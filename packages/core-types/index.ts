export interface AudioTrack {
  index: number;
  codec: string;
  channels: number;
  language?: string;
  title?: string;
}

export interface SubtitleTrack {
  index: number;
  codec: string; // srt, ass, subrip, hdmv_pgs, mov_text
  language?: string;
  title?: string;
  forced: boolean;
  isExternal?: boolean;
}

export interface MediaItem {
  id: string;
  filename: string;
  filePath: string;
  category: string;
  container: string; // mkv, mp4, avi, m4v, flac, mp3, mka, ts, ogm
  sizeGB: number;
  durationMins: number;
  year: number;
  videoCodec: string; // h264, hevc, av1, mpeg2, vc1, mpeg4, vp9
  videoResolution: string; // 4K, 1080p, 720p, SD
  videoBitrateMbps: number;
  hdrFormat?: string; // SDR, HDR10, HDR10+, Dolby Vision, HLG
  videoFrameRate?: number; // average/r_frame_rate of the primary video stream (e.g. 23.976, 30, 60)
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  tags?: Record<string, string>;
  audioBitrate?: number;
  hasEmbeddedPoster?: boolean;
  hasExternalPoster?: boolean;
  isCorrupted?: boolean;
  errorMessage?: string;
  bitrateAnomaly?: boolean;
  bitrateAnomalyReason?: string;
  topLevelFolder?: string;
  streamFriendlyLevel?: string;
  streamFriendlyReason?: string;
  streamFriendlySuggestion?: string;
  streamFriendlyEvaluated?: number;
  videoBitDepth?: string;
  audioSampleRate?: number;
  chapterCount?: number;
  
  // Suite Expansion Fields
  rawAudioCodec?: string;
  physicalAudioChannels?: number;
  matchedOnlineId?: string;
  hasExternalSubtitles?: boolean;
  embeddedSubtitleLanguages?: string;
  author?: string;
  narrator?: string;
  publisher?: string;
  bookSeries?: string;
  seriesIndex?: number;
  isbn?: string;
  pageCount?: number;
}

export type PlexFriendlyLevel = 'bleeding' | 'modern' | 'legacy' | 'unfriendly' | 'corrupted' | 'pending';

export interface EvaluationResult {
  level: PlexFriendlyLevel;
  reason: string;
  suggestion: string;
  isBloated?: boolean;
  isStarved?: boolean;
  isAnomaly?: boolean;
}

export const APP_NAME = "BitScribe Digital Library Steward";
export const APP_VERSION = `v${import.meta.env.APP_VERSION || "1.5.0"}`;
export const APP_VERSION_DATE = "July 31, 2026";

export function isMusicCategory(category: string | undefined): boolean {
  if (!category) return false;
  return category === 'Music' || category === 'Music Albums' || category === 'Soundtracks' || category === 'Music Compilations';
}

export const CATEGORY_ORDER = [
  'Movies (4K)',
  'Movies (1080p)',
  'Movies',
  'Movie',
  'TV Shows (4K)',
  'TV Shows (1080p)',
  'TV Shows',
  'TV',
  'Documentaries',
  'Docuseries',
  'Documentary Series',
  'Anime Movies',
  'Anime TV Shows',
  'Anime',
  'Shorts',
  'Plays',
  'Specials',
  'Music',
  'Music Albums',
  'Soundtracks',
  'Music Compilations',
  'Music Videos',
  'Audiobooks',
  'Podcasts',
  'Comedy',
  'Concerts',
  'Fitness',
  'Home Videos',
  'Photos',
  'Backgrounds',
  'Extras',
  'Other',
  'Uncategorized',
  'Unrecognized',
  'Static',
  'Corrupted'
];

export function getCategoryGroup(category: string): 'Music' | 'TV' | 'Movies' | 'Other' {
  if (isMusicCategory(category)) return 'Music';
  const lower = category.toLowerCase();
  
  if (lower.includes('movie') || lower.includes('documentar') || lower.includes('docuseries') || lower.includes('shorts') || lower === 'plays' || lower === 'specials' || lower.includes('music video')) {
    if (lower.includes('anime tv') || lower === 'anime') {
       return 'TV';
    }
    if (lower.includes('docuseries') || lower.includes('documentary series')) {
       return 'TV';
    }
    if (lower.includes('documentar')) {
       return 'Movies';
    }
    if (lower.includes('series') || lower.includes('show')) {
      if (!lower.includes('movies')) {
         return 'TV';
      }
    }
    return 'Movies';
  }
  
  if (lower.includes('tv') || lower.includes('show') || lower.includes('series') || lower === 'anime') {
    return 'TV';
  }
  
  return 'Other';
}

export function sortCategories(categories: (string | undefined)[]): string[] {
  const cats = Array.from(new Set(categories.map(c => c || 'Uncategorized')));
  return cats.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    let aIndex = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === aLower);
    let bIndex = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === bLower);
    
    if (aIndex === -1 && aLower.includes('movie')) aIndex = 3.5;
    if (bIndex === -1 && bLower.includes('movie')) bIndex = 3.5;
    if (aIndex === -1 && aLower.includes('tv')) aIndex = 7.5;
    if (bIndex === -1 && bLower.includes('tv')) bIndex = 7.5;
    
    if (aIndex === -1) aIndex = 50; // default unknown categories in the middle
    if (bIndex === -1) bIndex = 50;
    
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  });
}



export interface RuleCriteria {
  useBleedingEdgePreset?: boolean;
  useModernPreset: boolean;
  useLegacyPreset: boolean;
  useDiscoveryPreset: boolean;
  useCorruptedScan?: boolean;
  useSubtitleScan?: boolean;
  useDeepSubtitleScan?: boolean;
  useDeepAudioScan?: boolean;
  useDuplicationScan?: boolean;
  useDuplicationVideoScan?: boolean;
  useDuplicationMusicScan?: boolean;
  useAnomalyScan?: boolean;
  useMetadataScan?: boolean;
  useVideoMetadataScan?: boolean;
  useMusicMetadataScan?: boolean;
  useCleanNonLatinTags?: boolean;
  enableStandardLogging?: boolean;
  diagnosticLoggingEnabled?: boolean;
  diagLogScanEngine?: boolean;
  diagLogMediaParsing?: boolean;
  diagLogSystem?: boolean;
  bleedingEdgeVideoCodecs?: string[];
  bleedingEdgeSurroundAudioCodecs?: string[];
  bleedingEdgeStereoAudioCodecs?: string[];
  modernVideoCodecs: string[];
  modernSurroundAudioCodecs: string[];
  modernStereoAudioCodecs: string[];
  modernMusicCodecs: string[];
  legacyVideoCodecs: string[];
  legacySurroundAudioCodecs: string[];
  legacyStereoAudioCodecs: string[];
  legacyMusicCodecs: string[];
  discoveryVideoCodecs: string[];
  discoverySurroundAudioCodecs: string[];
  discoveryStereoAudioCodecs: string[];
  discoveryMusicCodecs: string[];
  discoveryContainers: string[];
  discoveryHdrFormats?: string[];
}
