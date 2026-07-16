import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat } from "./mediaFormatter";
import { isMusicCategory } from '../types';
import { MediaItem, EvaluationResult, RuleCriteria, PlexFriendlyLevel } from '../types';
import { getDisplayArtist } from './musicHelper';
import { EXTRAS_REGEX, extractSeasonNumber } from './mediaParser';
import { computeDuplicatesMap, getDuplicatePairRows } from "./duplicateHelper";

export const DEFAULT_RULES: RuleCriteria = {
  useBleedingEdgePreset: false,
  bleedingEdgeVideoCodecs: ['av1', 'vvc', 'vp9'],
  bleedingEdgeSurroundAudioCodecs: ['truehd', 'dtshd', 'opus'],
  bleedingEdgeStereoAudioCodecs: ['flac', 'pcm', 'opus'],
  useModernPreset: false,
  useLegacyPreset: false,
  useDiscoveryPreset: true,
  useSubtitleScan: false,
  useDuplicationScan: false,
  useDuplicationVideoScan: false,
  useDuplicationMusicScan: false,
  useMetadataScan: false,
  useVideoMetadataScan: false,
  useMusicMetadataScan: false,
  useCleanNonLatinTags: true,

  modernVideoCodecs: ['hevc', 'h264'],
  modernSurroundAudioCodecs: ['ac3', 'eac3'],
  modernStereoAudioCodecs: ['aac', 'mp3', 'ac3', 'eac3'],
  modernMusicCodecs: ['flac', 'aac', 'mp3', 'alac', 'wav'],

  legacyVideoCodecs: ['h264'],
  legacySurroundAudioCodecs: ['ac3', 'aac'],
  legacyStereoAudioCodecs: ['aac', 'mp3', 'ac3'],
  legacyMusicCodecs: ['mp3', 'aac'],

  discoveryVideoCodecs: [
    'hevc', 'h265', 'h264', 'av1', 'vp9', 'mpeg2', 'mpeg4', 'vc1', 'wmv', 'flv', 'theora', 'divx', 'xvid', 'vp8', 'prores', 'h255', 'h263'
  ],
  discoverySurroundAudioCodecs: [
    'ac3', 'eac3', 'dts', 'truehd', 'flac', 'aac', 'opus', 'vorbis', 'wma', 'dtshd', 'alac', 'pcm_s16le', 'pcm_s24le', 'mp3'
  ],
  discoveryStereoAudioCodecs: [
    'aac', 'mp3', 'flac', 'pcm', 'alac', 'opus', 'vorbis', 'mp2', 'wma', 'wav', 'ogg', 'ape', 'realaudio', 'wmapro', 'wmav2', 'adpcm_ms', 'ac3', 'eac3', 'dts', 'truehd', 'dtshd'
  ],
  discoveryMusicCodecs: [
    'flac', 'aac', 'mp3', 'alac', 'wav', 'ogg', 'ape', 'wma', 'm4a', 'opus'
  ],
  discoveryContainers: [
    'mkv', 'mp4', 'm4v', 'avi', 'ts', 'mov', 'flv', 'webm', 'wmv', 'mpg', 'vob', 'm2ts', 'ogg', 'wav', 'mp3', 'flac'
  ]
};

export function isMissingSubtitles(item: MediaItem): boolean {
  if (isMusicCategory(item.category) || item.category === "Static" || item.category === "Corrupted") return false;
  return !item.subtitleTracks || item.subtitleTracks.length === 0;
}

export function hasBadSubtitles(item: MediaItem): boolean {
  if (isMusicCategory(item.category) || item.category === "Static" || item.category === "Corrupted") return false;
  return !!item.subtitleTracks?.some(s => s.codec?.toLowerCase() === "pgs" || s.codec?.toLowerCase() === "vobsub");
}

export function evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false, forceEvaluate: boolean = false): EvaluationResult {
  const result = _evaluatePlexCompatibility(item, customRules, isDuplicate, forceEvaluate);
  
  // Set central source of truth for Anomaly metrics
  const reason = result.reason || "";
  const isBloated = reason.includes("Bloated");
  const isStarved = reason.includes("Starved");
  const isAnomaly = isBloated || isStarved || reason.includes("Anomaly") || result.level === "unfriendly" && result.suggestion?.includes("Transcode Required");

  return {
    ...result,
    isBloated,
    isStarved,
    isAnomaly
  };
}

function _evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false, forceEvaluate: boolean = false): EvaluationResult {
  if (item.category === 'Corrupted') {
    return {
      level: 'unfriendly',
      reason: 'Corrupted file: Cannot evaluate compatibility.',
      suggestion: 'Replace corrupted file.'
    };
  }

  const isStandardStreamingScan = !(
    customRules.useMetadataScan ||
    customRules.useVideoMetadataScan ||
    customRules.useMusicMetadataScan ||
    customRules.useSubtitleScan ||
    customRules.useDuplicationScan ||
    customRules.useDuplicationVideoScan ||
    customRules.useDuplicationMusicScan ||
    customRules.useAnomalyScan
  );

  if (!forceEvaluate) {
    if (isStandardStreamingScan) {
      if (item.streamFriendlyEvaluated && item.streamFriendlyEvaluated > 0 && item.streamFriendlyLevel) {
        return {
          level: item.streamFriendlyLevel as PlexFriendlyLevel,
          reason: item.streamFriendlyReason || '',
          suggestion: item.streamFriendlySuggestion || ''
        };
      }
      return {
        level: 'pending',
        reason: 'This file has not been evaluated by the Streaming compatibility scanner yet.',
        suggestion: 'Please run a scan with Streaming preset or click Evaluate Streaming Compatibility.'
      };
    }
  }
  if (item.category === 'Static') {
    return {
      level: 'modern',
      reason: 'Static Asset: Static catalog entry.',
      suggestion: ''
    };
  }

  const vCodec = (item.videoCodec || '').toLowerCase();
  let container = (item.container || '').toLowerCase();
  const audios = item.audioTracks || [];
  const subs = item.subtitleTracks || [];

  // Normalize ffprobe container names to common extensions for rule matching
  if (container === 'matroska' || container === 'matroska,webm') container = 'mkv';
  if (container === 'quicktime' || container === 'mov') container = 'mp4';
  if (container.includes('mpegts')) container = 'ts';
  if (container.includes('avi')) container = 'avi';

  // --- SPECIAL AUDIT MODES ---
  const isMusicFile = isMusicCategory(item.category);
  const checkVideoMeta = !!customRules.useVideoMetadataScan || (!!customRules.useMetadataScan && !isMusicFile);
  const checkMusicMeta = !!customRules.useMusicMetadataScan || (!!customRules.useMetadataScan && isMusicFile);

  if ((checkVideoMeta && !isMusicFile) || (checkMusicMeta && isMusicFile) || (item.category === 'Corrupted' && (checkVideoMeta || checkMusicMeta))) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Cannot probe metadata tags.',
        suggestion: 'Replace corrupted file.'
      };
    }

    const tags = item.tags || {};
    const titleVal = tags.title || tags.TITLE || '';
    const yearVal = item.year || parseInt(tags.date || tags.DATE || tags.year || tags.YEAR || '0') || 0;
    
    if (isMusicCategory(item.category)) {
      const artistVal = tags.artist || tags.ARTIST || '';
      const albumVal = tags.album || tags.ALBUM || '';
      
      const missingFields: string[] = [];
      if (!titleVal) missingFields.push('Title');
      if (!artistVal) missingFields.push('Artist');
      if (!albumVal) missingFields.push('Album');
      if (!yearVal) missingFields.push('Year');
      
      if (missingFields.length > 0) {
        return {
          level: 'unfriendly',
          reason: `Incomplete Tags: Missing ${missingFields.join(', ')}`,
          suggestion: 'Use Picard or TagScanner to write embedded ID3/Vorbis tags.'
        };
      } else {
        return {
          level: 'modern',
          reason: `Tags Complete: "${titleVal}" by ${artistVal} (${albumVal}, ${yearVal})`,
          suggestion: 'None required. Tags are robust and direct-index friendly.'
        };
      }
    } else {
      // Videos: movies/shows
      const missingFields: string[] = [];
      const titleCleaned = titleVal.trim();
      const hasTitle = !!titleCleaned && titleCleaned.toLowerCase() !== item.filename.toLowerCase();
      if (!hasTitle) missingFields.push('Title');
      if (!yearVal) missingFields.push('Year');

      const directorVal = tags.director || tags.DIRECTOR || '';
      const writerVal = tags.writer || tags.WRITER || '';
      const castVal = tags.cast || tags.CAST || tags.actors || tags.ACTORS || tags.actor || tags.ACTOR || '';
      const studioVal = tags.studio || tags.STUDIO || tags.publisher || tags.PUBLISHER || tags.network || tags.NETWORK || '';

      if (item.category === 'TV') {
        const showVal = tags.show || tags.SHOW || tags.series || tags.SERIES || tags.show_name || tags.SHOW_NAME || '';
        if (!showVal) missingFields.push('Show Title');
      } else {
        if (!directorVal) missingFields.push('Director');
      }

      if (!writerVal) missingFields.push('Writer');
      if (!castVal) missingFields.push('Cast/Actors');
      if (!studioVal) missingFields.push('Studio');
      
      if (missingFields.length > 0) {
        return {
          level: 'unfriendly',
          reason: `Incomplete Tags: Missing ${missingFields.join(', ')}`,
          suggestion: `Open MKVToolNix or FFmpeg to write missing tags (${missingFields.join(', ')}).`
        };
      } else {
        const detailStr = item.category === 'TV' 
          ? `Show "${tags.show || tags.SHOW}" - "${titleCleaned}" (${yearVal})` 
          : `"${titleCleaned}" (${yearVal}) Dir: ${directorVal}`;
        return {
          level: 'modern',
          reason: `Embedded Metadata OK: ${detailStr} is fully populated`,
          suggestion: 'Tags are perfectly embedded inside video container.'
        };
      }
    }
  }

  if (customRules.useSubtitleScan) {
    if (isMusicCategory(item.category)) {
      return {
        level: 'modern',
        reason: 'Music cataloged: Subtitle scan does not apply to audio files.',
        suggestion: ''
      };
    }
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Cannot verify subtitle streams.',
        suggestion: 'Replace corrupted file.'
      };
    }
    const embeddedSubs = subs.filter(s => !s.isExternal);
    const externalSubs = subs.filter(s => s.isExternal);
    const embeddedCount = embeddedSubs.length;
    const externalCount = externalSubs.length;

    const hasImageSub = subs.some(s => {
      const c = (s.codec || '').toLowerCase();
      return c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa');
    });

    if (embeddedCount === 0 && externalCount === 0) {
      return {
        level: 'legacy',
        reason: 'No Embedded or External Subtitles found.',
        suggestion: 'Add or embed SRT subtitle file.'
      };
    }

    if (hasImageSub) {
      const extMsg = externalCount > 0 
        ? `${externalCount} external/sidecar track(s) found` 
        : 'no external/sidecar subtitles found';
      return {
        level: 'unfriendly',
        reason: `Image-based Subtitles (PGS/VOB/ASS) may force video transcoding. (${extMsg})`,
        suggestion: 'Extract and convert subtitles to text-based SRT format, or sideload clean external SRTs.'
      };
    }

    const subFormats = subs.map(s => formatCodecString(s.codec)).join(', ');
    let reason = '';
    let suggestion = '';

    if (embeddedCount > 0 && externalCount > 0) {
      reason = `Subtitles Complete: ${embeddedCount} embedded and ${externalCount} external/sidecar tracks detected (${subFormats})`;
      suggestion = 'None required. Subtitles are available both embedded and as external sidecars.';
    } else if (embeddedCount > 0) {
      reason = `Subtitles Complete: ${embeddedCount} embedded tracks detected (${subFormats}) | No external/sidecar`;
      suggestion = 'None required. Subtitles are available inside container.';
    } else {
      reason = `Subtitles Complete: ${externalCount} external/sidecar tracks detected (${subFormats}) | No embedded`;
      suggestion = 'None required. External sidecar subtitles are available.';
    }

    return {
      level: 'modern',
      reason,
      suggestion
    };
  }

  const isVideoDuplicationActive = customRules.useDuplicationVideoScan || (customRules.useDuplicationScan && !isMusicCategory(item.category));
  const isMusicDuplicationActive = customRules.useDuplicationMusicScan || (customRules.useDuplicationScan && isMusicCategory(item.category));

  if ((isVideoDuplicationActive && !isMusicCategory(item.category)) || (isMusicDuplicationActive && isMusicCategory(item.category))) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Duplication check skipped.',
        suggestion: 'Replace corrupted file.'
      };
    }
    if (isDuplicate) {
      if (isMusicCategory(item.category)) {
        const titleVal = item.tags?.title || item.filename;
        const artistVal = item.tags?.artist || 'Unknown Artist';
        return {
          level: 'unfriendly',
          reason: `Duplicated Track: "${titleVal}" by ${artistVal} has multiple copies.`,
          suggestion: 'Consolidate audio duplicates. Prefer high-fidelity FLAC or lossless wav over low bit-rate MP3.'
        };
      } else {
        return {
          level: 'unfriendly',
          reason: 'Duplicated Video: Multiple quality files detected for this title.',
          suggestion: 'Consolidate video files. Remove resolution duplicates or consolidate streams into a single high-quality file (prefer 4K/HDR or best HEVC/H.264 stream).'
        };
      }
    } else {
      if (isMusicCategory(item.category)) {
        return {
          level: 'modern',
          reason: 'Unique: No other copy of this track detected.',
          suggestion: 'None. Track is uniquely isolated in the music catalog.'
        };
      } else {
        return {
          level: 'modern',
          reason: 'Unique: No other duplicates detected for this title.',
          suggestion: 'None. Stream is isolated as a single copy in the library.'
        };
      }
    }
  }

  if (customRules.useAnomalyScan) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Bitrate check failed.',
        suggestion: 'Replace corrupted file.'
      };
    }

    if (isMusicCategory(item.category)) {
      const br = (item.audioBitrate || 0) / 1000;
      const isLossless = (audios[0]?.codec ?? container).toLowerCase().includes('flac');
      
      if (isLossless) {
        if (br > 0 && br < 200) {
          return {
            level: 'unfriendly',
            reason: `Starved (Music): FLAC lossless bitrate too low (${br} kbps).`,
            suggestion: 'Re-encode from high-quality lossless source file.'
          };
        } else if (br > 2500) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Music): FLAC audio bitrate is excessively high (${br} kbps).`,
            suggestion: 'Evaluate if sampling rate/depth (e.g. 192kHz/24bit) exceeds client capabilities.'
          };
        }
      } else {
        // Lossy codecs like MP3, AAC
        if (br > 0 && br < 96) {
          return {
            level: 'unfriendly',
            reason: `Starved (Music): Lossy audio bitrate is too low for quality streaming (${br} kbps).`,
            suggestion: 'Obtain high-quality AAC (~256 kbps) or MP3 (~320 kbps) copy.'
          };
        } else if (br > 350) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Music): Lossy file exceeds standard compression limits (${br} kbps).`,
            suggestion: 'Convert to standard stereo MP3 (320 kbps) or high-fidelity lossless FLAC.'
          };
        }
      }
      return {
        level: 'modern',
        reason: `Optimal: Audio bitrate (${br} kbps) is in the optimal range.`,
        suggestion: 'None. Fits standard high-fidelity audio parameters.'
      };
    } else {
      const res = (item.videoResolution || '').toLowerCase();
      const br = item.videoBitrateMbps || 0;
      const displayRes = item.videoResolution || 'Unknown Res';

      if (br > 0) {
        let isStarved = false;
        let isBloated = false;
        let starvedThreshold = 0;
        let bloatedThreshold = 0;

        // Base thresholds assuming H.264 / AVC
        if (res.includes('4k') || res.includes('2160')) {
          starvedThreshold = 10.0;
          bloatedThreshold = 65.0;
        } else if (res.includes('1080')) {
          starvedThreshold = 1.5;
          bloatedThreshold = 25.0;
        } else if (res.includes('720')) {
          starvedThreshold = 1.0;
          bloatedThreshold = 10.0;
        } else if (res.includes('sd') || res.includes('480') || res.includes('576') || res.includes('360')) {
          starvedThreshold = 0.3;
          bloatedThreshold = 4.0;
        }

        // Adjust thresholds based on codec efficiency
        let codecMultiplier = 1.0;
        const codecLabel = vCodec.toUpperCase();
        if (['hevc', 'h265', 'av1'].includes(vCodec)) {
          codecMultiplier = 0.6; // High efficiency codecs require less bitrate
        } else if (['mpeg2video', 'mpeg2', 'mpeg4', 'xvid', 'divx', 'vp8'].includes(vCodec)) {
          codecMultiplier = 1.5; // Older/less efficient codecs require more bitrate
        }

        if (starvedThreshold > 0) {
          starvedThreshold = Number((starvedThreshold * codecMultiplier).toFixed(2));
          bloatedThreshold = Number((bloatedThreshold * codecMultiplier).toFixed(2));
          
          if (br < starvedThreshold) {
            isStarved = true;
          } else if (br > bloatedThreshold) {
            isBloated = true;
          }
        }

        if (isStarved) {
          return {
            level: 'unfriendly',
            reason: `Starved (Video): Bitrate (${br} Mbps) is too low for ${displayRes} resolution with ${codecLabel} codec (min ${starvedThreshold} Mbps).`,
            suggestion: 'Re-encode from a higher quality source or replace with a better release.'
          };
        } else if (isBloated) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Video): Bitrate (${br} Mbps) is unnecessarily high for ${displayRes} resolution with ${codecLabel} codec (max ${bloatedThreshold} Mbps).`,
            suggestion: 'Transcode to HEVC/H.265 or AV1 to significantly reduce file size without losing perceived quality.'
          };
        }
      }

      if (item.bitrateAnomaly) {
        return {
          level: 'unfriendly',
          reason: `Anomaly Detected: ${item.bitrateAnomalyReason}`,
          suggestion: 'Re-encode or re-source to meet standard quality-to-bitrate ratio guidelines.'
        };
      }

      return {
        level: 'modern',
        reason: `Optimal: Bitrate (${br} Mbps) is perfectly proportioned for ${displayRes} resolution.`,
        suggestion: 'None. Excellent encoding density and size optimization.'
      };
    }
  }

  if (customRules.useDiscoveryPreset) {
    return {
      level: 'pending',
      reason: 'This file has not been evaluated by the Streaming compatibility scanner yet.',
      suggestion: 'Please run a scan with Streaming preset or click Evaluate Streaming Compatibility.'
    };
  }
  // Music files are processed separately (audio only)
  if (isMusicCategory(item.category)) {
    const modernMusic = customRules.modernMusicCodecs || DEFAULT_RULES.modernMusicCodecs;
    const legacyMusic = customRules.legacyMusicCodecs || DEFAULT_RULES.legacyMusicCodecs;
    const discoveryMusic = customRules.discoveryMusicCodecs || DEFAULT_RULES.discoveryMusicCodecs;

    const codecToCheck = (audios.length > 0 ? audios[0].codec : vCodec || container).toLowerCase();

    if (customRules.useLegacyPreset && legacyMusic.includes(codecToCheck)) {
      return {
        level: 'legacy',
        reason: `Legacy compatible music format (${codecToCheck})`,
        suggestion: 'None required. Fits basic streaming requirements.'
      };
    } else if (customRules.useModernPreset && modernMusic.includes(codecToCheck)) {
      return {
        level: 'modern',
        reason: `Modern music format (${codecToCheck})`,
        suggestion: 'Standard modern music format. Good to go.'
      };
    } else {
      return {
        level: 'unfriendly',
        reason: `Unsupported music codec (${codecToCheck})`,
        suggestion: 'Convert to standard AAC or MP3 format.'
      };
    }
  }

  // --- VIDEO COMPATIBILITY EVALUATION ---
  const activeBleedingEdge = customRules.useBleedingEdgePreset ?? false;
  const activeModern = customRules.useModernPreset ?? true;
  const activeLegacy = customRules.useLegacyPreset ?? true;

  const isProfile5 = item.hdrFormat?.toLowerCase().includes('profile 5') || false;

  const hasImageSub = subs.some(s => {
    const c = (s.codec || '').toLowerCase();
    return c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa');
  });

  // 0. Evaluate for Bleeding Edge Standards
  if (activeBleedingEdge) {
    const beVCodecs = customRules.bleedingEdgeVideoCodecs || DEFAULT_RULES.bleedingEdgeVideoCodecs || ['av1', 'vvc', 'vp9'];
    const beSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || DEFAULT_RULES.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd', 'opus'];
    const beStereos = customRules.bleedingEdgeStereoAudioCodecs || DEFAULT_RULES.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm', 'opus'];

    const vCompat = beVCodecs.includes(vCodec);
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!beSurrounds.includes(codec)) aCompat = false;
        } else {
          if (!beStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub && !isProfile5) {
      return {
        level: 'bleeding',
        reason: 'Direct Plays: 2015+ HW (Bleeding Edge)',
        suggestion: 'Perfect. Peak efficiency and audio fidelity.'
      };
    } else if (vCompat || cCompat || aCompat) {
       // if Bleeding Edge is the ONLY thing active, and it failed
       if (!activeModern && !activeLegacy) {
           return {
             level: 'unfriendly',
             reason: 'Fails Bleeding Edge standards.',
             suggestion: 'Upgrade internal streams to AV1/VVC or lossless audio formats.'
           };
       }
    }
  }

  // 1. Evaluate for Legacy Streaming Standards
  if (activeLegacy && !isProfile5) {
    const legacyVideoCodecsList = customRules.legacyVideoCodecs || DEFAULT_RULES.legacyVideoCodecs || ['h264'];
    const legacySurrounds = customRules.legacySurroundAudioCodecs || DEFAULT_RULES.legacySurroundAudioCodecs || ['ac3', 'aac'];
    const legacyStereos = customRules.legacyStereoAudioCodecs || DEFAULT_RULES.legacyStereoAudioCodecs || ['aac', 'mp3', 'ac3'];

    const vCompat = legacyVideoCodecsList.includes(vCodec) || (legacyVideoCodecsList.includes('h264') && vCodec === 'avc');
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!legacySurrounds.includes(codec)) aCompat = false;
        } else {
          if (!legacyStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub) {
      return {
        level: 'legacy',
        reason: 'Direct Plays: Broad/Legacy HW',
        suggestion: 'Compatible stream, but candidate for improvement. Smooth legacy streaming, but could upgrade to HEVC for space savings.'
      };
    }
  }

  // 2. Evaluate for Modern Streaming Standards
  if (activeModern && !isProfile5) {
    const modernVCodecs = customRules.modernVideoCodecs || DEFAULT_RULES.modernVideoCodecs || ['hevc', 'h264'];
    const modernSurrounds = customRules.modernSurroundAudioCodecs || DEFAULT_RULES.modernSurroundAudioCodecs || ['ac3', 'eac3'];
    const modernStereos = customRules.modernStereoAudioCodecs || DEFAULT_RULES.modernStereoAudioCodecs || ['aac', 'mp3', 'ac3', 'eac3'];

    const vCompat = modernVCodecs.includes(vCodec);
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!modernSurrounds.includes(codec)) aCompat = false;
        } else {
          if (!modernStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub) {
      if (['h264', 'avc'].includes(vCodec)) {
        return {
          level: 'legacy',
          reason: 'Direct Plays: Broad/Legacy HW',
          suggestion: 'Compatible stream, but candidate for improvement. Upgrade to HEVC for better compression.'
        };
      }
      return {
        level: 'modern',
        reason: 'Direct Plays: 2015+ HW',
        suggestion: 'Perfect. Ready to scan sync and stream natively.'
      };
    }
  }

  // 3. Fallback check: If it didn't match Legacy or Modern, but contains Bleeding Edge codecs
  const fallbackBeVCodecs = customRules.bleedingEdgeVideoCodecs || DEFAULT_RULES.bleedingEdgeVideoCodecs || ['av1', 'vvc', 'vp9'];
  const fallbackBeSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || DEFAULT_RULES.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd', 'opus'];
  const fallbackBeStereos = customRules.bleedingEdgeStereoAudioCodecs || DEFAULT_RULES.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm', 'opus'];

  const hasBleedingVideo = fallbackBeVCodecs.includes(vCodec);
  let hasBleedingAudio = false;
  for (const track of audios) {
    const codec = (track.codec || '').toLowerCase();
    const ch = track.channels;
    if (ch > 2) {
      if (fallbackBeSurrounds.includes(codec)) hasBleedingAudio = true;
    } else {
      if (fallbackBeStereos.includes(codec)) hasBleedingAudio = true;
    }
  }

  if ((hasBleedingVideo || hasBleedingAudio) && !isProfile5 && !hasImageSub) {
    return {
      level: 'bleeding',
      reason: 'Bleeding Edge: High transcode & buffering risk (lossless/uncommon streams)',
      suggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.'
    };
  }

  // Compile remediation details / reasons
  const causes: string[] = [];
  const suggestions: string[] = [];

  const validVid = ['h264', 'avc'];
  if (activeModern) validVid.push('hevc', 'h255', 'h265');

  if (!validVid.includes(vCodec)) {
    causes.push(`Suboptimal video codec (${formatCodecString(vCodec) || 'UNKNOWN'})`);
    suggestions.push(`Transcode stream to HEVC/H.264 standard profiles.`);
  }

  const validConts = ['mkv', 'mp4', 'm4v'];

  if (!validConts.includes(container)) {
    causes.push(`Complex container format wrap (${formatCodecString(container)})`);
    suggestions.push(`Remux stream wrap to clean MP4 or MKV without transcoding.`);
  }

  if (hasImageSub) {
    causes.push('PGS/DVD Image subtitles force CPU transcode burning');
    suggestions.push('Sideload clean external text SRT subtitles.');
  }

  if (isProfile5) {
    causes.push('Dolby Vision Profile 5 lacks standard HDR10 fallback layer');
    suggestions.push('Transcode or source standard HDR10/HDR10+ capable media.');
  }

  let auditFailed = false;
  if (audios.length === 0) {
    auditFailed = true;
  } else {
    for (const track of audios) {
      const codec = (track.codec || '').toLowerCase();
      const ch = track.channels;
      if (ch > 2) {
        let allowed = ['ac3', 'eac3', 'dts', 'truehd', 'flac'];
        if (!allowed.includes(codec)) auditFailed = true;
      } else {
        let allowed = ['aac', 'mp3', 'flac', 'pcm', 'ac3', 'eac3'];
        if (!allowed.includes(codec)) auditFailed = true;
      }
    }
  }

  if (auditFailed) {
    causes.push('Incompatible sound track compression standard');
    suggestions.push('Embed secondary standard AAC/Dolby surround soundtrack.');
  }

  const finalReason = causes.length > 0 ? causes.join('; ') : 'Complex audio/video combination causing potential transcoding';
  const finalSuggestion = suggestions.length > 0 
    ? suggestions.slice(0, 2).join(' ') 
    : 'Remux wrap or transcode stream to standard format.';

  return {
    level: 'unfriendly',
    reason: finalReason,
    suggestion: finalSuggestion
  };
}

export { computeDuplicatesMap, getDuplicatePairRows };
