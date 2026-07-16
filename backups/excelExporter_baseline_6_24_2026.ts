import { isMusicCategory, sortCategories } from "../types";
import ExcelJS from "exceljs";
import { downloadOrSaveFile } from "./downloader";
import { MediaItem, RuleCriteria } from "../types";
import {
  evaluatePlexCompatibility,
  computeDuplicatesMap,
} from "./plexEvaluator";
import {
  getDisplayArtist,
  getDisplayAlbum,
  getDisplaySongTitle,
} from "./musicHelper";
import { getScanType, getReportTitle } from "./reportExporter";
import {
  parseVideoMetadata,
  getExtrasGroupTitle,
  extractSeasonNumber,
} from "./mediaParser";

export function formatResolutionForExcel(
  videoResolution: string | undefined,
): string {
  if (!videoResolution || videoResolution === "-") return "-";
  const val = videoResolution.trim();
  const match = val.match(/^(\d+x\d+)\s*\[(.*?)\]/);
  if (match) {
    return `${match[2]} (${match[1]})`;
  }
  if (/^(4K|1080p|720p|SD|480p|360p)$/i.test(val)) {
    const lower = val.toLowerCase();
    if (lower === "4k") return "4K (3840x2160)";
    if (lower === "1080p") return "1080p (1920x1080)";
    if (lower === "720p") return "720p (1280x720)";
    if (lower === "sd" || lower === "480p") return "SD (720x480)";
    return val;
  }
  return val;
}

export function getMissingMetadataTags(item: MediaItem): string[] {
  const tags = item.tags || {};
  const missing: string[] = [];

  if (item.category === "Static" || item.category === "Corrupted") {
    return [];
  }

  const titleVal = tags.title || tags.TITLE || "";
  const titleCleaned = titleVal.trim();
  const hasTitle =
    !!titleCleaned &&
    titleCleaned.toLowerCase() !== (item.filename || "").toLowerCase();
  if (!hasTitle) {
    missing.push("Title");
  }

  const yearVal =
    item.year ||
    parseInt(tags.date || tags.DATE || tags.year || tags.YEAR || "0") ||
    0;
  if (!yearVal) {
    missing.push("Release Year");
  }

  const catLower = (item.category || "").toLowerCase();
  const isTV = ["tv shows", "tv", "docuseries", "anime", "shorts"].includes(
    catLower,
  );
  const isMovie = [
    "movies",
    "movie",
    "documentaries",
    "concerts",
    "education",
  ].includes(catLower);
  const isMusic = [
    "music",
    "music albums",
    "soundtracks",
    "music compilations",
    "audio",
  ].includes(catLower);

  if (isMovie) {
    if (!tags.director && !tags.DIRECTOR) missing.push("Director");
    if (!tags.writer && !tags.WRITER) missing.push("Writer");
    if (!tags.cast && !tags.CAST && !tags.actors && !tags.ACTORS)
      missing.push("Cast/Actors");
    if (!tags.studio && !tags.STUDIO && !tags.publisher && !tags.PUBLISHER)
      missing.push("Studio");
  } else if (isTV) {
    if (!tags.show && !tags.SHOW && !tags.series && !tags.SERIES)
      missing.push("Show Title");
    if (!tags.writer && !tags.WRITER) missing.push("Writer");
    if (!tags.cast && !tags.CAST && !tags.actors && !tags.ACTORS)
      missing.push("Cast/Actors");
    if (!tags.studio && !tags.STUDIO && !tags.network && !tags.NETWORK)
      missing.push("Studio");
  } else if (isMusic) {
    if (!tags.artist && !tags.ARTIST) missing.push("Artist");
    if (!tags.album && !tags.ALBUM) missing.push("Album");
  }

  return missing;
}

export const getFolderPath = (filepath: string, filename: string) => {
  const p = filepath.substring(0, filepath.lastIndexOf(filename));
  return p.endsWith("/") || p.endsWith("\\") ? p.slice(0, -1) : p;
};

export async function exportMediaLibraryToExcel(
  items: MediaItem[],
  rules: RuleCriteria,
  columnVisibility?: Record<string, boolean>,
) {
  const globalScanType = getScanType(rules, items);
  const wb = new ExcelJS.Workbook();
  wb.creator = "StreamFriendly Scanner";
  wb.created = new Date();

  // Helper to map compatibility level to verbal description
  const getCompatibilityLabel = (level: string) => {
    if (level === "bleeding") return "Bleeding Edge";
    if (level === "modern") return "Modern+";
    if (level === "legacy") return "Legacy+";
    return "Transcode Required";
  };

  const getGroupTitleInit = (
    item: MediaItem,
    isTv: boolean = false,
  ): string => {
    if (item.category === "Extras") {
      return getExtrasGroupTitle(item);
    }
    const meta = parseVideoMetadata(item);
    if (isTv && meta.season && meta.season !== "-") {
      const p = parseInt(meta.season, 10);
      return `${meta.title || "Unknown"} - ${isNaN(p) ? meta.season : "Season " + p}`;
    }
    return meta.title || "Ungrouped";
  };

  // 1. Create Overview Summary Sheet
  const overviewWs = wb.addWorksheet("Overview", {
    views: [{ showGridLines: false }],
  });
  overviewWs.columns = [
    { header: "", key: "metricLeft", width: 35 },
    { header: "", key: "valueLeft", width: 30 },
    { header: "", key: "gap", width: 30 },
    { header: "", key: "metricRight", width: 35 },
    { header: "", key: "valueRight", width: 50 },
  ];

  // Header / Logo area
  overviewWs.mergeCells("A1:E1");
  const titleCell = overviewWs.getCell("A1");
  titleCell.value = "BitScribe - Digital Media Library Steward";
  titleCell.font = { bold: true, size: 24, color: { argb: "FF8B5CF6" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  overviewWs.mergeCells("A2:E2");
  const subTitleCell = overviewWs.getCell("A2");
  subTitleCell.value = getReportTitle(globalScanType).toUpperCase();
  subTitleCell.font = { bold: true, size: 12, color: { argb: "FFCBD5E1" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  const corruptedFilesList = items.filter((it) => it.category === "Corrupted");
  const healthyFilesList = items.filter(
    (it) => it.category !== "Corrupted" && it.category !== "Static",
  );
  const totalAuditedCount = healthyFilesList.length;
  const corruptedCount = corruptedFilesList.length;

  let modern = 0;
  let legacy = 0;
  let unfriendly = 0;
  let totalGB = 0;
  const videoCounts: Record<string, number> = {};
  const audioCounts: Record<string, number> = {};
  const containerCounts: Record<string, number> = {};
  const musicCounts: Record<string, number> = {};

  items.forEach((item) => {
    if (item.category === "Static") {
      return;
    }
    totalGB += item.sizeGB;
    if (item.category === "Corrupted") {
      return; // Skip corrupted files from general codec / compatibility processing
    }
    const evalResult = evaluatePlexCompatibility(item, rules);

    if (!isMusicCategory(item.category)) {
      if (evalResult.level === "modern") modern++;
      else if (evalResult.level === "legacy") legacy++;
      else unfriendly++;

      const vc = (item.videoCodec || "").toUpperCase() || "UNKNOWN";
      videoCounts[vc] = (videoCounts[vc] || 0) + 1;

      const cont = (
        (item.container || "").toLowerCase().includes("matroska")
          ? "mkv"
          : item.filename.split(".").pop() || item.container || ""
      ).toUpperCase();
      containerCounts[cont] = (containerCounts[cont] || 0) + 1;

      item.audioTracks.forEach((tr) => {
        const ac = (tr.codec || "UNKNOWN").toUpperCase();
        audioCounts[ac] = (audioCounts[ac] || 0) + 1;
      });
    } else {
      const mc = (
        (item.audioTracks || [])[0]?.codec ||
        item.container ||
        "UNKNOWN"
      ).toUpperCase();
      musicCounts[mc] = (musicCounts[mc] || 0) + 1;

      const cont = (
        item.container ||
        item.filename.split(".").pop() ||
        "UNKNOWN"
      ).toUpperCase();
      containerCounts[cont] = (containerCounts[cont] || 0) + 1;
    }
  });

  const formatSize = (gb: number) => {
    if (gb >= 1000) return (gb / 1024).toFixed(2) + " TB";
    if (gb < 1 && gb > 0) return (gb * 1024).toFixed(2) + " MB";
    return gb.toFixed(2) + " GB";
  };

  const styleHeaderCell = (cell: any) => {
    cell.font = { bold: true, color: { argb: "FF10B981" }, size: 14 }; // Emerald Green for Header
  };

  const styleCategoryCell = (cell: any) => {
    cell.font = { bold: true, color: { argb: "FF3B82F6" }, size: 12 }; // Blue for Category Name
  };

  const styleSubMetricCell = (cell: any) => {
    cell.font = { color: { argb: "FFCBD5E1" }, size: 10 }; // Light grey for sub-metrics
  };

  const styleValueCell = (cell: any) => {
    cell.font = { color: { argb: "FFFFFFFF" }, size: 10 }; // White normal for values
  };

  const writeLeftCell = (
    rowNum: number,
    metricText: string,
    valueText: string,
    isHeader = false,
    isCat = false,
  ) => {
    const row = overviewWs.getRow(rowNum);
    const mCell = row.getCell(1);
    const vCell = row.getCell(2);
    mCell.value = metricText;
    vCell.value = valueText;
    vCell.alignment = { wrapText: true, vertical: "top" };

    if (isHeader) {
      styleHeaderCell(mCell);
    } else if (isCat) {
      styleCategoryCell(mCell);
    } else {
      styleSubMetricCell(mCell);
    }
    if (valueText) {
      styleValueCell(vCell);
    }
  };

  const writeRightCell = (
    rowNum: number,
    metricText: string,
    valueText: string,
    isHeader = false,
    isCat = false,
  ) => {
    const row = overviewWs.getRow(rowNum);
    const mCell = row.getCell(4);
    const vCell = row.getCell(5);
    mCell.value = metricText;
    vCell.value = valueText;
    vCell.alignment = { wrapText: true, vertical: "top" };

    if (isHeader) {
      styleHeaderCell(mCell);
    } else if (isCat) {
      styleCategoryCell(mCell);
    } else {
      styleSubMetricCell(mCell);
    }
    if (valueText) {
      styleValueCell(vCell);
    }
  };

  // Populate Left Block
  writeLeftCell(4, "◆  GENERAL LIBRARY SUMMARY", "", true);
  writeLeftCell(5, "      Total Indexed Media", `${totalAuditedCount} items`);
  writeLeftCell(
    6,
    "      Corrupted/Failed Files",
    `${corruptedCount} files ${corruptedCount > 0 ? "(See 'Corrupted' tab)" : ""}`,
  );
  writeLeftCell(7, "      Library Size", formatSize(totalGB));

  let leftRowIdx = 8;
  const isDiscovery = !!rules.useDiscoveryPreset;

  let rightRowIdx = 4;
  writeRightCell(rightRowIdx++, "◆  SCAN SPECIFIC METRICS", "", true);

  if (!isDiscovery) {
    if (
      rules.useMetadataScan ||
      rules.useVideoMetadataScan ||
      rules.useMusicMetadataScan
    ) {
      const totalAudited = items.filter(
        (it) => it.category !== "Corrupted" && it.category !== "Static",
      ).length;
      const completeCount = items.filter(
        (it) =>
          it.category !== "Corrupted" &&
          it.category !== "Static" &&
          evaluatePlexCompatibility(it, rules).level === "modern",
      ).length;
      const pct =
        totalAudited > 0
          ? Math.round((completeCount / totalAudited) * 100)
          : 100;
      writeLeftCell(leftRowIdx++, "      Metadata Compliance", `${pct}%`);
      writeRightCell(rightRowIdx++, "      Files Missing Metadata", `${totalAudited - completeCount} files`);
    } else if (rules.useSubtitleScan) {
      const videoItems = items.filter(
        (it) =>
          it.category !== "Music" &&
          it.category !== "Corrupted" &&
          it.category !== "Static",
      );
      const missingSubsCount = videoItems.filter(
        (it) => !it.subtitleTracks || it.subtitleTracks.length === 0,
      ).length;
      const subPct =
        videoItems.length > 0
          ? Math.round(
              ((videoItems.length - missingSubsCount) / videoItems.length) *
                100,
            )
          : 100;
      writeLeftCell(leftRowIdx++, "      Subtitle Coverage Rate", `${subPct}%`);
      writeRightCell(rightRowIdx++, "      Missing Subtitles", `${missingSubsCount} files`);
    } else if (rules.useAnomalyScan) {
      const videoBitrates = items.filter(
        (it) =>
          it.category !== "Music" &&
          it.category !== "Corrupted" &&
          it.category !== "Static" &&
          it.videoBitrateMbps,
      );
      let bloated = 0,
        starved = 0;
      videoBitrates.forEach((it) => {
        const res = (it.videoResolution || "").toLowerCase();
        const br = it.videoBitrateMbps;
        if (res.includes("4k") && br < 10) starved++;
        else if (res.includes("1080p") && br > 20) bloated++;
        else if (res.includes("1080p") && br < 2) starved++;
        else if (res.includes("720p") && br > 10) bloated++;
        else if ((res.includes("sd") || res.includes("480p")) && br > 4)
          bloated++;
      });
      const totalAnomalies = bloated + starved;
      const healthyPct =
        videoBitrates.length > 0
          ? Math.round(
              ((videoBitrates.length - totalAnomalies) / videoBitrates.length) *
                100,
            )
          : 100;
      writeLeftCell(
        leftRowIdx++,
        "      Optimal Sizing Ratio",
        `${healthyPct}%`,
      );
      writeRightCell(rightRowIdx++, "      Bloated Bitrates", `${bloated} files`);
      writeRightCell(rightRowIdx++, "      Starved Bitrates", `${starved} files`);
    } else {
      // Default compatibility / Stream Audit Scan
      writeLeftCell(
        leftRowIdx++,
        "      Video Streaming Compatibility",
        `${Math.round(((modern + legacy) / Math.max(modern + legacy + unfriendly, 1)) * 100)}%`,
      );
      writeLeftCell(
        leftRowIdx++,
        "      Requires Video Transcode",
        `${Math.round((unfriendly / Math.max(modern + legacy + unfriendly, 1)) * 100)}%`,
      );
      writeRightCell(rightRowIdx++, "      Modern+ Devices Ready", `${modern} files`);
      writeRightCell(rightRowIdx++, "      Legacy Devices Ready", `${legacy} files`);
      writeRightCell(rightRowIdx++, "      Needs Transcoding", `${unfriendly} files`);
    }
  } else {
    // Discovery
    const videoCounts: Record<string, number> = {};
    const audioCounts: Record<string, number> = {};
    items.forEach(it => {
      if (!isMusicCategory(it.category) && it.category !== 'Corrupted' && it.category !== 'Static') {
        const vc = (it.videoCodec || "").toUpperCase();
        if (vc && vc !== "-") videoCounts[vc] = (videoCounts[vc] || 0) + 1;
        (it.audioTracks || []).forEach(tr => {
          const ac = (tr.codec || "").toUpperCase();
          if (ac && ac !== "-") audioCounts[ac] = (audioCounts[ac] || 0) + 1;
        });
      }
    });
    const topVideo = Object.entries(videoCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => `${e[0]} (${e[1]})`).join(", ");
    const topAudio = Object.entries(audioCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => `${e[0]} (${e[1]})`).join(", ");
    writeRightCell(rightRowIdx++, "      Top Video Codecs", topVideo || "None");
    writeRightCell(rightRowIdx++, "      Top Audio Codecs", topAudio || "None");
  }

  // Sync rightRowIdx to leftRowIdx
  rightRowIdx = Math.max(leftRowIdx, rightRowIdx);
  leftRowIdx = rightRowIdx;

  // Prepare Category & Tab Breakdowns
  writeLeftCell(leftRowIdx++, "", "");
  writeLeftCell(leftRowIdx++, "◆  CATEGORY & TAB BREAKDOWNS", "", true);

  const categories = sortCategories(
    Array.from(new Set(items.map((i) => i.category))),
  );
  const halfLength = Math.floor(categories.length / 2);
  const leftCategories = categories.slice(0, halfLength);
  const rightCategories = categories.slice(halfLength);

  rightRowIdx = leftRowIdx; // Start right column at the same height as left column categories

  const renderCategoryBlock = (cats: string[], isLeft: boolean) => {
    cats.forEach((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length === 0) return;

      if (isLeft) {
        writeLeftCell(
          leftRowIdx++,
          `      ${cat.toUpperCase()}`,
          "",
          false,
          true,
        );
        writeLeftCell(
          leftRowIdx++,
          "            Total Files",
          `${catItems.length} files`,
        );
        writeLeftCell(
          leftRowIdx++,
          "            Total Size",
          formatSize(catItems.reduce((sum, item) => sum + item.sizeGB, 0)),
        );
      } else {
        writeRightCell(
          rightRowIdx++,
          `      ${cat.toUpperCase()}`,
          "",
          false,
          true,
        );
        writeRightCell(
          rightRowIdx++,
          "            Total Files",
          `${catItems.length} files`,
        );
        writeRightCell(
          rightRowIdx++,
          "            Total Size",
          formatSize(catItems.reduce((sum, item) => sum + item.sizeGB, 0)),
        );
      }

      if (cat === "Corrupted" || cat === "Static") {
        if (isLeft) leftRowIdx++;
        else rightRowIdx++;
        return;
      }

      const writeCell = isLeft ? writeLeftCell : writeRightCell;
      let rIdx = isLeft ? leftRowIdx : rightRowIdx;

      if (globalScanType === "Stream Audit Scan") {
        let modernCount = 0, legacyCount = 0, transcodeCount = 0;
        catItems.forEach(item => {
          const evalRes = evaluatePlexCompatibility(item, rules, false);
          if (evalRes.level === "modern") modernCount++;
          else if (evalRes.level === "legacy") legacyCount++;
          else if (evalRes.level === "unfriendly") transcodeCount++;
        });
        if (modernCount > 0) writeCell(rIdx++, "            Modern+", `${modernCount} files`);
        if (legacyCount > 0) writeCell(rIdx++, "            Legacy+", `${legacyCount} files`);
        if (transcodeCount > 0) writeCell(rIdx++, "            Needs Transcode", `${transcodeCount} files`);
      } else if (globalScanType === "Anomaly Scan") {
        let bloatedCount = 0, starvedCount = 0;
        catItems.forEach(item => {
          const evalRes = evaluatePlexCompatibility(item, rules, false);
          if (evalRes.level === "unfriendly" && evalRes.reason.includes("Bloated")) bloatedCount++;
          else if (evalRes.level === "unfriendly" && evalRes.reason.includes("Starved")) starvedCount++;
        });
        if (bloatedCount > 0) writeCell(rIdx++, "            Bloated Bitrates", `${bloatedCount} files`);
        if (starvedCount > 0) writeCell(rIdx++, "            Starved Bitrates", `${starvedCount} files`);
      } else if (globalScanType.includes("Metadata")) {
        let incompleteCount = 0;
        catItems.forEach(item => {
          const evalRes = evaluatePlexCompatibility(item, rules, false);
          if (evalRes.level === "unfriendly" && evalRes.reason.includes("Incomplete Tags")) incompleteCount++;
        });
        writeCell(rIdx++, "            Incomplete Tags", `${incompleteCount} files`);
      } else if (globalScanType === "Subtitle Scan") {
        let missingCount = 0;
        catItems.forEach(item => {
          const evalRes = evaluatePlexCompatibility(item, rules, false);
          if (evalRes.level === "unfriendly" && evalRes.reason.includes("No embedded subtitles")) missingCount++;
        });
        writeCell(rIdx++, "            Missing Subtitles", `${missingCount} files`);
      } else {
        const catVideoCounts: Record<string, number> = {};
        const catAudioCounts: Record<string, number> = {};

        catItems.forEach((item) => {
          const isMusic =
            isMusicCategory(item.category) || item.category === "Audio";
          if (!isMusic) {
            const vc = (item.videoCodec || "").toUpperCase();
            if (vc && vc !== "-")
              catVideoCounts[vc] = (catVideoCounts[vc] || 0) + 1;
            (item.audioTracks || []).forEach((tr) => {
              const ac = (tr.codec || "UNKNOWN").toUpperCase();
              catAudioCounts[ac] = (catAudioCounts[ac] || 0) + 1;
            });
          } else {
            const mc = (
              (item.audioTracks || [])[0]?.codec ||
              item.container ||
              "UNKNOWN"
            ).toUpperCase();
            catAudioCounts[mc] = (catAudioCounts[mc] || 0) + 1;
          }
        });

        if (Object.keys(catVideoCounts).length > 0) {
          const vcStr = Object.entries(catVideoCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k} (${v})`)
            .join(", ");
          writeCell(rIdx++, "            Video Codecs", vcStr);
        }

        if (Object.keys(catAudioCounts).length > 0) {
          const acStr = Object.entries(catAudioCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k} (${v})`)
            .join(", ");
          writeCell(rIdx++, "            Audio Codecs", acStr);
        }
      }

      if (isLeft) leftRowIdx = rIdx + 1;
      else rightRowIdx = rIdx + 1;
    });
  };

  renderCategoryBlock(leftCategories, true);
  renderCategoryBlock(rightCategories, false);

  // Apply dark theme background to the whole sheet overview area (columns 1 to 20, rows 1 to maxRow + 5)
  const maxRow = Math.max(leftRowIdx, rightRowIdx) + 5;
  for (let c = 1; c <= 20; c++) {
    const col = overviewWs.getColumn(c);
    col.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B0F19" },
    };
  }

  // Ensure cell background formatting is preserved after row population
  for (let r = 1; r <= maxRow; r++) {
    const row = overviewWs.getRow(r);
    for (let c = 1; c <= 20; c++) {
      row.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0B0F19" },
      };
    }
  }

  const createGroupedSheet = (
    sheetName: string,
    dataItems: MediaItem[],
    catType: string,
  ) => {
    // Freeze top row for headers
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });
    if (dataItems.length === 0) return;

    let headers: string[] = [];
    const catLower = catType.toLowerCase();
    const isTv =
      catLower.includes("tv") ||
      catLower.includes("show") ||
      catLower.includes("series") ||
      catLower.includes("docuseries") ||
      catLower.includes("anime") ||
      catLower.includes("shorts");

    const isDoc = ["Documentaries", "Education", "Concerts"].includes(catType);
    const isMusic = isMusicCategory(catType) || catType === "Audio";
    const isCorrupt = catType === "Corrupted";
    const isStatic = catType === "Static";
    const isMovie = ["Movies", "Movie"].includes(catType) || isDoc;

    const scanType = getScanType(rules, dataItems);

    if (scanType === "Discovery Scan") {
      if (catType === "Soundtracks" || catType === "Music Compilations") {
        headers = [
          "Album/Folder Title",
          "Artist",
          "Song Title",
          "File Name",
          "File Format/Codec",
          "Audio Bitrate",
          "Cover Art",
          "File Path",
        ];
      } else if (isMusic) {
        headers = [
          "Artist",
          "Album Title",
          "Song Title",
          "File Name",
          "File Format/Codec",
          "Audio Bitrate",
          "Cover Art",
          "File Path",
        ];
      } else if (isTv) {
        headers = [
          "Series Title",
          "Release Year",
          "Season",
          "Episode",
          "Episode Title",
          "File Name",
          "Container",
          "Video Codec",
          "Resolution",
          "Video Bitrate",
          "HDR Format",
          "Audio Tracks",
          "Audio Codecs",
          "Audio Bitrate",
          "Subtitles",
          "Poster",
          "File Path",
        ];
      } else if (catType === "Extras") {
        headers = [
          "Title",
          "File Name",
          "Container",
          "Video Codec",
          "Resolution",
          "Video Bitrate",
          "HDR Format",
          "Audio Tracks",
          "Audio Codecs",
          "Audio Bitrate",
          "Subtitles",
          "Poster",
          "File Path",
        ];
      } else if (isMovie) {
        headers = [
          "Title",
          "Release Year",
          "File Name",
          "Container",
          "Video Codec",
          "Resolution",
          "Video Bitrate",
          "HDR Format",
          "Audio Tracks",
          "Audio Codecs",
          "Audio Bitrate",
          "Subtitles",
          "Poster",
          "File Path",
        ];
      } else if (isCorrupt) {
        headers = [
          "File Name",
          "Corruption Type",
          "Recommendation",
          "File Path",
        ];
      } else if (isStatic) {
        headers = ["File Name", "File Path"];
      } else {
        headers = ["Title", "File Name", "File Path"];
      }
    } else if (scanType === "Stream Audit Scan") {
      if (isMusic) {
        headers = [
          "Artist",
          "Album Title",
          "Song Title",
          "File Format/Codec",
          "Audio Bitrate",
          "Analysis Notes",
          "Recommendation",
          "File Path",
        ];
      } else if (isCorrupt || isStatic) {
        headers = ["File Name", "File Path"];
      } else {
        headers = [
          "Stream Friendly?",
          "File Name",
          "Video Codec",
          "Resolution",
          "Video Bitrate",
          "Audio Codecs",
          "Audio Bitrate",
          "HDR Format",
          "Analysis Notes",
          "Recommendation",
          "File Path",
        ];
      }
    } else if (
      scanType === "Metadata Scan" ||
      scanType === "Video Metadata Scan" ||
      scanType === "Music Metadata Scan"
    ) {
      headers = [
        "File Name",
        "Missing Metadata",
        scanType === "Music Metadata Scan" || isMusic ? "Cover Art" : "Poster",
        "File Path",
      ];
    } else if (scanType === "Duplication Scan") {
      headers = ["File Name", "File Path"];
    } else if (scanType === "Anomaly Scan") {
      if (isMusic) {
        headers = [
          "File Name",
          "Audio Bitrate",
          "Analysis Notes",
          "Recommendation",
          "File Path",
        ];
      } else if (isCorrupt || isStatic) {
        headers = ["File Name", "File Path"];
      } else {
        headers = [
          "File Name",
          "Video Bitrate",
          "Resolution",
          "Audio Bitrate",
          "Analysis Notes",
          "Recommendation",
          "File Path",
        ];
      }
    } else if (scanType === "Subtitle Scan") {
      headers = [
        "File Name",
        "Subtitles",
        "Analysis Notes",
        "Recommendation",
        "File Path",
      ];
    } else if (scanType === "Corrupted Audit") {
      headers = ["File Name", "Corruption Type", "Recommendation", "File Path"];
    } else {
      headers = ["File Name", "File Path"]; // Fallback
    }

    let visibleHeaders = headers; // we ignore column visibility to respect the strict scan rules

    // Define columns with keys and widths
    ws.columns = visibleHeaders.map((h) => {
      let width = 15;
      if (h === "File Path" || h === "Analysis Notes" || h === "Recommendation" || h === "Remediation Action" || h === "Missing Metadata" || h === "Missing Tags") {
        width = 45;
      } else if (h === "File Name" || h === "Title" || h === "Series Title") {
        width = 35;
      } else if (h.length + 5 > 15) {
        width = h.length + 5;
      }
      return { key: h, width };
    });

    // Set the headers on Row 1
    ws.getRow(1).values = visibleHeaders;

    // Style the actual table header (now at Row 1!)
    ws.getRow(1).eachCell((cell) => {
      cell.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      }; // Dark slate
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
    ws.getRow(1).height = 24;

    let currentGroup = "";

    const duplicatesMap = computeDuplicatesMap(dataItems, rules);

    dataItems.forEach((item) => {
      const isDuplicate = duplicatesMap.get(item.id) ?? false;
      const evalResult = evaluatePlexCompatibility(item, rules, isDuplicate);
      const audioStr =
        (item.audioTracks || []).length > 0
          ? (item.audioTracks || [])
              .map((t) => `${t.codec.toUpperCase()} (${t.channels}ch)`)
              .join(" | ")
          : "None";
      const subStr =
        (item.subtitleTracks || []).length > 0
          ? (item.subtitleTracks || [])
              .map((s) => `${s.codec.toUpperCase()}`)
              .join(", ")
          : "None";
      const folderPath = getFolderPath(item.filePath, item.filename);

      const catLower = catType.toLowerCase();
      const isTv =
        catLower.includes("tv") ||
        catLower.includes("show") ||
        catLower.includes("series") ||
        catLower.includes("docuseries") ||
        catLower.includes("anime") ||
        catLower.includes("shorts");
      const isDoc = catLower.includes("doc") && !isTv;
      const isMusic = isMusicCategory(catType);

      const normCurrentGroup = String(currentGroup)
        .replace(/['"\[\]()]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (isTv) {
        const groupTitle = getGroupTitleInit(item, isTv) || "Ungrouped";
        const normGroupTitle = String(groupTitle)
          .replace(/['"\[\]()]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        if (normGroupTitle !== normCurrentGroup) {
          currentGroup = groupTitle;
          const groupRow = ws.addRow([currentGroup]);
          ws.mergeCells(
            groupRow.number,
            1,
            groupRow.number,
            visibleHeaders.length,
          );
          groupRow.getCell(1).font = {
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFADD8E6" },
          };
          groupRow.getCell(1).alignment = {
            vertical: "top",
            horizontal: "left",
          };
        }
      } else if (catType === "Extras") {
        const groupTitle = getExtrasGroupTitle(item);
        const normGroupTitle = String(groupTitle)
          .replace(/['"\[\]()]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        if (normGroupTitle !== normCurrentGroup) {
          currentGroup = groupTitle;
          const groupRow = ws.addRow([groupTitle]);
          ws.mergeCells(
            groupRow.number,
            1,
            groupRow.number,
            visibleHeaders.length,
          );
          groupRow.getCell(1).font = {
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFBCFE8" },
          }; // Soft pink/magenta for extras grouping
          groupRow.getCell(1).alignment = {
            vertical: "top",
            horizontal: "left",
          };
        }
      } else if (isMusic) {
        const dArtist = getDisplayArtist(item, rules);
        const dAlbum = getDisplayAlbum(item, rules);
        const groupTitle =
          catType === "Soundtracks" || catType === "Music Compilations"
            ? dAlbum
            : `${dArtist} - ${dAlbum}`;
        const normGroupTitle = String(groupTitle)
          .replace(/['"\[\]()]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        if (normGroupTitle !== normCurrentGroup) {
          currentGroup = groupTitle;
          const groupRow = ws.addRow([groupTitle]);
          ws.mergeCells(
            groupRow.number,
            1,
            groupRow.number,
            visibleHeaders.length,
          );
          groupRow.getCell(1).font = {
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF98FF98" },
          };
          groupRow.getCell(1).alignment = {
            vertical: "top",
            horizontal: "left",
          };
        }
      }

      const rowValues: Record<string, any> = {};
      const parsedMeta = parseVideoMetadata(item);

      const missing = getMissingMetadataTags(item);
      const missingTagsStr = missing.length > 0 ? missing.join(", ") : "None";

      if (isMusicCategory(catType)) {
        rowValues["Artist"] = getDisplayArtist(item, rules);
        rowValues["Album Title"] = getDisplayAlbum(item, rules);
        rowValues["Album/Folder Title"] = getDisplayAlbum(item, rules);
        rowValues["Stream Friendly?"] = getCompatibilityLabel(evalResult.level);
        rowValues["Song Title"] = getDisplaySongTitle(item, rules);
        rowValues["File Name"] = item.filename;
        rowValues["Filename"] = item.filename;
        rowValues["File Format/Codec"] =
          (item.audioTracks || [])[0]?.codec?.toUpperCase() ||
          (
            item.container ||
            item.filename.split(".").pop() ||
            "UNKNOWN"
          ).toUpperCase();
        rowValues["Bitrate"] = `${item.audioBitrate || 0} kbps`;
        rowValues["Audio Bitrate"] = `${item.audioBitrate || 0} kbps`;
        rowValues["Missing Tags"] = missingTagsStr;
        rowValues["Missing Metadata"] = missingTagsStr;
        rowValues["Poster"] = item.hasEmbeddedPoster
          ? "Embedded"
          : item.hasExternalPoster
            ? "External"
            : "None";
        rowValues["Cover Art"] = item.hasEmbeddedPoster
          ? "Embedded"
          : item.hasExternalPoster
            ? "External"
            : "None";
        rowValues["Bitrate Anomaly"] = item.bitrateAnomaly
          ? item.bitrateAnomalyReason
          : "None";
        rowValues["File Path"] = item.filePath;
        rowValues["Analysis Notes"] = evalResult.level === "unfriendly" ? evalResult.reason : "";
        rowValues["Remediation Action"] = evalResult.level === "unfriendly" ? evalResult.suggestion : "";
        rowValues["Recommendation"] = evalResult.level === "unfriendly" ? evalResult.suggestion : "";
      } else {
        const c = (
          (item.container || "").toLowerCase().includes("matroska")
            ? "mkv"
            : item.filename.split(".").pop() || item.container || ""
        ).toUpperCase();
        const baseValues = {
          "Missing Metadata": missingTagsStr,
          "Stream Friendly?": getCompatibilityLabel(evalResult.level),
          "Missing Tags": missingTagsStr,
          Poster: item.hasEmbeddedPoster
            ? "Embedded"
            : item.hasExternalPoster
              ? "External"
              : "None",
          "Cover Art": item.hasEmbeddedPoster
            ? "Embedded"
            : item.hasExternalPoster
              ? "External"
              : "None",
          "Bitrate Anomaly": item.bitrateAnomaly
            ? item.bitrateAnomalyReason
            : "None",
          Filename: item.filename,
          "File Name": item.filename,
          "Video Codec": (item.videoCodec || "-").toUpperCase(),
          Resolution: formatResolutionForExcel(item.videoResolution),
          "Video Bitrate": item.videoBitrateMbps
            ? item.videoBitrateMbps.toFixed(2) + " Mbps"
            : "",
          "Audio Bitrate": item.audioBitrate ? item.audioBitrate + " kbps" : "",
          "HDR Format": item.hdrFormat || "SDR",
          "Audio Codec": audioStr,
          "Audio Codecs": audioStr,
          "Audio Tracks": (item.audioTracks || []).length,
          Container: c,
          Subtitles: subStr,
          "File Path": item.filePath,
          "Analysis Notes": evalResult.level === "unfriendly" ? evalResult.reason : "",
          "Remediation Action": evalResult.level === "unfriendly" ? evalResult.suggestion : "",
          Recommendation: evalResult.level === "unfriendly" ? evalResult.suggestion : "",
        };

        if (catType === "Corrupted") {
          Object.assign(rowValues, {
            "File Name": item.filename,
            Filename: item.filename,
            "Corruption Type": item.tags?.artist || "Read error / 0-byte file",
            Recommendation: "Replace file",
            "File Path": item.filePath,
          });
        } else if (catType === "Static") {
          Object.assign(rowValues, {
            "File Name": item.filename,
            Filename: item.filename,
            "File Path": item.filePath,
          });
        } else if (catType === "TV Shows" || catType === "Docuseries") {
          Object.assign(rowValues, baseValues, {
            "Series Title": parsedMeta.title,
            Season: parsedMeta.season,
            Episode: parsedMeta.episode,
            "Episode Title": parsedMeta.epTitle,
            "Release Year": parsedMeta.year,
          });
        } else if (catType === "Movies") {
          Object.assign(rowValues, baseValues, {
            Title: parsedMeta.title,
            "Release Year": parsedMeta.year,
          });
        } else if (catType === "Documentaries") {
          Object.assign(rowValues, baseValues, {
            Title: parsedMeta.title,
            "Release Year": parsedMeta.year,
          });
        } else if (catType === "Extras") {
          Object.assign(rowValues, baseValues, {
            Title: ((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle || parsedMeta.title),
            "Release Year": parsedMeta.year,
          });
        } else {
          Object.assign(rowValues, baseValues, {
            Title: parsedMeta.title,
            "Release Year": parsedMeta.year,
          });
        }
      }

      const orderedValues = visibleHeaders.map((h) => rowValues[h] || "");
      const addedRow = ws.addRow(orderedValues);

      // Format "Stream Friendly?" column cell highlights
      const sfIdx = visibleHeaders.indexOf("Stream Friendly?");
      if (sfIdx !== -1) {
        const sfCell = addedRow.getCell(sfIdx + 1);
        const sfVal = sfCell.value;
        if (sfVal === "Bleeding Edge") {
          sfCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          }; // Soft red background
          sfCell.font = { color: { argb: "FFEF4444" }, bold: true }; // Bold red text
        } else if (sfVal === "Modern+") {
          sfCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" },
          }; // Soft green background
          sfCell.font = { color: { argb: "FF166534" }, bold: true }; // Bold green text
        } else if (sfVal === "Legacy+") {
          sfCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEF9C3" },
          }; // Soft yellow background
          sfCell.font = { color: { argb: "FF854D0E" }, bold: true }; // Bold gold/yellow text
        }
      }

      if (catType === "Music") {
        const brIdx = visibleHeaders.indexOf("Bitrate");
        if (brIdx !== -1) {
          const brCell = addedRow.getCell(brIdx + 1);
          const brVal = item.audioBitrate || 0;
          if (brVal >= 256)
            brCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF86EFAC" },
            };
          else if (brVal >= 128)
            brCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFDE047" },
            };
          else
            brCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFCA5A5" },
            };
          brCell.font = { color: { argb: "FF000000" }, bold: true };
        }
      } else if (catType === "Corrupted") {
        const corrIdx = visibleHeaders.indexOf("Corruption Type");
        if (corrIdx !== -1) {
          const corrCell = addedRow.getCell(corrIdx + 1);
          corrCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          }; // Soft red background
          corrCell.font = { color: { argb: "FFEF4444" }, bold: true }; // Bold red text for the corruption cause details
        }
      } else {
        const compIdx = visibleHeaders.indexOf("Analysis Notes");
        if (compIdx !== -1) {
          const compCell = addedRow.getCell(compIdx + 1);
          if (compCell.value === "Will transcode") {
            compCell.font = { color: { argb: "FFFFDA44" }, bold: true };
          } else if (compCell.value === "Direct Play on most HW") {
            compCell.font = { color: { argb: "FF10B981" }, bold: true };
          } else if (compCell.value === "Direct Play on newer HW") {
            compCell.font = { color: { argb: "FF3B82F6" }, bold: true };
          }
        }
      }
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && !row.getCell(1).fill) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "hair", color: { argb: "FF334155" } },
            left: { style: "hair", color: { argb: "FF334155" } },
            bottom: { style: "hair", color: { argb: "FF334155" } },
            right: { style: "hair", color: { argb: "FF334155" } },
          };
          if (cell.type === ExcelJS.ValueType.String && cell.value) {
            cell.alignment = {
              vertical: "top",
              horizontal: "left",
              wrapText: true,
            };
          } else {
            cell.alignment = { vertical: "top", horizontal: "left" };
          }
        });
      }
    });
  };

  const usedSheetNames = new Set<string>();

  categories.forEach((cat) => {
    const catItems = items
      .filter((i) => i.category === cat)
      .sort((a, b) => {
        if (cat === "Corrupted" || cat === "Static") {
          return a.filename.localeCompare(b.filename, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        const isTvCat =
          cat.toLowerCase().includes("tv") ||
          cat.toLowerCase().includes("show") ||
          cat.toLowerCase().includes("series") ||
          cat.toLowerCase().includes("docuseries") ||
          cat.toLowerCase().includes("anime") ||
          cat.toLowerCase().includes("shorts");
        const titleA =
          cat === "Soundtracks" || cat === "Music Compilations"
            ? getDisplayAlbum(a, rules)
            : (isMusicCategory(cat)
                ? `${getDisplayArtist(a, rules)} - ${getDisplayAlbum(a, rules)}`
                : getGroupTitleInit(a, isTvCat)) || "";
        const titleB =
          cat === "Soundtracks" || cat === "Music Compilations"
            ? getDisplayAlbum(b, rules)
            : (isMusicCategory(cat)
                ? `${getDisplayArtist(b, rules)} - ${getDisplayAlbum(b, rules)}`
                : getGroupTitleInit(b, isTvCat)) || "";

        const normA = String(titleA)
          .replace(/['"\[\]()]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const normB = String(titleB)
          .replace(/['"\[\]()]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        if (normA !== normB) {
          return normA.localeCompare(normB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        return a.filename.localeCompare(b.filename, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

    let baseName = cat.charAt(0).toUpperCase() + cat.slice(1);
    // Replace invalid characters for Excel sheet names
    baseName = baseName.replace(/[\\/?*[\]:]/g, "-");
    let sheetName = baseName.slice(0, 31);
    let counter = 1;

    // Ensure uniqueness, also preventing conflict with 'Overview' sheet
    while (
      usedSheetNames.has(sheetName.toLowerCase()) ||
      sheetName.toLowerCase() === "overview"
    ) {
      const suffix = `-${counter}`;
      // Truncate base name further to accommodate the suffix if it would exceed 31 chars
      sheetName = baseName.slice(0, 31 - suffix.length) + suffix;
      counter++;
    }

    usedSheetNames.add(sheetName.toLowerCase());
    createGroupedSheet(sheetName, catItems, cat);
  });

  const formatDateMMDDYY = (date: Date = new Date()) => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  };
  const dateStr = formatDateMMDDYY();

  const reportFileName = getReportTitle(globalScanType);

  const buffer = await wb.xlsx.writeBuffer();
  await downloadOrSaveFile(
    `${reportFileName}.xlsx`,
    new Blob([buffer as BlobPart]),
  );
}
