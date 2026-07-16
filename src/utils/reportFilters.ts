import { MediaItem, RuleCriteria, isMusicCategory } from "../types";
import { evaluatePlexCompatibility, isMissingSubtitles, hasBadSubtitles } from "./plexEvaluator";
import { getScanType } from "./reportExporter";
import { getMissingMetadataTags } from "./excelExporter";

export function filterItemsForReport(
  items: MediaItem[],
  rules: RuleCriteria
): MediaItem[] {
  const scanType = getScanType(rules, items);

  return items.filter((item) => {
    // 1. Discovery Report: Exclude Corrupted files as they are covered by the Bad Files Audit.
    if (scanType === "Discovery Scan") {
      return item.category !== "Corrupted";
    }

    // 2. Streaming Compatibility Report ("Stream Audit Scan"): Focus on streaming media (excluding music)
    if (scanType === "Stream Audit Scan") {
      if (isMusicCategory(item.category)) return false;
      if (item.category === "Static" || item.category === "Corrupted") return false;
      return true;
    }

    // 3. Metadata Report ("Metadata Scan" etc.): ONLY files that are missing metadata.
    if (
      scanType === "Metadata Scan" ||
      scanType === "Video Metadata Scan" ||
      scanType === "Music Metadata Scan"
    ) {
      if (item.category === "Static" || item.category === "Corrupted") return false;
      if (scanType === "Video Metadata Scan" && isMusicCategory(item.category)) return false;
      if (scanType === "Music Metadata Scan" && !isMusicCategory(item.category)) return false;

      // Evaluate what missing metadata is
      const missingTags = getMissingMetadataTags(item);
      if (missingTags.length === 0) return false;
      return true;
    }

    // 4. Media Duplication Report ("Duplication Scan"): Only tabs based on scan results (Duplicates only)
    if (scanType === "Duplication Scan") {
      return true;
    }

    // 5. Quality Audit Report ("Anomaly Scan"): Only include data for media that fits the criteria for remediation.
    if (scanType === "Anomaly Scan") {
      const evalResult = evaluatePlexCompatibility(item, rules);
      return !!evalResult.isAnomaly;
    }

    // 6. Subtitle Audit Report ("Subtitle Scan"): Only media missing subtitles or forcing transcoding.
    if (scanType === "Subtitle Scan") {
      return hasBadSubtitles(item) || isMissingSubtitles(item);
    }

    // 7. Corrupted & Failed files Report ("Corrupted Audit"): Only corrupted.
    if (scanType === "Corrupted Audit") {
      if (item.category !== "Corrupted") return false;
      return true;
    }

    return true;
  });
}


