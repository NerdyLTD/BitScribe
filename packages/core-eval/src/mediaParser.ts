import { MediaItem } from '@bitscribe/core-types';

export const EXTRAS_REGEX = /\b(extras|bonus(?: features)?|bonus disc|behind[ _\-]?the[ _\-]?scenes|featurettes|shorts|deleted[ _\-]?scenes|commentar(?:y|ies)|interview(?:s)?|promos|trailers|bloopers|gag[ _\-]?reel|outtakes)\b/i;

export function extractSeasonNumber(dir: string): string | null {
  const d = dir.trim();
  const seasonMatch = d.match(/season\s*(\d{1,2})/i);
  if (seasonMatch) return parseInt(seasonMatch[1], 10).toString();

  const sMatch = d.match(
    /(?:^|[\s\-_._\(\[\\/])s(\d{1,2})(?:$|[\s\-_._\)\]])/i,
  );
  if (sMatch) return parseInt(sMatch[1], 10).toString();

  const sEndMatch = d.match(/s(\d{1,2})$/i);
  if (sEndMatch) return parseInt(sEndMatch[1], 10).toString();

  const seriesMatch = d.match(/series\s*(\d{1,2})/i);
  if (seriesMatch) return parseInt(seriesMatch[1], 10).toString();

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

export function cleanReleaseGroups(str: string): string {
  let s = str.trim();

  // Strip URLs (like http://... or https://... or www...)
  s = s.replace(/https?:\/\/\S+|www\.\S+/gi, "");

  // Strip domain names (like domain.cr, domain.com, etc. - excluding 'me' and 'tv' which are common title words)
  s = s.replace(/\b[a-zA-Z0-9\-]+\.(?:com|net|org|cr|co|mx|ws|cc|xyz|info|biz|mkv|mp4|avi)\b/gi, "");

  // Clean trailing punctuation left over by URL removal (e.g. trailing commas, hyphens, slashes)
  s = s.replace(/[,;:\-\s\\/]+$/, "").trim();

  const KNOWN_GROUPS = [
    // Premium 4K / Bluray / REMUX Groups
    "FRACTION", "FGT", "EPSILON", "WiKi", "DON", "CtrlHD", "GLaDOS", "AMIABLE", "EVO", "FraMeSToR", "TayTO", "EbP", "Grym",
    
    // WEB-DL / Streaming Aggregators
    "NTb", "FLUX", "GGWP", "KOGi", "KINGS", "CAKE", "KASHMIR", "ION10", "SVA", "mSD", "Chocgasm",
    
    // Highly Compressed / Budget Encode Groups
    "YIFY", "YTS", "PSA", "QxR", "GalaxyRG", "Tigole", "MeGusta", "RARBG", "TGX", "Pahe", "Silence", "Joy", "VyTO",
    
    // Top-Tier Music & Lossless/FLAC Groups
    "PERFECT", "CHOIR", "TL", "WRE", "STRV", "GMA", "AMRAP", "AMRAPS", "Fua", "RED", "PLUTON", "RNS",
    
    // Classic/Legendary Game & Scene Groups
    "DEViANCE", "RELOADED", "CODEX", "SKIDROW", "Razor1911", "FAiRLiGHT", "HOODLUM", "PARADOX", "maVen", "SPARKS", "ROVERS", "DRONES", "GECKOS", "Deflate", "BiH", "SiGMA",
    
    // Extra Scene / Uploader / Ripping Group Spam
    "RMTeam", "RMZ"
  ];

  // Remove known groups with preceding separator at the end
  for (const group of KNOWN_GROUPS) {
    const groupEscaped = group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match -Group, .Group, _Group at the very end of the string, optionally followed by .domain (like .mx, .me, etc.) and optional brackets
    const endPattern = new RegExp(`[-_.\\s\\(\\[,]+${groupEscaped}(?:\\.[a-zA-Z0-9]+)?(?:\\s*[\\]\\)])?$`, 'i');
    s = s.replace(endPattern, '');
  }

  // Remove known prepended groups with following separator at the beginning of the string
  for (const group of KNOWN_GROUPS) {
    let groupPatternStr = group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (group === "GalaxyRG") {
      groupPatternStr = "Galaxy[\\s\\-_]?RG";
    } else if (group === "RMTeam") {
      groupPatternStr = "RM[\\s\\-_]?Team";
    }

    // Require a strong separator like hyphen, vertical bar, colon, or underscore (avoid matching simple space)
    const startPattern = new RegExp(`^(?:${groupPatternStr})\\s*[-_|:]\\s*`, 'i');
    s = s.replace(startPattern, '');
  }

  // Also match general trailing hyphen group pattern if it's not a common suffix and has at least one uppercase letter (or digits) to be extremely safe
  const EXCLUDE_SUFFIXES = /^(man|men|woman|boy|girl|child|baby|one|two|three|four|five|six|seven|eight|nine|ten|part|vol|volume|book|season|episode|special|extras|bonus|deleted|scene|promo|trailer|teaser|live|mix|remix|dub|sub|raw|cut|version|edit|uncut|extended|remaster|remastered|repack|proper|internal|limited|unrated|theatrical|directors?|imax|3d|2d|uhd|hd|sd|mp3|flac|aac|wav|m4a|mp4|mkv|avi|mpg|mpeg|force|rex|fi|hop|up|order|stop|class|production|laws|op|pop|show|series|film|music|video)$/i;

  const trailingHyphenMatch = s.match(/-([a-zA-Z0-9_]+)$/);
  if (trailingHyphenMatch) {
    const candidateGroup = trailingHyphenMatch[1];
    if (!EXCLUDE_SUFFIXES.test(candidateGroup)) {
      // Only strip generic hyphen suffixes if they are not entirely lowercase, OR if they contain a digit/mix of case
      const isPlainLowercase = /^[a-z0-9_]+$/.test(candidateGroup);
      if (!isPlainLowercase || candidateGroup.length >= 3) {
        s = s.slice(0, trailingHyphenMatch.index);
      }
    }
  }

  return s.trim();
}

export function isValidMetadataTitle(title: string, isTv: boolean = false): boolean {
  if (!title) return false;
  const t = title.trim();
  if (t === "" || t.toLowerCase() === "unknown" || t === "-") return false;

  // 1. Check for file extensions (e.g. .mkv, .mp4, .avi) at the end
  if (/\.(mkv|mp4|avi|mov|mpg|mpeg|flv|wmv|m4v)$/i.test(t)) {
    return false;
  }

  // 2. Check for URLs or domain names (e.g. www.site.com, site.net, https://...)
  if (/https?:\/\/\S+|www\.\S+|\b[a-zA-Z0-9\-]+\.(?:com|net|org|cr|co|mx|ws|cc|xyz|info|biz|me|tv|mkv|mp4)\b/i.test(t)) {
    return false;
  }

  // 3. Check for technical quality / rip tags (extraneous technical data)
  const techRegex = /\b(1080p|720p|2160p|4k|uhd|bluray|web-?dl|webrip|dvdrip|brrip|bdrip|dvdscr|repack|remux|pdtv|hdtv|sdtv|dsr|xvid|divx|truehd|atmos|dts-hd|ddp5\.1|dd5\.1|e-ac3|ac3|aac|flac|mp3_320|mp3_v0|mvgroup\\.?org|h\.?264|x\.?264|h\.?265|x\.?265|hevc|av1|avc|multi|subs?|dubbed)\b/i;
  if (techRegex.test(t)) {
    return false;
  }

  // 4. Check for season/episode coding (e.g. S01E01, S01, E01, 1x01, Season 1, etc.)
  const seCodeRegex = /\b(s\d{1,2}e\d{1,3}|s\d{1,2}|e\d{1,3}|\d{1,2}x\d{1,3})\b/i;
  if (seCodeRegex.test(t)) {
    return false;
  }
  const seWordsRegex = /\b(season|episode)\s*\d+/i;
  if (seWordsRegex.test(t)) {
    return false;
  }

  // 5. Check for known release groups (case-insensitive)
  const groups = [
    "FRACTION", "FGT", "EPSILON", "WiKi", "DON", "CtrlHD", "GLaDOS", "AMIABLE", "EVO", "FraMeSToR", "TayTO", "EbP", "Grym",
    "NTb", "FLUX", "GGWP", "KOGi", "KINGS", "CAKE", "KASHMIR", "ION10", "SVA", "mSD", "Chocgasm",
    "YIFY", "YTS", "PSA", "QxR", "GalaxyRG", "Tigole", "MeGusta", "RARBG", "TGX", "Pahe", "Silence", "Joy", "VyTO",
    "PERFECT", "CHOIR", "TL", "WRE", "STRV", "GMA", "AMRAP", "AMRAPS", "Fua", "RED", "PLUTON", "RNS",
    "DEViANCE", "RELOADED", "CODEX", "SKIDROW", "Razor1911", "FAiRLiGHT", "HOODLUM", "PARADOX", "maVen", "SPARKS", "ROVERS", "DRONES", "GECKOS", "Deflate", "BiH", "SiGMA",
    "RMTeam", "RMZ", "DLKING", "RARBG", "VXT", "TBD", "Snoop", "Gano", "YIFY", "YTS", "MkvCage"
  ];
  
  const cleanT = t.toLowerCase();
  for (const g of groups) {
    if (cleanT === g.toLowerCase()) {
      return false;
    }
  }

  // 6. Check for all-uppercase word that is likely a group name / acronym (excluding common short words)
  const isAllUpperCaseWord = /^[A-Z0-9_\-]{3,12}$/.test(t);
  const commonShortWords = /^(the|and|for|you|our|new|old|man|men|boy|girl|one|two|red|big|bad|out|run|spy|war|raw|sub|dub|cut|fit|map|art|app|zip)$/i;
  if (isAllUpperCaseWord && !commonShortWords.test(t)) {
    const hasVowels = /[AEIOUYaeiouy]/.test(t);
    if (!hasVowels || t.length >= 5) {
      return false;
    }
  }

  // 7. Check for ratio of letters to overall string length (avoid hashes / junk punctuation)
  const lettersCount = (t.match(/[a-zA-Z0-9]/g) || []).length;
  if (t.length > 0 && lettersCount / t.length < 0.3) {
    return false;
  }

  return true;
}

export function cleanEmbeddedTitle(embTitle: string, showTitle?: string): string {
  let s = embTitle.trim();

  // Strip show title prefix if present
  if (showTitle) {
    const escapedShow = showTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const showPrefixRegex = new RegExp(`^${escapedShow}\\s*[-_~:\\|\\s]+`, 'i');
    s = s.replace(showPrefixRegex, '');
  }

  // Strip season/episode codes
  s = s.replace(/\b(s\d{1,2}e\d{1,3}|s\d{1,2}|e\d{1,3}|\d{1,2}x\d{1,3})\b/gi, '');
  s = s.replace(/\b(season|episode)\s*\d+/gi, '');

  // Strip technical/rip terms and release groups
  s = cleanReleaseGroups(s);

  // Clean remaining dots/underscores/separators
  s = s.replace(/[._\-]/g, " ")
       .replace(/^[|:\-\s\\/]+/, "")
       .replace(/\s*-\s*$/, "")
       .replace(/\s+/g, " ")
       .trim();

  return s;
}

export const parseVideoMetadata = (item: MediaItem) => {
  const rawFilename = item.filename;
  const rawName = rawFilename.replace(/\.[a-z0-9]+$/i, "");

  // Helper to extract case-insensitive tag values safely
  const getTag = (keys: string[]): string | undefined => {
    if (!item.tags) return undefined;
    for (const k of keys) {
      const foundKey = Object.keys(item.tags).find(tk => tk.toLowerCase() === k.toLowerCase());
      if (foundKey && item.tags[foundKey]) {
        return String(item.tags[foundKey]).trim();
      }
    }
    return undefined;
  };

  const embeddedShow = getTag(['show', 'show_name', 'series', 'tvshow', 'show_title', 'series_title']);
  const embeddedTitle = getTag(['title', 'track_title', 'episode_title']);
  const embeddedSeason = getTag(['season_number', 'season', 'seasonnumber']);
  const embeddedEpisode = getTag(['episode_id', 'episode', 'episode_number', 'episodenumber', 'track']);

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

  // Also extract year from embedded title if available
  let embeddedYearMatch = embeddedTitle ? embeddedTitle.match(/(?:^|[^a-zA-Z0-9])(19\d{2}|20\d{2})(?:[^a-zA-Z0-9]|$)/) : null;

  let titleStr = rawName;
  let epTitle = "";
  let seasonNum = "-";
  let episodeNum = "-";
  
  // Resolve year with high priority sources (filename, embedded title) and avoid container 2026 if other sources exist
  let year = "-";
  if (yearMatch) {
    year = yearMatch[1];
  } else if (embeddedYearMatch) {
    year = embeddedYearMatch[1];
  } else if (item.year && item.year > 0 && item.year !== 2026) {
    year = item.year.toString();
  }

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

  if ((seasonNum === "-" || !seasonNum) && embeddedSeason) {
    seasonNum = embeddedSeason;
  }
  if ((episodeNum === "-" || !episodeNum) && embeddedEpisode) {
    const slashIdx = embeddedEpisode.indexOf('/');
    episodeNum = slashIdx !== -1 ? embeddedEpisode.substring(0, slashIdx).trim() : embeddedEpisode;
  }

  const cleanTitleText = (str: string, y: string) => {
    let cleanStr = cleanReleaseGroups(str);
    const junkMatch = cleanStr.match(/[-_.\s\(]?(\d{3,4}p|4k|uhd|bluray|web-?dl|webrip|dvdrip|brrip|bdrip|dvdscr|[hx]\.?26[45]|hevc|av1|avc|repack|remux|pdtv|hdtv|sdtv|dsr|xvid|divx|truehd|atmos|dts-hd(?:\.ma)?|dts\.?x|ddp5\.1|dd5\.1|e-ac3|ac3|aac|flac|mp3_320|mp3_v0|mvgroup\\.?org)\b/i);
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
      const yearSuffixRegex = new RegExp(`(?:_-_|\\s-\\s|[\\(\\[\\s])` + y + `(?:.*)$`, "i");
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
      .replace(/^[|:\-\s\\/]+/, "") // Strip leading vertical bars, hyphens, colons, slashes, and spaces
      .replace(/\s*-\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const catLower = (item.category || "").toLowerCase();
  const isTvShow =
    catLower.includes("tv") ||
    catLower.includes("show") ||
    catLower.includes("series") ||
    catLower.includes("docuseries") ||
    catLower.includes("anime") ||
    embeddedShow !== undefined ||
    embeddedSeason !== undefined ||
    (seasonNum !== "-" && seasonNum !== "Special");

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
        if (cleanSeriesTitle.length > 0 && !/^(stuff|slob|downloads|new folder|temp|unsorted|media|data|app|shared|unsorted|incoming|content|steward|bitscribe)$/i.test(cleanSeriesTitle)) {
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

  // Validate and apply high-quality embedded metadata tags if available with fallbacks
  const cleanedFilenameTitle = cleanTitleText(titleStr, year);
  const isFilenameTitleKnown = cleanedFilenameTitle && 
                               cleanedFilenameTitle.toLowerCase() !== "unknown" && 
                               cleanedFilenameTitle.trim() !== "" &&
                               isValidMetadataTitle(cleanedFilenameTitle, isTvShow);

  if (isTvShow) {
    let finalShowTitle = "Unknown";
    let cleanedEmbShow = embeddedShow ? cleanEmbeddedTitle(embeddedShow) : "";
    
    if (isFilenameTitleKnown) {
      finalShowTitle = cleanedFilenameTitle;
    } else if (cleanedEmbShow && isValidMetadataTitle(cleanedEmbShow, true)) {
      finalShowTitle = cleanedEmbShow;
    } else {
      if (embeddedShow && isValidMetadataTitle(embeddedShow, true)) {
        finalShowTitle = cleanEmbeddedTitle(embeddedShow);
      } else {
        finalShowTitle = "Unknown";
      }
    }
    titleStr = finalShowTitle;

    const cleanedFilenameEpTitle = (epTitle && epTitle !== "-") ? cleanTitleText(epTitle, year) : "";
    const isFilenameEpTitleKnown = cleanedFilenameEpTitle && 
                                   cleanedFilenameEpTitle.toLowerCase() !== "unknown" && 
                                   cleanedFilenameEpTitle.trim() !== "" &&
                                   isValidMetadataTitle(cleanedFilenameEpTitle, true);

    let finalEpTitle = "-";
    if (isFilenameEpTitleKnown) {
      finalEpTitle = cleanedFilenameEpTitle;
    } else if (embeddedTitle) {
      const cleanedEmbEp = cleanEmbeddedTitle(embeddedTitle, titleStr);
      if (cleanedEmbEp && isValidMetadataTitle(cleanedEmbEp, true)) {
        finalEpTitle = cleanedEmbEp;
      }
    }
    epTitle = finalEpTitle;

  } else {
    let finalMovieTitle = "Unknown";
    let cleanedEmbTitle = embeddedTitle ? cleanEmbeddedTitle(embeddedTitle) : "";
    
    if (isFilenameTitleKnown) {
      finalMovieTitle = cleanedFilenameTitle;
    } else if (cleanedEmbTitle && isValidMetadataTitle(cleanedEmbTitle, false)) {
      finalMovieTitle = cleanedEmbTitle;
    } else {
      if (embeddedTitle && isValidMetadataTitle(embeddedTitle, false)) {
        finalMovieTitle = cleanEmbeddedTitle(embeddedTitle);
      } else {
        finalMovieTitle = "Unknown";
      }
    }
    titleStr = finalMovieTitle;
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
