import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat, formatSubtitleSummary, formatSubtitleTechnical } from "./mediaFormatter";
import { isMusicCategory, sortCategories, getCategoryGroup } from "../types";
import { MediaItem, RuleCriteria } from "../types";
import {
  evaluatePlexCompatibility,
  computeDuplicatesMap,
  isMissingSubtitles,
  hasBadSubtitles
} from "./plexEvaluator";
import { getDuplicatePairRows } from "./duplicateHelper";
import {
  getFolderPath,
  getMissingMetadataTags,
  formatResolutionForExcel,
} from "./excelExporter";
import { parseVideoMetadata } from "./mediaParser";
import {
  getDisplayArtist,
  getDisplayAlbum,
  getDisplaySongTitle,
} from "./musicHelper";
import { downloadOrSaveFile } from "./downloader";

async function triggerClientDownload(
  fileName: string,
  content: string,
  contentType: string,
  targetDir?: string
) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  await downloadOrSaveFile(fileName, blob, targetDir);
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return fileName;
}

export function getScanType(
  rules: RuleCriteria,
  items: MediaItem[] = [],
): string {
  let scanType = "Local Audit Scan";
  if (
    rules.useMetadataScan ||
    rules.useVideoMetadataScan ||
    rules.useMusicMetadataScan
  ) {
    if (rules.useVideoMetadataScan && !rules.useMusicMetadataScan) {
      scanType = "Video Metadata Scan";
    } else if (rules.useMusicMetadataScan && !rules.useVideoMetadataScan) {
      scanType = "Music Metadata Scan";
    } else {
      scanType = "Metadata Scan";
    }
  } else if (rules.useSubtitleScan) {
    scanType = "Subtitle Scan";
  } else if (rules.useAnomalyScan) {
    scanType = "Anomaly Scan";
  } else if (
    rules.useDuplicationScan ||
    rules.useDuplicationVideoScan ||
    rules.useDuplicationMusicScan
  ) {
    scanType = "Duplication Scan";
  } else if (rules.useDiscoveryPreset) {
    scanType = "Discovery Scan";
  } else if (rules.useModernPreset && rules.useLegacyPreset) {
    scanType = "Stream Audit Scan";
  } else if (rules.useModernPreset) {
    scanType = "Stream Audit Scan";
  } else if (
    items.length > 0 &&
    items.every((i) => i.category === "Corrupted")
  ) {
    scanType = "Corrupted Audit";
  } else {
    scanType = "Stream Audit Scan"; // default
  }
  return scanType;
}

export function getReportTitle(scanType: string): string {
  if (scanType === "Discovery Scan") return "Discovery Audit";
  if (scanType === "Stream Audit Scan") return "Streaming Audit";
  if (scanType === "Subtitle Scan") return "Subtitle Audit";
  if (scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan") return "Metadata Audit";
  if (scanType === "Duplication Scan") return "Duplicate Files Audit";
  if (scanType === "Corrupted Audit") return "Bad Files Audit";
  if (scanType === "Anomaly Scan") return "Quality Audit";
  return "Media Library Audit";
}

function getReportFileName(
  rules: RuleCriteria,
  items: MediaItem[] = [],
): string {
  const scanType = getScanType(rules, items);
  return getReportTitle(scanType);
}

export async function exportMediaLibraryToCSV(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;
  const isDuplication = getScanType(rules, items) === "Duplication Scan";
  const duplicatesMap = isDuplication ? new Map() : computeDuplicatesMap(itemsForDups, rules);

  const getCompatibilityLabel = (level: string) => {
    if (level === "pending") return "Pending Scan";
    if (level === "legacy") return "Legacy+";
    if (level === "modern") return "Modern+";
    if (level === "bleeding") return "Bleeding Edge";
    return "Transcode Required";
  };

  const scanType = getScanType(rules, items);
  const isMetadata = scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan";

  let allPossibleHeaders = isDuplication 
    ? ["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"]
    : [
    "Alert Level",
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    ...(rules.useSubtitleScan ? ["Subtitle Type"] : []),
    "Series Title",
    "Season",
    "Episode",
    "Episode Title",
    "Title",
    "Release Year",
    "Artist",
    "Album Title",
    "Song Title",
    "File Format/Codec",
    "Bitrate",
    "Corruption Type",
    "Recommendation",
    "Analysis Notes",
    "Remediation Action",
    "File Path",
  ];

  if (isMetadata) {
    allPossibleHeaders = [
      "Cleaned Title",
      "Title",
      "File Name",
      "Series Title",
      "Season",
      "Episode Number",
      "Episode Title",
      "Artist",
      "Album Title",
      "Year",
      "Track",
      "Director",
      "Writer",
      "Cast",
      "Studio",
      "Video Bit Depth",
      "Audio Sample Rate",
      "Chapters",
      "Poster",
      "Cover Art",
      "File Path"
    ];
  }

  const headers = isDuplication ? allPossibleHeaders : allPossibleHeaders.filter((col) => columns[col] !== false);

  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const filteredItemIds = new Set(items.map(i => i.id));
    const visiblePairs = dupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
    
    const rows = visiblePairs.map(row => {
      let data: Record<string, any> = {
        "File": row.fileName,
        "Path": row.filePath,
        "Duplicate File": row.dupFileName,
        "Duplicate Path": row.dupFilePath,
        "Flag Reason": row.flagReason || "",
      };
      return headers
        .map((h) => {
          let val = String(data[h] ?? "");
          // Prevent Excel Formula Injection
          if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
            val = `'${val}`;
          }
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const filename = `${getReportFileName(rules, items)}.csv`;
    return await triggerClientDownload(filename, csvContent, "text/csv;charset=utf-8;", targetDir);
  }

  const rows = items
    .filter((item) => {
      if (isMetadata) {
        if (item.category === "Extras" || item.category === "Corrupted" || item.category === "Static") {
          return false;
        }
      }
      return true;
    })
    .map((item) => {
      let data: Record<string, any> = {};

      if (isMetadata) {
        const isMusic = isMusicCategory(item.category);
        const isTv = getCategoryGroup(item.category) === "TV";
        const parsedMeta = parseVideoMetadata(item);

        const missingFmt = (val: any) => {
          if (val === undefined || val === null) return "[MISSING]";
          const s = String(val).trim();
          if (s === "" || s === "-" || s === "0" || s === "None" || s === "Unknown") return "[MISSING]";
          return s;
        };

        const posterFmt = (hasEmb: boolean | undefined, hasExt: boolean | undefined) => {
          if (hasEmb) return "Embedded";
          if (hasExt) return "External";
          return "[MISSING]";
        };

        const yearVal = item.year || parseInt(item.tags?.date || item.tags?.DATE || item.tags?.year || item.tags?.YEAR || "0") || 0;

        if (isMusic) {
          const songTitle = item.tags?.title || item.tags?.TITLE || "";
          const hasSongTitle = songTitle && songTitle.toLowerCase() !== (item.filename || "").toLowerCase();

          data["Title"] = hasSongTitle ? missingFmt(songTitle) : "[MISSING]";
          data["File Name"] = item.filename;
          data["Artist"] = missingFmt(item.tags?.artist || item.tags?.ARTIST);
          data["Album Title"] = missingFmt(item.tags?.album || item.tags?.ALBUM);
          data["Year"] = missingFmt(yearVal);
          data["Track"] = missingFmt(item.tags?.track || item.tags?.TRACK || item.tags?.tracknumber || item.tags?.TRACKNUMBER);
          data["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          data["Cover Art"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          data["File Path"] = item.filePath;
        } else if (isTv) {
          const tvTitle = item.tags?.title || item.tags?.TITLE || "";
          const hasTvTitle = tvTitle && tvTitle.toLowerCase() !== (item.filename || "").toLowerCase();

          data["Title"] = hasTvTitle ? missingFmt(tvTitle) : missingFmt(parsedMeta.title);
          data["File Name"] = item.filename;
          data["Series Title"] = missingFmt(parsedMeta.title || item.tags?.show || item.tags?.SHOW || item.tags?.series || item.tags?.SERIES);
          data["Season"] = missingFmt(parsedMeta.season);
          data["Episode Number"] = missingFmt(parsedMeta.episode);
          data["Episode Title"] = missingFmt(parsedMeta.epTitle);
          data["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          data["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          data["Year"] = missingFmt(yearVal);
          data["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          data["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          data["Video Bit Depth"] = missingFmt(item.videoBitDepth);
          data["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          data["Chapters"] = item.chapterCount !== undefined ? (item.chapterCount > 0 ? `${item.chapterCount} chapters` : "[MISSING]") : "[MISSING]";
          data["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          data["File Path"] = item.filePath;
        } else {
          const videoTitle = item.tags?.title || item.tags?.TITLE || "";
          const hasVideoTitle = videoTitle && videoTitle.toLowerCase() !== (item.filename || "").toLowerCase();

          data["Title"] = hasVideoTitle ? missingFmt(videoTitle) : missingFmt(parsedMeta.title);
          data["File Name"] = item.filename;
          data["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          data["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          data["Year"] = missingFmt(yearVal);
          data["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          data["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          data["Video Bit Depth"] = missingFmt(item.videoBitDepth);
          data["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          data["Chapters"] = item.chapterCount !== undefined ? (item.chapterCount > 0 ? `${item.chapterCount} chapters` : "[MISSING]") : "[MISSING]";
          data["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          data["File Path"] = item.filePath;
        }
      } else {
        const isDup = duplicatesMap.get(item.id) ?? false;
        const evalResult = evaluatePlexCompatibility(item, rules, isDup);
        const parsedMeta = parseVideoMetadata(item);

        const audioStr = item.audioTracks
          .map(
            (t) =>
              `${formatCodecString(t.codec)} (${t.channels}ch${t.language ? `-${t.language}` : ""})`,
          )
          .join(" | ");
        const subStr = formatSubtitleSummary(item);

        const missing = getMissingMetadataTags(item);
        const missingTagsValue = missing.length > 0 ? missing.join(", ") : "None";
        let alertText = "";
        if (getScanType(rules, items) === "Subtitle Scan") {
          alertText = evalResult.level === "unfriendly" ? "Critical" : evalResult.level === "legacy" ? "Warning" : "OK";
        }

        data = {
          "Alert Level": alertText,
          "Missing Metadata": missingTagsValue,
          "Stream Audit": isMusicCategory(item.category)
            ? ""
            : getCompatibilityLabel(evalResult.level),
          "File Name": item.filename,
          Container: getContainerFormat(item),
          "Video Codec": isMusicCategory(item.category)
            ? ""
            : getPrimaryVideoCodec(item),
          Resolution: isMusicCategory(item.category)
            ? ""
            : formatResolutionForExcel(item.videoResolution),
          "Audio Tracks": (item.audioTracks || []).length,
          "Audio Codecs": audioStr,
          Subtitles: subStr,
          "Subtitle Type": rules.useSubtitleScan ? formatSubtitleTechnical(item) : "",
          "Series Title":
            getCategoryGroup(item.category) === "TV"
              ? parsedMeta.title
              : "",
          "Season":
            getCategoryGroup(item.category) === "TV"
              ? parsedMeta.season
              : "",
          "Episode":
            getCategoryGroup(item.category) === "TV"
              ? parsedMeta.episode
              : "",
          "Episode Title":
            getCategoryGroup(item.category) === "TV"
              ? parsedMeta.epTitle
              : "",
          Title:
            getCategoryGroup(item.category) === "Movies" || getCategoryGroup(item.category) === "Other"
              ? (item.category === "Extras" ? (((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle && parsedMeta.epTitle !== "-" ? parsedMeta.epTitle : parsedMeta.title)) : parsedMeta.title)
              : "",
          "Release Year": !["Music", "Corrupted", "Static"].includes(item.category)
            ? parsedMeta.year
            : "",
          Artist: isMusicCategory(item.category)
            ? getDisplayArtist(item, rules)
            : "",
          "Album Title": isMusicCategory(item.category)
            ? getDisplayAlbum(item, rules)
            : "",
          "Album/Folder Title": isMusicCategory(item.category)
            ? getDisplayAlbum(item, rules)
            : "",
          "Song Title": isMusicCategory(item.category)
            ? getDisplaySongTitle(item, rules)
            : "",
          "File Format/Codec": isMusicCategory(item.category)
            ? getPrimaryAudioCodec(item) ||
              getContainerFormat(item)
            : "",
          Bitrate: isMusicCategory(item.category)
            ? `${Math.round((item.audioBitrate || 0) / 1000)} kbps`
            : "",
          "Cover Art": item.hasEmbeddedPoster
            ? "Embedded"
            : item.hasExternalPoster
              ? "External"
              : "Missing",
          Poster: item.hasEmbeddedPoster
            ? "Embedded"
            : item.hasExternalPoster
              ? "External"
              : "Missing",
          "Analysis Notes":
            isMusicCategory(item.category) || item.category === "Corrupted"
              ? ""
              : evalResult.level === "modern"
                ? "Direct Play on newer HW"
                : evalResult.level === "legacy"
                  ? "Direct Play on most HW"
                  : "Will transcode",
          "Corruption Type":
            item.category === "Corrupted"
              ? item.tags?.artist || "Read error / 0-byte file"
              : "",
          Recommendation: item.category === "Corrupted" ? "Replace file" : "",
          "Remediation Action":
            isMusicCategory(item.category) || item.category === "Corrupted"
              ? ""
              : evalResult.level !== "unfriendly"
                ? ""
                : evalResult.suggestion,
          "File Path": item.filePath,
        };
      }

      return headers
        .map((h) => {
          let val = String(data[h] ?? "");
          // Prevent Excel Formula Injection
          if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
            val = `'${val}`;
          }
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",");
    });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename = `${getReportFileName(rules, items)}.csv`;
  return await triggerClientDownload(filename, csvContent, "text/csv;charset=utf-8;", targetDir);
}

export async function exportMediaLibraryToJSON(
  items: MediaItem[],
  rules: RuleCriteria,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;
  const scanType = getScanType(rules, items);
  const isDuplication = scanType === "Duplication Scan";
  
  let targetItems = items;
  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const dupIds = new Set<string>();
    dupRows.forEach(r => {
      if (r.id) dupIds.add(r.id);
      if (r.dupId) dupIds.add(r.dupId);
    });
    targetItems = items.filter(i => dupIds.has(i.id));
  }
  
  const duplicatesMap = computeDuplicatesMap(itemsForDups, rules);

  const reports = targetItems.map((item) => {
    const isDup = duplicatesMap.get(item.id) ?? false;
    return {
      ...item,
      parsedMetadata: parseVideoMetadata(item),
      evaluation: evaluatePlexCompatibility(item, rules, isDup),
    };
  });
  const jsonContent = JSON.stringify(
    {
      application: "Bitscribe",
      version: "v1.0",
      timestamp: new Date().toLocaleString(),
      items: reports,
    },
    null,
    2,
  );
  const filename = `${getReportFileName(rules, items)}.json`;
  await triggerClientDownload(
    filename,
    jsonContent,
    "application/json;charset=utf-8;",
    targetDir
  );
}

export async function exportMediaLibraryToHTML(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;
  const scanType = getScanType(rules, items);

  const getCompatibilityLabel = (level: string) => {
    if (level === "pending") return "Pending Scan";
    if (level === "legacy") return "Legacy+";
    if (level === "modern") return "Modern+";
    if (level === "bleeding") return "Bleeding Edge";
    return "Transcode Required";
  };

  const duplicatesMap = computeDuplicatesMap(itemsForDups, rules);

  const isCorrupted = scanType === "Corrupted Audit";
  const isDuplication = scanType === "Duplication Scan";
  const isMetadata = scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan";
  const isQuality = scanType === "Quality Audit";
  const isDiscovery = scanType === "Media Discovery" || scanType === "Modern Direct Play" || rules.useDiscoveryPreset;

  const isSubtitle = scanType === "Subtitle Scan";

  let allPossibleHeaders = [
    "Alert Level",
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    ...(isSubtitle ? ["Subtitle Type"] : []),
    "Series Title",
    "Season",
    "Episode",
    "Episode Title",
    "Title",
    "Release Year",
    "Artist",
    "Album Title",
    "Song Title",
    "File Format/Codec",
    "Video Bitrate",
    "Audio Bitrate",
    "Bitrate",
    "Corruption Type",
    "Recommendation",
    "Analysis Notes",
    "Remediation Action",
    "File Path",
  ];

  if (isMetadata) {
    allPossibleHeaders = [
      "Cleaned Title",
      "Title",
      "File Name",
      "Series Title",
      "Season",
      "Episode Number",
      "Episode Title",
      "Artist",
      "Album Title",
      "Year",
      "Track",
      "Director",
      "Writer",
      "Cast",
      "Studio",
      "Poster",
      "Cover Art",
      "File Path"
    ];
  }

  let allOptimizedItems: any[] = [];
  let optimizedItems: any[] = [];
  let finalColumns = { ...columns };

  let targetItems = items;
  if (isSubtitle) {
    targetItems = items.filter(item => {
      return hasBadSubtitles(item) || isMissingSubtitles(item);
    });
  } else if (isMetadata) {
    targetItems = items.filter(item => {
      return item.category !== "Extras" && item.category !== "Corrupted" && item.category !== "Static";
    });
    finalColumns = {};
    allPossibleHeaders.forEach(h => {
      finalColumns[h] = true;
    });
  }

  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const filteredItemIds = new Set(targetItems.map(i => i.id));
    const visibleDupRows = dupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
    
    optimizedItems = visibleDupRows.map(row => ({

      category: row.category,
      topLevelFolder: row.topLevelFolder,
      "File": row.fileName,
      "Path": row.filePath,
      "Duplicate File": row.dupFileName,
      "Duplicate Path": row.dupFilePath,
      "Flag Reason": row.flagReason || "",
      dupSizeGB: row.dupSizeGB || 0
    }));
    allPossibleHeaders = ["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"];
    finalColumns = { "File": true, "Path": true, "Duplicate File": true, "Duplicate Path": true, "Flag Reason": true };
    allOptimizedItems = optimizedItems;
  } else {
    
    const mapItemRow = (item: MediaItem) => {
      const isDup = duplicatesMap.get(item.id) ?? false;
      const evalResult = evaluatePlexCompatibility(item, rules, isDup);
      const parsedMeta = parseVideoMetadata(item);

      const audioStr = (item.audioTracks || [])
        .map((t) => `${formatCodecString(t.codec)} (${t.channels}ch${t.language ? "-" + t.language : ""})`)
        .join(" | ");
      const subStr = formatSubtitleSummary(item);

      const missing = getMissingMetadataTags(item);
      
      const rowData: Record<string, string | number | boolean> = {};
      if (isMetadata) {
        const isMusic = isMusicCategory(item.category);
        const isTv = getCategoryGroup(item.category) === "TV";

        const missingFmt = (val: any) => {
          if (val === undefined || val === null) return "[MISSING]";
          const s = String(val).trim();
          if (s === "" || s === "-" || s === "0" || s === "None" || s === "Unknown") return "[MISSING]";
          return s;
        };

        const posterFmt = (hasEmb: boolean | undefined, hasExt: boolean | undefined) => {
          if (hasEmb) return "Embedded";
          if (hasExt) return "External";
          return "[MISSING]";
        };

        const yearVal = item.year || parseInt(item.tags?.date || item.tags?.DATE || item.tags?.year || item.tags?.YEAR || "0") || 0;

        const cat = item.category || "Unknown";
        const tlf = item.topLevelFolder || "";
        if (cat) rowData["category"] = cat;
        if (tlf) rowData["topLevelFolder"] = tlf;

        if (isMusic) {
          const songTitle = item.tags?.title || item.tags?.TITLE || "";
          const hasSongTitle = songTitle && songTitle.toLowerCase() !== (item.filename || "").toLowerCase();

          rowData["Title"] = hasSongTitle ? missingFmt(songTitle) : "[MISSING]";
          rowData["File Name"] = item.filename;
          rowData["Artist"] = missingFmt(item.tags?.artist || item.tags?.ARTIST);
          rowData["Album Title"] = missingFmt(item.tags?.album || item.tags?.ALBUM);
          rowData["Year"] = missingFmt(yearVal);
          rowData["Track"] = missingFmt(item.tags?.track || item.tags?.TRACK || item.tags?.tracknumber || item.tags?.TRACKNUMBER);
          rowData["Cover Art"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowData["File Path"] = item.filePath;
        } else if (isTv) {
          const tvTitle = item.tags?.title || item.tags?.TITLE || "";
          const tvNameVal = tvTitle && tvTitle.toLowerCase() !== (item.filename || "").toLowerCase() ? tvTitle : parsedMeta.title;

          rowData["Cleaned Title"] = missingFmt(parsedMeta.title);
          rowData["Title"] = missingFmt(tvNameVal);
          rowData["File Name"] = item.filename;
          rowData["Series Title"] = missingFmt(parsedMeta.title || item.tags?.show || item.tags?.SHOW || item.tags?.series || item.tags?.SERIES);
          rowData["Season"] = missingFmt(parsedMeta.season);
          rowData["Episode Number"] = missingFmt(parsedMeta.episode);
          rowData["Episode Title"] = missingFmt(parsedMeta.epTitle);
          rowData["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          rowData["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          rowData["Year"] = missingFmt(yearVal);
          rowData["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          rowData["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          rowData["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowData["File Path"] = item.filePath;
        } else {
          const videoTitle = item.tags?.title || item.tags?.TITLE || "";
          const hasVideoTitle = videoTitle && videoTitle.toLowerCase() !== (item.filename || "").toLowerCase();

          rowData["Cleaned Title"] = missingFmt(parsedMeta.title);
          rowData["Title"] = hasVideoTitle ? missingFmt(videoTitle) : missingFmt(parsedMeta.title);
          rowData["File Name"] = item.filename;
          rowData["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          rowData["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          rowData["Year"] = missingFmt(yearVal);
          rowData["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          rowData["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          rowData["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowData["File Path"] = item.filePath;
        }
      } else {
        if (isSubtitle) {
          rowData["Alert Level"] = evalResult.level === "unfriendly" ? "Critical" : evalResult.level === "legacy" ? "Warning" : "OK";
        }
        
        const cat = item.category || "Unknown";
        const tlf = item.topLevelFolder || "";
        if (cat) rowData["category"] = cat;
        if (tlf) rowData["topLevelFolder"] = tlf;
        
        if (evalResult.isBloated) rowData["isBloated"] = true;
        if (evalResult.isStarved) rowData["isStarved"] = true;
        if (evalResult.isAnomaly) rowData["isAnomaly"] = true;
        
        if (missing.length > 0) rowData["Missing Metadata"] = missing.join(", ");
        
        const streamAudit = isMusicCategory(item.category) ? "" : getCompatibilityLabel(evalResult.level);
        if (streamAudit) rowData["Stream Audit"] = streamAudit;
        
        if (item.filename) rowData["File Name"] = item.filename;
        
        const container = getContainerFormat(item);
        if (container) rowData["Container"] = container;
        
        const videoCodec = isMusicCategory(item.category) ? "" : getPrimaryVideoCodec(item);
        if (videoCodec) rowData["Video Codec"] = videoCodec;
        
        const res = isMusicCategory(item.category) ? "" : formatResolutionForExcel(item.videoResolution);
        if (res) rowData["Resolution"] = res;
        
        if ((item.audioTracks || []).length > 0) rowData["Audio Tracks"] = item.audioTracks.length;
        if (audioStr) rowData["Audio Codecs"] = audioStr;
        rowData["Subtitles"] = subStr;
        if (isSubtitle) {
          rowData["Subtitle Type"] = formatSubtitleTechnical(item);
        }
        
        if (getCategoryGroup(item.category) === "TV") {
          if (parsedMeta.title) rowData["Series Title"] = parsedMeta.title;
          if (parsedMeta.season) rowData["Season"] = parsedMeta.season;
          if (parsedMeta.episode) rowData["Episode"] = parsedMeta.episode;
          if (parsedMeta.epTitle) rowData["Episode Title"] = parsedMeta.epTitle;
        }
        
        const isMovieGroup = getCategoryGroup(item.category) === "Movies" || getCategoryGroup(item.category) === "Other";
        const title = isMovieGroup
          ? item.category === "Extras"
            ? ((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle && parsedMeta.epTitle !== "-" ? parsedMeta.epTitle : parsedMeta.title)
            : parsedMeta.title
          : "";
        if (title) rowData["Title"] = title;
        
        const year = !["Music", "Corrupted", "Static"].includes(item.category) ? parsedMeta.year : "";
        if (year) rowData["Release Year"] = year;
        
        if (item.videoBitrateMbps) rowData["Video Bitrate"] = `${item.videoBitrateMbps.toFixed(2)} Mbps`;
        if (item.audioBitrate) rowData["Audio Bitrate"] = `${Math.round(item.audioBitrate / 1000)} kbps`;

        if (isMusicCategory(item.category)) {
          const artist = getDisplayArtist(item, rules);
          if (artist) rowData["Artist"] = artist;
          
          const album = getDisplayAlbum(item, rules);
          if (album) rowData["Album Title"] = album;
          
          const song = getDisplaySongTitle(item, rules);
          if (song) rowData["Song Title"] = song;
          
          const format = getPrimaryAudioCodec(item);
          if (format) rowData["File Format/Codec"] = format;
          
          if (item.audioBitrate) rowData["Bitrate"] = `${Math.round(item.audioBitrate / 1000)} kbps`;
        }
        
        if (item.category === "Corrupted") {
          rowData["Corruption Type"] = item.tags?.artist || "Read error / 0-byte file";
          rowData["Recommendation"] = "Replace file";
        } else {
          if (isMetadata) {
            const missing = getMissingMetadataTags(item);
            rowData["Missing Metadata"] = missing.length > 0 ? missing.join(", ") : "None";
            rowData[isMusicCategory(item.category) ? "Cover Art" : "Poster"] = 
              item.hasEmbeddedPoster ? "Embedded" : item.hasExternalPoster ? "External" : "None";
          } else if (isSubtitle || isQuality) {
            rowData["Analysis Notes"] = evalResult.reason;
            rowData["Remediation Action"] = evalResult.suggestion;
          } else {
            if (!isMusicCategory(item.category)) {
              let notes = "";
              if (evalResult.level === "modern") {
                notes = "Direct Play on newer HW";
              } else if (evalResult.level === "legacy") {
                notes = "Direct Play on most HW";
              } else if (evalResult.level === "unfriendly") {
                notes = evalResult.reason || "Will transcode";
              } else {
                notes = evalResult.reason || "Will transcode";
              }
              if (notes) rowData["Analysis Notes"] = notes;
              
              if (evalResult.level === "unfriendly" && evalResult.suggestion) {
                rowData["Remediation Action"] = evalResult.suggestion;
              }
            }
          }
        }
      }

      if (item.filePath) rowData["File Path"] = item.filePath;
      
      return rowData;

    };

    allOptimizedItems = targetItems.map(item => mapItemRow(item));
    optimizedItems = allOptimizedItems;

  }

  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__REPORT_TITLE__</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background-color: #0B0F19; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  .gradient-text { background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .glass-panel { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.05); }
  th { position: sticky; top: 0; background: #0f172a; z-index: 10; cursor: pointer; user-select: none; }
  th:hover { background: #1e293b; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0B0F19; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
  .sort-asc::after { content: " \\25B2"; font-size: 0.8em; }
  .sort-desc::after { content: " \\25BC"; font-size: 0.8em; }
  
  .col-resizer {
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    user-select: none;
    z-index: 11;
  }
  .col-resizer:hover, .col-resizer.resizing {
    background: rgba(99, 102, 241, 0.4);
    border-right: 2px solid #6366f1;
  }
</style>
</head>
<body class="min-h-screen p-4 md:p-8">

<div class="max-w-[1600px] mx-auto">
  <header class="flex flex-col items-center justify-center mb-8">
    <div class="flex flex-col items-center select-none">
      <div class="flex items-center gap-1">
        <svg class="w-14 h-14 flex-shrink-0 relative group -mt-1" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="headerQuillGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#A78BFA" />
              <stop offset="50%" stop-color="#8B5CF6" />
              <stop offset="100%" stop-color="#3B82F6" />
            </linearGradient>
            <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.0" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M 5,59 Q 15,61.8 25,54 T 41,45 T 55,41" stroke="url(#headerQuillGrad)" stroke-width="1.2" stroke-dasharray="1.5 2.5" fill="none" opacity="0.3" />
          <!-- Elegant squiggly ink line connecting the pen tip to the reel -->
          <path d="M 5,59 Q 10,61 14,57.5 T 21,54.5" stroke="url(#headerQuillGrad)" stroke-width="1.2" fill="none" opacity="0.85" />

          <!-- Curving wavy tail of celluloid film strip trailing out the back of the reel in the opposite direction -->
          <!-- Elegant curving film strip trailing out to the right under the TV/Music icons as a stylized underline -->
          <!-- Film backing block (dark translucent fill, closed-ended, flaring out dynamically to the right) -->
          <path d="M 28,55.0 C 35,59.5 45,43.5 60,44.0 L 60,56.0 C 45,50.0 35,63.0 28,58.5 Z" fill="none" stroke="#A78BFA" stroke-width="0.8" opacity="0.95" />

          <!-- Celluloid Frame Division Lines (vertical frame borders) -->
          <line x1="36" y1="55.1" x2="36" y2="59.2" stroke="#8B5CF6" stroke-width="0.6" opacity="0.8" />
          <line x1="44" y1="51.0" x2="44" y2="56.7" stroke="#8B5CF6" stroke-width="0.6" opacity="0.8" />
          <line x1="52" y1="46.1" x2="52" y2="54.5" stroke="#8B5CF6" stroke-width="0.6" opacity="0.8" />

          <!-- Dual sprocket holes trailing along the top and bottom borders -->
          <path d="M 28,55.7 C 35,60.2 45,44.2 60,44.7" stroke="#C084FC" stroke-width="0.7" stroke-dasharray="0.8 1.0" fill="none" opacity="0.85" />
          <path d="M 28,57.7 C 35,62.2 45,49.2 60,55.2" stroke="#C084FC" stroke-width="0.7" stroke-dasharray="0.8 1.0" fill="none" opacity="0.85" />
          <circle cx="25" cy="54" r="6.5" fill="none" opacity="0.3" />
          <circle cx="25" cy="54" r="6.5" stroke="#8B5CF6" stroke-width="1.3" fill="white" />
          <circle cx="25" cy="54" r="5.5" stroke="#A78BFA" stroke-width="0.5" fill="none" opacity="0.45" />
          <circle cx="25" cy="54" r="4.6" fill="white" />
          <circle cx="25" cy="54" r="4.6" stroke="#4C1D95" stroke-width="0.8" stroke-dasharray="0.8 0.6" fill="none" opacity="0.85" />
          <circle cx="25.0" cy="50.7" r="1.2" fill="black" stroke="#8B5CF6" stroke-width="0.4" />
          <circle cx="28.14" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" stroke-width="0.4" />
          <circle cx="26.94" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" stroke-width="0.4" />
          <circle cx="23.06" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" stroke-width="0.4" />
          <circle cx="21.86" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" stroke-width="0.4" />

          <circle cx="25" cy="54" r="1.8" fill="none" stroke="#C084FC" stroke-width="0.5" />
          <circle cx="25" cy="54" r="0.7" fill="black" />
          <rect x="33.5" y="42" width="9" height="7" rx="1.5" stroke="#3B82F6" stroke-width="1.1" fill="none" />
          <path d="M 36.5,42 L 35,39" stroke="#3B82F6" stroke-width="0.8" stroke-linecap="round" />
          <path d="M 39.5,42 L 41,39" stroke="#3B82F6" stroke-width="0.8" stroke-linecap="round" />
          <rect x="34.5" y="43.5" width="5.2" height="4" rx="0.6" stroke="#60A5FA" stroke-width="0.4" fill="none" opacity="0.35" />
          <circle cx="41" cy="44" r="0.4" fill="none" stroke="#3B82F6" stroke-width="0.3" />
          <circle cx="41" cy="45.5" r="0.4" fill="none" stroke="#3B82F6" stroke-width="0.3" />
          <circle cx="48.5" cy="39.5" r="1.3" fill="none" stroke="#06B6D4" stroke-width="0.9" />
          <circle cx="52.5" cy="38.0" r="1.3" fill="none" stroke="#06B6D4" stroke-width="0.9" />
          <path d="M 49.8,39.5 L 49.8,31.5" stroke="#06B6D4" stroke-width="0.9" stroke-linecap="round" />
          <path d="M 53.8,38.0 L 53.8,30.0" stroke="#06B6D4" stroke-width="0.9" stroke-linecap="round" />
          <path d="M 49.8,32.3 L 53.8,30.8" stroke="#06B6D4" stroke-width="1.8" stroke-linecap="round" />
          <path d="M 49.8,34.5 L 53.8,33.0" stroke="#06B6D4" stroke-width="1.0" stroke-linecap="round" opacity="0.7" />
          <path d="M 8,56 L 22,42" stroke="url(#headerQuillGrad)" stroke-width="2.8" stroke-linecap="round" />
          <path d="M 9,55 L 21,43" stroke="#FFFFFF" stroke-width="0.8" stroke-linecap="round" opacity="0.4" />
          <path d="M 8,56 L 5,59" stroke="#E2E8F0" stroke-width="2.2" stroke-linecap="round" />
          <line x1="5" y1="59" x2="7" y2="57" stroke="#10141D" stroke-width="0.8" />
          <path d="M 20,44 C 10,34 16,16 42,12 C 46,11 48,15 44,22 C 37,33 29,41 20,44 Z" fill="url(#headerQuillGrad)" />
          <path d="M 20,44 Q 30,29 42,12" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.6" />
          <path d="M 21,42 C 12,32 18,18 41,13" stroke="#F3E8FF" stroke-width="0.6" fill="none" opacity="0.35" />
          <path d="M 27,33 Q 19,28 17,32" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 31,28 Q 23,22 21,26" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 35,23 Q 27,17 25,21" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 38,18 Q 30,12 28,16" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 27,33 Q 33,36 35,33" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 31,28 Q 37,31 39,28" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 35,23 Q 41,26 43,23" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
          <path d="M 38,18 Q 44,21 46,18" stroke="#10141D" stroke-width="0.8" opacity="0.35" />
        </svg>
        <h1 class="text-3xl font-[950] tracking-[0.25em] bg-gradient-to-r from-indigo-300 via-white to-purple-300 gradient-text leading-none translate-x-[0.125em]">
          BitScribe
        </h1>
      </div>
      <div class="w-full mt-1">
        <p class="text-[10px] font-bold text-[#8B5CF6] tracking-[0.25em] uppercase leading-none text-center pl-1">
          Digital Media Library Steward
        </p>
      </div>
    </div>
    <h2 class="mt-6 text-xl font-semibold text-slate-300 border-b border-slate-700 pb-2 px-8 text-center uppercase tracking-wider">__REPORT_TITLE__</h2>
  </header>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center" id="metrics-container"></div>
  <div id="codec-metrics-container" class="hidden grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"></div>

  <div class="flex flex-col lg:flex-row gap-4 mb-4 justify-between items-start lg:items-center">
    <div class="flex flex-wrap gap-2 items-center gap-y-3" id="category-filters-container">
      <div class="flex flex-wrap gap-2" id="category-filters"></div>
      <button id="all-metrics-toggle" onclick="toggleAllMetrics()" class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium border border-slate-700 transition-all flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        All Metrics Dashboard
      </button>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 items-end sm:items-center" id="right-controls">
      <div class="relative" id="column-dropdown-container">
        <button id="column-dropdown-btn" onclick="toggleColumnDropdown(event)" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2">
          Columns
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        <div id="column-dropdown-menu" class="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-2 hidden z-50 max-h-96 overflow-y-auto">
          <div class="space-y-1" id="column-toggles"></div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
        <label for="page-size">Show:</label>
        <select id="page-size" class="bg-transparent border-none text-slate-200 outline-none focus:ring-0 cursor-pointer">
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="250">250</option>
          <option value="500">500</option>
        </select>
      </div>
    </div>
  </div>

  <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4" id="pagination-controls-top">
    <div class="text-sm text-slate-400" id="pagination-info-top">Showing 0 to 0 of 0 entries</div>
    <div class="flex gap-2" id="pagination-buttons-top"></div>
  </div>

  <div class="glass-panel rounded-xl overflow-x-auto shadow-2xl">
    <table class="w-full text-left text-sm whitespace-nowrap table-fixed">
      <thead id="table-head"></thead>
      <tbody id="table-body" class="divide-y divide-slate-800/50"></tbody>
    </table>
  </div>
  
  <div class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4" id="pagination-controls-bottom">
    <div class="text-sm text-slate-400" id="pagination-info-bottom">Showing 0 to 0 of 0 entries</div>
    <div class="flex gap-2" id="pagination-buttons-bottom"></div>
  </div>
</div>

<script>
  const ALL_DATA = __ALL_DATA__;
  const RAW_DATA = ALL_DATA;
  const INITIAL_COLUMNS = __COLUMNS__;
  const ALL_POSSIBLE_HEADERS = __HEADERS__;
  const SCAN_TYPE = "__SCAN_TYPE__";

  function formatCodecString(codec) {
    if (codec == null) return "";
    return String(codec).toUpperCase().trim();
  }

  let items = RAW_DATA;
  let sortCol = SCAN_TYPE === "Duplication Scan" ? "File" : "File Name";
  let sortDesc = false;
  let currentPage = 1;
  let pageSize = 50;
  let activeDupFilter = "All";
  let visibleColumns = { ...INITIAL_COLUMNS };
  let colWidths = {};

  let activeCategory = "";
  let orderedCats = [];
  let showAllMetricsMode = false;

  const isDiscovery = SCAN_TYPE === "Discovery Scan";
  const isStreaming = SCAN_TYPE === "Stream Audit Scan" || SCAN_TYPE === "Local Audit Scan";
  const isMetadata = SCAN_TYPE === "Metadata Scan" || SCAN_TYPE === "Video Metadata Scan" || SCAN_TYPE === "Music Metadata Scan";
  const isQuality = SCAN_TYPE === "Anomaly Scan";
  const isSubtitle = SCAN_TYPE === "Subtitle Scan";

  const getCategoryGroupInBrowser = (category) => {
    if (!category) return 'Other';
    const isMusicCat = ["Music Albums", "Soundtracks", "Music Compilations", "Music"].includes(category);
    if (isMusicCat) return 'Music';
    const lower = category.toLowerCase();
    
    if (lower.includes('movie') || lower.includes('documentar') || lower.includes('docuseries') || lower.includes('shorts') || lower === 'plays' || lower === 'specials' || lower.includes('music video')) {
      if (lower.includes('anime tv') || lower === 'anime') {
         return 'TV';
      }
      if (lower.includes('docuseries') || lower.includes('documentary series')) {
         return 'TV';
      }
      if (lower.includes('documentar')) {
         return 'Movies';
      }
      if (lower.includes('series') || lower.includes('show')) {
        if (!lower.includes('movies')) {
           return 'TV';
        }
      }
      return 'Movies';
    }
    
    if (lower.includes('tv') || lower.includes('show') || lower.includes('series') || lower === 'anime') {
      return 'TV';
    }
    
    return 'Other';
  };

  const getColsForCat = (cat) => {
    const isVideo = ["Movies", "Movie", "Documentaries", "TV Shows", "TV", "Docuseries", "Documentary Series", "Extras", "Shorts", "Plays", "Specials", "Music Videos"].includes(cat);
    const isMusic = ["Music Albums", "Soundtracks", "Music Compilations", "Music"].includes(cat);
    
    if (isDiscovery) {
      if (getCategoryGroupInBrowser(cat) === "TV") return ["Series Title", "Season", "Episode", "Episode Title", "Video Codec", "Resolution", "Audio Codecs", "Audio Tracks", "Release Year", "File Path"];
      if (isVideo) return ["Title", "Video Codec", "Resolution", "Audio Codecs", "Audio Tracks", "Release Year", "File Path"];
      if (isMusic) return ["Artist", "Album Title", "Song Title", "File Format/Codec", "File Path"];
      if (cat === "Corrupted") return ["File Name", "Container", "Corruption Type", "Recommendation", "File Path"];
      if (cat === "Static") return ["File Name", "Container", "File Path"];
      if (cat === "Other") return ["Title", "Video Codec", "Audio Codecs", "File Path"];
      return ["Title", "File Path"];
    }
    
    if (isStreaming) {
      if (isVideo) return ["Stream Audit", "File Name", "Video Codec", "Audio Codecs", "Audio Tracks", "Analysis Notes", "Remediation Action", "File Path"];
      return ["File Name", "File Path"];
    }
    
    if (isMetadata) {
      if (isMusic) {
        return [
          "File Name",
          "Title",
          "Album Title",
          "Artist",
          "Year",
          "Track",
          "Cover Art",
          "File Path"
        ];
      }
      const isTvTab = getCategoryGroupInBrowser(cat) === "TV";
      if (isTvTab) {
        return [
          "Cleaned Title",
          "File Name",
          "Title",
          "Series Title",
          "Episode Title",
          "Season",
          "Episode Number",
          "Director",
          "Writer",
          "Year",
          "Cast",
          "Studio",
          "Poster",
          "File Path"
        ];
      }
      return [
        "Cleaned Title",
        "File Name",
        "Title",
        "Director",
        "Writer",
        "Year",
        "Cast",
        "Studio",
        "Poster",
        "File Path"
      ];
    }
    
    if (isQuality) {
      if (isVideo) return ["File Name", "Resolution", "Video Bitrate", "Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
      return ["File Name", "Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
    }
    
    if (isSubtitle) {
      return ["Alert Level", "File Name", "Subtitles", "Subtitle Type", "Analysis Notes", "Remediation Action", "File Path"];
    }

    if (cat === "Corrupted") return ["File Name", "Container", "Corruption Type", "Recommendation", "File Path"];
    if (cat === "Static") return ["File Name", "Container", "File Path"];
    
    return ["File Name", "File Path"];
  };

  function initCategories() {
    if (SCAN_TYPE === "Duplication Scan") {
      orderedCats = ["All"];
      activeCategory = "All";
      return;
    }
    const rawCats = new Set();
    items.forEach(i => {
      let c = i.category || "Other";
      if (isMetadata && (c === "Extras" || c === "Corrupted" || c === "Static" || c === "Other")) {
        return;
      }
      if (SCAN_TYPE === "Discovery Scan" && c === "Corrupted") {
        return;
      }
      if (c) rawCats.add(c);
    });
    const order = ["Movies", "Movie", "Documentaries", "Docuseries", "Documentary Series", "TV Shows", "TV", "Plays", "Specials", "Extras", "Shorts", "Music Videos", "Music Albums", "Soundtracks", "Music Compilations", "Music", "Other", "Static", "Corrupted"];
    orderedCats = Array.from(rawCats).sort((a,b) => {
      let ia = order.indexOf(a); let ib = order.indexOf(b);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b);
    });
    
    if (orderedCats.length > 0) {
      activeCategory = orderedCats[0];
      applyCategoryColumns(activeCategory);
    }
  }

  function applyCategoryColumns(cat) {
    const defCols = getColsForCat(cat);
    if (defCols) {
      const nextCols = {};
      ALL_POSSIBLE_HEADERS.forEach(h => {
        nextCols[h] = defCols.includes(h);
      });
      visibleColumns = nextCols;
    }
  }

  window.toggleColumnDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('column-dropdown-menu');
    dropdown.classList.toggle('hidden');
  };

  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('column-dropdown-menu');
    const button = document.getElementById('column-dropdown-btn');
    if (dropdown && button && !dropdown.contains(e.target) && !button.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  window.toggleAllMetrics = function() {
    showAllMetricsMode = !showAllMetricsMode;
    const btn = document.getElementById('all-metrics-toggle');
    const tableContainer = document.querySelector('.glass-panel.rounded-xl.overflow-x-auto');
    const filterSection = document.getElementById('category-filters');
    const rightControls = document.getElementById('right-controls');
    const paginationControlsTop = document.getElementById('pagination-controls-top');
    const paginationControlsBottom = document.getElementById('pagination-controls-bottom');

    if (showAllMetricsMode) {
      btn.className = "px-4 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium shadow-lg shadow-indigo-500/20 border border-indigo-500 transition-all flex items-center gap-2";
      if (tableContainer) tableContainer.classList.add('hidden');
      if (filterSection) filterSection.classList.add('opacity-50');
      if (rightControls) rightControls.classList.add('opacity-40', 'pointer-events-none');
      if (paginationControlsTop) paginationControlsTop.classList.add('hidden');
      if (paginationControlsBottom) paginationControlsBottom.classList.add('hidden');
    } else {
      btn.className = "px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium border border-slate-700 transition-all flex items-center gap-2";
      if (tableContainer) tableContainer.classList.remove('hidden');
      if (filterSection) filterSection.classList.remove('opacity-50', 'opacity-40', 'pointer-events-none');
      if (rightControls) rightControls.classList.remove('opacity-40', 'pointer-events-none');
      if (paginationControlsTop) paginationControlsTop.classList.remove('hidden');
      if (paginationControlsBottom) paginationControlsBottom.classList.remove('hidden');
    }
    renderMetrics();
  };

  function renderMetrics() {
    const container = document.getElementById('metrics-container');
    if (!container) return;

    const isMusicCat = (cat) => ["Music Albums", "Soundtracks", "Music Compilations", "Music", "audio"].includes(cat || "");
    const baseItems = ALL_DATA.filter(i => {
      const isMusic = isMusicCat(i.category);
      if (isMusic && (SCAN_TYPE === "Subtitle Scan" || SCAN_TYPE === "Stream Audit Scan" || SCAN_TYPE === "Video Metadata Scan" || SCAN_TYPE === "Quality Audit")) return false;
      if (!isMusic && SCAN_TYPE === "Music Metadata Scan") return false;
      if (i.category === "Corrupted" && SCAN_TYPE !== "Corrupted Audit") return false;
      if (i.category === "Static" && SCAN_TYPE !== "Discovery Scan") return false;
      return true;
    });

    const targetItems = showAllMetricsMode 
      ? baseItems 
      : baseItems.filter(i => SCAN_TYPE === "Duplication Scan" || (i.category || "Other") === activeCategory);

    const total = targetItems.length;
    let html = '';

    if (SCAN_TYPE === "Duplication Scan") {
      const filteredItems = targetItems.filter(i => {
        if (activeDupFilter === "All") return true;
        const isMusic = isMusicCat(i.category);
        if (activeDupFilter === "Music") return isMusic;
        if (activeDupFilter === "Video") return !isMusic;
        return true;
      });

      const totalPairs = filteredItems.length;
      let videoPairs = 0;
      let musicPairs = 0;
      let totalSavedGB = 0;

      filteredItems.forEach(i => {
        const cat = i.category || '';
        const isMusic = ["Music", "Music Albums", "Soundtracks", "Music Compilations"].includes(cat);
        if (isMusic) {
          musicPairs++;
        } else {
          videoPairs++;
        }
        totalSavedGB += i.dupSizeGB || 0;
      });

      function formatSize(gb) {
        if (!gb) return '0 Bytes';
        if (gb < 1) {
          return (gb * 1024).toFixed(1) + ' MB';
        }
        return gb.toFixed(2) + ' GB';
      }

      html = [
        '<div class="glass-panel p-4 rounded-xl transition-all duration-300 ' + (activeDupFilter === "All" ? "border-indigo-500/40 bg-indigo-950/20 shadow-md shadow-indigo-500/5" : "") + '"><div class="text-3xl font-bold text-slate-100">'+totalPairs+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Duplicates</div></div>',
        '<div class="glass-panel p-4 rounded-xl transition-all duration-300 ' + (activeDupFilter === "Video" ? "border-blue-500/40 bg-blue-950/20 shadow-md shadow-blue-500/5" : "") + '"><div class="text-3xl font-bold text-slate-100">'+videoPairs+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Video Duplicates</div></div>',
        '<div class="glass-panel p-4 rounded-xl transition-all duration-300 ' + (activeDupFilter === "Music" ? "border-emerald-500/40 bg-emerald-950/20 shadow-md shadow-emerald-500/5" : "") + '"><div class="text-3xl font-bold text-slate-100">'+musicPairs+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Audio Duplicates</div></div>',
        '<div class="glass-panel p-4 rounded-xl border-emerald-900/50"><div class="text-3xl font-bold text-emerald-400">'+formatSize(totalSavedGB)+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Potential Space Savings</div></div>'
      ].join('');

    } else if (SCAN_TYPE === "Corrupted Audit") {
      let readErrors = 0;
      let zeroByte = 0;
      let severeHeader = 0;

      targetItems.forEach(i => {
        const desc = (i["Corruption Type"] || "").toLowerCase();
        if (desc.includes("read error") || desc.includes("io error")) {
          readErrors++;
        } else if (desc.includes("0-byte") || desc.includes("empty")) {
          zeroByte++;
        } else {
          severeHeader++;
        }
      });

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Corrupted Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-red-400"><div class="text-3xl font-bold">'+readErrors+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Read/I-O Errors</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-amber-400"><div class="text-3xl font-bold">'+zeroByte+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">0-Byte Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-yellow-500"><div class="text-3xl font-bold">'+severeHeader+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">Header Errors</div></div>'
      ].join('');

    } else if (SCAN_TYPE === "Stream Audit Scan") {
      let legacyAndModern = 0;
      let modernOnly = 0;
      let bleedingEdge = 0;
      let transcodeReq = 0;

      targetItems.forEach(i => {
        const audit = i["Stream Audit"] || "";
        if (audit === "Legacy+") {
          legacyAndModern++;
        } else if (audit === "Modern+") {
          modernOnly++;
        } else if (audit === "Bleeding Edge") {
          bleedingEdge++;
        } else {
          transcodeReq++;
        }
      });

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-emerald-400"><div class="text-3xl font-bold">'+legacyAndModern+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Legacy+ Stream Ready</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-cyan-400"><div class="text-3xl font-bold">'+modernOnly+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Modern+ Stream Ready</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-fuchsia-400"><div class="text-3xl font-bold">'+bleedingEdge+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Bleeding Edge</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-rose-400"><div class="text-3xl font-bold">'+transcodeReq+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Transcodes Required</div></div>'
      ].join('');

    } else if (SCAN_TYPE === "Subtitle Scan") {
      let embeddedCount = 0;
      let noneCount = 0;

      targetItems.forEach(i => {
        const sub = i["Subtitles"] || "None";
        if (sub && sub !== "None") {
          embeddedCount++;
        } else {
          noneCount++;
        }
      });

      const coverage = total > 0 ? Math.round((embeddedCount / total) * 100) : 0;

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-emerald-400"><div class="text-3xl font-bold">'+embeddedCount+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">With Subtitles</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-amber-400"><div class="text-3xl font-bold">'+noneCount+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Missing Subtitles</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-indigo-400"><div class="text-3xl font-bold">'+coverage+'%</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Subtitle Coverage</div></div>'
      ].join('');

    } else if (SCAN_TYPE === "Anomaly Scan") {
      let bloated = 0;
      let starved = 0;
      let totalAnom = 0;

      targetItems.forEach(i => {
        if (i["isBloated"]) {
          bloated++;
          totalAnom++;
        } else if (i["isStarved"]) {
          starved++;
          totalAnom++;
        } else if (i["isAnomaly"]) {
          totalAnom++;
        }
      });

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Items</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-red-400"><div class="text-3xl font-bold">'+totalAnom+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Warnings</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-amber-500"><div class="text-3xl font-bold">'+bloated+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Bloated Bitrates</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-blue-400"><div class="text-3xl font-bold">'+starved+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">Starved Bitrates</div></div>'
      ].join('');

    } else if (SCAN_TYPE === "Discovery Scan") {
      const containerCounts = {};
      const videoCounts = {};
      const audioCounts = {};
      const musicCounts = {};

      targetItems.forEach(i => {
        const cat = i.category || 'Other';
        const isMusic = isMusicCat(cat);

        const cont = i["Container"] || "";
        if (cont) {
          containerCounts[cont] = (containerCounts[cont] || 0) + 1;
        }

        if (!isMusic && cat !== 'Corrupted' && cat !== 'Static') {
          const vCodec = i["Video Codec"] || "";
          if (vCodec) {
            const vc = formatCodecString(vCodec).trim();
            videoCounts[vc] = (videoCounts[vc] || 0) + 1;
          }
        }

        if (cat !== 'Corrupted' && cat !== 'Static') {
          const aCodecs = i["Audio Codecs"] || "";
          if (aCodecs) {
            aCodecs.split(/\\s*\\|\\s*/).forEach(part => {
              const firstWord = part.trim().split(/[\\s(]/)[0]?.toString()?.toUpperCase();
              if (firstWord) {
                audioCounts[firstWord] = (audioCounts[firstWord] || 0) + 1;
              }
            });
          }
        }

        if (isMusic) {
          const mCodec = i["File Format/Codec"] || "";
          if (mCodec) {
            const mc = formatCodecString(mCodec).trim();
            musicCounts[mc] = (musicCounts[mc] || 0) + 1;
          }
        }
      });

      const distVideo = Object.keys(videoCounts).length;
      const distAudio = Object.keys(audioCounts).length;
      const distContainers = Object.keys(containerCounts).length;
      const distMusic = Object.keys(musicCounts).length;

      container.className = "grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 text-center";

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-indigo-400"><div class="text-3xl font-bold">'+distVideo+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Video Codecs</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-emerald-400"><div class="text-3xl font-bold">'+distAudio+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Audio Codecs</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-amber-400"><div class="text-3xl font-bold">'+distContainers+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Containers</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-pink-400"><div class="text-3xl font-bold">'+distMusic+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">Music Codecs</div></div>'
      ].join('');

    } else {
      let missingCount = 0;
      let completeCount = 0;

      targetItems.forEach(i => {
        const missing = i["Missing Metadata"];
        if (missing && missing !== "None") {
          missingCount++;
        } else {
          completeCount++;
        }
      });

      const coverage = total > 0 ? Math.round((completeCount / total) * 100) : 0;

      html = [
        '<div class="glass-panel p-4 rounded-xl"><div class="text-3xl font-bold text-slate-100">'+total+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Files</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-emerald-400"><div class="text-3xl font-bold">'+completeCount+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">Fully Tagged</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-rose-400"><div class="text-3xl font-bold">'+missingCount+'</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">Missing Tags</div></div>',
        '<div class="glass-panel p-4 rounded-xl text-indigo-400"><div class="text-3xl font-bold">'+coverage+'%</div><div class="text-xs text-slate-400 uppercase tracking-wider mt-1">Tag Coverage</div></div>'
      ].join('');
    }

    container.innerHTML = html;
    renderCodecDistribution(targetItems);
  }

  const isMusicCat = (cat) => ["Music Albums", "Soundtracks", "Music Compilations", "Music", "audio"].includes(cat || "");

  function renderCodecDistribution(targetItems) {
    const codecContainer = document.getElementById('codec-metrics-container');
    if (!codecContainer) return;

    if (!showAllMetricsMode && SCAN_TYPE !== "Discovery Scan") {
      codecContainer.classList.add('hidden');
      return;
    }

    codecContainer.classList.remove('hidden');

    const videoCounts = {};
    const audioCounts = {};
    const musicCounts = {};

    targetItems.forEach(i => {
      const cat = i.category || 'Other';
      const isMusic = isMusicCat(cat);

      if (!isMusic && cat !== 'Corrupted' && cat !== 'Static') {
        const vCodec = i["Video Codec"] || "";
        if (vCodec) {
          const vc = formatCodecString(vCodec).trim();
          videoCounts[vc] = (videoCounts[vc] || 0) + 1;
        }
      }

      if (cat !== 'Corrupted' && cat !== 'Static') {
        const aCodecs = i["Audio Codecs"] || "";
        if (aCodecs) {
          aCodecs.split(/\\s*\\|\\s*/).forEach(part => {
            const firstWord = part.trim().split(/[\\s(]/)[0]?.toString()?.toUpperCase();
            if (firstWord) {
              audioCounts[firstWord] = (audioCounts[firstWord] || 0) + 1;
            }
          });
        }
      }

      if (isMusic) {
        const mCodec = i["File Format/Codec"] || "";
        if (mCodec) {
          const mc = formatCodecString(mCodec).trim();
          musicCounts[mc] = (musicCounts[mc] || 0) + 1;
        }
      }
    });

    const getSortedArray = (countsObj) => {
      return Object.keys(countsObj)
        .map(key => ({ name: key, count: countsObj[key] }))
        .sort((a, b) => b.count - a.count);
    };

    const sortedVideo = getSortedArray(videoCounts);
    const sortedAudio = getSortedArray(audioCounts);
    const sortedMusic = getSortedArray(musicCounts);

    const renderCard = (title, itemsList, badgeColorClass) => {
      let itemsHtml = '';
      if (itemsList.length === 0) {
        itemsHtml = '<div class="text-sm text-slate-500 py-6 italic text-center">No assets found</div>';
      } else {
        itemsHtml = '<div class="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">';
        itemsList.forEach(item => {
          itemsHtml += '<div class="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0">' +
            '<span class="font-mono text-xs text-slate-200 font-medium">' + item.name + '</span>' +
            '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full ' + badgeColorClass + '">' + item.count + '</span>' +
          '</div>';
        });
        itemsHtml += '</div>';
      }

      return '<div class="glass-panel p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 flex flex-col h-[270px]">' +
        '<div class="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">' +
          '<div class="w-2 h-2 rounded-full ' + badgeColorClass.split(' ')[0] + '"></div>' +
          '<h3 class="text-xs font-semibold tracking-wider uppercase text-slate-300 font-sans">' + title + ' Distribution</h3>' +
        '</div>' +
        '<div class="flex-1 flex flex-col justify-between overflow-hidden">' +
          itemsHtml +
          '<div class="text-[9px] text-slate-500 font-mono text-right mt-1.5">' +
            'Distinct: ' + itemsList.length +
          '</div>' +
        '</div>' +
      '</div>';
    };

    codecContainer.innerHTML = [
      renderCard('Video Codecs', sortedVideo, 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'),
      renderCard('Audio Codecs', sortedAudio, 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'),
      renderCard('Music Codecs', sortedMusic, 'bg-pink-500/10 text-pink-400 border border-pink-500/20')
    ].join('');
  }

  function renderFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    if (SCAN_TYPE === "Duplication Scan") {
      const filters = [
        { id: "All", label: "All Duplicates", activeClass: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30", normalClass: "bg-slate-800 text-slate-300 hover:bg-slate-700" },
        { id: "Video", label: "Video Only", activeClass: "bg-blue-600 text-white shadow-lg shadow-blue-500/30", normalClass: "bg-slate-800 text-slate-300 hover:bg-slate-700" },
        { id: "Music", label: "Audio Only", activeClass: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30", normalClass: "bg-slate-800 text-slate-300 hover:bg-slate-700" }
      ];
      container.innerHTML = filters.map(f => {
        const isAct = activeDupFilter === f.id;
        const cls = isAct ? f.activeClass : f.normalClass;
        return '<button onclick="setDupFilter(&quot;'+f.id+'&quot;)" class="px-4 py-1.5 rounded-full text-sm font-medium transition-all '+cls+'">'+f.label+'</button>';
      }).join('');
      return;
    }
    container.innerHTML = orderedCats.map(c => {
      const isAct = activeCategory === c;
      const cls = isAct ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';
      return '<button onclick="setCategory(&quot;'+c.replace(/"/g, '&quot;')+'&quot;)" class="px-4 py-1.5 rounded-full text-sm font-medium transition-all '+cls+'">'+c+'</button>';
    }).join('');
  }

  window.setCategory = function(cat) {
    if (showAllMetricsMode) {
      window.toggleAllMetrics();
    }
    activeCategory = cat;
    currentPage = 1;
    
    applyCategoryColumns(cat);
    
    renderFilters();
    renderColumnToggles();
    renderMetrics();
    renderTable();
  };

  window.setDupFilter = function(filter) {
    if (showAllMetricsMode) {
      window.toggleAllMetrics();
    }
    activeDupFilter = filter;
    currentPage = 1;
    renderFilters();
    renderMetrics();
    renderTable();
  };

  function renderColumnToggles() {
    const container = document.getElementById('column-toggles');
    if (!container) return;
    container.innerHTML = ALL_POSSIBLE_HEADERS.map(col => {
      const chk = visibleColumns[col] !== false ? 'checked' : '';
      return '<label class="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer text-sm text-slate-200">' +
        '<input type="checkbox" '+chk+' onchange="toggleColumn(&quot;'+col.replace(/"/g, '&quot;')+'&quot;, this.checked)" class="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800">' +
        (col === 'Duplicate Path' ? 'Path' : col) + '</label>';
    }).join('');
  }

  window.toggleColumn = function(col, isVisible) {
    visibleColumns[col] = isVisible;
    renderTable();
  };

  window.setSort = function(col) {
    if (sortCol === col) {
      sortDesc = !sortDesc;
    } else {
      sortCol = col;
      sortDesc = false;
    }
    renderTable();
  };

  let startX, startWidth, resizingCol;

  function initResizing() {
    const ths = document.querySelectorAll('#table-head th');
    ths.forEach(th => {
      if (th.querySelector('.col-resizer')) return;
      
      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      th.appendChild(resizer);

      resizer.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      resizer.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
        resizingCol = th;
        startX = e.pageX;
        startWidth = th.offsetWidth;
        resizer.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });
    });
  }

  function handleMouseMove(e) {
    if (resizingCol) {
      const diff = e.pageX - startX;
      const nextWidth = Math.max(40, startWidth + diff);
      resizingCol.style.width = nextWidth + 'px';
      resizingCol.style.minWidth = nextWidth + 'px';
      
      const colName = resizingCol.getAttribute('data-col');
      if (colName) {
        colWidths[colName] = nextWidth;
      }
    }
  }

  function handleMouseUp(e) {
    if (resizingCol) {
      const resizer = resizingCol.querySelector('.col-resizer');
      if (resizer) resizer.classList.remove('resizing');
      
      // prevent the click from bubbling if it occurs during mouse up on the document
      if (e.target === resizer || resizer.contains(e.target)) {
        e.stopPropagation();
      }
    }
    resizingCol = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function renderTable() {
    let filtered = SCAN_TYPE === "Duplication Scan" 
      ? items.filter(i => {
          if (activeDupFilter === "All") return true;
          const isMusic = isMusicCat(i.category);
          if (activeDupFilter === "Music") return isMusic;
          if (activeDupFilter === "Video") return !isMusic;
          return true;
        })
      : items.filter(i => (i.category || "Other") === activeCategory);

    filtered.sort((a, b) => {
      let valA = a[sortCol] !== undefined && a[sortCol] !== null ? a[sortCol] : "";
      let valB = b[sortCol] !== undefined && b[sortCol] !== null ? b[sortCol] : "";
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA.toString().match(/^[0-9.]+$/)) {
        valA = numA;
        valB = numB;
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    let baseHeaders = SCAN_TYPE === "Duplication Scan" ? ALL_POSSIBLE_HEADERS : getColsForCat(activeCategory);
    const activeHeaders = ALL_POSSIBLE_HEADERS.filter(h => visibleColumns[h] !== false).sort((a,b) => {
      let ia = baseHeaders.indexOf(a);
      let ib = baseHeaders.indexOf(b);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      return ia - ib;
    });

    document.getElementById('table-head').innerHTML = '<tr>' + 
      activeHeaders.map(h => {
        let sc = sortCol === h ? (sortDesc ? 'sort-desc text-indigo-400' : 'sort-asc text-indigo-400') : '';
        const displayLabel = h === 'Duplicate Path' ? 'Path' : h;
        const widthStyle = colWidths[h] ? 'style="width: ' + colWidths[h] + 'px; min-width: ' + colWidths[h] + 'px;"' : '';
        
        let thClass = 'px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b text-center align-top select-none relative ' + sc;
        const factualCols = ["Cleaned Title", "File Name", "File Path", "Path", "File", "Duplicate File", "Duplicate Path", "Flag Reason"];
        
        if (isMetadata && !factualCols.includes(h)) {
          // Metadata column header: colored differently (Deep indigo background and indigo text)
          thClass += ' bg-indigo-950/70 text-indigo-200 border-indigo-900/60 font-bold';
        } else {
          // Factual column header
          thClass += ' bg-slate-900/60 text-slate-400 border-slate-700';
        }

        return '<th onclick="setSort(&quot;'+h.replace(/"/g, '&quot;')+'&quot;)" data-col="'+h.replace(/"/g, '&quot;')+'" '+widthStyle+' class="'+thClass+'">'+displayLabel+'</th>';
      }).join('') + '</tr>';

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIdx = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);

    document.getElementById('table-body').innerHTML = paginated.map(row => {
      let trClass = "hover:bg-slate-800/50 transition-colors";
      return '<tr class="' + trClass + '">' +
        activeHeaders.map(h => {
          let val = row[h] !== undefined && row[h] !== null ? String(row[h]) : "";
          val = val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          let tdClass = "px-4 py-3 text-slate-300 text-left align-top truncate max-w-xs";
          if (SCAN_TYPE === "Subtitle Scan" && h === "Alert Level") {
             if (row["Alert Level"] === "Critical") tdClass += " bg-red-900/30 font-semibold text-red-200 text-center";
             else if (row["Alert Level"] === "Warning") tdClass += " bg-yellow-900/30 font-semibold text-yellow-200 text-center";
             else tdClass += " text-center";
          } else if (isMetadata && val === "[MISSING]") {
             tdClass += " bg-rose-950/40 text-rose-300 font-semibold text-center";
          }
          return '<td class="'+tdClass+'" title="'+val+'">'+val+'</td>';
        }).join('') + '</tr>';
    }).join('');

    const endIdx = Math.min(startIdx + pageSize, filtered.length);
    const pagInfoText = 'Showing ' + (filtered.length > 0 ? startIdx + 1 : 0) + ' to ' + endIdx + ' of ' + filtered.length + ' entries';
    
    document.getElementById('pagination-info-bottom').innerText = pagInfoText;
    document.getElementById('pagination-info-top').innerText = pagInfoText;

    let pageHtml = '<button onclick="setPage('+(currentPage - 1)+')" '+(currentPage === 1 ? 'disabled' : '')+' class="px-3 py-1 bg-slate-800 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors text-slate-300 text-sm">Prev</button>' +
      '<span class="px-3 py-1 text-slate-400 text-sm">Page '+currentPage+' of '+totalPages+'</span>' +
      '<button onclick="setPage('+(currentPage + 1)+')" '+(currentPage === totalPages || totalPages === 0 ? 'disabled' : '')+' class="px-3 py-1 bg-slate-800 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors text-slate-300 text-sm">Next</button>';
      
    document.getElementById('pagination-buttons-bottom').innerHTML = pageHtml;
    document.getElementById('pagination-buttons-top').innerHTML = pageHtml;

    initResizing();
  }

  window.setPage = function(p) {
    currentPage = p;
    renderTable();
  };

  document.getElementById('page-size').addEventListener('change', function(e) {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });

  initCategories();
  renderMetrics();
  renderFilters();
  renderColumnToggles();
  renderTable();
</script>
</body>
</html>`;

  const finalHtml = htmlTemplate
    .replace('__DATA__', () => '[]')
    .replace('__ALL_DATA__', () => JSON.stringify(allOptimizedItems).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'))
    .replace('__COLUMNS__', () => JSON.stringify(finalColumns).replace(/</g, '\\u003c'))
    .replace('__HEADERS__', () => JSON.stringify(allPossibleHeaders).replace(/</g, '\\u003c'))
    .replace('__SCAN_TYPE__', () => scanType)
    .replace(/__REPORT_TITLE__/g, () => getReportTitle(scanType));

  const filename = `${getReportFileName(rules, items)}.html`;
  return await triggerClientDownload(filename, finalHtml, "text/html;charset=utf-8;", targetDir);
}
