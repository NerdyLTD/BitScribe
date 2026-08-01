import { isMusicCategory } from '../types';
import { MediaItem, EvaluationResult, RuleCriteria } from '../types';
import { getDisplayArtist } from './musicHelper';

export const DEFAULT_RULES: RuleCriteria = {
  useBleedingEdgePreset: false,
  bleedingEdgeVideoCodecs: ['av1', 'hevc'],
  bleedingEdgeSurroundAudioCodecs: ['truehd', 'dtshd'],
  bleedingEdgeStereoAudioCodecs: ['flac', 'pcm'],
  useModernPreset: true,
  useLegacyPreset: true,
  useDiscoveryPreset: false,
  useSubtitleScan: false,
  useDuplicationScan: false,
  useDuplicationVideoScan: false,
  useDuplicationMusicScan: false,
  useMetadataScan: false,
  useVideoMetadataScan: false,
  useMusicMetadataScan: false,
  useCleanNonLatinTags: true,

  modernVideoCodecs: ['hevc', 'h264', 'vp9'],
  modernSurroundAudioCodecs: ['ac3', 'eac3', 'dts', 'opus'],
  modernStereoAudioCodecs: ['aac', 'mp3', 'opus', 'flac', 'pcm'],
  modernMusicCodecs: ['flac', 'aac', 'mp3', 'alac', 'wav', 'ogg', 'opus'],

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

export function evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false): EvaluationResult {
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
      const subFormats = subs.map(s => s.codec.toUpperCase()).join(', ');
      return {
        level: 'modern',
        reason: `Subtitles Complete: ${subs.length} tracks detected (${subFormats})`,
        suggestion: 'None required. Subtitles are available inside container.'
      };
    } else {
      return {
        level: 'unfriendly',
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
      const br = item.audioBitrate || 0;
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
        } else if (br > 320) {
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
    if (isMusicCategory(item.category)) {
      const discoveryMusic = customRules.discoveryMusicCodecs || DEFAULT_RULES.discoveryMusicCodecs;
      const codecToCheck = (audios.length > 0 ? audios[0].codec : vCodec || container).toLowerCase();
      if (discoveryMusic.includes(codecToCheck)) {
        return {
          level: 'modern',
          reason: `Cataloged: Matches discovered music format (${codecToCheck.toUpperCase()})`,
          suggestion: 'Track successfully discovered and cataloged.'
        };
      } else {
        return {
          level: 'unfriendly',
          reason: `Discovery Skip: Unsupported music codec (${codecToCheck.toUpperCase()})`,
          suggestion: 'Select a matching discovery music audio codec in settings or transcode.'
        };
      }
    }

    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Cannot catalog file parameters.',
        suggestion: 'Replace corrupted/broken media file.'
      };
    }

    const valVid = customRules.discoveryVideoCodecs || DEFAULT_RULES.discoveryVideoCodecs;
    const valCont = customRules.discoveryContainers || DEFAULT_RULES.discoveryContainers;
    const valSurr = customRules.discoverySurroundAudioCodecs || DEFAULT_RULES.discoverySurroundAudioCodecs;
    const valSter = customRules.discoveryStereoAudioCodecs || DEFAULT_RULES.discoveryStereoAudioCodecs;

    const vCompat = valVid.includes(vCodec);
    const cCompat = valCont.includes(container);
    
    let aCompat = true;
    if (audios.length > 0) {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!valSurr.includes(codec)) aCompat = false;
        } else {
          if (!valSter.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat) {
      return {
        level: 'modern',
        reason: `Cataloged: Format found and successfully cataloged (${vCodec.toUpperCase()} / ${container.toUpperCase()}).`,
        suggestion: 'File discovery complete. Ready for database indexing.'
      };
    } else {
      const issues: string[] = [];
      if (!vCompat) issues.push(`Rare/Unknown video codec (${vCodec.toUpperCase() || 'none'})`);
      if (!cCompat) issues.push(`Unsupported container (${container.toUpperCase()})`);
      if (!aCompat) issues.push(`Rare/Non-cataloged audio track formats`);
      return {
        level: 'unfriendly',
        reason: `Discovery Skip: ${issues.join('; ')}`,
        suggestion: 'Check file headers or adjust your discovery codecs definition in settings.'
      };
    }
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
    } else if (customRules.useDiscoveryPreset && discoveryMusic.includes(codecToCheck)) {
      return {
        level: 'modern',
        reason: `Matches custom discovery music format (${codecToCheck})`,
        suggestion: 'Configured Discovery compliance.'
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
    const beVCodecs = customRules.bleedingEdgeVideoCodecs || ['av1', 'hevc'];
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
        reason: `Direct Plays on Bleeding Edge: Uses ${vCodec.toUpperCase()} video with lossless/modern audio.`,
        suggestion: 'Perfect. Peak efficiency and audio fidelity.'
      };
    } else if (vCompat || cCompat || aCompat) {
       // if Bleeding Edge is the ONLY thing active, and it failed
       if (!activeModern && !activeLegacy) {
           return {
             level: 'unfriendly',
             reason: 'Fails Bleeding Edge standards.',
             suggestion: 'Upgrade internal streams to AV1/HEVC or lossless audio formats.'
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
    const modernVCodecs = customRules.modernVideoCodecs || ['hevc', 'h264', 'av1'];
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
          reason: `Direct Plays on Modern HW: Uses ${vCodec.toUpperCase()} video with compatible audio streams.`,
          suggestion: 'Compatible stream, but candidate for improvement. Upgrade to HEVC for better compression.'
        };
      }
      return {
        level: 'modern',
        reason: `Direct Plays on Modern HW: Uses ${vCodec.toUpperCase()} video with compatible audio streams.`,
        suggestion: 'Perfect. Ready to scan sync and stream natively.'
      };
    }
  }

  // Compile remediation details / reasons
  const causes: string[] = [];
  const suggestions: string[] = [];

  const validVid = ['h264', 'avc'];
  if (activeModern) validVid.push('hevc', 'h255', 'h265');

  if (!validVid.includes(vCodec)) {
    causes.push(`Suboptimal video codec (${vCodec.toUpperCase() || 'UNKNOWN'})`);
    suggestions.push(`Transcode stream to HEVC/H.264 standard profiles.`);
  }

  const validConts = ['mkv', 'mp4', 'm4v'];

  if (!validConts.includes(container)) {
    causes.push(`Complex container format wrap (${container.toUpperCase()})`);
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

export function computeDuplicatesMap(items: MediaItem[], rules: RuleCriteria): Map<string, boolean> {
  const duplicateMap = new Map<string, boolean>();
  const isVideoActive = rules.useDuplicationVideoScan || rules.useDuplicationScan;
  const isMusicActive = rules.useDuplicationMusicScan || rules.useDuplicationScan;

  if (!isVideoActive && !isMusicActive) {
    return duplicateMap;
  }

  // --- VIDEO DUPLICATIONS ---
  if (isVideoActive) {
    const videoItems = items.filter(it => it.category !== 'Music' && it.category !== 'Corrupted' && it.category !== 'Static');
    
    // Clean function for video names
    const cleanVideoName = (filename: string) => {
      let cleaned = filename
        .replace(/\.[a-zA-Z0-9]+$/, '') // strip extension
        .replace(/[-_.(](1080p|720p|4k|2160p|x264|x265|hevc|h264|h265|av1|bluray|web-?dl|webrip|dd5\.1|dts|aac|truehd|hdr|dovi|remux)[-_.)]*/gi, '') // strip codecs/res/ratings
        .replace(/\s*[\(\[]\d{4}[\)\]]\s*/g, ' ') // strip year e.g. (2024)
        .replace(/[^a-zA-Z0-9 ]/g, ' ') // alphanumeric
        .replace(/\s+/g, ' ') // collapse multi-spaces
        .trim()
        .toLowerCase();
      return cleaned;
    };

    // Grouping by cleaned video name
    const videoGroups = new Map<string, MediaItem[]>();
    videoItems.forEach(item => {
      const key = cleanVideoName(item.filename);
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
    const musicItems = items.filter(it => it.category === 'Music');

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
          artist = cleanArtist(parts[parts.length - 3]);
        }
      }
      return { title, artist };
    };

    const musicGroups = new Map<string, MediaItem[]>();
    musicItems.forEach(item => {
      const { title, artist } = getMusicProperties(item);
      const key = `${artist || 'unknown'} - ${title}`;
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
