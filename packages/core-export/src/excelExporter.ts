import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat, formatSubtitleSummary, formatSubtitleTechnical } from '@bitscribe/core-eval';
import { isMusicCategory, sortCategories, getCategoryGroup } from '@bitscribe/core-types';
import ExcelJS from "exceljs";
import { downloadOrSaveFile } from "./downloader";
import { MediaItem, RuleCriteria } from '@bitscribe/core-types';
import { normalizeTitleForSort, getSectionHeaderForTitle, normalizeGroupTitle, getMusicGroupTitle, getGroupTitleInit } from '@bitscribe/core-eval';

import {
  evaluatePlexCompatibility,
  computeDuplicatesMap,
} from '@bitscribe/core-eval';
import { getDuplicatePairRows, DuplicatePairRow } from '@bitscribe/core-eval';
import {
  getDisplayArtist,
  getDisplayAlbum,
  getDisplaySongTitle,
} from '@bitscribe/core-eval';
import { getScanType, getReportTitle, getFolderPath, getMissingMetadataTags, formatResolutionForExcel } from "@bitscribe/core-eval";
import {
  parseVideoMetadata,
  getExtrasGroupTitle,
  extractSeasonNumber,
} from '@bitscribe/core-eval';






  


export async function exportMediaLibraryToExcel(
  items: MediaItem[],
  rules: RuleCriteria,
  columnVisibility?: Record<string, boolean>,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const globalScanType = getScanType(rules, items);
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;
  
  // Get all pairs globally, then filter to only those visible in the current exported items list
  const globalDupRows = globalScanType === "Duplication Scan" ? getDuplicatePairRows(itemsForDups, rules) : [];
  const filteredItemIds = new Set(items.map(i => i.id));
  const allDupRows = globalDupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));

  const wb = new ExcelJS.Workbook();
  wb.creator = "StreamFriendly Scanner";
  wb.created = new Date();

  // Helper to map compatibility level to verbal description
  const getCompatibilityLabel = (level: string) => {
    if (level === "pending") return "Pending Scan";
    if (level === "bleeding") return "Bleeding Edge";
    if (level === "modern") return "Modern+";
    if (level === "legacy") return "Legacy+";
    return "Transcode Required";
  };



  // 1. Create Overview Summary Sheet
  const overviewWs = wb.addWorksheet("Overview", {
    views: [{ showGridLines: false }],
  });
  overviewWs.columns = [
    { header: "", key: "metricLeft", width: 42 },
    { header: "", key: "valueLeft", width: 30 },
    { header: "", key: "gap", width: 30 },
    { header: "", key: "metricRight", width: 42 },
    { header: "", key: "valueRight", width: 50 },
  ];

  // Header text area (logo removed)
  overviewWs.mergeCells("A1:E1");
  const titleCell = overviewWs.getCell("A1");
  titleCell.value = "BitScribe - Digital Media Library Steward";
  titleCell.font = { bold: true, size: 24, color: { argb: "FF8B5CF6" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  overviewWs.getRow(1).height = 40;

  overviewWs.mergeCells("A2:E2");
  const subTitleCell = overviewWs.getCell("A2");
  subTitleCell.value = getReportTitle(globalScanType)?.toString()?.toUpperCase();
  subTitleCell.font = { bold: true, size: 12, color: { argb: "FFCBD5E1" } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  overviewWs.getRow(2).height = 25;

  const corruptedFilesList = itemsForDups.filter((it) => it.category === "Corrupted");
  const healthyFilesList = itemsForDups.filter(
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

  itemsForDups.forEach((item) => {
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

      const vc = getPrimaryVideoCodec(item) || "UNKNOWN";
      videoCounts[vc] = (videoCounts[vc] || 0) + 1;

      const cont = getContainerFormat(item);
      containerCounts[cont] = (containerCounts[cont] || 0) + 1;

      item.audioTracks.forEach((tr) => {
        const ac = formatCodecString(tr.codec);
        audioCounts[ac] = (audioCounts[ac] || 0) + 1;
      });
    } else {
      const mc = getPrimaryAudioCodec(item);
      musicCounts[mc] = (musicCounts[mc] || 0) + 1;

      const cont = getContainerFormat(item);
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
  const startRow = 4;
  let leftRowIdx = startRow;
  writeLeftCell(leftRowIdx++, "◆  GENERAL LIBRARY SUMMARY", "", true);
  writeLeftCell(leftRowIdx++, "      Total Indexed Media", `${totalAuditedCount} items`);
  writeLeftCell(
    leftRowIdx++,
    "      Corrupted/Failed Files",
    `${corruptedCount} files ${
      corruptedCount > 0
        ? (globalScanType === "Corrupted Audit"
          ? "(See 'Corrupted' tab)"
          : "(See the Bad Files Audit report.)")
        : ""
    }`,
  );
  writeLeftCell(leftRowIdx++, "      Library Size", formatSize(totalGB));

  const isDiscovery = !!rules.useDiscoveryPreset;

  let rightRowIdx = startRow;
  writeRightCell(rightRowIdx++, "◆  SCAN SPECIFIC METRICS", "", true);

  if (!isDiscovery) {
    if (
      rules.useMetadataScan ||
      rules.useVideoMetadataScan ||
      rules.useMusicMetadataScan
    ) {
      const auditVideo = rules.useMetadataScan || rules.useVideoMetadataScan;
      const auditMusic = rules.useMetadataScan || rules.useMusicMetadataScan;

      const targetItems = itemsForDups.filter(
        (it) => {
          if (it.category === "Corrupted" || it.category === "Static") return false;
          const isMusic = isMusicCategory(it.category);
          if (isMusic && !auditMusic) return false;
          if (!isMusic && !auditVideo) return false;
          return true;
        }
      );

      const totalAudited = targetItems.length;
      const completeCount = targetItems.filter(
        (it) => getMissingMetadataTags(it).length === 0,
      ).length;

      const pct =
        totalAudited > 0
          ? Math.round((completeCount / totalAudited) * 100)
          : 100;

      const labelPrefix = rules.useVideoMetadataScan && !rules.useMusicMetadataScan 
        ? "Video " 
        : (rules.useMusicMetadataScan && !rules.useVideoMetadataScan ? "Music " : "");

      writeLeftCell(leftRowIdx++, `      ${labelPrefix}Metadata Compliance`, `${pct}%`);
      writeRightCell(rightRowIdx++, `      Files Missing ${labelPrefix}Metadata`, `${totalAudited - completeCount} files`);
    } else if (rules.useSubtitleScan) {
      const videoItems = itemsForDups.filter(
        (it) =>
          !isMusicCategory(it.category) &&
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
      let bloated = 0, starved = 0;
      const auditedItems = itemsForDups.filter(
        (it) => it.category !== "Corrupted" && it.category !== "Static"
      );

      auditedItems.forEach(item => {
        const evalRes = evaluatePlexCompatibility(item, rules, false);
        if (evalRes.isBloated) bloated++;
        else if (evalRes.isStarved) starved++;
      });

      const totalAnomalies = bloated + starved;
      const healthyPct =
        auditedItems.length > 0
          ? Math.round(
              ((auditedItems.length - totalAnomalies) / auditedItems.length) * 100,
            )
          : 100;

      writeLeftCell(
        leftRowIdx++,
        "      Optimal Sizing Ratio",
        `${healthyPct}%`,
      );
      writeRightCell(rightRowIdx++, "      Bloated Bitrates", `${bloated} files`);
      writeRightCell(rightRowIdx++, "      Starved Bitrates", `${starved} files`);
    } else if (globalScanType === "Duplication Scan") {
      const dupRows = getDuplicatePairRows(itemsForDups, rules);
      const dupCount = dupRows.length;
      let spaceSavedGB = 0;
      dupRows.forEach(row => {
        spaceSavedGB += row.dupSizeGB || 0;
      });

      const uniquePct = itemsForDups.length > 0
        ? Math.round(((itemsForDups.length - dupCount) / itemsForDups.length) * 100)
        : 100;

      writeLeftCell(
        leftRowIdx++,
        "      Library Uniqueness Ratio",
        `${uniquePct}% Unique`,
      );
      writeRightCell(rightRowIdx++, "      Total Duplicate Pairs", `${dupCount} pairs`);
      writeRightCell(rightRowIdx++, "      Potential Space Savings", formatSize(spaceSavedGB));
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
    itemsForDups.forEach(it => {
      if (!isMusicCategory(it.category) && it.category !== 'Corrupted' && it.category !== 'Static') {
        const vc = getPrimaryVideoCodec(it);
        if (vc && vc !== "-") videoCounts[vc] = (videoCounts[vc] || 0) + 1;
        (it.audioTracks || []).forEach(tr => {
          const ac = formatCodecString(tr.codec);
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
    Array.from(new Set(items.map((i) => i.category)))
  ).filter(cat => !(globalScanType === "Discovery Scan" && cat === "Corrupted"));
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
          `      ${formatCodecString(cat)}`,
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
          `      ${formatCodecString(cat)}`,
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
          if (evalRes.isBloated) bloatedCount++;
          else if (evalRes.isStarved) starvedCount++;
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
          if (evalRes.level === "legacy" && (evalRes.reason.includes("No embedded subtitles") || evalRes.reason.includes("No Embedded or External Subtitles"))) missingCount++;
        });
        writeCell(rIdx++, "            Missing Subtitles", `${missingCount} files`);
      } else if (globalScanType === "Duplication Scan") {
        const dupRows = allDupRows.filter(row => row.category === cat);
        writeCell(rIdx++, "            Duplicates Found", `${dupRows.length} pairs`);
        let spaceSavedGB = 0;
        dupRows.forEach(row => {
          spaceSavedGB += row.dupSizeGB || 0;
        });
        if (spaceSavedGB > 0) {
          writeCell(rIdx++, "            Space Savings", formatSize(spaceSavedGB));
        }
      } else {
        const catVideoCounts: Record<string, number> = {};
        const catAudioCounts: Record<string, number> = {};

        catItems.forEach((item) => {
          const isMusic =
            isMusicCategory(item.category) || item.category === "Audio";
          if (!isMusic) {
            const vc = getPrimaryVideoCodec(item);
            if (vc && vc !== "-")
              catVideoCounts[vc] = (catVideoCounts[vc] || 0) + 1;
            (item.audioTracks || []).forEach((tr) => {
              const ac = formatCodecString(tr.codec);
              catAudioCounts[ac] = (catAudioCounts[ac] || 0) + 1;
            });
          } else {
            const mc = getPrimaryAudioCodec(item);
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
    dupRows?: DuplicatePairRow[],
  ) => {
    // Freeze top row for headers
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
    });
    if (dataItems.length === 0) return;

    let headers: string[] = [];
    const catLower = catType.toLowerCase();
    const isTv = getCategoryGroup(catType) === "TV";

    const isDoc = ["Documentaries", "Education", "Concerts"].includes(catType) || catLower.includes("docu");
    const isMusic = isMusicCategory(catType) || catType === "Audio";
    const isCorrupt = catType === "Corrupted";
    const isStatic = catType === "Static";
    const isMovie = getCategoryGroup(catType) === "Movies";

    const scanType = getScanType(rules, dataItems);

    if (scanType === "Discovery Scan") {
      if (catType === "Soundtracks" || catType === "Music Compilations") {
        headers = [
          "Album/Folder Title",
          "Artist",
          "Song Title",
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
          "Container",
          "Video Codec",
          "Resolution",
          "Frame Rate",
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
          "Container",
          "Video Codec",
          "Resolution",
          "Frame Rate",
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
          "Container",
          "Video Codec",
          "Resolution",
          "Frame Rate",
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
          "Corruption Type",
          "Recommendation",
          "File Path",
        ];
      } else if (isStatic) {
        headers = ["File Path"];
      } else {
        headers = ["Title", "File Path"];
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
          "Remediation Action",
          "File Path",
        ];
      } else if (isCorrupt || isStatic) {
        headers = ["File Path"];
      } else {
        headers = [
          "Stream Friendly?",
          "Video Codec",
          "Resolution",
          "Frame Rate",
          "Video Bitrate",
          "Audio Codecs",
          "Audio Bitrate",
          "HDR Format",
          "Analysis Notes",
          "Remediation Action",
          "File Path",
        ];
      }
    } else if (
      scanType === "Metadata Scan" ||
      scanType === "Video Metadata Scan" ||
      scanType === "Music Metadata Scan"
    ) {
      if (isMusic) {
        headers = [
          "Cleaned Title",
          "Title",
          "Album Title",
          "Artist",
          "Year",
          "Track",
          "Audio Sample Rate",
          "Cover Art",
          "File Path"
        ];
      } else if (isTv) {
        headers = [
          "Cleaned Title",
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
          "Video Bit Depth",
          "Audio Sample Rate",
          "Chapters",
          "Poster",
          "File Path"
        ];
      } else { // Video
        headers = [
          "Cleaned Title",
          "Title",
          "Director",
          "Writer",
          "Year",
          "Cast",
          "Studio",
          "Video Bit Depth",
          "Audio Sample Rate",
          "Chapters",
          "Poster",
          "File Path"
        ];
      }
    } else if (scanType === "Duplication Scan") {
      headers = ["Path", "Duplicate Path", "Flag Reason"];
    } else if (scanType === "Anomaly Scan") {
      if (isMusic) {
        headers = [
          "Audio Bitrate",
          "Analysis Notes",
          "Remediation Action",
          "File Path",
        ];
      } else if (isCorrupt || isStatic) {
        headers = ["File Path"];
      } else {
        headers = [
          "Resolution",
          "Video Bitrate",
          "Audio Bitrate",
          "Analysis Notes",
          "Remediation Action",
          "File Path",
        ];
      }
    } else if (scanType === "Subtitle Scan") {
      headers = [
        "Alert Level",
        "Subtitles",
        "Subtitle Type",
        "Analysis Notes",
        "Remediation Action",
        "File Path",
      ];
    } else if (scanType === "Corrupted Audit") {
      headers = ["Corruption Type", "Recommendation", "File Path"];
    } else {
      headers = ["File Path"]; // Fallback
    }

    let visibleHeaders = headers; // we ignore column visibility to respect the strict scan rules

    // Define columns with keys and widths
    ws.columns = visibleHeaders.map((h, idx) => {
      let width = 15;
      if (h === "Alert Level") {
        width = 15;
      } else if (h === "File Path" || h === "Path" || h === "Duplicate Path") {
        width = 65; // wider for file paths to avoid cutoffs
      } else if (h === "Analysis Notes" || h === "Recommendation" || h === "Remediation Action" || h === "Flag Reason") {
        width = 52; // wider for text columns to prevent bleeding
      } else if (h === "Missing Metadata" || h === "Missing Tags") {
        width = 45;
      } else if (h === "File Name" || h === "Title" || h === "Series Title" || h === "Duplicate File" || h === "Cleaned Title") {
        width = 35;
      } else if (h.length + 5 > 15) {
        width = h.length + 5;
      }
      return { header: h, key: `${h}_${idx}`, width };
    });

    // Set the headers on Row 1
    ws.getRow(1).values = visibleHeaders;

    // Style the actual table header (now at Row 1!)
    const factualCols = new Set(["Cleaned Title", "File Path", "Path", "Duplicate Path", "Flag Reason"]);
    ws.getRow(1).eachCell((cell) => {
      const colName = String(cell.value || "");
      const isFactual = factualCols.has(colName);
      const isMetadataScan = scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan";

      if (isMetadataScan && !isFactual) {
        // Metadata header coloring (Elegant Indigo theme)
        cell.font = { size: 11, bold: true, color: { argb: "FFE0E7FF" } }; // Light indigo text
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF312E81" }, // Deep Indigo-900 background
        };
      } else {
        // Factual or non-metadata-scan header coloring (Standard Dark Slate)
        cell.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } }; // White text
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" }, // Dark slate background
        };
      }

      cell.alignment = {
        vertical: "top",
        horizontal: "center",
        wrapText: true,
      };
    });
    ws.getRow(1).height = 24;

    let currentGroup = "";

    if (scanType === "Duplication Scan") {
      const rows = dupRows || getDuplicatePairRows(dataItems, rules);
      rows.forEach((row) => {
        const sanitize = (val: string | undefined | null) => {
          if (!val) return "";
          if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
            return `'${val}`;
          }
          return val;
        };
        ws.addRow([
          sanitize(row.filePath),
          sanitize(row.dupFilePath),
          sanitize(row.flagReason)
        ]);
      });
    } else {
      const duplicatesMap = computeDuplicatesMap(itemsForDups, rules);

    dataItems.forEach((item) => {
      const isDuplicate = duplicatesMap.get(item.id) ?? false;
      const evalResult = evaluatePlexCompatibility(item, rules, isDuplicate);
      const audioStr =
        (item.audioTracks || []).length > 0
          ? (item.audioTracks || [])
              .map((t) => `${formatCodecString(t.codec)} (${t.channels}ch)`)
              .join(" | ")
          : "None";
      const subStr = formatSubtitleSummary(item);
      const folderPath = getFolderPath(item.filePath, item.filename);
      const parsedMeta = parseVideoMetadata(item);

      const catLower = catType.toLowerCase();
      const isTv = getCategoryGroup(catType) === "TV";
      const isDoc = ["Documentaries", "Education", "Concerts"].includes(catType) || catLower.includes("docu");
      const isMovie = getCategoryGroup(catType) === "Movies";
      const isMusic = isMusicCategory(catType);

      const normCurrentGroup = normalizeGroupTitle(currentGroup);

      if (isTv) {
        const groupTitle = getGroupTitleInit(item, isTv) || "Ungrouped";
        const normGroupTitle = normalizeGroupTitle(groupTitle);

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
            name: "Calibri",
            size: 12,
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFADD8E6" },
          };
          groupRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          groupRow.height = 14;
        }
      } else if (isMovie) {
        const rawTitle = parsedMeta?.title || item.filename || '';
        const sectionHeader = getSectionHeaderForTitle(rawTitle);
        const normSectionHeader = sectionHeader.trim().toLowerCase();

        if (normSectionHeader !== normCurrentGroup) {
          currentGroup = sectionHeader;
          const groupRow = ws.addRow([sectionHeader]);
          ws.mergeCells(
            groupRow.number,
            1,
            groupRow.number,
            visibleHeaders.length,
          );
          groupRow.getCell(1).font = {
            name: "Calibri",
            size: 12,
            color: { argb: "FFFFFFFF" },
            bold: true,
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF00B0F0" },
          };
          groupRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          groupRow.height = 14;
        }
      } else if (catType === "Extras") {
        const groupTitle = getExtrasGroupTitle(item);
        const normGroupTitle = normalizeGroupTitle(groupTitle);

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
            name: "Calibri",
            size: 12,
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFBCFE8" },
          }; // Soft pink/magenta for extras grouping
          groupRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          groupRow.height = 14;
        }
      } else if (isMusic) {
        const dArtist = getDisplayArtist(item, rules);
        const dAlbum = getDisplayAlbum(item, rules);
        const groupTitle = getMusicGroupTitle(item, rules, catType);
        const normGroupTitle = normalizeGroupTitle(groupTitle);

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
            name: "Calibri",
            size: 12,
            bold: true,
            color: { argb: "FF000000" },
          };
          groupRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF98FF98" },
          };
          groupRow.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          groupRow.height = 14;
        }
      }

      const rowValues: Record<string, any> = {};

      const missing = getMissingMetadataTags(item);
      const missingTagsStr = missing.length > 0 ? missing.join(", ") : "None";

      let analysisNotes = "";
      let remediationAction = "";
      const isSubtitle = scanType === "Subtitle Scan";
      const isQuality = scanType === "Anomaly Scan";
      const isMetadata = scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan";

      if (isMetadata) {
        const missingFmt = (val: any) => {
          if (val === undefined || val === null) return "[MISSING]";
          let s = String(val).trim();
          if (s.length > 500) s = s.substring(0, 500) + "... [TRUNCATED]";
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
          rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);
          rowValues["Metadata Title"] = songTitle ? missingFmt(songTitle) : "[MISSING]";
          rowValues["Artist"] = missingFmt(item.tags?.artist || item.tags?.ARTIST);
          rowValues["Album Title"] = missingFmt(item.tags?.album || item.tags?.ALBUM);
          rowValues["Year"] = missingFmt(yearVal);
          rowValues["Track"] = missingFmt(item.tags?.track || item.tags?.TRACK || item.tags?.tracknumber || item.tags?.TRACKNUMBER);
          rowValues["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          rowValues["Cover Art"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowValues["File Path"] = item.filePath;
        } else if (isTv) {
          const tvTitle = item.tags?.title || item.tags?.TITLE || "";
          rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);
          rowValues["Metadata Title"] = tvTitle ? missingFmt(tvTitle) : "[MISSING]";
          rowValues["Series Title"] = missingFmt(parsedMeta.title || item.tags?.show || item.tags?.SHOW || item.tags?.series || item.tags?.SERIES);
          rowValues["Season"] = missingFmt(parsedMeta.season);
          rowValues["Episode Number"] = missingFmt(parsedMeta.episode);
          rowValues["Episode Title"] = missingFmt(parsedMeta.epTitle);
          rowValues["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          rowValues["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          rowValues["Year"] = missingFmt(yearVal);
          rowValues["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          rowValues["Online ID"] = missingFmt(item.matchedOnlineId);
          rowValues["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          rowValues["Video Bit Depth"] = missingFmt(item.videoBitDepth);
          rowValues["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          rowValues["Chapters"] = item.chapterCount !== undefined ? (item.chapterCount > 0 ? `${item.chapterCount} chapters` : "[MISSING]") : "[MISSING]";
          rowValues["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowValues["File Path"] = item.filePath;
        } else {
          // Movies / Video
          const videoTitle = item.tags?.title || item.tags?.TITLE || "";
          rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);
          rowValues["Metadata Title"] = videoTitle ? missingFmt(videoTitle) : "[MISSING]";
          rowValues["Director"] = missingFmt(item.tags?.director || item.tags?.DIRECTOR);
          rowValues["Writer"] = missingFmt(item.tags?.writer || item.tags?.WRITER);
          rowValues["Year"] = missingFmt(yearVal);
          rowValues["Cast"] = missingFmt(item.tags?.cast || item.tags?.CAST || item.tags?.actors || item.tags?.ACTORS);
          rowValues["Online ID"] = missingFmt(item.matchedOnlineId);
          rowValues["Studio"] = missingFmt(item.tags?.studio || item.tags?.STUDIO || item.tags?.publisher || item.tags?.PUBLISHER || item.tags?.network || item.tags?.NETWORK);
          rowValues["Video Bit Depth"] = missingFmt(item.videoBitDepth);
          rowValues["Audio Sample Rate"] = item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : "[MISSING]";
          rowValues["Chapters"] = item.chapterCount !== undefined ? (item.chapterCount > 0 ? `${item.chapterCount} chapters` : "[MISSING]") : "[MISSING]";
          rowValues["Poster"] = posterFmt(item.hasEmbeddedPoster, item.hasExternalPoster);
          rowValues["File Path"] = item.filePath;
        }
      } else {
        if (catType === "Corrupted") {
          analysisNotes = "Corrupted file";
          remediationAction = "Replace file";
        } else {
          if (isSubtitle || isQuality || isMetadata) {
            analysisNotes = evalResult.reason;
            remediationAction = evalResult.suggestion;
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
              if (notes) analysisNotes = notes;
              
              if (evalResult.level === "unfriendly" && evalResult.suggestion) {
                remediationAction = evalResult.suggestion;
              }
            }
          }
        }

        if (isMusicCategory(catType)) {
          rowValues["Artist"] = getDisplayArtist(item, rules);
          rowValues["Album Title"] = getDisplayAlbum(item, rules);
          rowValues["Album/Folder Title"] = getDisplayAlbum(item, rules);
          rowValues["Stream Friendly?"] = getCompatibilityLabel(evalResult.level);
          rowValues["Song Title"] = getDisplaySongTitle(item, rules);
          rowValues["Filename"] = item.filename;
          rowValues["File Format/Codec"] =
            getPrimaryAudioCodec(item) ||
            getContainerFormat(item);
          rowValues["Bitrate"] = `${Math.round((item.audioBitrate || 0) / 1000)} kbps`;
          rowValues["Audio Bitrate"] = `${Math.round((item.audioBitrate || 0) / 1000)} kbps`;
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
          rowValues["Analysis Notes"] = analysisNotes || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.reason : "");
          rowValues["Remediation Action"] = remediationAction || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.suggestion : "");
          rowValues["Recommendation"] = remediationAction || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.suggestion : "");
        } else {
          const c = getContainerFormat(item);
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
            "Video Codec": getPrimaryVideoCodec(item),
            Resolution: formatResolutionForExcel(item.videoResolution),
            "Frame Rate": isMusicCategory(item.category) || !item.videoFrameRate
              ? ""
              : `${item.videoFrameRate} fps`,
            "Video Bitrate": item.videoBitrateMbps
              ? item.videoBitrateMbps.toFixed(2) + " Mbps"
              : "",
            "Audio Bitrate": (item.audioBitrate !== undefined && item.audioBitrate !== null) ? Math.round(item.audioBitrate / 1000) + " kbps" : "",
            "HDR Format": item.hdrFormat || "SDR",
            "Audio Codec": audioStr,
            "Audio Codecs": audioStr,
            "Audio Tracks": (item.audioTracks || []).length,
            Container: c,
            Subtitles: subStr,
            "Subtitle Type": formatSubtitleTechnical(item),
            "File Path": item.filePath,
            "Analysis Notes": analysisNotes || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.reason : ""),
            "Remediation Action": remediationAction || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.suggestion : ""),
            Recommendation: remediationAction || ((evalResult.level === "unfriendly" || evalResult.level === "legacy") ? evalResult.suggestion : ""),
          };

          if (catType === "Corrupted") {
            Object.assign(rowValues, {
              "Corruption Type": item.tags?.artist || "Read error / 0-byte file",
              Recommendation: "Replace file",
              "File Path": item.filePath,
            });
          } else if (catType === "Static") {
            Object.assign(rowValues, {
              "File Path": item.filePath,
            });
          } else if (isTv) {
            Object.assign(rowValues, baseValues, {
              "Series Title": parsedMeta.title || item.tags?.show || item.tags?.SHOW || item.tags?.series || item.tags?.SERIES || "",
              Season: parsedMeta.season,
              Episode: parsedMeta.episode,
              "Episode Title": parsedMeta.epTitle,
              "Release Year": parsedMeta.year,
            });
          } else if (catType === "Extras") {
            Object.assign(rowValues, baseValues, {
              Title: ((item.filePath || "").split(/[\\\/]/).filter(Boolean).slice(-2, -1)[0] || "Extras") + " - " + (parsedMeta.epTitle && parsedMeta.epTitle !== "-" ? parsedMeta.epTitle : parsedMeta.title),
              "Release Year": parsedMeta.year,
            });
          } else {
            Object.assign(rowValues, baseValues, {
              Title: parsedMeta.title,
              "Release Year": parsedMeta.year,
            });
          }
        }
      }

      if (scanType === "Subtitle Scan") {
        if (evalResult.level === "unfriendly") {
          rowValues["Alert Level"] = "Critical";
        } else if (evalResult.level === "legacy") {
          rowValues["Alert Level"] = "Warning";
        } else {
          rowValues["Alert Level"] = "OK";
        }
      }

      const orderedValues = visibleHeaders.map((h) => {
        let val = rowValues[h];
        if (typeof val === "string") {
          // Prevent Excel Formula Injection
          if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
            val = `'${val}`;
          }
        }
        return val ?? "";
      });
      const addedRow = ws.addRow(orderedValues);

      if (isMetadata) {
        visibleHeaders.forEach((h, index) => {
          const cellVal = rowValues[h];
          if (cellVal === "[MISSING]") {
            const cell = addedRow.getCell(index + 1);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFE4E6" }, // light pink (Rose-100)
            };
            cell.font = {
              color: { argb: "FF9F1239" }, // deep rose text
              bold: true
            };
          }
        });
      }

      if (scanType === "Subtitle Scan") {
        const alertIdx = visibleHeaders.indexOf("Alert Level");
        if (alertIdx !== -1) {
          const alertCell = addedRow.getCell(alertIdx + 1);
          if (evalResult.level === "unfriendly") {
            alertCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEE2E2" },
            };
            alertCell.font = { color: { argb: "FFEF4444" }, bold: true };
          } else if (evalResult.level === "legacy") {
            alertCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF9C3" },
            };
            alertCell.font = { color: { argb: "FF854D0E" }, bold: true };
          } else {
            alertCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDCFCE7" },
            };
            alertCell.font = { color: { argb: "FF166534" }, bold: true };
          }
        }
      }

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
          const brVal = (item.audioBitrate || 0) / 1000;
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
    }

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
    const catItems = items.filter((i) => i.category === cat);
    const sheetDupRows = globalScanType === "Duplication Scan" ? allDupRows.filter(row => row.category === cat) : undefined;

    if (globalScanType === "Duplication Scan") {
      if (!sheetDupRows || sheetDupRows.length === 0) {
        return; // Skip empty sheets for Duplication Scan
      }
    }

    catItems.sort((a, b) => {
        if (cat === "Corrupted" || cat === "Static") {
          return a.filename.localeCompare(b.filename, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        const isTvCat =
          !cat.toLowerCase().includes("docu") &&
          (cat.toLowerCase().includes("tv") ||
          cat.toLowerCase().includes("show") ||
          cat.toLowerCase().includes("series") ||
          cat.toLowerCase().includes("anime"));
        const titleA = isMusicCategory(cat) 
            ? getMusicGroupTitle(a, rules, cat)
            : getGroupTitleInit(a, isTvCat) || "";
        const titleB = isMusicCategory(cat) 
            ? getMusicGroupTitle(b, rules, cat)
            : getGroupTitleInit(b, isTvCat) || "";

        let normA = normalizeGroupTitle(titleA);
        let normB = normalizeGroupTitle(titleB);

        const catLower = cat.toLowerCase();
        const isDocCat = ["documentaries", "education", "concerts"].includes(catLower) || catLower.includes("docu");
        const isMovieCat = ["movies", "movie", "plays", "specials", "shorts", "music videos"].includes(catLower) || isDocCat;

        if (isMovieCat) {
          normA = normalizeTitleForSort(normA).toLowerCase();
          normB = normalizeTitleForSort(normB).toLowerCase();
        }

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

    let baseName = cat.charAt(0)?.toString()?.toUpperCase() + cat.slice(1);
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
    createGroupedSheet(sheetName, catItems, cat, sheetDupRows);
  });

  // --- Create "Changes" Tab ---
  let storedChanges: any[] = [];
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("bitscribe_media_changes");
      if (saved) {
        storedChanges = JSON.parse(saved);
        if (!Array.isArray(storedChanges)) storedChanges = [];
      }
    }
  } catch (e) {
    console.warn("Failed to retrieve media changes for Excel export:", e);
  }

  if (storedChanges.length > 0 && globalScanType === "Discovery Scan") {
    const changesWs = wb.addWorksheet("Changes", {
      views: [{ showGridLines: true }],
    });

    changesWs.columns = [
      { header: "Filename", key: "filename", width: 35 },
      { header: "Path", key: "path", width: 60 },
      { header: "Change Found", key: "changeFound", width: 40 },
      { header: "Date", key: "date", width: 15 },
    ];

    const changesHeaderRow = changesWs.getRow(1);
    changesHeaderRow.values = ["Filename", "Path", "Change Found", "Date"];
    changesHeaderRow.eachCell((cell) => {
      cell.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" }, // Slate-900 background
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
    });
    changesHeaderRow.height = 24;

    storedChanges.forEach((change) => {
      const row = changesWs.addRow({
        filename: change.filename || "",
        path: change.path || "",
        changeFound: change.changeFound || "",
        date: change.date || "",
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "hair", color: { argb: "FFCBD5E1" } },
          left: { style: "hair", color: { argb: "FFCBD5E1" } },
          bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
          right: { style: "hair", color: { argb: "FFCBD5E1" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });

      // Style the "Change Found" column cell
      const cfCell = row.getCell(3);
      const cfVal = cfCell.value ? String(cfCell.value).toLowerCase() : "";
      if (cfVal.includes("moved")) {
        cfCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF9C3" }, // Soft Yellow background
        };
        cfCell.font = { color: { argb: "FF854D0E" }, bold: true };
      } else if (cfVal.includes("deleted") || cfVal.includes("removed")) {
        cfCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" }, // Soft Red background
        };
        cfCell.font = { color: { argb: "FFEF4444" }, bold: true };
      } else if (cfVal.includes("added")) {
        cfCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDCFCE7" }, // Soft Green background
        };
        cfCell.font = { color: { argb: "FF166534" }, bold: true };
      }
    });
  }

  const formatDateMMDDYY = (date: Date = new Date()) => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  };
  const dateStr = formatDateMMDDYY();

  const reportFileName = getReportTitle(globalScanType);

  const buffer = await wb.xlsx.writeBuffer();
  await downloadOrSaveFile(`${reportFileName}.xlsx`, new Blob([buffer as BlobPart]), targetDir);
  return `${reportFileName}.xlsx`;
}
