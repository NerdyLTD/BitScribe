import { MediaItem } from '@bitscribe/core-types';

export const MOCK_MEDIA_LIBRARY: MediaItem[] = [
  // ==========================================
  // GROUP 1: MODERN+ (15 items - 5 Movies, 5 TV, 5 Music)
  // HEVC with AAC/AC3/EAC3 audio (perfect direct play on modern hardware)
  // ==========================================

  // Movies (5)
  {
    id: 'm_mod1',
    filename: 'Dune.Part.Two.2024.2160p.HEVC.EAC3.mkv',
    filePath: 'C:\\Movies\\Dune Part Two (2024)\\Dune.Part.Two.2024.2160p.HEVC.EAC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 18.4,
    durationMins: 166,
    year: 2024,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 15.5,
    hdrFormat: 'HDR10+',
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'Dolby Digital Plus 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible EAC3 surround sound.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_mod2',
    filename: 'Oppenheimer.2023.2160p.HEVC.AC3.mkv',
    filePath: 'C:\\Movies\\Oppenheimer (2023)\\Oppenheimer.2023.2160p.HEVC.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 22.0,
    durationMins: 180,
    year: 2023,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 16.5,
    hdrFormat: 'HDR10',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'Dolby Digital 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'hdmv_pgs', language: 'eng', forced: false },
      { index: 1, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible AC3 surround sound.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_mod3',
    filename: 'Avatar.The.Way.of.Water.2022.1080p.HEVC.AAC.mp4',
    filePath: 'C:\\Movies\\Avatar The Way of Water (2022)\\Avatar.The.Way.of.Water.2022.1080p.HEVC.AAC.mp4',
    category: 'Movie',
    container: 'mp4',
    sizeGB: 8.5,
    durationMins: 192,
    year: 2022,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 6.2,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'webvtt', language: 'eng', forced: false, isExternal: true },
      { index: 1, codec: 'webvtt', language: 'spa', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible AAC stereo fallback.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_mod4',
    filename: 'La.La.Land.2016.1080p.HEVC.AC3.mkv',
    filePath: 'C:\\Movies\\La La Land (2016)\\La.La.Land.2016.1080p.HEVC.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 4.8,
    durationMins: 128,
    year: 2016,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 5.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible Dolby Digital 5.1.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_mod5',
    filename: 'Spider-Man.Across.the.Spider-Verse.2023.2160p.HEVC.EAC3.mkv',
    filePath: 'C:\\Movies\\Spider-Man Across the Spider-Verse (2023)\\Spider-Man.Across.the.Spider-Verse.2023.2160p.HEVC.EAC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 14.5,
    durationMins: 140,
    year: 2023,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 14.0,
    hdrFormat: 'HDR10',
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'EAC3 Surround' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with high quality digital surround.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },

  // TV Shows (5)
  {
    id: 't_mod1',
    filename: 'Stranger.Things.S04E01.1080p.HEVC.EAC3.mp4',
    filePath: 'T:\\TV Shows\\Stranger Things\\Season 04\\Stranger.Things.S04E01.1080p.HEVC.EAC3.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 2.1,
    durationMins: 75,
    year: 2022,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 3.9,
    hdrFormat: 'SDR',
    tags: { title: 'Stranger Things', season: '4', episode: '1', episodeTitle: 'Chapter One: The Hellfire Club', releaseGroup: 'FLUX' },
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'DDP 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true },
      { index: 1, codec: 'subrip', language: 'fre', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible digital surround sound.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_mod2',
    filename: 'The.Mandalorian.S01E01.2160p.HEVC.EAC3.mkv',
    filePath: 'T:\\TV Shows\\The Mandalorian\\Season 01\\The.Mandalorian.S01E01.2160p.HEVC.EAC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 3.5,
    durationMins: 39,
    year: 2019,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 12.5,
    hdrFormat: 'HDR10',
    tags: { title: 'The Mandalorian', season: '1', episode: '1', episodeTitle: 'Chapter 1: The Mandalorian', releaseGroup: 'SW' },
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'EAC3 Atmos' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with high quality digital surround.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_mod3',
    filename: 'Severance.S01E01.1080p.HEVC.AAC.mp4',
    filePath: 'T:\\TV Shows\\Severance\\Season 01\\Severance.S01E01.1080p.HEVC.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 1.2,
    durationMins: 47,
    year: 2022,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 3.5,
    hdrFormat: 'SDR',
    tags: { title: 'Severance', season: '1', episode: '1', episodeTitle: 'Good News About Hell', releaseGroup: 'LUMON' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible AAC stereo fallback.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_mod4',
    filename: 'Succession.S04E01.1080p.HEVC.AC3.mkv',
    filePath: 'T:\\TV Shows\\Succession\\Season 04\\Succession.S04E01.1080p.HEVC.AC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 1.8,
    durationMins: 60,
    year: 2023,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 4.2,
    hdrFormat: 'SDR',
    tags: { title: 'Succession', season: '4', episode: '1', episodeTitle: 'The Munsters', releaseGroup: 'WAYSTAR' },
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible Dolby Digital 5.1.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_mod5',
    filename: 'Game.of.Thrones.S08E05.2160p.HEVC.EAC3.mkv',
    filePath: 'T:\\TV Shows\\Game of Thrones\\Season 08\\Game.of.Thrones.S08E05.2160p.HEVC.EAC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 6.8,
    durationMins: 78,
    year: 2019,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 11.8,
    hdrFormat: 'HDR10',
    tags: { title: 'Game of Thrones', season: '8', episode: '5', episodeTitle: 'The Bells', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'EAC3 Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses HEVC video with compatible digital surround sound.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },

  // Music (5)
  {
    id: 'mu_mod1',
    filename: 'Perfect_Song.m4a',
    filePath: 'M:\\Music\\Melody Makers\\Acoustic Sessions\\01. Perfect_Song.m4a',
    category: 'Music',
    container: 'm4a',
    sizeGB: 0.008,
    durationMins: 3.5,
    year: 2021,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC 256kbps Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Melody Makers',
      album_artist: 'Melody Makers',
      album: 'Acoustic Sessions',
      title: 'Perfect Song',
      track: '1'
    },
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses standard high-bitrate AAC audio.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_mod2',
    filename: 'Acoustic_Jam.m4a',
    filePath: 'M:\\Music\\Melody Makers\\Acoustic Sessions\\02. Acoustic_Jam.m4a',
    category: 'Music',
    container: 'm4a',
    sizeGB: 0.009,
    durationMins: 4.2,
    year: 2021,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC 256kbps Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Melody Makers',
      album_artist: 'Melody Makers',
      album: 'Acoustic Sessions',
      title: 'Acoustic Jam',
      track: '2'
    },
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Uses standard high-bitrate AAC audio.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_mod3',
    filename: 'Synth_Wave_Anthem.mp3',
    filePath: 'M:\\Music\\Retro Beats\\Neon Nights\\01. Synth_Wave_Anthem.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.007,
    durationMins: 3.2,
    year: 2020,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 320000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 320kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Retro Beats',
      album_artist: 'Retro Beats',
      album: 'Neon Nights',
      title: 'Synth Wave Anthem',
      track: '1'
    },
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Standard MP3 audio at 320kbps.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_mod4',
    filename: 'Neon_Nights.mp3',
    filePath: 'M:\\Music\\Retro Beats\\Neon Nights\\02. Neon_Nights.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.008,
    durationMins: 3.8,
    year: 2020,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 320000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 320kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Retro Beats',
      album_artist: 'Retro Beats',
      album: 'Neon Nights',
      title: 'Neon Nights',
      track: '2'
    },
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Standard MP3 audio at 320kbps.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_mod5',
    filename: 'Midnight_Drive.mp3',
    filePath: 'M:\\Music\\Retro Beats\\Neon Nights\\03. Midnight_Drive.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.009,
    durationMins: 4.1,
    year: 2020,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 320000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 320kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Retro Beats',
      album_artist: 'Retro Beats',
      album: 'Neon Nights',
      title: 'Midnight Drive',
      track: '3'
    },
    streamFriendlyLevel: 'modern',
    streamFriendlyReason: 'Direct Plays on Modern HW: Standard MP3 audio at 320kbps.',
    streamFriendlySuggestion: 'Perfect. Ready to scan sync and stream natively.',
    streamFriendlyEvaluated: 1
  },

  // ==========================================
  // GROUP 2: LEGACY+ (15 items - 5 Movies, 5 TV, 5 Music)
  // H264 with AAC/AC3 audio (perfect direct play on absolutely everything, legacy & modern)
  // ==========================================

  // Movies (5)
  {
    id: 'm_leg1',
    filename: 'The.Matrix.1999.1080p.h264.AAC.mp4',
    filePath: 'C:\\Movies\\The Matrix (1999)\\The.Matrix.1999.1080p.h264.AAC.mp4',
    category: 'Movie',
    container: 'mp4',
    sizeGB: 8.2,
    durationMins: 136,
    year: 1999,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 8.2,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo fallback' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible AAC stereo streams.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_leg2',
    filename: 'Inception.2010.1080p.h264.AC3.mkv',
    filePath: 'C:\\Movies\\Inception (2010)\\Inception.2010.1080p.h264.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 10.5,
    durationMins: 148,
    year: 2010,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 9.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 Surround 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible Dolby Digital 5.1 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_leg3',
    filename: 'Interstellar.2014.1080p.h264.AC3.mkv',
    filePath: 'C:\\Movies\\Interstellar (2014)\\Interstellar.2014.1080p.h264.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 12.8,
    durationMins: 169,
    year: 2014,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 9.5,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'Dolby Surround 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible Dolby Digital 5.1 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_leg4',
    filename: 'Saving.Private.Ryan.1998.1080p.h264.AC3.mkv',
    filePath: 'C:\\Movies\\Saving Private Ryan (1998)\\Saving.Private.Ryan.1998.1080p.h264.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 15.2,
    durationMins: 169,
    year: 1998,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 12.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible Dolby Digital 5.1 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_leg5',
    filename: 'The.Dark.Knight.2008.1080p.h264.AAC.mp4',
    filePath: 'C:\\Movies\\The Dark Knight (2008)\\The.Dark.Knight.2008.1080p.h264.AAC.mp4',
    category: 'Movie',
    container: 'mp4',
    sizeGB: 9.5,
    durationMins: 152,
    year: 2008,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 8.5,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible AAC stereo streams.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },

  // TV Shows (5)
  {
    id: 't_leg1',
    filename: 'Breaking.Bad.S01E01.1080p.h264.AAC.mp4',
    filePath: 'T:\\TV Shows\\Breaking Bad\\Season 01\\Breaking.Bad.S01E01.1080p.h264.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 1.6,
    durationMins: 58,
    year: 2008,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 3.8,
    hdrFormat: 'SDR',
    tags: { title: 'Breaking Bad', season: '1', episode: '1', episodeTitle: 'Pilot', releaseGroup: 'AMC' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible AAC stereo streams.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_leg2',
    filename: 'The.Office.S01E01.1080p.h264.AAC.mp4',
    filePath: 'T:\\TV Shows\\The Office\\Season 01\\The.Office.S01E01.1080p.h264.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 0.8,
    durationMins: 22,
    year: 2005,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 3.2,
    hdrFormat: 'SDR',
    tags: { title: 'The Office', season: '1', episode: '1', episodeTitle: 'Pilot', releaseGroup: 'NBC' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible AAC stereo streams.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_leg3',
    filename: 'Friends.S01E01.1080p.h264.AAC.mp4',
    filePath: 'T:\\TV Shows\\Friends\\Season 01\\Friends.S01E01.1080p.h264.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 0.7,
    durationMins: 22,
    year: 1994,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 3.0,
    hdrFormat: 'SDR',
    tags: { title: 'Friends', season: '1', episode: '1', episodeTitle: 'The One Where Monica Gets a Roommate', releaseGroup: 'WB' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible AAC stereo streams.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_leg4',
    filename: 'Sherlock.S01E01.1080p.h264.AC3.mkv',
    filePath: 'T:\\TV Shows\\Sherlock\\Season 01\\Sherlock.S01E01.1080p.h264.AC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 2.5,
    durationMins: 90,
    year: 2010,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 4.5,
    hdrFormat: 'SDR',
    tags: { title: 'Sherlock', season: '1', episode: '1', episodeTitle: 'A Study in Pink', releaseGroup: 'BBC' },
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible Dolby Digital 5.1 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_leg5',
    filename: 'Fargo.S01E01.1080p.h264.AC3.mkv',
    filePath: 'T:\\TV Shows\\Fargo\\Season 01\\Fargo.S01E01.1080p.h264.AC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 1.8,
    durationMins: 53,
    year: 2014,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 4.0,
    hdrFormat: 'SDR',
    tags: { title: 'Fargo', season: '1', episode: '1', episodeTitle: "The Crocodile's Dilemma", releaseGroup: 'FX' },
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'Dolby Surround 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses H.264 video with highly compatible Dolby Digital 5.1 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for compression improvement. Upgrade to HEVC if storage space is key.',
    streamFriendlyEvaluated: 1
  },

  // Music (5)
  {
    id: 'mu_leg1',
    filename: 'Song_Remix_192.mp3',
    filePath: 'M:\\Music\\Melody Makers\\Acoustic Sessions\\03. Song_Remix_192.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.005,
    durationMins: 3.5,
    year: 2021,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 192000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 192kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Melody Makers',
      album_artist: 'Melody Makers',
      album: 'Acoustic Sessions',
      title: 'Song Remix (192kbps)',
      track: '3'
    },
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses standard compatibility MP3 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for improvement. Encode to high-bitrate AAC/MP3 for better fidelity.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_leg2',
    filename: 'Acoustic_Outtake_192.mp3',
    filePath: 'M:\\Music\\Melody Makers\\Acoustic Sessions\\04. Acoustic_Outtake_192.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.006,
    durationMins: 4.2,
    year: 2021,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 192000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 192kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Melody Makers',
      album_artist: 'Melody Makers',
      album: 'Acoustic Sessions',
      title: 'Acoustic Outtake (192kbps)',
      track: '4'
    },
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses standard compatibility MP3 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for improvement. Encode to high-bitrate AAC/MP3 for better fidelity.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_leg3',
    filename: 'Live_Jam_256.mp3',
    filePath: 'M:\\Music\\The Rockers\\Live Concert\\01. Live_Jam_256.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.006,
    durationMins: 3.2,
    year: 2018,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 256kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'The Rockers',
      album_artist: 'The Rockers',
      album: 'Live Concert',
      title: 'Live Jam (256kbps)',
      track: '1'
    },
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses standard compatibility MP3 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for improvement. Encode to high-bitrate AAC/MP3 for better fidelity.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_leg4',
    filename: 'Guitar_Solo_256.mp3',
    filePath: 'M:\\Music\\The Rockers\\Live Concert\\02. Guitar_Solo_256.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.007,
    durationMins: 3.8,
    year: 2018,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 256kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'The Rockers',
      album_artist: 'The Rockers',
      album: 'Live Concert',
      title: 'Guitar Solo',
      track: '2'
    },
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses standard compatibility MP3 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for improvement. Encode to high-bitrate AAC/MP3 for better fidelity.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_leg5',
    filename: 'Bass_Groove_256.mp3',
    filePath: 'M:\\Music\\The Rockers\\Live Concert\\03. Bass_Groove_256.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.008,
    durationMins: 4.1,
    year: 2018,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo 256kbps' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'The Rockers',
      album_artist: 'The Rockers',
      album: 'Live Concert',
      title: 'Bass Groove',
      track: '3'
    },
    streamFriendlyLevel: 'legacy',
    streamFriendlyReason: 'Direct Plays on Modern & Legacy HW: Uses standard compatibility MP3 audio.',
    streamFriendlySuggestion: 'Compatible stream, but candidate for improvement. Encode to high-bitrate AAC/MP3 for better fidelity.',
    streamFriendlyEvaluated: 1
  },

  // ==========================================
  // GROUP 3: BLEEDING EDGE (15 items - 5 Movies, 5 TV, 5 Music)
  // Codecs like AV1, VP9, or TrueHD / DTS-HD / Multichannel Opus / Hi-Res FLAC (transcodes on older HW, requires high-end players)
  // ==========================================

  // Movies (5)
  {
    id: 'm_ble1',
    filename: 'Blade.Runner.2049.2017.2160p.AV1.TrueHD.mkv',
    filePath: 'C:\\Movies\\Blade Runner 2049 (2017)\\Blade.Runner.2049.2017.2160p.AV1.TrueHD.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 25.1,
    durationMins: 164,
    year: 2017,
    videoCodec: 'av1',
    videoResolution: '4K',
    videoBitrateMbps: 21.0,
    hdrFormat: 'HDR10',
    audioTracks: [
      { index: 0, codec: 'truehd', channels: 8, language: 'eng', title: 'TrueHD Atmos 7.1' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (AV1) & Bleeding Edge/Lossless audio stream (TRUEHD). Requires transcoding on most current and past hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_ble2',
    filename: 'Sintel.2010.2160p.AV1.Opus.webm',
    filePath: 'C:\\Movies\\Sintel (2010)\\Sintel.2010.2160p.AV1.Opus.webm',
    category: 'Movie',
    container: 'webm',
    sizeGB: 4.8,
    durationMins: 15,
    year: 2010,
    videoCodec: 'av1',
    videoResolution: '4K',
    videoBitrateMbps: 18.0,
    hdrFormat: 'HDR10',
    audioTracks: [
      { index: 0, codec: 'opus', channels: 2, language: 'eng', title: 'Opus Stereo' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (AV1) requires transcoding on most current and past hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_ble3',
    filename: 'Tears.of.Steel.2012.1080p.VP9.Opus.webm',
    filePath: 'C:\\Movies\\Tears of Steel (2012)\\Tears.of.Steel.2012.1080p.VP9.Opus.webm',
    category: 'Movie',
    container: 'webm',
    sizeGB: 1.2,
    durationMins: 12,
    year: 2012,
    videoCodec: 'vp9',
    videoResolution: '1080p',
    videoBitrateMbps: 8.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'opus', channels: 6, language: 'eng', title: 'Opus 5.1 Surround' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (VP9) & Bleeding Edge/Lossless audio stream (OPUS) requires transcoding on older hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_ble4',
    filename: 'Dune.Part.One.2021.2160p.HEVC.TrueHD.mkv',
    filePath: 'C:\\Movies\\Dune Part One (2021)\\Dune.Part.One.2021.2160p.HEVC.TrueHD.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 20.0,
    durationMins: 155,
    year: 2021,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 18.5,
    hdrFormat: 'Dolby Vision',
    audioTracks: [
      { index: 0, codec: 'truehd', channels: 8, language: 'eng', title: 'Atmos 7.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Lossless audio stream (TRUEHD) requires transcoding on standard or older mobile hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_ble5',
    filename: 'The.Matrix.Resurrections.2021.2160p.HEVC.DTSHD.mkv',
    filePath: 'C:\\Movies\\The Matrix Resurrections (2021)\\The.Matrix.Resurrections.2021.2160p.HEVC.DTSHD.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 22.0,
    durationMins: 148,
    year: 2021,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 19.0,
    hdrFormat: 'Dolby Vision',
    audioTracks: [
      { index: 0, codec: 'dts', channels: 8, language: 'eng', title: 'DTS-HD Master Audio 7.1' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Lossless audio stream (DTS-HD MA) requires transcoding on standard or older mobile hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },

  // TV Shows (5)
  {
    id: 't_ble1',
    filename: 'Severance.S01E09.1080p.AV1.AAC.mkv',
    filePath: 'T:\\TV Shows\\Severance\\Season 01\\Severance.S01E09.1080p.AV1.AAC.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 1.5,
    durationMins: 50,
    year: 2022,
    videoCodec: 'av1',
    videoResolution: '1080p',
    videoBitrateMbps: 3.2,
    hdrFormat: 'SDR',
    tags: { title: 'Severance', season: '1', episode: '9', episodeTitle: 'The We We Are', releaseGroup: 'LUMON' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (AV1) requires transcoding on most current and past hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_ble2',
    filename: 'House.of.the.Dragon.S01E01.2160p.HEVC.TrueHD.mkv',
    filePath: 'T:\\TV Shows\\House of the Dragon\\Season 01\\House.of.the.Dragon.S01E01.2160p.HEVC.TrueHD.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 5.8,
    durationMins: 66,
    year: 2022,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 14.2,
    hdrFormat: 'Dolby Vision',
    tags: { title: 'House of the Dragon', season: '1', episode: '1', episodeTitle: 'Heirs of the Dragon', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'truehd', channels: 8, language: 'eng', title: 'Atmos 7.1' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Lossless audio stream (TRUEHD) requires transcoding on standard hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_ble3',
    filename: 'The.Last.of.Us.S01E01.2160p.HEVC.DTSHD.mkv',
    filePath: 'T:\\TV Shows\\The Last of Us\\Season 01\\The.Last.of.Us.S01E01.2160p.HEVC.DTSHD.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 6.2,
    durationMins: 81,
    year: 2023,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 13.8,
    hdrFormat: 'HDR10',
    tags: { title: 'The Last of Us', season: '1', episode: '1', episodeTitle: "When You're Lost in the Darkness", releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'dts', channels: 8, language: 'eng', title: 'DTS-HD MA 7.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Lossless audio stream (DTS-HD MA) requires transcoding on standard hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_ble4',
    filename: 'The.Mandalorian.S02E08.1080p.VP9.Opus.webm',
    filePath: 'T:\\TV Shows\\The Mandalorian\\Season 02\\The.Mandalorian.S02E08.1080p.VP9.Opus.webm',
    category: 'TV',
    container: 'webm',
    sizeGB: 1.5,
    durationMins: 47,
    year: 2020,
    videoCodec: 'vp9',
    videoResolution: '1080p',
    videoBitrateMbps: 3.5,
    hdrFormat: 'SDR',
    tags: { title: 'The Mandalorian', season: '2', episode: '8', episodeTitle: 'Chapter 16: The Rescue', releaseGroup: 'SW' },
    audioTracks: [
      { index: 0, codec: 'opus', channels: 2, language: 'eng', title: 'Opus Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (VP9) & Bleeding Edge/Lossless audio stream (OPUS). Requires transcoding on older hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_ble5',
    filename: 'Stranger.Things.S04E09.2160p.AV1.AAC.mkv',
    filePath: 'T:\\TV Shows\\Stranger Things\\Season 04\\Stranger.Things.S04E09.2160p.AV1.AAC.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 5.5,
    durationMins: 140,
    year: 2022,
    videoCodec: 'av1',
    videoResolution: '4K',
    videoBitrateMbps: 11.5,
    hdrFormat: 'HDR10',
    tags: { title: 'Stranger Things', season: '4', episode: '9', episodeTitle: 'Chapter Nine: The Piggyback', releaseGroup: 'FLUX' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: Bleeding Edge video codec (AV1) requires transcoding on most current and past hardware.',
    streamFriendlySuggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes on hand for broader compatibility.',
    streamFriendlyEvaluated: 1
  },

  // Music (5)
  {
    id: 'mu_ble1',
    filename: 'Speak_to_Me.flac',
    filePath: 'M:\\Music\\Pink Floyd\\The Dark Side of the Moon (1973)\\01. Speak_to_Me.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.04,
    durationMins: 2.5,
    year: 1973,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 960000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'Hi-Res FLAC 24-bit/96kHz' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Pink Floyd',
      album_artist: 'Pink Floyd',
      album: 'The Dark Side of the Moon',
      title: 'Speak to Me',
      track: '1'
    },
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: High resolution/lossless audio stream (FLAC) requires high-end receivers or server decoding.',
    streamFriendlySuggestion: 'Keep high-quality MP3 or AAC versions on hand for older mobile devices or remote streaming.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_ble2',
    filename: 'Time.flac',
    filePath: 'M:\\Music\\Pink Floyd\\The Dark Side of the Moon (1973)\\04. Time.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.05,
    durationMins: 6.8,
    year: 1973,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 960000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'Hi-Res FLAC 24-bit/96kHz' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Pink Floyd',
      album_artist: 'Pink Floyd',
      album: 'The Dark Side of the Moon',
      title: 'Time',
      track: '4'
    },
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: High resolution/lossless audio stream (FLAC) requires high-end receivers or server decoding.',
    streamFriendlySuggestion: 'Keep high-quality MP3 or AAC versions on hand for older mobile devices or remote streaming.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_ble3',
    filename: 'Beethoven_Symphony5.flac',
    filePath: 'M:\\Music\\Beethoven\\Symphonies\\01. Symphony_No5.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.08,
    durationMins: 8.5,
    year: 2015,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 1411000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'CD-Quality FLAC 16-bit/44.1kHz' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Ludwig van Beethoven',
      album_artist: 'Ludwig van Beethoven',
      album: 'Symphonies',
      title: 'Symphony No. 5',
      track: '1'
    },
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: High resolution/lossless audio stream (FLAC) requires high-end receivers or server decoding.',
    streamFriendlySuggestion: 'Keep high-quality MP3 or AAC versions on hand for older mobile devices or remote streaming.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_ble4',
    filename: 'Moonlight_Sonata.flac',
    filePath: 'M:\\Music\\Beethoven\\Symphonies\\02. Moonlight_Sonata.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.04,
    durationMins: 5.5,
    year: 2015,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 1411000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'CD-Quality FLAC 16-bit/44.1kHz' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Ludwig van Beethoven',
      album_artist: 'Ludwig van Beethoven',
      album: 'Symphonies',
      title: 'Moonlight Sonata',
      track: '2'
    },
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: High resolution/lossless audio stream (FLAC) requires high-end receivers or server decoding.',
    streamFriendlySuggestion: 'Keep high-quality MP3 or AAC versions on hand for older mobile devices or remote streaming.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_ble5',
    filename: 'Stairway_to_Heaven.flac',
    filePath: 'M:\\Music\\Led Zeppelin\\Led Zeppelin IV\\04. Stairway_to_Heaven.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.06,
    durationMins: 8.0,
    year: 1971,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 980000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'Hi-Res FLAC' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Led Zeppelin',
      album_artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      title: 'Stairway to Heaven',
      track: '4'
    },
    streamFriendlyLevel: 'bleeding',
    streamFriendlyReason: 'Bleeding Edge: High resolution/lossless audio stream (FLAC) requires high-end receivers or server decoding.',
    streamFriendlySuggestion: 'Keep high-quality MP3 or AAC versions on hand for older mobile devices or remote streaming.',
    streamFriendlyEvaluated: 1
  },

  // ==========================================
  // GROUP 4: TRANSCODE REQUIRED (15 items - 5 Movies, 5 TV, 5 Music)
  // Containers like AVI, TS, ASF or codecs like VC1, MPEG2, MPEG4 or missing fallback HDR/PGS image subs
  // ==========================================

  // Movies (5)
  {
    id: 'm_unf1',
    filename: 'Gladiator.2000.1080p.VC1.PGS.mkv',
    filePath: 'C:\\Movies\\Gladiator (2000)\\Gladiator.2000.1080p.VC1.PGS.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 15.2,
    durationMins: 155,
    year: 2000,
    videoCodec: 'vc1',
    videoResolution: '1080p',
    videoBitrateMbps: 12.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'dts', channels: 6, language: 'eng', title: 'DTS 5.1 Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'hdmv_pgs', language: 'eng', forced: false }
    ],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (VC1); PGS/DVD Image subtitles force CPU transcode burning.',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Sideload clean external text SRT subtitles.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_unf2',
    filename: 'Pulp.Fiction.1994.MPEG4.avi',
    filePath: 'C:\\Movies\\Pulp Fiction (1994)\\Pulp.Fiction.1994.MPEG4.avi',
    category: 'Movie',
    container: 'avi',
    sizeGB: 1.4,
    durationMins: 154,
    year: 1994,
    videoCodec: 'mpeg4',
    videoResolution: 'SD',
    videoBitrateMbps: 1.5,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG4); Complex container format wrap (AVI).',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Remux stream wrap to clean MP4 or MKV without transcoding.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_unf3',
    filename: 'Dune.Part.Two.2024.UHD.DoVi.Profile5.mkv',
    filePath: 'C:\\Movies\\Dune Part Two (2024)\\Dune.Part.Two.2024.UHD.DoVi.Profile5.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 21.5,
    durationMins: 166,
    year: 2024,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 18.0,
    hdrFormat: 'Dolby Vision Profile 5',
    audioTracks: [
      { index: 0, codec: 'truehd', channels: 8, language: 'eng', title: 'Dolby Atmos' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'hdmv_pgs', language: 'eng', forced: false }
    ],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Dolby Vision Profile 5 lacks standard HDR10 fallback layer; PGS/DVD Image subtitles force CPU transcode burning.',
    streamFriendlySuggestion: 'Transcode or source standard HDR10/HDR10+ capable media. Sideload clean external text SRT subtitles.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_unf4',
    filename: 'Classic.SciFi.2008.1080p.VC1.ts',
    filePath: 'C:\\Movies\\Classic SciFi (2008)\\Classic.SciFi.2008.1080p.VC1.ts',
    category: 'Movie',
    container: 'ts',
    sizeGB: 8.5,
    durationMins: 95,
    year: 2008,
    videoCodec: 'vc1',
    videoResolution: '1080p',
    videoBitrateMbps: 12.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'dts', channels: 6, language: 'eng', title: 'DTS Core 5.1' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (VC1); Complex container format wrap (TS).',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Remux stream wrap to clean MP4 or MKV without transcoding.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'm_unf5',
    filename: 'Vintage.Movie.1950.SD.MPEG2.mov',
    filePath: 'C:\\Movies\\Vintage Movie (1950)\\Vintage.Movie.1950.SD.MPEG2.mov',
    category: 'Movie',
    container: 'mov',
    sizeGB: 1.8,
    durationMins: 82,
    year: 1950,
    videoCodec: 'mpeg2',
    videoResolution: 'SD',
    videoBitrateMbps: 3.1,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'pcm', channels: 2, language: 'eng', title: 'PCM Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG2); Complex audio/video combination causing potential transcoding.',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Embed secondary standard AAC/Dolby surround soundtrack.',
    streamFriendlyEvaluated: 1
  },

  // TV Shows (5)
  {
    id: 't_unf1',
    filename: 'The.Simpsons.S04E12.SD.MPEG2.mkv',
    filePath: 'T:\\TV Shows\\The Simpsons\\Season 04\\The.Simpsons.S04E12.SD.MPEG2.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 0.4,
    durationMins: 22,
    year: 1993,
    videoCodec: 'mpeg2',
    videoResolution: 'SD',
    videoBitrateMbps: 2.5,
    hdrFormat: 'SDR',
    tags: { title: 'The Simpsons', season: '4', episode: '12', episodeTitle: 'Marge vs. the Monorail', releaseGroup: 'FOX' },
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 2, language: 'eng', title: 'AC3 Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG2) causing potential CPU transcode burning.',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_unf2',
    filename: 'Star.Trek.TNG.S01E01.VC1.WMA.wmv',
    filePath: 'T:\\TV Shows\\Star Trek TNG\\Season 01\\Star.Trek.TNG.S01E01.VC1.WMA.wmv',
    category: 'TV',
    container: 'wmv',
    sizeGB: 0.9,
    durationMins: 92,
    year: 1987,
    videoCodec: 'vc1',
    videoResolution: 'SD',
    videoBitrateMbps: 1.4,
    hdrFormat: 'SDR',
    tags: { title: 'Star Trek: The Next Generation', season: '1', episode: '1', episodeTitle: 'Encounter at Farpoint', releaseGroup: 'PAR' },
    audioTracks: [
      { index: 0, codec: 'wmav2', channels: 2, language: 'eng', title: 'WMA Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (VC1); Complex container format wrap (WMV); Incompatible sound track compression standard.',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Embed secondary standard AAC/Dolby surround soundtrack.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_unf3',
    filename: 'The.Wire.S01E01.MPEG4.avi',
    filePath: 'T:\\TV Shows\\The Wire\\Season 01\\The.Wire.S01E01.MPEG4.avi',
    category: 'TV',
    container: 'avi',
    sizeGB: 0.9,
    durationMins: 55,
    year: 2002,
    videoCodec: 'mpeg4',
    videoResolution: 'SD',
    videoBitrateMbps: 1.8,
    hdrFormat: 'SDR',
    tags: { title: 'The Wire', season: '1', episode: '1', episodeTitle: 'The Target', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 2, language: 'eng', title: 'AC3 Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG4); Complex container format wrap (AVI).',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Remux stream wrap to clean MP4 or MKV without transcoding.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_unf4',
    filename: 'Retro.Sitcom.S02E01.MPEG4.avi',
    filePath: 'T:\\TV Shows\\Retro Sitcom\\Season 02\\Retro.Sitcom.S02E01.MPEG4.avi',
    category: 'TV',
    container: 'avi',
    sizeGB: 0.5,
    durationMins: 22,
    year: 1998,
    videoCodec: 'mpeg4',
    videoResolution: 'SD',
    videoBitrateMbps: 1.5,
    hdrFormat: 'SDR',
    tags: { title: 'Retro Sitcom', season: '2', episode: '1', episodeTitle: 'The Reunion', releaseGroup: 'VHS' },
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'und', title: 'MP3 Undefined' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG4); Complex container format wrap (AVI).',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Remux stream wrap to clean MP4 or MKV without transcoding.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 't_unf5',
    filename: 'The.Twilight.Zone.S01E01.MPEG2.TS.ts',
    filePath: 'T:\\TV Shows\\The Twilight Zone\\Season 01\\The.Twilight.Zone.S01E01.MPEG2.TS.ts',
    category: 'TV',
    container: 'ts',
    sizeGB: 1.2,
    durationMins: 25,
    year: 1959,
    videoCodec: 'mpeg2',
    videoResolution: 'SD',
    videoBitrateMbps: 4.5,
    hdrFormat: 'SDR',
    tags: { title: 'The Twilight Zone', season: '1', episode: '1', episodeTitle: 'Where Is Everybody?', releaseGroup: 'CBS' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'dvbsub', language: 'eng', forced: false }
    ],
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Suboptimal video codec (MPEG2); Complex container format wrap (TS); PGS/DVD Image subtitles force CPU transcode burning.',
    streamFriendlySuggestion: 'Transcode stream to HEVC/H.264 standard profiles. Remux stream wrap to clean MP4 or MKV without transcoding.',
    streamFriendlyEvaluated: 1
  },

  // Music (5)
  {
    id: 'mu_unf1',
    filename: 'Background_Classic_Mozart.asf',
    filePath: 'M:\\Music\\Classical\\Background_Classic_Mozart.asf',
    category: 'Music',
    container: 'asf',
    sizeGB: 0.045,
    durationMins: 6.0,
    year: 2005,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 128000,
    audioTracks: [
      { index: 0, codec: 'wmav2', channels: 2, language: 'eng', title: 'WMA Audio v2' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Wolfgang Amadeus Mozart',
      album_artist: 'Wolfgang Amadeus Mozart',
      album: 'Classical Backgrounds',
      title: 'Mozart Classical Theme',
      track: '1'
    },
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Incompatible sound track compression standard (WMAV2); Complex container format wrap (ASF).',
    streamFriendlySuggestion: 'Remux wrap or transcode stream to standard format. Encode to AAC or MP3.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_unf2',
    filename: 'Vintage_Track_Vorbis.ogg',
    filePath: 'M:\\Music\\Messy Folder\\Vintage_Track_Vorbis.ogg',
    category: 'Music',
    container: 'ogg',
    sizeGB: 0.008,
    durationMins: 4.5,
    year: 2003,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 192000,
    audioTracks: [
      { index: 0, codec: 'vorbis', channels: 2, language: 'eng', title: 'Ogg Vorbis Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Various Artists',
      album_artist: 'Various Artists',
      album: 'Old Collections',
      title: 'Vintage Ogg Track',
      track: '5'
    },
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Incompatible sound track compression standard (VORBIS); Complex container format wrap (OGG).',
    streamFriendlySuggestion: 'Remux wrap or transcode stream to standard format. Encode to AAC or MP3.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_unf3',
    filename: 'Old_CD_Rip.wma',
    filePath: 'M:\\Music\\Messy Folder\\Old_CD_Rip.wma',
    category: 'Music',
    container: 'wma',
    sizeGB: 0.004,
    durationMins: 3.8,
    year: 2001,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 64000,
    audioTracks: [
      { index: 0, codec: 'wma', channels: 2, language: 'eng', title: 'WMA Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Unknown Artist',
      album_artist: 'Unknown Artist',
      album: 'Unknown Album',
      title: 'Old CD Rip Track',
      track: '6'
    },
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Incompatible sound track compression standard (WMA); Starved audio bitrate.',
    streamFriendlySuggestion: 'Transcode audio track to standard AAC or MP3.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_unf4',
    filename: 'Heavy_Bass_Compilation.ogg',
    filePath: 'M:\\Music\\Bass\\Subwoofer Beats\\Heavy_Bass_Compilation.ogg',
    category: 'Music',
    container: 'ogg',
    sizeGB: 0.012,
    durationMins: 5.2,
    year: 2012,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'vorbis', channels: 2, language: 'eng', title: 'Ogg Vorbis Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Loud Bass',
      album_artist: 'Loud Bass',
      album: 'Deep Vibes',
      title: 'Heavy Bass Beat',
      track: '12'
    },
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Incompatible sound track compression standard (VORBIS); Complex container format wrap (OGG).',
    streamFriendlySuggestion: 'Remux wrap or transcode stream to standard format. Encode to AAC or MP3.',
    streamFriendlyEvaluated: 1
  },
  {
    id: 'mu_unf5',
    filename: 'Mozart_Symphony40.asf',
    filePath: 'M:\\Music\\Classical\\Mozart_Symphony40.asf',
    category: 'Music',
    container: 'asf',
    sizeGB: 0.05,
    durationMins: 8.2,
    year: 2005,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 96000,
    audioTracks: [
      { index: 0, codec: 'wmav2', channels: 2, language: 'eng', title: 'WMA Audio v2' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Wolfgang Amadeus Mozart',
      album_artist: 'Wolfgang Amadeus Mozart',
      album: 'Classical Backgrounds',
      title: 'Symphony No. 40',
      track: '2'
    },
    streamFriendlyLevel: 'unfriendly',
    streamFriendlyReason: 'Incompatible sound track compression standard (WMAV2); Complex container format wrap (ASF).',
    streamFriendlySuggestion: 'Remux wrap or transcode stream to standard format. Encode to AAC or MP3.',
    streamFriendlyEvaluated: 1
  },

  // ==========================================
  // GROUP 5: PENDING SCAN (15 items - 5 Movies, 5 TV, 5 Music)
  // Has not been evaluated by the scanner yet (streamFriendlyEvaluated: 0)
  // ==========================================

  // Movies (5)
  {
    id: 'm_pen1',
    filename: 'Arrival.2016.2160p.HEVC.EAC3.mkv',
    filePath: 'C:\\Movies\\Arrival (2016)\\Arrival.2016.2160p.HEVC.EAC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 18.5,
    durationMins: 116,
    year: 2016,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 14.5,
    hdrFormat: 'HDR10',
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'Dolby Digital Plus 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'm_pen2',
    filename: 'The.Prestige.2006.1080p.h264.AC3.mkv',
    filePath: 'C:\\Movies\\The Prestige (2006)\\The.Prestige.2006.1080p.h264.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 8.5,
    durationMins: 130,
    year: 2006,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 8.2,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 5.1' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'm_pen3',
    filename: 'Memento.2000.1080p.h264.AAC.mp4',
    filePath: 'C:\\Movies\\Memento (2000)\\Memento.2000.1080p.h264.AAC.mp4',
    category: 'Movie',
    container: 'mp4',
    sizeGB: 5.5,
    durationMins: 113,
    year: 2000,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 6.2,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'm_pen4',
    filename: 'The.Social.Network.2010.1080p.h264.AAC.mp4',
    filePath: 'C:\\Movies\\The Social Network (2010)\\The.Social.Network.2010.1080p.h264.AAC.mp4',
    category: 'Movie',
    container: 'mp4',
    sizeGB: 6.5,
    durationMins: 120,
    year: 2010,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 6.5,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'm_pen5',
    filename: 'The.Grand.Budapest.Hotel.2014.1080p.h264.AC3.mkv',
    filePath: 'C:\\Movies\\The Grand Budapest Hotel (2014)\\The.Grand.Budapest.Hotel.2014.1080p.h264.AC3.mkv',
    category: 'Movie',
    container: 'mkv',
    sizeGB: 4.5,
    durationMins: 99,
    year: 2014,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 5.0,
    hdrFormat: 'SDR',
    audioTracks: [
      { index: 0, codec: 'ac3', channels: 6, language: 'eng', title: 'AC3 Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },

  // TV Shows (5)
  {
    id: 't_pen1',
    filename: 'True.Detective.S01E01.1080p.HEVC.EAC3.mkv',
    filePath: 'T:\\TV Shows\\True Detective\\Season 01\\True.Detective.S01E01.1080p.HEVC.EAC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 1.8,
    durationMins: 58,
    year: 2014,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 4.2,
    hdrFormat: 'SDR',
    tags: { title: 'True Detective', season: '1', episode: '1', episodeTitle: 'The Long Bright Dark', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'EAC3 Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 't_pen2',
    filename: 'Better.Call.Saul.S01E01.1080p.h264.AAC.mp4',
    filePath: 'T:\\TV Shows\\Better Call Saul\\Season 01\\Better.Call.Saul.S01E01.1080p.h264.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 1.5,
    durationMins: 53,
    year: 2015,
    videoCodec: 'h264',
    videoResolution: '1080p',
    videoBitrateMbps: 3.5,
    hdrFormat: 'SDR',
    tags: { title: 'Better Call Saul', season: '1', episode: '1', episodeTitle: 'Uno', releaseGroup: 'AMC' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 't_pen3',
    filename: 'Westworld.S01E01.2160p.HEVC.EAC3.mkv',
    filePath: 'T:\\TV Shows\\Westworld\\Season 01\\Westworld.S01E01.2160p.HEVC.EAC3.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 4.8,
    durationMins: 68,
    year: 2016,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 12.5,
    hdrFormat: 'HDR10',
    tags: { title: 'Westworld', season: '1', episode: '1', episodeTitle: 'The Original', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'eac3', channels: 6, language: 'eng', title: 'Dolby Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 't_pen4',
    filename: 'The.Crown.S01E01.1080p.HEVC.AAC.mp4',
    filePath: 'T:\\TV Shows\\The Crown\\Season 01\\The.Crown.S01E01.1080p.HEVC.AAC.mp4',
    category: 'TV',
    container: 'mp4',
    sizeGB: 1.2,
    durationMins: 56,
    year: 2016,
    videoCodec: 'hevc',
    videoResolution: '1080p',
    videoBitrateMbps: 3.2,
    hdrFormat: 'SDR',
    tags: { title: 'The Crown', season: '1', episode: '1', episodeTitle: 'Wolferton Splash', releaseGroup: 'NF' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 't_pen5',
    filename: 'Chernobyl.S01E01.2160p.HEVC.AAC.mkv',
    filePath: 'T:\\TV Shows\\Chernobyl\\Season 01\\Chernobyl.S01E01.2160p.HEVC.AAC.mkv',
    category: 'TV',
    container: 'mkv',
    sizeGB: 5.4,
    durationMins: 59,
    year: 2019,
    videoCodec: 'hevc',
    videoResolution: '4K',
    videoBitrateMbps: 12.8,
    hdrFormat: 'HLG',
    tags: { title: 'Chernobyl', season: '1', episode: '1', episodeTitle: '1:23:45', releaseGroup: 'HBO' },
    audioTracks: [
      { index: 0, codec: 'aac', channels: 6, language: 'eng', title: 'AAC 5.1 Surround' }
    ],
    subtitleTracks: [
      { index: 0, codec: 'subrip', language: 'eng', forced: false, isExternal: true }
    ],
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },

  // Music (5)
  {
    id: 'mu_pen1',
    filename: 'Acoustic_Outtake_2.m4a',
    filePath: 'M:\\Music\\Melody Makers\\Acoustic Sessions\\05. Acoustic_Outtake_2.m4a',
    category: 'Music',
    container: 'm4a',
    sizeGB: 0.008,
    durationMins: 3.5,
    year: 2021,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 256000,
    audioTracks: [
      { index: 0, codec: 'aac', channels: 2, language: 'eng', title: 'AAC Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      album_artist: 'Melody Makers',
      album: 'Acoustic Sessions',
      title: 'Acoustic Outtake 2',
      track: '5'
    },
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'mu_pen2',
    filename: 'Rock_Jam_2022.mp3',
    filePath: 'M:\\Music\\The Rockers\\Live Concert\\04. Rock_Jam_2022.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.007,
    durationMins: 3.2,
    year: 0,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 320000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 320kbps' }
    ],
    subtitleTracks: [],
    tags: {
      title: 'Rock Jam 2022',
      track: '4'
    },
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'mu_pen3',
    filename: 'Metal_Riff.mp3',
    filePath: 'M:\\Music\\The Rockers\\Live Concert\\05. Metal_Riff.mp3',
    category: 'Music',
    container: 'mp3',
    sizeGB: 0.008,
    durationMins: 3.8,
    year: 2022,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 320000,
    audioTracks: [
      { index: 0, codec: 'mp3', channels: 2, language: 'eng', title: 'MP3 Stereo' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'The Rockers',
      album_artist: 'The Rockers',
      album: 'Live Concert',
      title: 'Metal Riff',
      track: '5'
    },
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'mu_pen4',
    filename: 'Classical_Piano_Outtake.flac',
    filePath: 'M:\\Music\\Beethoven\\Symphonies\\03. Classical_Piano_Outtake.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.04,
    durationMins: 5.5,
    year: 2015,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 960000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'FLAC' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Ludwig van Beethoven',
      album_artist: 'Ludwig van Beethoven',
      album: 'Symphonies',
      title: 'Classical Piano Outtake',
      track: '3'
    },
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  },
  {
    id: 'mu_pen5',
    filename: 'Beethoven_Symphony9.flac',
    filePath: 'M:\\Music\\Beethoven\\Symphonies\\04. Symphony_No9.flac',
    category: 'Music',
    container: 'flac',
    sizeGB: 0.09,
    durationMins: 12.5,
    year: 2015,
    videoCodec: 'none',
    videoResolution: '',
    videoBitrateMbps: 0,
    audioBitrate: 1411000,
    audioTracks: [
      { index: 0, codec: 'flac', channels: 2, language: 'eng', title: 'FLAC CD Quality' }
    ],
    subtitleTracks: [],
    tags: {
      artist: 'Ludwig van Beethoven',
      album_artist: 'Ludwig van Beethoven',
      album: 'Symphonies',
      title: 'Symphony No. 9',
      track: '4'
    },
    streamFriendlyLevel: '',
    streamFriendlyReason: '',
    streamFriendlySuggestion: '',
    streamFriendlyEvaluated: 0
  }
];
