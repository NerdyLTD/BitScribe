import { isMusicCategory, sortCategories } from "../types";
import { MediaItem, RuleCriteria } from "../types";
import {
  evaluatePlexCompatibility,
  computeDuplicatesMap,
} from "./plexEvaluator";
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
) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  await downloadOrSaveFile(fileName, blob);
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  if (scanType === "Discovery Scan") return "Media Library Discovery Report";
  if (scanType === "Stream Audit Scan")
    return "Streaming Compatibility Audit Report";
  if (scanType === "Corrupted Audit")
    return "Corrupted & Failed Files Audit Report";
  if (scanType === "Metadata Scan") return "Metadata Audit Report";
  if (scanType === "Video Metadata Scan") return "Video Metadata Audit Report";
  if (scanType === "Music Metadata Scan") return "Music Metadata Audit Report";
  if (scanType === "Subtitle Scan") return "Subtitle Audit Report";
  if (scanType === "Anomaly Scan") return "Quality Audit Report";
  if (scanType === "Duplication Scan") return "Media Duplication Audit Report";
  return "Media Library Report";
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
) {
  const getCompatibilityLabel = (level: string) => {
    if (level === "modern") return "Modern OK";
    if (level === "legacy") return "Legacy & Modern OK";
    return "Transcode Required";
  };

  const allPossibleHeaders = [
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    "Series Title",
    "Season/Episode",
    "Episode Title",
    "Title",
    "Release Year",
    "Title",
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

  const headers = allPossibleHeaders.filter((col) => columns[col] !== false);

  const rows = items.map((item) => {
    const evalResult = evaluatePlexCompatibility(item, rules);
    const parsedMeta = parseVideoMetadata(item);

    const audioStr = item.audioTracks
      .map(
        (t) =>
          `${t.codec.toUpperCase()} (${t.channels}ch${t.language ? `-${t.language}` : ""})`,
      )
      .join(" | ");
    const subStr =
      (item.subtitleTracks || []).length > 0
        ? (item.subtitleTracks || [])
            .map(
              (s) =>
                `${s.codec.toUpperCase()}${s.language ? ` [${s.language}]` : ""}`,
            )
            .join(", ")
        : "None";

    const missing = getMissingMetadataTags(item);
    const missingTagsValue = missing.length > 0 ? missing.join(", ") : "None";
    const data: Record<string, any> = {
      "Missing Metadata": missingTagsValue,
      "Stream Audit": isMusicCategory(item.category)
        ? ""
        : getCompatibilityLabel(evalResult.level),
      "File Name": item.filename,
      Container: ((item.container || "").toLowerCase().includes("matroska")
        ? "mkv"
        : item.filename.split(".").pop() || item.container || ""
      ).toUpperCase(),
      "Video Codec": isMusicCategory(item.category)
        ? ""
        : (item.videoCodec || "").toUpperCase(),
      Resolution: isMusicCategory(item.category)
        ? ""
        : formatResolutionForExcel(item.videoResolution),
      "Audio Tracks": (item.audioTracks || []).length,
      "Audio Codecs": audioStr,
      Subtitles: subStr,
      "Series Title":
        item.category === "TV Shows" || item.category === "Docuseries"
          ? parsedMeta.title
          : "",
      "Season/Episode":
        item.category === "TV Shows" || item.category === "Docuseries"
          ? parsedMeta.season
          : "",
      "Episode Title":
        item.category === "TV Shows" || item.category === "Docuseries"
          ? parsedMeta.epTitle
          : "",
      Title:
        ["Movies", "Movie", "Documentaries"].includes(item.category) ||
        ![
          "TV Shows",
          "TV",
          "Docuseries",
          "Anime",
          "Shorts",
          "Music",
          "Corrupted",
          "Static",
          "Concerts",
          "Education",
        ].includes(item.category)
          ? (item.category === "Extras" ? (((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle || parsedMeta.title)) : parsedMeta.title)
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
        ? (item.audioTracks || [])[0]?.codec?.toUpperCase() ||
          (
            item.container ||
            item.filename.split(".").pop() ||
            "UNKNOWN"
          ).toUpperCase()
        : "",
      Bitrate: isMusicCategory(item.category)
        ? `${item.audioBitrate || 0} kbps`
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

    return headers
      .map((h) => {
        let val = String(data[h] ?? "");
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename = `${getReportFileName(rules, items)}.csv`;
  await triggerClientDownload(filename, csvContent, "text/csv;charset=utf-8;");
}

export async function exportMediaLibraryToJSON(
  items: MediaItem[],
  rules: RuleCriteria,
) {
  const reports = items.map((item) => {
    return {
      ...item,
      parsedMetadata: parseVideoMetadata(item),
      evaluation: evaluatePlexCompatibility(item, rules),
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
  );
}

export async function exportMediaLibraryToHTML(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
) {
  const scanType = getScanType(rules, items);

  const getCompatibilityLabel = (level: string) => {
    if (level === "modern") return "Modern OK";
    if (level === "legacy") return "Legacy & Modern OK";
    return "Transcode Required";
  };

  const duplicatesMap = computeDuplicatesMap(items, rules);

  const isCorrupted = scanType === "Corrupted Files Scan";
  const isDuplication = scanType === "Duplication Scan";
  const isMetadata = scanType === "Metadata Audit";
  const isQuality = scanType === "Quality Audit";
  const isDiscovery = scanType === "Media Discovery" || scanType === "Modern Direct Play" || rules.useDiscoveryPreset;

  const allPossibleHeaders = [
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    "Series Title",
    "Season/Episode",
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

  const optimizedItems = items.map(item => {
    const isDup = duplicatesMap.get(item.id) ?? false;
    const evalResult = evaluatePlexCompatibility(item, rules, isDup);
    const parsedMeta = parseVideoMetadata(item);

    const audioStr = (item.audioTracks || [])
      .map((t) => `${(t.codec||'').toUpperCase()} (${t.channels}ch${t.language ? "-" + t.language : ""})`)
      .join(" | ");
    const subStr = (item.subtitleTracks || []).length > 0
      ? (item.subtitleTracks || [])
          .map((s) => `${(s.codec||'').toUpperCase()}${s.language ? " [" + s.language + "]" : ""}`)
          .join(", ")
      : "None";

    const missing = getMissingMetadataTags(item);
    
    const rowData: Record<string, string | number> = {};
    
    rowData["id"] = item.id;
    rowData["category"] = item.category || "Unknown";
    rowData["topLevelFolder"] = item.topLevelFolder || "";
    
    rowData["Missing Metadata"] = missing.length > 0 ? missing.join(", ") : "None";
    rowData["Stream Audit"] = isMusicCategory(item.category) ? "" : getCompatibilityLabel(evalResult.level);
    rowData["File Name"] = item.filename;
    rowData["Container"] = ((item.container || "").toLowerCase().includes("matroska") ? "mkv" : item.filename.split(".").pop() || item.container || "").toUpperCase();
    rowData["Video Codec"] = isMusicCategory(item.category) ? "" : (item.videoCodec || "").toUpperCase();
    rowData["Resolution"] = isMusicCategory(item.category) ? "" : formatResolutionForExcel(item.videoResolution);
    rowData["Audio Tracks"] = (item.audioTracks || []).length;
    rowData["Audio Codecs"] = audioStr;
    rowData["Subtitles"] = subStr;
    rowData["Series Title"] = item.category === "TV Shows" || item.category === "Docuseries" ? parsedMeta.title : "";
    rowData["Season/Episode"] = item.category === "TV Shows" || item.category === "Docuseries" ? parsedMeta.season : "";
    rowData["Episode Title"] = item.category === "TV Shows" || item.category === "Docuseries" ? parsedMeta.epTitle : "";
    rowData["Title"] = ["Movies", "Movie", "Documentaries"].includes(item.category) ||
      !["TV Shows", "TV", "Docuseries", "Anime", "Shorts", "Music", "Corrupted", "Static", "Concerts", "Education"].includes(item.category)
      ? item.category === "Extras"
        ? ((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle || parsedMeta.title)
        : parsedMeta.title
      : "";
    rowData["Release Year"] = !["Music", "Corrupted", "Static"].includes(item.category) ? parsedMeta.year : "";
    rowData["Artist"] = isMusicCategory(item.category) ? getDisplayArtist(item, rules) : "";
    rowData["Album Title"] = isMusicCategory(item.category) ? getDisplayAlbum(item, rules) : "";
    rowData["Song Title"] = isMusicCategory(item.category) ? getDisplaySongTitle(item, rules) : "";
    rowData["File Format/Codec"] = isMusicCategory(item.category)
      ? (item.audioTracks || [])[0]?.codec?.toUpperCase() || (item.container || item.filename.split(".").pop() || "UNKNOWN").toUpperCase()
      : "";
    rowData["Bitrate"] = isMusicCategory(item.category) ? `${item.audioBitrate || 0} kbps` : "";
    rowData["Corruption Type"] = item.category === "Corrupted" ? item.tags?.artist || "Read error / 0-byte file" : "";
    rowData["Recommendation"] = item.category === "Corrupted" ? "Replace file" : "";
    rowData["Analysis Notes"] = isMusicCategory(item.category) || item.category === "Corrupted"
      ? ""
      : evalResult.level === "modern"
        ? "Direct Play on newer HW"
        : evalResult.level === "legacy"
          ? "Direct Play on most HW"
          : "Will transcode";
    rowData["Remediation Action"] = isMusicCategory(item.category) || item.category === "Corrupted"
      ? ""
      : evalResult.level !== "unfriendly"
        ? ""
        : evalResult.suggestion;
    rowData["File Path"] = item.filePath;
    
    return rowData;
  });

  const htmlTemplate = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>BitScribe - __REPORT_TITLE__</title>\n<script src=\"https://cdn.tailwindcss.com\"></script>\n<style>\n  body { background-color: #0B0F19; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }\n  .gradient-text { background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n  .glass-panel { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.05); }\n  th { position: sticky; top: 0; background: #0f172a; z-index: 10; cursor: pointer; user-select: none; }\n  th:hover { background: #1e293b; }\n  ::-webkit-scrollbar { width: 8px; height: 8px; }\n  ::-webkit-scrollbar-track { background: #0B0F19; }\n  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }\n  ::-webkit-scrollbar-thumb:hover { background: #475569; }\n  .sort-asc::after { content: \" \\25B2\"; font-size: 0.8em; }\n  .sort-desc::after { content: \" \\25BC\"; font-size: 0.8em; }\n</style>\n</head>\n<body class=\"min-h-screen p-4 md:p-8\">\n\n<div class=\"max-w-[1600px] mx-auto\">\n  <header class=\"flex flex-col items-center justify-center mb-8\">\n    <div class=\"flex flex-col items-center select-none\">\n      <div class=\"flex items-center gap-1\">\n        <svg class=\"w-14 h-14 flex-shrink-0 relative group -mt-1\" viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <defs>\n            <linearGradient id=\"headerQuillGrad\" x1=\"0%\" y1=\"100%\" x2=\"100%\" y2=\"0%\">\n              <stop offset=\"0%\" stopColor=\"#A78BFA\" />\n              <stop offset=\"50%\" stopColor=\"#8B5CF6\" />\n              <stop offset=\"100%\" stopColor=\"#3B82F6\" />\n            </linearGradient>\n            <filter id=\"waveGlow\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">\n              <feGaussianBlur stdDeviation=\"1.0\" result=\"blur\" />\n              <feComposite in=\"SourceGraphic\" in2=\"blur\" operator=\"over\" />\n            </filter>\n          </defs>\n          <path d=\"M 5,59 Q 15,61.8 25,54 T 41,45 T 55,41\" stroke=\"url(#headerQuillGrad)\" stroke-width=\"1.2\" stroke-dasharray=\"1.5 2.5\" fill=\"none\" opacity=\"0.3\" />\n          <path d=\"M 5,59 C 10,61.8 15,61.8 21.5,57.5\" stroke=\"#A78BFA\" stroke-width=\"1.6\" fill=\"none\" opacity=\"0.85\" />\n          <path d=\"M 5,59 C 10,61.8 15,61.8 21.5,57.5\" stroke=\"#0F111A\" stroke-width=\"0.8\" fill=\"none\" />\n          <path d=\"M 5,59 C 10,61.8 15,61.8 21.5,57.5\" stroke=\"#C084FC\" stroke-width=\"1.6\" stroke-dasharray=\"0.6 1.0\" fill=\"none\" opacity=\"0.75\" />\n          <circle cx=\"25\" cy=\"54\" r=\"6.5\" fill=\"black\" opacity=\"0.3\" />\n          <circle cx=\"25\" cy=\"54\" r=\"6.5\" stroke=\"#8B5CF6\" stroke-width=\"1.3\" fill=\"#0F111A\" />\n          <circle cx=\"25\" cy=\"54\" r=\"5.5\" stroke=\"#A78BFA\" stroke-width=\"0.5\" fill=\"none\" opacity=\"0.45\" />\n          <circle cx=\"25\" cy=\"54\" r=\"4.6\" fill=\"#151329\" />\n          <circle cx=\"25\" cy=\"54\" r=\"4.6\" stroke=\"#4C1D95\" stroke-width=\"0.8\" stroke-dasharray=\"0.8 0.6\" fill=\"none\" opacity=\"0.85\" />\n          <circle cx=\"27.7\" cy=\"54.0\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"26.35\" cy=\"51.65\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"23.65\" cy=\"51.65\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"22.3\" cy=\"54.0\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"23.65\" cy=\"56.35\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"26.35\" cy=\"56.35\" r=\"1.4\" fill=\"#0B0D14\" stroke=\"#8B5CF6\" stroke-width=\"0.4\" />\n          <circle cx=\"25\" cy=\"54\" r=\"1.2\" fill=\"#C084FC\" />\n          <circle cx=\"25\" cy=\"54\" r=\"0.5\" fill=\"#0F111A\" />\n          <rect x=\"33.5\" y=\"44\" width=\"9\" height=\"7\" rx=\"1.5\" stroke=\"#3B82F6\" stroke-width=\"1.1\" fill=\"#111827\" />\n          <path d=\"M 36.5,44 L 35,41\" stroke=\"#3B82F6\" stroke-width=\"0.8\" stroke-linecap=\"round\" />\n          <path d=\"M 39.5,44 L 41,41\" stroke=\"#3B82F6\" stroke-width=\"0.8\" stroke-linecap=\"round\" />\n          <rect x=\"34.5\" y=\"45.5\" width=\"5.2\" height=\"4\" rx=\"0.6\" stroke=\"#60A5FA\" stroke-width=\"0.4\" fill=\"none\" opacity=\"0.35\" />\n          <circle cx=\"41\" cy=\"46\" r=\"0.4\" fill=\"#3B82F6\" />\n          <circle cx=\"41\" cy=\"47.5\" r=\"0.4\" fill=\"#3B82F6\" />\n          <circle cx=\"48.5\" cy=\"41\" r=\"1.3\" fill=\"#06B6D4\" />\n          <circle cx=\"52.5\" cy=\"39.5\" r=\"1.3\" fill=\"#06B6D4\" />\n          <path d=\"M 49.8,41 L 49.8,33\" stroke=\"#06B6D4\" stroke-width=\"0.9\" stroke-linecap=\"round\" />\n          <path d=\"M 53.8,39.5 L 53.8,31.5\" stroke=\"#06B6D4\" stroke-width=\"0.9\" stroke-linecap=\"round\" />\n          <path d=\"M 49.8,33.8 L 53.8,32.3\" stroke=\"#06B6D4\" stroke-width=\"1.8\" stroke-linecap=\"round\" />\n          <path d=\"M 49.8,36 L 53.8,34.5\" stroke=\"#06B6D4\" stroke-width=\"1.0\" stroke-linecap=\"round\" opacity=\"0.7\" />\n          <path d=\"M 8,56 L 22,42\" stroke=\"url(#headerQuillGrad)\" stroke-width=\"2.8\" stroke-linecap=\"round\" />\n          <path d=\"M 9,55 L 21,43\" stroke=\"#FFFFFF\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.4\" />\n          <path d=\"M 8,56 L 5,59\" stroke=\"#E2E8F0\" stroke-width=\"2.2\" stroke-linecap=\"round\" />\n          <line x1=\"5\" y1=\"59\" x2=\"7\" y2=\"57\" stroke=\"#10141D\" stroke-width=\"0.8\" />\n          <path d=\"M 20,44 C 10,34 16,16 42,12 C 46,11 48,15 44,22 C 37,33 29,41 20,44 Z\" fill=\"url(#headerQuillGrad)\" />\n          <path d=\"M 20,44 Q 30,29 42,12\" stroke=\"#FFFFFF\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\"0.6\" />\n          <path d=\"M 21,42 C 12,32 18,18 41,13\" stroke=\"#F3E8FF\" stroke-width=\"0.6\" fill=\"none\" opacity=\"0.35\" />\n          <path d=\"M 27,33 Q 19,28 17,32\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 31,28 Q 23,22 21,26\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 35,23 Q 27,17 25,21\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 38,18 Q 30,12 28,16\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 27,33 Q 33,36 35,33\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 31,28 Q 37,31 39,28\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 35,23 Q 41,26 43,23\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n          <path d=\"M 38,18 Q 44,21 46,18\" stroke=\"#10141D\" stroke-width=\"0.8\" opacity=\"0.35\" />\n        </svg>\n        <h1 class=\"text-3xl font-[950] tracking-[0.25em] bg-gradient-to-r from-indigo-300 via-white to-purple-300 gradient-text leading-none translate-x-[0.125em]\">\n          BitScribe\n        </h1>\n      </div>\n      <div class=\"w-full mt-1\">\n        <p class=\"text-[10px] font-bold text-[#8B5CF6] tracking-[0.25em] uppercase leading-none text-center pl-1\">\n          Digital Media Library Steward\n        </p>\n      </div>\n    </div>\n    <h2 class=\"mt-6 text-xl font-semibold text-slate-300 border-b border-slate-700 pb-2 px-8 text-center uppercase tracking-wider\">__REPORT_TITLE__</h2>\n  </header>\n\n  <div class=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center\" id=\"metrics-container\"></div>\n\n  <div class=\"flex flex-col lg:flex-row gap-4 mb-4 justify-between items-start lg:items-center\">\n    <div class=\"flex flex-wrap gap-2\" id=\"category-filters\"></div>\n\n    <div class=\"flex flex-col sm:flex-row gap-4 items-end sm:items-center\">\n      <div class=\"relative group\" tabindex=\"0\">\n        <button class=\"px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2\">\n          Columns\n          <svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"></path></svg>\n        </button>\n        <div class=\"absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-2 hidden group-focus-within:block z-50 max-h-96 overflow-y-auto\">\n          <div class=\"space-y-1\" id=\"column-toggles\"></div>\n        </div>\n      </div>\n\n      <div class=\"flex items-center gap-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg\">\n        <label for=\"page-size\">Show:</label>\n        <select id=\"page-size\" class=\"bg-transparent border-none text-slate-200 outline-none focus:ring-0 cursor-pointer\">\n          <option value=\"50\">50</option>\n          <option value=\"100\">100</option>\n          <option value=\"250\">250</option>\n          <option value=\"500\">500</option>\n        </select>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"glass-panel rounded-xl overflow-x-auto shadow-2xl\">\n    <table class=\"w-full text-left text-sm whitespace-nowrap\">\n      <thead id=\"table-head\"></thead>\n      <tbody id=\"table-body\" class=\"divide-y divide-slate-800/50\"></tbody>\n    </table>\n  </div>\n  \n  <div class=\"flex flex-col sm:flex-row justify-between items-center mt-4 gap-4\">\n    <div class=\"text-sm text-slate-400\" id=\"pagination-info\">Showing 0 to 0 of 0 entries</div>\n    <div class=\"flex gap-2\" id=\"pagination-controls\"></div>\n  </div>\n</div>\n\n<script>\n  const RAW_DATA = __DATA__;\n  const INITIAL_COLUMNS = __COLUMNS__;\n  const ALL_POSSIBLE_HEADERS = __HEADERS__;\n\n  let items = RAW_DATA;\n  let activeCategory = \"All\";\n  let sortCol = \"File Name\";\n  let sortDesc = false;\n  let currentPage = 1;\n  let pageSize = 50;\n  let visibleColumns = { ...INITIAL_COLUMNS };\n\n  function renderMetrics() {\n    const container = document.getElementById('metrics-container');\n    const total = items.length;\n    let corrupted = 0;\n    let missingMeta = 0;\n    let transcodeReq = 0;\n    \n    items.forEach(i => {\n      if (i.category === 'Corrupted') corrupted++;\n      if (i[\"Missing Metadata\"] && i[\"Missing Metadata\"] !== \"None\") missingMeta++;\n      if (i[\"Stream Audit\"] && i[\"Stream Audit\"] === \"Transcode Required\") transcodeReq++;\n    });\n\n    container.innerHTML = [\n      '<div class=\"glass-panel p-4 rounded-xl\"><div class=\"text-3xl font-bold text-slate-100\">'+total+'</div><div class=\"text-xs text-slate-400 uppercase tracking-wider mt-1\">Total Items</div></div>',\n      '<div class=\"glass-panel p-4 rounded-xl '+(corrupted>0?'border-red-900/50':'')+'\"><div class=\"text-3xl font-bold '+(corrupted>0?'text-red-400':'text-slate-100')+'\">'+corrupted+'</div><div class=\"text-xs text-slate-400 uppercase tracking-wider mt-1\">Corrupted Files</div></div>',\n      '<div class=\"glass-panel p-4 rounded-xl\"><div class=\"text-3xl font-bold text-slate-100\">'+transcodeReq+'</div><div class=\"text-xs text-slate-400 uppercase tracking-wider mt-1\">Transcodes</div></div>',\n      '<div class=\"glass-panel p-4 rounded-xl\"><div class=\"text-3xl font-bold text-slate-100\">'+missingMeta+'</div><div class=\"text-xs text-slate-400 uppercase tracking-wider mt-1\">Missing Metadata</div></div>'\n    ].join('');\n  }\n\n  function renderFilters() {\n    const container = document.getElementById('category-filters');\n    const cats = [\"All\"];\n    items.forEach(i => {\n      let c = i.topLevelFolder || i.category || \"Other\";\n      if (!cats.includes(c)) cats.push(c);\n    });\n\n    container.innerHTML = cats.map(c => {\n      const isAct = activeCategory === c;\n      const cls = isAct ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';\n      return '<button onclick=\"setCategory(\\''+c.replace(/'/g, \"\\'\")+'\\')\" class=\"px-4 py-1.5 rounded-full text-sm font-medium transition-all '+cls+'\">'+c+'</button>';\n    }).join('');\n  }\n\n  window.setCategory = function(cat) {\n    activeCategory = cat;\n    currentPage = 1;\n    renderFilters();\n    renderTable();\n  };\n\n  function renderColumnToggles() {\n    const container = document.getElementById('column-toggles');\n    container.innerHTML = ALL_POSSIBLE_HEADERS.map(col => {\n      const chk = visibleColumns[col] !== false ? 'checked' : '';\n      return '<label class=\"flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer text-sm text-slate-200\">' +\n        '<input type=\"checkbox\" '+chk+' onchange=\"toggleColumn(\\''+col.replace(/'/g, \"\\'\")+'\\', this.checked)\" class=\"rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800\">' +\n        col + '</label>';\n    }).join('');\n  }\n\n  window.toggleColumn = function(col, isVisible) {\n    visibleColumns[col] = isVisible;\n    renderTable();\n  };\n\n  window.setSort = function(col) {\n    if (sortCol === col) {\n      sortDesc = !sortDesc;\n    } else {\n      sortCol = col;\n      sortDesc = false;\n    }\n    renderTable();\n  };\n\n  function renderTable() {\n    let filtered = activeCategory === \"All\" \n      ? items \n      : items.filter(i => (i.topLevelFolder || i.category) === activeCategory || i.category === activeCategory);\n\n    filtered.sort((a, b) => {\n      let valA = a[sortCol] || \"\";\n      let valB = b[sortCol] || \"\";\n      if (typeof valA === 'string') valA = valA.toLowerCase();\n      if (typeof valB === 'string') valB = valB.toLowerCase();\n\n      const numA = parseFloat(valA);\n      const numB = parseFloat(valB);\n      if (!isNaN(numA) && !isNaN(numB) && valA.toString().match(/^[\\d.]+$/)) {\n        valA = numA;\n        valB = numB;\n      }\n\n      if (valA < valB) return sortDesc ? 1 : -1;\n      if (valA > valB) return sortDesc ? -1 : 1;\n      return 0;\n    });\n\n    const activeHeaders = ALL_POSSIBLE_HEADERS.filter(h => visibleColumns[h] !== false);\n\n    document.getElementById('table-head').innerHTML = '<tr>' + \n      activeHeaders.map(h => {\n        let sc = sortCol === h ? (sortDesc ? 'sort-desc text-indigo-400' : 'sort-asc text-indigo-400') : '';\n        return '<th onclick=\"setSort(\\''+h.replace(/'/g, \"\\'\")+'\\')\" class=\"px-4 py-3 text-xs font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-700 '+sc+'\">'+h+'</th>';\n      }).join('') + '</tr>';\n\n    const totalPages = Math.ceil(filtered.length / pageSize) || 1;\n    if (currentPage > totalPages) currentPage = totalPages;\n    \n    const startIdx = (currentPage - 1) * pageSize;\n    const paginated = filtered.slice(startIdx, startIdx + pageSize);\n\n    document.getElementById('table-body').innerHTML = paginated.map(row => {\n      return '<tr class=\"hover:bg-slate-800/50 transition-colors\">' +\n        activeHeaders.map(h => {\n          let val = row[h] !== undefined && row[h] !== null ? String(row[h]) : \"\";\n          val = val.replace(/&/g, \"&amp;\").replace(/</g, \"&lt;\").replace(/>/g, \"&gt;\");\n          return '<td class=\"px-4 py-3 text-slate-300\">'+val+'</td>';\n        }).join('') + '</tr>';\n    }).join('');\n\n    const endIdx = Math.min(startIdx + pageSize, filtered.length);\n    document.getElementById('pagination-info').innerText = 'Showing ' + (filtered.length > 0 ? startIdx + 1 : 0) + ' to ' + endIdx + ' of ' + filtered.length + ' entries';\n\n    let pageHtml = '<button onclick=\"setPage('+(currentPage - 1)+')\" '+(currentPage === 1 ? 'disabled' : '')+' class=\"px-3 py-1 bg-slate-800 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors text-slate-300 text-sm\">Prev</button>' +\n      '<span class=\"px-3 py-1 text-slate-400 text-sm\">Page '+currentPage+' of '+totalPages+'</span>' +\n      '<button onclick=\"setPage('+(currentPage + 1)+')\" '+(currentPage === totalPages || totalPages === 0 ? 'disabled' : '')+' class=\"px-3 py-1 bg-slate-800 rounded border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors text-slate-300 text-sm\">Next</button>';\n    document.getElementById('pagination-controls').innerHTML = pageHtml;\n  }\n\n  window.setPage = function(p) {\n    currentPage = p;\n    renderTable();\n  };\n\n  document.getElementById('page-size').addEventListener('change', function(e) {\n    pageSize = parseInt(e.target.value);\n    currentPage = 1;\n    renderTable();\n  });\n\n  renderMetrics();\n  renderFilters();\n  renderColumnToggles();\n  renderTable();\n</script>\n</body>\n</html>";

  const finalHtml = htmlTemplate
    .replace('__DATA__', JSON.stringify(optimizedItems))
    .replace('__COLUMNS__', JSON.stringify(columns))
    .replace('__HEADERS__', JSON.stringify(allPossibleHeaders))
    .replace('__REPORT_TITLE__', getReportTitle(scanType));

  const filename = `${getReportFileName(rules, items)}.html`;
  await triggerClientDownload(filename, finalHtml, "text/html;charset=utf-8;");
}
