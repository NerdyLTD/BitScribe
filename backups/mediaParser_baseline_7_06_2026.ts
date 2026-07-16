import { MediaItem } from "../types";

export const EXTRAS_REGEX = /\b(extras|bonus(?: features)?|bonus disc|behind[ _\-]?the[ _\-]?scenes|featurettes|shorts|deleted[ _\-]?scenes|commentar(?:y|ies)|interview(?:s)?|promos|trailers|bloopers|gag[ _\-]?reel|outtakes)\b/i;

export function extractSeasonNumber(dir: string): string | null {
  const d = dir.trim();
  const seasonMatch = d.match(/season\s*(\d{1,2})/i);
  if (seasonMatch) return seasonMatch[1];

  const sMatch = d.match(
    /(?:^|[\s\-_._\(\[\\/])s(\d{1,2})(?:$|[\s\-_._\)\]])/i,
  );
  if (sMatch) return sMatch[1];

  const sEndMatch = d.match(/s(\d{1,2})$/i);
  if (sEndMatch) return sEndMatch[1];

  const seriesMatch = d.match(/series\s*(\d{1,2})/i);
  if (seriesMatch) return seriesMatch[1];

  return null;
}

export function getExtrasGroupTitle(item: MediaItem): string {
  const parts = (item.filePath || "").split(/[\\\/]/).filter(Boolean);
  let groupTitle = "Other Extras";
  const extraIdx = parts.findIndex((p) => EXTRAS_REGEX.test(p));
  if (extraIdx > 0) {
    const designation = parts[extraIdx];
    let parentIdx = extraIdx - 1;
    while (parentIdx > 0) {
      const pName = parts[parentIdx];
      const isSeason = extractSeasonNumber(pName) !== null;
      const isGenericRoot =
        /^(tv|tv shows|shows|series|docuseries|cartoons|anime|documentaries|movies|movie|film|films|video|videos|extras|music|audio|foreign)$/i.test(
          pName,
        );
      if (isSeason || isGenericRoot) {
        parentIdx--;
      } else {
        break;
      }
    }
    const parentName = parts[parentIdx] || "Unknown";
    groupTitle = `${parentName} - ${designation}`;
  } else {
    const parentName = parts.length > 1 ? parts[parts.length - 2] : "Unknown";
    groupTitle = `${parentName} - Extras`;
  }
  return groupTitle;
}

export const parseVideoMetadata = (item: MediaItem) => {
  const rawFilename = item.filename;
  const rawName = rawFilename.replace(/\.[a-z0-9]+$/i, "");

  const seMatch = rawName.match(
    /((?:[sS](?:eason)?\s*[\.\-]?\s*(\d{1,2})\s*[\.\-]?\s*)[eE](?:p|pisode)?\s*[\.\-]?\s*(\d{1,3})(?:(?:[-,\&]\s*(?:[eE](?:p|pisode)?)?|[\.\s]*[eE](?:p|pisode)?)\s*(\d{1,3}))?|\b(?:[eE](?:p|pisode)?|webisode)\s*[\.\-]?\s*(\d{1,3})(?:(?:[-,\&]\s*(?:[eE](?:p|pisode)?)?|[\.\s]*[eE](?:p|pisode)?)\s*(\d{1,3}))?|\b(\d{1,2})\s*x\s*(\d{1,3})\b|\b(\d{1,2})[ ]?of[ ]?(\d{1,3})\b)/i,
  );
  let yearMatch = rawName.match(/[\(\[]\s*(19\d{2}|20\d{2})\s*[\)\]]/);
  if (!yearMatch) {
    const allMatches = [...rawName.matchAll(/(?:^|[^a-zA-Z0-9])(19\d{2}|20\d{2})(?:[^a-zA-Z0-9]|$)/g)];
    if (allMatches.length > 0) {
       yearMatch = allMatches[allMatches.length - 1];
    }
  }

  let titleStr = rawName;
  let epTitle = "";
  let seasonNum = "-";
  let episodeNum = "-";
  let year = yearMatch ? yearMatch[1] : "-";

  const specialMatch = rawName.match(/\b(Special)s?\s*[\.\-]?\s*(\d{1,3})\b/i);

  if (seMatch) {
    titleStr = rawName.slice(0, seMatch.index);
    const afterMatch = rawName.slice(seMatch.index + seMatch[0].length);
    epTitle = afterMatch.replace(/^[._\-\s]+/, "");
    if (seMatch[3]) {
      seasonNum = seMatch[2] ? parseInt(seMatch[2], 10).toString() : "-";
      episodeNum = parseInt(seMatch[3], 10).toString();
      if (seMatch[4]) {
         episodeNum += "-" + parseInt(seMatch[4], 10).toString();
      }
    } else if (seMatch[5]) {
      seasonNum = "-";
      episodeNum = parseInt(seMatch[5], 10).toString();
      if (seMatch[6]) {
         episodeNum += "-" + parseInt(seMatch[6], 10).toString();
      }
    } else if (seMatch[7] && seMatch[8]) {
      seasonNum = parseInt(seMatch[7], 10).toString();
      episodeNum = parseInt(seMatch[8], 10).toString();
    } else if (seMatch[9] && seMatch[10]) {
      seasonNum = "-";
      episodeNum = parseInt(seMatch[9], 10).toString();
    }
  } else if (specialMatch) {
    titleStr = rawName.slice(0, specialMatch.index);
    const afterMatch = rawName.slice(specialMatch.index + specialMatch[0].length);
    epTitle = afterMatch.replace(/^[._\-\s]+/, "");
    seasonNum = "Special";
    episodeNum = parseInt(specialMatch[2], 10).toString();
  }

  const cleanTitleText = (str: string, y: string) => {
    let cleanStr = str;
    const junkMatch = cleanStr.match(/[-_.\s\(]?(\d{3,4}p|4k|bluray|web-?dl|webrip|dvdrip|brrip|bdrip|[hx]\.?26[45]|hevc|repack|remux|pdtv|hdtv|sdtv|xvid|divx|aac|ac3|dts|mvgroup\\.?org)\b/i);
    if (junkMatch) {
      cleanStr = cleanStr.slice(0, junkMatch.index);
    }
    
    // Remove "+ C" anomaly
    cleanStr = cleanStr.replace(/\s*\+\s*C\b/i, "");

    let tempClean = cleanStr.replace(/[\{\[].*?[\}\]]/g, " ").trim();
    if (tempClean.length > 0) {
      cleanStr = tempClean;
    } else {
      cleanStr = cleanStr.replace(/[\{\[\}\]]/g, " ").trim();
    }

    if (y !== "-" && cleanStr.includes(y)) {
      const yearSuffixRegex = new RegExp(`(?:_-_|\\s-\\s|[\\(\\[])` + y + `(?:.*)$`, "i");
      const suffixMatch = cleanStr.match(yearSuffixRegex);
      if (suffixMatch) {
         cleanStr = cleanStr.slice(0, suffixMatch.index);
      } else {
        if (cleanStr.replace(new RegExp("[({\\[]?" + y + "[)}\\]]?"), "").replace(/[^a-zA-Z]/g, "").length > 0) {
           cleanStr = cleanStr.replace(new RegExp("[({\\[]?" + y + "[)}\\]]?"), " ").trim();
        }
      }
    }
    return cleanStr
      .replace(/[._]/g, " ")
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[\{\[\}\]]/g, "")
      .replace(/\s*-\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const catLower = (item.category || "").toLowerCase();
  const isTvShow =
    catLower.includes("tv") ||
    catLower.includes("show") ||
    catLower.includes("series") ||
    catLower.includes("docuseries");

  const parts = (item.filePath || "").split(/[\\\/]/).filter(Boolean);
  if (parts.length >= 2) {
    let rootIdx = -1;
    const genericRoots =
      /^(tv|tv shows|shows|series|docuseries|cartoons|anime|documentaries|movies|movie|film|films|video|videos|extras|music|audio|foreign)$/i;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (/^[a-z]:$/i.test(p) || genericRoots.test(p)) {
        rootIdx = i;
      } else if (
        /^[A-Z]$/i.test(p) ||
        p === "1,2,3" ||
        /^[0-9]+(-[0-9]+)?$/.test(p) ||
        /^#[0-9]?$/.test(p)
      ) {
        rootIdx = i;
      } else {
        break;
      }
    }

    if (rootIdx >= 0 && rootIdx + 1 < parts.length) {
      const seriesTitleFound = parts[rootIdx + 1];
      let cleanSeriesTitle = seriesTitleFound
        .replace(/[._\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const folderYearMatch = cleanSeriesTitle.match(
        /\(?\[?(19\d{2}|20\d{2})\]?\)?/,
      );
      if (folderYearMatch && (year === "-" || !year)) {
        year = folderYearMatch[1];
      }
      cleanSeriesTitle = cleanSeriesTitle
        .replace(/\(?\[?(19\d{2}|20\d{2})\]?\)?/g, "")
        .trim();

      let seasonExtracted = "";
      for (let i = rootIdx + 2; i < parts.length - 1; i++) {
        const dir = parts[i];
        const extracted = extractSeasonNumber(dir);
        if (extracted !== null) {
          seasonExtracted = extracted;
          break;
        } else if (EXTRAS_REGEX.test(dir)) {
          seasonExtracted = "Extras";
          break;
        }
      }

      if (isTvShow || seasonExtracted !== "" || titleStr === "Unknown") {
        if (cleanSeriesTitle.length > 0) {
          if (seasonExtracted === "Extras" && !epTitle) {
             epTitle = titleStr;
          }
          titleStr = cleanSeriesTitle;
        }
        if (seasonExtracted !== "") seasonNum = seasonExtracted;

        if (!seMatch && (epTitle === "" || epTitle === "-")) {
          const baseName = parts[parts.length - 1]
            .replace(/\.[^/.]+$/, "");
          if (titleStr.toLowerCase() !== baseName.toLowerCase()) {
            let newEpTitle = baseName;
            
            if (seriesTitleFound) {
               const seriesFoundPrefixRegex = new RegExp(`^${seriesTitleFound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-_]*\\s*`, 'i');
               if (seriesFoundPrefixRegex.test(newEpTitle)) {
                  newEpTitle = newEpTitle.replace(seriesFoundPrefixRegex, '');
               } else if (cleanSeriesTitle) {
                  const seriesPrefixRegex = new RegExp(`^${cleanSeriesTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-_]*\\s*`, 'i');
                  if (seriesPrefixRegex.test(newEpTitle)) {
                     newEpTitle = newEpTitle.replace(seriesPrefixRegex, '');
                  }
               }
            }
            
            const prefixMatch = newEpTitle.match(/^(?:Special|Season)\s*\d+[\s\-_]+(?:Episode\s*\d+[\s\-_]+)?/i) || 
                                newEpTitle.match(/^(?:S\d{1,2}E\d{1,3}|S\d{1,2}|E\d{1,3}|\d{1,2}x\d{1,3})[\s\-_]+/i);
            if (prefixMatch) {
               newEpTitle = newEpTitle.substring(prefixMatch[0].length);
            }
            
            epTitle = newEpTitle || baseName;
          }
        }
      }
    }
  }

  // Final cleanup on titles
  titleStr = titleStr !== "Unknown" ? (cleanTitleText(titleStr, year) || "Unknown") : "Unknown";
  if (epTitle && epTitle !== "-") {
    epTitle = cleanTitleText(epTitle, year);
  }

  return {
    title: titleStr,
    year: year,
    season: seasonNum,
    episode: episodeNum,
    epTitle: epTitle || "-",
  };
};
