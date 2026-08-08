import { useMemo } from 'react';
import { MediaItem, RuleCriteria, isMusicCategory, getCategoryGroup } from '@bitscribe/core-types';
import { evaluatePlexCompatibility, computeDuplicatesMap, getDuplicatePairRows, isMissingSubtitles, getMissingMetadataTags } from '@bitscribe/core-eval';

export function useDashboardMetrics(items: MediaItem[], customRules: RuleCriteria) {
  return useMemo(() => {
    let unfriendly = 0;
    let warnings = 0;
    let checks = 0;

    let subMissing = 0;
    let hdrCount = 0;
    let highBitrate = 0;
    let badContainer = 0;
    let invalidVideo = 0;
    let missingMeta = 0;
    let corruptCount = 0;
    let duplicateCount = 0;
    let totalWastedSpace = 0;

    let discoveryPassed = 0;
    let totalEvaluated = 0;
    let totalMusic = 0;

    const duplicatesMap = computeDuplicatesMap(items, customRules);
    
    // Only check missing metadata if doing a metadata scan
    const doMetaCheck = customRules.useMetadataScan || customRules.useVideoMetadataScan || customRules.useMusicMetadataScan;

    items.forEach((item) => {
      // Duplications
      const isDup = duplicatesMap.get(item.id) ?? false;
      if (customRules.useDuplicationScan && isDup && item.category !== "Corrupted" && item.category !== "Static") {
         duplicateCount++;
      }

      if (item.category === "Corrupted") {
        corruptCount++;
        return;
      }
      if (item.category === "Static" || item.category === "Extras") return;

      totalEvaluated++;

      if (isMusicCategory(item.category)) {
        totalMusic++;
      }

      const evalResult = evaluatePlexCompatibility(item, customRules, isDup);
      checks += evalResult.checksPassed;

      // Anomalies using unified evaluator
      if (evalResult.reasons.some(r => r.includes("HDR"))) hdrCount++;
      if (evalResult.reasons.some(r => r.includes("Bitrate exceeds"))) highBitrate++;
      if (evalResult.reasons.some(r => r.includes("Container"))) badContainer++;
      if (evalResult.reasons.some(r => r.includes("Video codec"))) invalidVideo++;

      // Missing Subtitles
      if (!isMusicCategory(item.category)) {
        if (isMissingSubtitles(item, customRules)) {
          subMissing++;
        }
      }

      // Missing Metadata Tags
      if (doMetaCheck) {
        const missing = getMissingMetadataTags(item);
        if (missing.length > 0) {
          missingMeta++;
        } else {
          discoveryPassed++;
        }
      } else {
         if (evalResult.level === "unfriendly") {
           unfriendly++;
         } else if (evalResult.level === "warning") {
           warnings++;
         } else {
           discoveryPassed++;
         }
      }
    });

    if (customRules.useDuplicationScan) {
      const itemsForDups = items.filter(i => i.category !== "Corrupted" && i.category !== "Static");
      const dupRows = getDuplicatePairRows(itemsForDups, customRules);
      const filteredItemIds = new Set(items.map(i => i.id));
      const visiblePairs = dupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
      totalWastedSpace = visiblePairs.reduce((sum, pair) => sum + (pair.dupSizeGB || 0), 0);
    }

    // Normalized maximum possible checks per file for metadata completeness
    if (doMetaCheck) {
      checks = totalEvaluated * 6;
    }

    return {
      unfriendly,
      warnings,
      checks,
      subMissing,
      hdrCount,
      highBitrate,
      badContainer,
      invalidVideo,
      missingMeta,
      corruptCount,
      duplicateCount,
      totalWastedSpace,
      discoveryPassed,
      totalEvaluated,
      totalMusic,
      duplicatesMap
    };
  }, [items, customRules]);
}
