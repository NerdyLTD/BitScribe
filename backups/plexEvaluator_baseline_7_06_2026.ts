import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat } from "./mediaFormatter";
import { isMusicCategory } from '../types';
import { MediaItem, EvaluationResult, RuleCriteria, PlexFriendlyLevel } from '../types';
import { getDisplayArtist } from './musicHelper';
import { EXTRAS_REGEX, extractSeasonNumber } from './mediaParser';

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
  modernSurroundAudioCodecs: ['ac3', 'eac3', 'dts'],
  modernStereoAudioCodecs: ['aac', 'mp3'],
  modernMusicCodecs: ['flac', 'aac', 'mp3', 'alac', 'wav'],

  legacyVideoCodecs: ['h264'],
  legacySurroundAudioCodecs: ['ac3', 'aac'],
  legacyStereoAudioCodecs: ['aac', 'mp3'],
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

export function evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false, forceEvaluate: boolean = false): EvaluationResult {
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
    if (item.streamFriendlyEvaluated && item.streamFriendlyEvaluated > 0 && item.streamFriendlyLevel) {
      return {
        level: item.streamFriendlyLevel as PlexFriendlyLevel,
        reason: item.streamFriendlyReason || '',
        suggestion: item.streamFriendlySuggestion || ''
      };
    }

    if (isStandardStreamingScan) {
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
    const hasSubs = subs && subs.length > 0;
    if (hasSubs) {
      const hasImageSub = subs.some(s => {
        const c = (s.codec || '').toLowerCase();
        return c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa');
      });
      if (hasImageSub) {
        return {
          level: 'unfriendly',
          reason: 'Image-based Subtitles (PGS/VOB/ASS) may force video transcoding.',
          suggestion: 'Extract and convert subtitles to text-based SRT format.'
        };
      }
      const subFormats = subs.map(s => formatCodecString(s.codec)).join(', ');
      return {
        level: 'modern',
        reason: `Subtitles Complete: ${subs.length} tracks detected (${subFormats})`,
        suggestion: 'None required. Subtitles are available inside container.'
      };
    } else {
      return {
        level: 'legacy',
        reason: 'Incomplete: No embedded subtitles found',
        suggestion: 'Sideload clean external text SRT subtitles, or embed internal subtitle tracks.'
      };
    }
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

        if (res.includes('4k') || res.includes('2160')) {
          starvedThreshold = 10.0;
          bloatedThreshold = 65.0;
        } else if (res.includes('1080')) {
          starvedThreshold = 2.0;
          bloatedThreshold = 25.0;
        } else if (res.includes('720')) {
          starvedThreshold = 1.0;
          bloatedThreshold = 10.0;
        } else if (res.includes('sd') || res.includes('480') || res.includes('576') || res.includes('360')) {
          starvedThreshold = 0.3;
          bloatedThreshold = 4.0;
        }

        if (starvedThreshold > 0 && br < starvedThreshold) {
          isStarved = true;
        } else if (bloatedThreshold > 0 && br > bloatedThreshold) {
          isBloated = true;
        }

        if (isStarved) {
          return {
            level: 'unfriendly',
            reason: `Starved (Video): Bitrate (${br} Mbps) is too low for ${displayRes} resolution (min ${starvedThreshold} Mbps).`,
            suggestion: 'Re-encode from a higher quality source or replace with a better release.'
          };
        } else if (isBloated) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Video): Bitrate (${br} Mbps) is unnecessarily high for ${displayRes} resolution (max ${bloatedThreshold} Mbps).`,
            suggestion: 'Transcode to HEVC/H.265 to significantly reduce file size without losing perceived quality.'
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
    const beVCodecs = customRules.bleedingEdgeVideoCodecs || ['av1', 'vvc'];
    const beSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd'];
    const beStereos = customRules.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm'];

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
        reason: `Direct Plays on Bleeding Edge: Uses ${formatCodecString(vCodec)} video with lossless/modern audio.`,
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
    const legacySurrounds = customRules.legacySurroundAudioCodecs || ['ac3', 'aac'];
    const legacyStereos = customRules.legacyStereoAudioCodecs || ['aac', 'mp3'];

    const vCompat = ['h264', 'avc'].includes(vCodec);
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
        reason: `Direct Plays on Legacy HW: H.264 wrapper with low-spec audio streams.`,
        suggestion: 'Compatible stream, but candidate for improvement. Smooth legacy streaming, but could upgrade to HEVC for space savings.'
      };
    }
  }

  // 2. Evaluate for Modern Streaming Standards
  if (activeModern && !isProfile5) {
    const modernVCodecs = customRules.modernVideoCodecs || ['hevc', 'h264', 'vp9'];
    const modernSurrounds = customRules.modernSurroundAudioCodecs || ['ac3', 'eac3', 'dts', 'opus'];
    const modernStereos = customRules.modernStereoAudioCodecs || ['aac', 'mp3', 'opus', 'flac', 'pcm'];

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
          reason: `Direct Plays on Modern HW: Uses ${formatCodecString(vCodec)} video with compatible audio streams.`,
          suggestion: 'Compatible stream, but candidate for improvement. Upgrade to HEVC for better compression.'
        };
      }
      return {
        level: 'modern',
        reason: `Direct Plays on Modern HW: Uses ${formatCodecString(vCodec)} video with compatible audio streams.`,
        suggestion: 'Perfect. Ready to scan sync and stream natively.'
      };
    }
  }

  // 3. Fallback check: If it didn't match Legacy or Modern, but contains Bleeding Edge codecs
  const beVCodecs = customRules.bleedingEdgeVideoCodecs || ['av1', 'vvc', 'vp9'];
  const beSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd', 'opus'];
  const beStereos = customRules.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm', 'opus'];

  const hasBleedingVideo = beVCodecs.includes(vCodec);
  let hasBleedingAudio = false;
  for (const track of audios) {
    const codec = (track.codec || '').toLowerCase();
    const ch = track.channels;
    if (ch > 2) {
      if (beSurrounds.includes(codec)) hasBleedingAudio = true;
    } else {
      if (beStereos.includes(codec)) hasBleedingAudio = true;
    }
  }

  if ((hasBleedingVideo || hasBleedingAudio) && !isProfile5 && !hasImageSub) {
    const reasons: string[] = [];
    if (hasBleedingVideo) reasons.push(`Bleeding Edge video codec (${formatCodecString(vCodec)})`);
    if (hasBleedingAudio) {
      const beCodecs = audios.map(a => formatCodecString(a.codec)).join('/');
      reasons.push(`Bleeding Edge/Lossless audio stream (${beCodecs})`);
    }
    return {
      level: 'bleeding',
      reason: `Bleeding Edge: ${reasons.join(' & ')} requires transcoding on most current and past hardware.`,
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
        let allowed = ['aac', 'mp3', 'flac', 'pcm'];
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

const areParentFoldersSimilar = (pathA: string, pathB: string) => {
  const partsA = pathA.split(/[\\/]/).filter(Boolean);
  const partsB = pathB.split(/[\\/]/).filter(Boolean);
  if (partsA.length < 2 || partsB.length < 2) return true; // fallback
  
  const parentA = partsA[partsA.length - 2].toLowerCase();
  const parentB = partsB[partsB.length - 2].toLowerCase();
  
  if (parentA === parentB) return true;
  
  const cleanParent = (p: string) => {
    return p
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\([^)]+\)/g, '')
      .replace(/[-_.(](flac|mp3|remaster|remastered|deluxe|edition|expanded|bonus|vbr|320k|320kbps)[-_.)]*/gi, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .trim();
  };
  
  const cleanA = cleanParent(parentA);
  const cleanB = cleanParent(parentB);
  
  if (!cleanA || !cleanB) return true; // fallback
  
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
};

const isPlexThemeMusic = (item: MediaItem, allItems: MediaItem[]) => {
  if (item.filename.toLowerCase() !== "theme.mp3") return false;
  
  const lastSlashIdx = Math.max(item.filePath.lastIndexOf("/"), item.filePath.lastIndexOf("\\"));
  if (lastSlashIdx === -1) return false;
  const itemDir = item.filePath.substring(0, lastSlashIdx);

  return allItems.some(other => {
    if (other.id === item.id) return false;
    if (isMusicCategory(other.category) || other.category === "Corrupted" || other.category === "Static") return false;
    
    const otherLastSlashIdx = Math.max(other.filePath.lastIndexOf("/"), other.filePath.lastIndexOf("\\"));
    if (otherLastSlashIdx === -1) return false;
    const otherDir = other.filePath.substring(0, otherLastSlashIdx);
    
    return otherDir === itemDir;
  });
};

export function computeDuplicatesMap(items: MediaItem[], rules: RuleCriteria): Map<string, boolean> {
  const duplicateMap = new Map<string, boolean>();
  const isVideoActive = rules.useDuplicationVideoScan || rules.useDuplicationScan;
  const isMusicActive = rules.useDuplicationMusicScan || rules.useDuplicationScan;

  if (!isVideoActive && !isMusicActive) {
    return duplicateMap;
  }

  // --- VIDEO DUPLICATIONS ---
  if (isVideoActive) {
    const videoItems = items.filter(it => !isMusicCategory(it.category) && it.category !== 'Corrupted' && it.category !== 'Static');
    
    // Clean function for video names
    const cleanVideoName = (filename: string, item?: MediaItem) => {
      let cleaned = filename
        .replace(/\.[a-zA-Z0-9]+$/, '') // strip extension
        .replace(/[-_.(](1080p|720p|4k|2160p|x264|x265|hevc|h264|h265|av1|bluray|web-?dl|webrip|dd5\.1|dts|aac|truehd|hdr|dovi|remux)[-_.)]*/gi, '') // strip codecs/res/ratings
        .replace(/[^a-zA-Z0-9 \(\)[\]]/g, ' ') // alphanumeric
        .replace(/\s+/g, ' ') // collapse multi-spaces
        .trim()
        .toLowerCase();
        
      if (item) {
        const parts = (item.filePath || "").split(/[\\\/]/).filter(Boolean);
        const getParentMediaName = () => {
          if (parts.length === 0) return "unknown";
          const extraIdx = parts.findIndex(p => EXTRAS_REGEX.test(p));
          let startIdx = extraIdx > 0 ? extraIdx - 1 : parts.length - 2;
          let parentIdx = startIdx;
          while (parentIdx > 0) {
            const pName = parts[parentIdx];
            const isSeason = extractSeasonNumber(pName) !== null;
            const isGenericRoot = /^(tv|tv shows|shows|series|docuseries|cartoons|anime|documentaries|movies|movie|film|films|video|videos|extras|music|audio|foreign)$/i.test(pName);
            if (isSeason || isGenericRoot || pName.length <= 2) {
              parentIdx--;
            } else {
              break;
            }
          }
          return (parts[parentIdx] || "unknown").toLowerCase();
        };

        const getSeasonFromPath = () => {
          for (const part of parts) {
            const s = extractSeasonNumber(part);
            if (s !== null) return `season_${s}`;
          }
          return "noseason";
        };

        const isExtra = EXTRAS_REGEX.test(item.filePath || "") || 
                        (item.category || "").toLowerCase() === "extras" || 
                        (item.category || "").toLowerCase() === "shorts";
        
        const parentMediaName = getParentMediaName();
        const season = getSeasonFromPath();

        if (isExtra) {
          return `extra_${parentMediaName}_${season}_${cleaned}`;
        }

        const isTvShow = (item.category || "").toLowerCase().includes("tv") || 
                         (item.category || "").toLowerCase().includes("show") || 
                         (item.category || "").toLowerCase().includes("series");
        
        const seMatch = cleaned.match(/([sS](\d{1,2})[eE](\d{1,2})|\b(\d{1,2})x(\d{1,2})\b|\b(\d{1,2})[ ]?of[ ]?(\d{1,2})\b)/i);
        
        if (isTvShow || seMatch) {
          return `tv_${parentMediaName}_${season}_${cleaned}`;
        }
        
        const genericNames = ['trailer', 'teaser', 'featurette', 'behind the scenes', 'main title', 'interview', 'extras', 'deleted scenes', 'scene', 'clip', 'short', 'outtakes', 'bloopers'];
        if (genericNames.includes(cleaned) || genericNames.some(g => cleaned.includes(g))) {
          return `extra_${parentMediaName}_${season}_${cleaned}`;
        }
      }

      return cleaned;
    };

    // Grouping by cleaned video name
    const videoGroups = new Map<string, MediaItem[]>();
    videoItems.forEach(item => {
      const key = cleanVideoName(item.filename, item);
      if (!videoGroups.has(key)) {
        videoGroups.set(key, []);
      }
      videoGroups.get(key)!.push(item);
    });

    // Pairwise duration check to confirm duplication (within 3 minutes)
    for (const [key, group] of videoGroups.entries()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          const itemA = group[i];
          let isDupA = false;
          for (let j = 0; j < group.length; j++) {
            if (i === j) continue;
            const itemB = group[j];
            // If durations match within 180 seconds or of similar length, or if either duration is zero (corrupted/missing metadata)
            const durationDiff = Math.abs(itemA.durationMins - itemB.durationMins);
            const sizeDiffRatio = Math.abs(itemA.sizeGB - itemB.sizeGB) / Math.max(itemA.sizeGB, itemB.sizeGB || 1);
            
            // If durations are close (within 3 minutes), it's highly likely to be a quality copy/version of the same file
            if (durationDiff <= 3 || itemA.durationMins === 0 || itemB.durationMins === 0) {
              isDupA = true;
              break;
            }
          }
          if (isDupA) {
            duplicateMap.set(itemA.id, true);
          }
        }
      }
    }
  }

  // --- MUSIC DUPLICATIONS ---
  if (isMusicActive) {
    const musicItems = items.filter(it => isMusicCategory(it.category) && !isPlexThemeMusic(it, items));

    const cleanMusicTrack = (title: string) => {
      return title
        .replace(/\.[a-zA-Z0-9]+$/, '') // strip extension
        .replace(/^\d+[-_.\s]+/, '') // strip track number prefix like "01 - " or "01. "
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };

    const cleanArtist = (artist: string) => {
      return artist.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    };

    const getMusicProperties = (item: MediaItem) => {
      const title = cleanMusicTrack(item.tags?.title || item.filename);
      let artist = cleanArtist(item.tags?.artist || '');
      
      // If artist is empty, try to parse from the parent directory of filePath
      if (!artist && item.filePath) {
        const parts = item.filePath.split(/[\\/]/).filter(Boolean);
        // Usually: D:\Media\Music\ArtistName\AlbumName\Song.mp3
        if (parts.length > 2) {
          const potentialArtist = parts[parts.length - 3];
          const lowerPotential = potentialArtist.toLowerCase();
          const genericMusicFolders = new Set(["music", "artists", "artist", "tv", "tv shows", "movies", "soundtracks", "compilations", "albums", "shared", "downloads", "temp", "unknown", "audio", "various"]);
          if (!genericMusicFolders.has(lowerPotential) && potentialArtist.length > 2) {
            artist = cleanArtist(potentialArtist);
          }
        }
      }
      if (!artist) {
        artist = 'unknown';
      }
      return { title, artist };
    };

    const musicGroups = new Map<string, MediaItem[]>();
    musicItems.forEach(item => {
      const { title, artist } = getMusicProperties(item);
      const parts = (item.filePath || "").split(/[\\/]/).filter(Boolean);
      const parentDir = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : "unknown_dir";
      const key = artist === 'unknown' ? `unknown_${parentDir}_${title}` : `${artist} - ${title}`;
      if (!musicGroups.has(key)) {
        musicGroups.set(key, []);
      }
      musicGroups.get(key)!.push(item);
    });

    for (const [key, group] of musicGroups.entries()) {
      if (group.length > 1) {
        // Since different tracks on different albums could have same name (e.g. Intro), we check duration match (within 30 seconds)
        for (let i = 0; i < group.length; i++) {
          const itemA = group[i];
          let isDupA = false;
          for (let j = 0; j < group.length; j++) {
            if (i === j) continue;
            const itemB = group[j];
            
            if (!areParentFoldersSimilar(itemA.filePath, itemB.filePath)) continue;
            const durationDiffMins = Math.abs(itemA.durationMins - itemB.durationMins);
            const durationDiffMs = durationDiffMins * 60; // minutes to seconds check
            
            if (durationDiffMs <= 30 || itemA.durationMins === 0 || itemB.durationMins === 0) {
              isDupA = true;
              break;
            }
          }
          if (isDupA) {
            duplicateMap.set(itemA.id, true);
          }
        }
      }
    }
  }

  return duplicateMap;
}
