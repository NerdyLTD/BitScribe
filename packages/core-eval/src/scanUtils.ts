
import { MediaItem, RuleCriteria, getCategoryGroup } from '@bitscribe/core-types';

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
  } else if (rules.useModernPreset && rules.useLegacyPreset) {
    scanType = "Stream Audit Scan";
  } else if (rules.useModernPreset) {
    scanType = "Modern Audit Scan";
  } else if (rules.useLegacyPreset) {
    scanType = "Legacy Audit Scan";
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
  } else if (
    rules.useCorruptedScan || 
    (items.length > 0 && items.every((i) => i.category === "Corrupted"))
  ) {
    scanType = "Corrupted Audit";
  } else {
    scanType = "Stream Audit Scan"; // default
  }
  return scanType;
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

  const catGroup = getCategoryGroup(item.category || "");
  const isTV = catGroup === "TV";
  const isMovie = catGroup === "Movies";
  const isMusic = catGroup === "Music";

  if (isMovie) {
    if (!tags.director && !tags.DIRECTOR) missing.push("Director");
    if (!tags.writer && !tags.WRITER) missing.push("Writer");
    if (!tags.cast && !tags.CAST && !tags.actors && !tags.ACTORS && !tags.actor && !tags.ACTOR)
      missing.push("Cast/Actors");
    if (!tags.studio && !tags.STUDIO && !tags.publisher && !tags.PUBLISHER && !tags.network && !tags.NETWORK)
      missing.push("Studio");
  } else if (isTV) {
    if (!tags.show && !tags.SHOW && !tags.series && !tags.SERIES)
      missing.push("Show Title");
    if (!tags.writer && !tags.WRITER) missing.push("Writer");
    if (!tags.cast && !tags.CAST && !tags.actors && !tags.ACTORS && !tags.actor && !tags.ACTOR)
      missing.push("Cast/Actors");
    if (!tags.studio && !tags.STUDIO && !tags.network && !tags.NETWORK && !tags.publisher && !tags.PUBLISHER)
      missing.push("Studio");
  } else if (isMusic) {
    if (!tags.artist && !tags.ARTIST) missing.push("Artist");
    if (!tags.album && !tags.ALBUM) missing.push("Album");
    if (!tags.album_artist && !tags.ALBUM_ARTIST) missing.push("Album Artist");
    if (!tags.track && !tags.TRACK && !tags.tracknumber && !tags.TRACKNUMBER) missing.push("Track");
    if (!tags.disc && !tags.DISC) missing.push("Disc");
  }

  return missing;
}

export function getReportTitle(scanType: string): string {
  if (scanType === "Discovery Scan") return "Discovery Audit";
  if (scanType === "Stream Audit Scan") return "Stream Audit";
  if (scanType === "Subtitle Scan") return "Subtitle Audit";
  if (scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan") return "Metadata Audit";
  if (scanType === "Duplication Scan") return "Duplicates Audit";
  if (scanType === "Corrupted Audit") return "Bad Files Audit";
  if (scanType === "Anomaly Scan") return "Quality Audit";
  return "Media Library Audit";
}

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

export const getFolderPath = (filepath: string, filename: string) => {
  const p = filepath.substring(0, filepath.lastIndexOf(filename));

  return p.endsWith("/") || p.endsWith("\\") ? p.slice(0, -1) : p;
};
