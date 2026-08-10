import {
  MediaItem,
  RenamePatternConfig,
  RenameCandidate,
  EpisodicFormat,
  ArticleOption,
  CaseStyle,
  DelimiterOption,
} from '@bitscribe/core-types';

/**
 * Extracts a clean show or movie title from tags, filename, or folder structure,
 * stripping season/episode indicators and technical resolution/codec metadata.
 */
export function extractCleanShowTitle(item: MediaItem): string {
  // If tags.title exists and doesn't contain season/episode code or resolution, prefer it!
  if (item.tags?.title) {
    const t = item.tags.title;
    if (!/S\d+E\d+|\d+x\d+|\b(1080p|720p|2160p|4K|HEVC|x264|H\.264)\b/i.test(t)) {
      return t;
    }
  }

  // Next, try extracting show name from filename before S01E02 or 1x02 or year
  const filename = item.filename;
  const match = filename.match(/^(.*?)[.\s_\-](?:S\d+E\d+|\d+x\d+|S\d+|(?:19|20)\d{2})/i);
  if (match && match[1]) {
    const candidate = match[1].replace(/[._]+/g, ' ').trim();
    if (candidate.length > 1) return candidate;
  }

  // Next, try parent folder from filePath e.g. T:\TV Shows\Stranger Things\Season 04\...
  if (item.filePath) {
    const parts = item.filePath.split(/[/\\]+/);
    const seasonIdx = parts.findIndex((p) => /^Season\s*\d+$/i.test(p) || /^S\d+$/i.test(p));
    if (seasonIdx > 0) {
      return parts[seasonIdx - 1];
    }
    // Or folder right above filename if it looks like a show name
    if (parts.length >= 2) {
      const parent = parts[parts.length - 2];
      if (!/^TV Shows|Movies|Music|Downloads|Season/i.test(parent)) {
        return parent.replace(/\s*\((?:19|20)\d{2}\)/, '').trim();
      }
    }
  }

  // Fallback: strip technical tags and numbers
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const cleaned = baseName
    .replace(/S\d+E\d+.*$/i, '')
    .replace(/\b(2160p|1080p|720p|480p|SD|HD|4K|UHD|HEVC|x264|x265|h264|H\.264|H264|AV1|VP9|MPEG2|MPEG4|VC1|AAC|AC3|EAC3|TrueHD|Atmos|DTS|DTSHD|FLAC|MP3|BluRay|WEBDL|WEB-DL|WEBRip|HDTV|PROPER|REPACK)\b/gi, '')
    .replace(/[._]+/g, ' ')
    .trim();

  return cleaned || baseName;
}

/**
 * Derives compact initials from a show or parent folder name.
 * e.g., "Buffy the Vampire Slayer" -> "BtVS"
 * e.g., "Game of Thrones" -> "GoT"
 * e.g., "Stranger Things" -> "ST"
 * e.g., "The Mandalorian" -> "TM"
 */
export function deriveInitials(
  title: string,
  singleWordMode: 'three_letters' | 'full_word' | 'single_letter' = 'three_letters'
): string {
  if (!title) return '';

  // Clean title first if it contains tech tags or S01E01
  let clean = title.replace(/S\d+E\d+.*$/i, '').trim();
  clean = clean.replace(
    /\b(2160p|1080p|720p|480p|SD|HD|4K|UHD|HEVC|x264|x265|h264|H\.264|H264|AV1|VP9|MPEG2|MPEG4|VC1|AAC|AC3|EAC3|TrueHD|Atmos|DTS|DTSHD|FLAC|MP3|BluRay|WEBDL|WEB-DL|WEBRip|HDTV|PROPER|REPACK)\b/gi,
    ''
  );

  const words = clean.split(/[\s_\-.:]+/).filter(Boolean);
  if (words.length === 0) return title.slice(0, 3).toUpperCase();

  if (words.length === 1) {
    const singleWord = words[0];
    if (singleWordMode === 'full_word') {
      return singleWord;
    }
    if (singleWordMode === 'single_letter') {
      return singleWord[0].toUpperCase();
    }
    // Default 'three_letters'
    if (singleWord.length <= 3) {
      return singleWord.toUpperCase();
    }
    return singleWord[0].toUpperCase() + singleWord.slice(1, 3).toLowerCase();
  }

  return words
    .map((word, idx) => {
      // Keep acronyms like "TNG" intact
      if (word.length <= 4 && word === word.toUpperCase() && !/^(the|a|an|of|and|for)$/i.test(word)) {
        return word;
      }
      const lower = word.toLowerCase();
      if (['of', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an'].includes(lower)) {
        return word[0].toLowerCase();
      }
      if (idx === 0 && lower === 'the') {
        return 'T';
      }
      if (lower === 'the') {
        return 't';
      }
      return word[0].toUpperCase();
    })
    .join('');
}

/**
 * Formats season and episode numbers according to the selected format.
 */
export function formatSeasonEpisode(
  season: number | undefined,
  episode: number | undefined,
  format: EpisodicFormat = 'S01E02'
): string {
  const s = Math.max(1, season || 1);
  const e = Math.max(1, episode || 1);
  const sPad = String(s).padStart(2, '0');
  const ePad = String(e).padStart(2, '0');

  switch (format) {
    case '1x02':
      return `${s}x${ePad}`;
    case 's1e2':
      return `s${s}e${e}`;
    case 'S01.E02':
      return `S${sPad}.E${ePad}`;
    case 'S01E02':
    default:
      return `S${sPad}E${ePad}`;
  }
}

/**
 * Strips or replaces OS illegal characters: / \ : * ? " < > |
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  return filename
    .replace(/[/\\?%*:|"<>]/g, '') // strip illegal chars
    .replace(/\s+/g, ' ')          // collapse multiple spaces
    .trim();
}

/**
 * Applies article rules (Keep, Strip, Move to End).
 */
export function applyArticleOption(text: string, option: ArticleOption = 'keep'): string {
  if (!text) return '';
  const match = text.match(/^(the|a|an)\s+(.*)$/i);
  if (!match) return text;

  const article = match[1];
  const rest = match[2];

  switch (option) {
    case 'strip':
      return rest;
    case 'move_to_end':
      return `${rest}, ${article.charAt(0).toUpperCase() + article.slice(1).toLowerCase()}`;
    case 'keep':
    default:
      return text;
  }
}

/**
 * Applies case styling to a string.
 */
export function applyCaseStyle(text: string, style: CaseStyle = 'clean_case'): string {
  if (!text) return '';

  switch (style) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'title_case':
      return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    case 'clean_case':
    default:
      return text.trim();
  }
}

/**
 * Replaces spaces with dots, dashes, or underscores if configured.
 */
export function applyDelimiter(text: string, delimiter: DelimiterOption = 'space'): string {
  if (!text) return '';
  switch (delimiter) {
    case 'dot':
      return text.replace(/\s+/g, '.');
    case 'dash':
      return text.replace(/\s+/g, '-');
    case 'underscore':
      return text.replace(/\s+/g, '_');
    case 'space':
    default:
      return text;
  }
}

/**
 * Extracts season/episode and episode title from a filename.
 * Strips video resolutions, codecs, and container info from episode titles.
 */
export function parseSeasonEpisodeFromFilename(filename: string): { season?: number; episode?: number; epTitle?: string } {
  // Helper to clean codec noise from episode title
  const cleanEpTitle = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    let title = raw.replace(/\.[^/.]+$/, '').trim();
    title = title
      .replace(/\b(2160p|1080p|720p|480p|SD|HD|4K|UHD|HEVC|x264|x265|h264|H\.264|H264|AV1|VP9|MPEG2|MPEG4|VC1|AAC|AC3|EAC3|TrueHD|Atmos|DTS|DTSHD|FLAC|MP3|BluRay|WEBDL|WEB-DL|WEBRip|HDTV|PROPER|REPACK)\b/gi, '')
      .replace(/[._\-]+/g, ' ')
      .trim();
    return title.length > 0 ? title : undefined;
  };

  // S01E02 or s01e02 or S1E2
  const seMatch = filename.match(/S(\d{1,2})E(\d{1,3})(?:[\s.\-_]+(.*))?/i);
  if (seMatch) {
    return {
      season: parseInt(seMatch[1], 10),
      episode: parseInt(seMatch[2], 10),
      epTitle: cleanEpTitle(seMatch[3]),
    };
  }

  // 1x02 or 01x02
  const xMatch = filename.match(/(\d{1,2})x(\d{1,3})(?:[\s.\-_]+(.*))?/i);
  if (xMatch) {
    return {
      season: parseInt(xMatch[1], 10),
      episode: parseInt(xMatch[2], 10),
      epTitle: cleanEpTitle(xMatch[3]),
    };
  }

  return {};
}

/**
 * Resolves proposed filename for a single media item.
 */
export function generateProposedFilename(
  item: MediaItem,
  config: RenamePatternConfig
): {
  filename: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  missingTokens: string[];
} {
  const reasons: string[] = [];
  const missingTokens: string[] = [];
  const ext = item.container ? `.${item.container.toLowerCase().replace(/^\./, '')}` : '';

  // Extract clean show/movie title
  const rawShowTitle = extractCleanShowTitle(item);

  // Parse episodic details
  const epInfo = parseSeasonEpisodeFromFilename(item.filename);
  const season = item.tags?.season ? parseInt(item.tags.season, 10) : epInfo.season;
  const episode = item.tags?.episode ? parseInt(item.tags.episode, 10) : epInfo.episode;
  const epTitle = item.tags?.episodeTitle || epInfo.epTitle || '';

  // Apply template according to preset
  let template = config.customTemplate;
  if (config.preset === 'simple-movie') {
    template = '{Title} ({Year})';
  } else if (config.preset === 'detailed-movie') {
    template = '{Title} ({Year}) [{Resolution} {VideoCodec} {AudioCodec}]';
  } else if (config.preset === 'scene-movie') {
    template = '{Title}.{Year}.{Resolution}.{VideoCodec}';
  } else if (config.preset === 'standard-tv') {
    template = '{Title} - {SeasonEpisode} - {EpTitle}';
  } else if (config.preset === 'compact-tv') {
    template = '{Initials} {SeasonEpisode}';
  } else if (config.preset === 'plex-tv') {
    template = '{Title} - {SeasonEpisode}';
  } else if (config.preset === 'artist-track-title') {
    template = '{Artist} - {Track} - {Title}';
  } else if (config.preset === 'track-title') {
    template = '{Track}. {Title}';
  } else if (config.preset === 'album-track-title') {
    template = '{Album} - {Track} - {Title}';
  }

  if (!template) {
    template = '{Title} ({Year})';
  }

  // Token replacement map
  let cleanTitle = applyArticleOption(rawShowTitle, config.articleOption);
  cleanTitle = applyCaseStyle(cleanTitle, config.caseStyle);

  const initials = deriveInitials(rawShowTitle, config.singleWordInitialsMode);
  const seStr = season !== undefined && episode !== undefined ? formatSeasonEpisode(season, episode, config.episodicFormat) : '';

  const artist = item.author || item.tags?.artist || item.tags?.albumArtist || 'Unknown Artist';
  const album = item.publisher || item.tags?.album || 'Unknown Album';
  const rawTrack = item.seriesIndex !== undefined ? String(item.seriesIndex) : item.tags?.track || '1';
  const trackNum = String(parseInt(rawTrack, 10) || 1).padStart(2, '0');

  if (template.includes('{SeasonEpisode}') && !seStr) {
    missingTokens.push('{SeasonEpisode}');
  }
  if (template.includes('{Year}') && !item.year) {
    missingTokens.push('{Year}');
  }
  if (template.includes('{Resolution}') && !item.videoResolution) {
    missingTokens.push('{Resolution}');
  }
  if (template.includes('{VideoCodec}') && !item.videoCodec) {
    missingTokens.push('{VideoCodec}');
  }

  let result = template
    .replace('{Title}', cleanTitle)
    .replace('{CleanTitle}', cleanTitle)
    .replace('{Initials}', initials)
    .replace('{Year}', item.year ? String(item.year) : '')
    .replace('{Date}', item.year ? String(item.year) : '')
    .replace('{SeasonEpisode}', seStr)
    .replace('{Season}', season !== undefined ? String(season) : '')
    .replace('{Episode}', episode !== undefined ? String(episode) : '')
    .replace('{EpTitle}', epTitle)
    .replace('{Artist}', artist)
    .replace('{Album}', album)
    .replace('{Track}', trackNum)
    .replace('{TrackNum}', trackNum)
    .replace('{VideoCodec}', item.videoCodec || '')
    .replace('{Codec}', item.videoCodec || '')
    .replace('{Resolution}', item.videoResolution || '')
    .replace('{Res}', item.videoResolution || '')
    .replace('{AudioCodec}', item.audioTracks?.[0]?.codec || '')
    .replace('{AudioChannels}', item.audioTracks?.[0]?.channels ? `${item.audioTracks[0].channels}.0` : '')
    .replace('{Channels}', item.audioTracks?.[0]?.channels ? `${item.audioTracks[0].channels}.0` : '')
    .replace('{BitDepth}', item.videoBitDepth || '')
    .replace('{ReleaseGroup}', item.tags?.releaseGroup || '');

  // Clean empty brackets e.g. "[]", "()", double spaces, and dangling separators when EpTitle is empty
  result = result
    .replace(/\s*-\s*-\s*/g, ' - ') // collapse double dashes
    .replace(/\s*-\s*$/g, '')       // strip trailing dash
    .replace(/^\s*-\s*/g, '')       // strip leading dash
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Apply delimiters
  result = applyDelimiter(result, config.delimiter);

  // Sanitize illegal chars
  if (config.sanitizeChars) {
    result = sanitizeFilename(result);
  }

  // Append extension
  const finalFilename = `${result}${ext}`;

  // Evaluate confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (missingTokens.length > 0) {
    confidence = missingTokens.length > 2 ? 'low' : 'medium';
    reasons.push(`Missing tokens: ${missingTokens.join(', ')}`);
  }
  if (!cleanTitle || cleanTitle.length < 2) {
    confidence = 'low';
    reasons.push('Title is missing or suspiciously short');
  }

  return {
    filename: finalFilename,
    confidence,
    reasons,
    missingTokens,
  };
}

/**
 * Batch candidate generator with pre-flight collision detection & dry-run diffing.
 */
export function generateRenameCandidates(
  items: MediaItem[],
  config: RenamePatternConfig,
  existingPathsInDirectory?: Set<string>
): RenameCandidate[] {
  const proposedPathsMap = new Map<string, string[]>(); // proposedPath -> list of item IDs

  const candidates: RenameCandidate[] = items.map((item) => {
    const { filename: proposedFilename, confidence, reasons, missingTokens } = generateProposedFilename(item, config);
    
    // Calculate proposed full path in same folder
    const folder = item.filePath.substring(0, Math.max(item.filePath.lastIndexOf('/'), item.filePath.lastIndexOf('\\')));
    const sep = item.filePath.includes('/') ? '/' : '\\';
    const proposedPath = `${folder}${sep}${proposedFilename}`;

    // Track proposed paths for collision detection
    if (!proposedPathsMap.has(proposedPath)) {
      proposedPathsMap.set(proposedPath, []);
    }
    proposedPathsMap.get(proposedPath)!.push(item.id);

    return {
      id: item.id,
      originalPath: item.filePath,
      originalFilename: item.filename,
      proposedFilename,
      proposedPath,
      confidence,
      confidenceReasons: reasons,
      isCollision: false,
      hasMissingTokens: missingTokens.length > 0,
      selected: confidence === 'high',
      status: 'pending',
    };
  });

  // Second pass: Collision & existence validation
  return candidates.map((cand) => {
    const isDuplicateTarget = (proposedPathsMap.get(cand.proposedPath)?.length || 0) > 1;
    const isExistingFileOnDisk = existingPathsInDirectory?.has(cand.proposedPath) && cand.proposedPath !== cand.originalPath;

    const isCollision = isDuplicateTarget || !!isExistingFileOnDisk;
    const reasons = [...cand.confidenceReasons];

    if (isDuplicateTarget) {
      reasons.push('Multiple files map to the same target filename');
    }
    if (isExistingFileOnDisk) {
      reasons.push('Target filename already exists on disk');
    }

    return {
      ...cand,
      isCollision,
      confidence: isCollision ? 'low' : cand.confidence,
      confidenceReasons: reasons,
      selected: cand.selected && !isCollision,
    };
  });
}
