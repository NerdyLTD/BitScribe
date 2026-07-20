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
    /([sS](\d{1,2})[eE](\d{1,2})|\b(\d{1,2})x(\d{1,2})\b|\b(\d{1,2})[ ]?of[ ]?(\d{1,2})\b)/i,
  );
  let yearMatch = rawName.match(/[\(\[]\s*(19\d{2}|20\d{2})\s*[\)\]]/);
  if (!yearMatch) {
    const allMatches = [...rawName.matchAll(/\b(19\d{2}|20\d{2})\b/g)];
    if (allMatches.length > 0) {
       yearMatch = allMatches[allMatches.length - 1];
    }
  }

  let titleStr = rawName;
  let epTitle = "";
  let seasonNum = "-";
  let episodeNum = "-";
  let year = yearMatch ? yearMatch[1] : "-";

  if (seMatch) {
    titleStr = rawName.slice(0, seMatch.index);
    const afterMatch = rawName.slice(seMatch.index + seMatch[0].length);
    epTitle = afterMatch.replace(/^[._\-\s]+/, "").replace(/\.[a-z0-9]+$/i, "");
    if (seMatch[2] && seMatch[3]) {
      seasonNum = parseInt(seMatch[2], 10).toString();
      episodeNum = parseInt(seMatch[3], 10).toString();
    } else if (seMatch[4] && seMatch[5]) {
      seasonNum = parseInt(seMatch[4], 10).toString();
      episodeNum = parseInt(seMatch[5], 10).toString();
    } else if (seMatch[6] && seMatch[7]) {
      seasonNum = "1";
      episodeNum = parseInt(seMatch[6], 10).toString();
    }
  }

  // Strip anything after common release markers
  const junkMatch = titleStr.match(/[-_.\s\(]?(1080p|720p|480p|4k|2160p|bluray|web-?dl|webrip|dvdrip|brrip|bdrip|x264|x265|hevc|repack)\b/i);
  if (junkMatch) {
      titleStr = titleStr.slice(0, junkMatch.index);
  }

  // Remove all bracketed content first!
  titleStr = titleStr.replace(/[\{\[\(].*?[\}\]\)]/g, " ");

  if (year !== "-" && titleStr.includes(year)) {
    // only remove year if it doesn't empty the title
    if (titleStr.replace(new RegExp("[({\\[]?" + year + "[)}\\]]?"), "").replace(/[^a-zA-Z]/g, "").length > 0) {
       titleStr = titleStr.replace(new RegExp("[({\\[]?" + year + "[)}\\]]?"), " ").trim();
    }
  }

  titleStr =
    titleStr
      .replace(/[._\-]/g, " ")
      .replace(/[\(\[\{]/g, "")
      .replace(/[\)\]\}]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Unknown";

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
            .replace(/\.[^/.]+$/, "")
            .replace(/[._\-]/g, " ")
            .trim();
          if (titleStr.toLowerCase() !== baseName.toLowerCase()) {
            epTitle = baseName;
          }
        }
      }
    }
  }

  return {
    title: titleStr,
    year: year,
    season: seasonNum,
    episode: episodeNum,
    epTitle: epTitle || "-",
  };
};
