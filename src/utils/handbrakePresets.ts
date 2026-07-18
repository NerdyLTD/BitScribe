import JSZip from 'jszip';
import { downloadOrSaveFile } from './downloader';

export interface HandbrakePreset {
  PresetName: string;
  Folder: boolean;
  Type?: number;
  PresetDescription?: string;
  ChildrenArray?: HandbrakePreset[];
  
  // Picture Settings (Flat-prefixes in official Handbrake exports)
  PictureCropMode?: number;
  PictureBottomCrop?: number;
  PictureLeftCrop?: number;
  PictureRightCrop?: number;
  PictureTopCrop?: number;
  PictureDARWidth?: number;
  PictureDeblockPreset?: string;
  PictureDeblockTune?: string;
  PictureDeblockCustom?: string;
  PictureDeinterlaceFilter?: string;
  PictureCombDetectPreset?: string;
  PictureCombDetectCustom?: string;
  PictureDenoiseCustom?: string;
  PictureDenoiseFilter?: string;
  PictureSharpenCustom?: string;
  PictureSharpenFilter?: string;
  PictureSharpenPreset?: string;
  PictureSharpenTune?: string;
  PictureDetelecine?: string;
  PictureDetelecineCustom?: string;
  PictureColorspacePreset?: string;
  PictureColorspaceCustom?: string;
  PictureChromaSmoothPreset?: string;
  PictureChromaSmoothTune?: string;
  PictureChromaSmoothCustom?: string;
  PictureItuPAR?: boolean;
  PictureKeepRatio?: boolean;
  PicturePAR?: string;
  PicturePARWidth?: number;
  PicturePARHeight?: number;
  PictureWidth?: number;
  PictureHeight?: number;
  PictureUseMaximumSize?: boolean;
  PictureAllowUpscaling?: boolean;
  PictureForceHeight?: number;
  PictureForceWidth?: number;
  PicturePadMode?: string;
  PicturePadTop?: number;
  PicturePadBottom?: number;
  PicturePadLeft?: number;
  PicturePadRight?: number;
  PicturePadColor?: string;

  // Video Settings (Flat-prefixes in official Handbrake exports)
  VideoAvgBitrate?: number;
  VideoColorRange?: string;
  VideoColorMatrixCode?: number;
  VideoEncoder?: string;
  VideoFramerateMode?: string;
  VideoGrayScale?: boolean;
  VideoScaler?: string;
  VideoPreset?: string;
  VideoTune?: string;
  VideoProfile?: string;
  VideoLevel?: string;
  VideoOptionExtra?: string;
  VideoQualityType?: number;
  VideoQualitySlider?: number;
  VideoMultiPass?: boolean;
  VideoTurboMultiPass?: boolean;
  VideoPasshtruHDRDynamicMetadata?: string;
  x264UseAdvancedOptions?: boolean;
  PresetDisabled?: boolean;
  MetadataPassthru?: boolean;

  // Audio Settings (Flat-prefixes and structures)
  AlignAVStart?: boolean;
  AudioCopyMask?: string[];
  AudioEncoderFallback?: string;
  AudioLanguageList?: string[];
  AudioList?: Array<{
    AudioBitrate: number;
    AudioCompressionLevel: number;
    AudioEncoder: string;
    AudioMixdown: string;
    AudioNormalizeMixLevel: boolean;
    AudioSamplerate: string;
    AudioTrackQualityEnable: boolean;
    AudioTrackQuality: number;
    AudioTrackGainSlider: number;
    AudioTrackDRCSlider: number;
  }>;
  AudioSecondaryEncoderMode?: boolean;
  AudioTrackSelectionBehavior?: string;
  AudioTrackNamePassthru?: boolean;
  AudioAutomaticNamingBehavior?: string;
  ChapterMarkers?: boolean;

  // Subtitle Settings (Flat-prefixes)
  SubtitleAddCC?: boolean;
  SubtitleAddForeignAudioSearch?: boolean;
  SubtitleAddForeignAudioSubtitle?: boolean;
  SubtitleBurnBehavior?: string;
  SubtitleBurnBDSub?: boolean;
  SubtitleBurnDVDSub?: boolean;
  SubtitleLanguageList?: string[];
  SubtitleTrackSelectionBehavior?: string;
  SubtitleTrackNamePassthru?: boolean;

  Default?: boolean;
  FileFormat?: string;
  FolderOpen?: boolean;
  Optimize?: boolean;
  Mp4iPodCompatible?: boolean;
}

export interface PresetDef {
  name: string;
  standard: 'Modern+' | 'Legacy+';
  resolution: 'SD' | 'HD' | 'Full HD' | '4K';
  quality: 'Space Saver' | 'Balanced' | 'Kinda Silly';
  width: number;
  height: number;
  encoder: string;
  rf: number;
  audio: Array<{ codec: string; bitrate: number; mixdown: string }>;
}

export const PRESET_BLUEPRINTS: PresetDef[] = [
  // --- MODERN+ ---
  // SD (480p)
  {
    name: "Space Saver SD (Modern+)",
    standard: "Modern+",
    resolution: "SD",
    quality: "Space Saver",
    width: 720,
    height: 480,
    encoder: "x265_10bit",
    rf: 24,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced SD (Modern+)",
    standard: "Modern+",
    resolution: "SD",
    quality: "Balanced",
    width: 720,
    height: 480,
    encoder: "x265_10bit",
    rf: 21,
    audio: [
      { codec: "eac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly SD (Modern+)",
    standard: "Modern+",
    resolution: "SD",
    quality: "Kinda Silly",
    width: 720,
    height: 480,
    encoder: "x265_10bit",
    rf: 18,
    audio: [
      { codec: "eac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // HD (720p)
  {
    name: "Space Saver HD (Modern+)",
    standard: "Modern+",
    resolution: "HD",
    quality: "Space Saver",
    width: 1280,
    height: 720,
    encoder: "x265_10bit",
    rf: 22,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced HD (Modern+)",
    standard: "Modern+",
    resolution: "HD",
    quality: "Balanced",
    width: 1280,
    height: 720,
    encoder: "x265_10bit",
    rf: 19,
    audio: [
      { codec: "eac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly HD (Modern+)",
    standard: "Modern+",
    resolution: "HD",
    quality: "Kinda Silly",
    width: 1280,
    height: 720,
    encoder: "x265_10bit",
    rf: 16,
    audio: [
      { codec: "eac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // Full HD (1080p)
  {
    name: "Space Saver Full HD (Modern+)",
    standard: "Modern+",
    resolution: "Full HD",
    quality: "Space Saver",
    width: 1920,
    height: 1080,
    encoder: "x265_10bit",
    rf: 20,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced Full HD (Modern+)",
    standard: "Modern+",
    resolution: "Full HD",
    quality: "Balanced",
    width: 1920,
    height: 1080,
    encoder: "x265_10bit",
    rf: 17,
    audio: [
      { codec: "eac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly Full HD (Modern+)",
    standard: "Modern+",
    resolution: "Full HD",
    quality: "Kinda Silly",
    width: 1920,
    height: 1080,
    encoder: "x265_10bit",
    rf: 14,
    audio: [
      { codec: "eac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // 4K (2160p)
  {
    name: "Space Saver 4K (Modern+)",
    standard: "Modern+",
    resolution: "4K",
    quality: "Space Saver",
    width: 3840,
    height: 2160,
    encoder: "x265_10bit",
    rf: 18,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced 4K (Modern+)",
    standard: "Modern+",
    resolution: "4K",
    quality: "Balanced",
    width: 3840,
    height: 2160,
    encoder: "x265_10bit",
    rf: 15,
    audio: [
      { codec: "eac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly 4K (Modern+)",
    standard: "Modern+",
    resolution: "4K",
    quality: "Kinda Silly",
    width: 3840,
    height: 2160,
    encoder: "x265_10bit",
    rf: 12,
    audio: [
      { codec: "eac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },

  // --- LEGACY+ ---
  // SD (480p)
  {
    name: "Space Saver SD (Legacy+)",
    standard: "Legacy+",
    resolution: "SD",
    quality: "Space Saver",
    width: 720,
    height: 480,
    encoder: "x264",
    rf: 22,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced SD (Legacy+)",
    standard: "Legacy+",
    resolution: "SD",
    quality: "Balanced",
    width: 720,
    height: 480,
    encoder: "x264",
    rf: 20,
    audio: [
      { codec: "ac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly SD (Legacy+)",
    standard: "Legacy+",
    resolution: "SD",
    quality: "Kinda Silly",
    width: 720,
    height: 480,
    encoder: "x264",
    rf: 17,
    audio: [
      { codec: "ac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // HD (720p)
  {
    name: "Space Saver HD (Legacy+)",
    standard: "Legacy+",
    resolution: "HD",
    quality: "Space Saver",
    width: 1280,
    height: 720,
    encoder: "x264",
    rf: 20,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced HD (Legacy+)",
    standard: "Legacy+",
    resolution: "HD",
    quality: "Balanced",
    width: 1280,
    height: 720,
    encoder: "x264",
    rf: 18,
    audio: [
      { codec: "ac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly HD (Legacy+)",
    standard: "Legacy+",
    resolution: "HD",
    quality: "Kinda Silly",
    width: 1280,
    height: 720,
    encoder: "x264",
    rf: 15,
    audio: [
      { codec: "ac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // Full HD (1080p)
  {
    name: "Space Saver Full HD (Legacy+)",
    standard: "Legacy+",
    resolution: "Full HD",
    quality: "Space Saver",
    width: 1920,
    height: 1080,
    encoder: "x264",
    rf: 18,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced Full HD (Legacy+)",
    standard: "Legacy+",
    resolution: "Full HD",
    quality: "Balanced",
    width: 1920,
    height: 1080,
    encoder: "x264",
    rf: 16,
    audio: [
      { codec: "ac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly Full HD (Legacy+)",
    standard: "Legacy+",
    resolution: "Full HD",
    quality: "Kinda Silly",
    width: 1920,
    height: 1080,
    encoder: "x264",
    rf: 13,
    audio: [
      { codec: "ac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  },
  // 4K (2160p)
  {
    name: "Space Saver 4K (Legacy+)",
    standard: "Legacy+",
    resolution: "4K",
    quality: "Space Saver",
    width: 3840,
    height: 2160,
    encoder: "x264",
    rf: 16,
    audio: [
      { codec: "ac3", bitrate: 384, mixdown: "5point1" },
      { codec: "aac", bitrate: 128, mixdown: "dpl2" }
    ]
  },
  {
    name: "Balanced 4K (Legacy+)",
    standard: "Legacy+",
    resolution: "4K",
    quality: "Balanced",
    width: 3840,
    height: 2160,
    encoder: "x264",
    rf: 14,
    audio: [
      { codec: "ac3", bitrate: 448, mixdown: "5point1" },
      { codec: "aac", bitrate: 160, mixdown: "dpl2" }
    ]
  },
  {
    name: "Kinda Silly 4K (Legacy+)",
    standard: "Legacy+",
    resolution: "4K",
    quality: "Kinda Silly",
    width: 3840,
    height: 2160,
    encoder: "x264",
    rf: 11,
    audio: [
      { codec: "ac3", bitrate: 640, mixdown: "5point1" },
      { codec: "aac", bitrate: 192, mixdown: "dpl2" }
    ]
  }
];

export function createHandbrakePresetObject(def: PresetDef): HandbrakePreset {
  const isModern = def.standard === 'Modern+';
  const desc = `${def.standard} ${def.resolution} [${def.quality}]: ` +
    `Video Codec: ${isModern ? 'HEVC 10-bit' : 'H.264 8-bit'}, Constant Quality: RF ${def.rf}, ` +
    `Audio Tracks: ${def.audio.map(a => `${a.codec.toUpperCase()} (${a.bitrate}kbps)`).join(' + ')}, Subtitles: SRT soft subs. ` +
    `Max resolution bounds: ${def.width}x${def.height}. Optimized for BitScribe direct-play compatibility audits.`;

  return {
    PresetName: def.name,
    Folder: false,
    Type: 1,
    PresetDescription: desc,
    ChildrenArray: [],

    // Picture Settings
    PictureCropMode: 2,
    PictureBottomCrop: 0,
    PictureLeftCrop: 0,
    PictureRightCrop: 0,
    PictureTopCrop: 0,
    PictureDARWidth: 0,
    PictureDeblockPreset: "off",
    PictureDeblockTune: "medium",
    PictureDeblockCustom: "strength=strong:thresh=20:blocksize=8",
    PictureDeinterlaceFilter: "off",
    PictureCombDetectPreset: "off",
    PictureCombDetectCustom: "",
    PictureDenoiseCustom: "",
    PictureDenoiseFilter: "off",
    PictureSharpenCustom: "",
    PictureSharpenFilter: "off",
    PictureSharpenPreset: "medium",
    PictureSharpenTune: "none",
    PictureDetelecine: "off",
    PictureDetelecineCustom: "",
    PictureColorspacePreset: "off",
    PictureColorspaceCustom: "",
    PictureChromaSmoothPreset: "off",
    PictureChromaSmoothTune: "none",
    PictureChromaSmoothCustom: "",
    PictureItuPAR: false,
    PictureKeepRatio: true,
    PicturePAR: "auto",
    PicturePARWidth: 0,
    PicturePARHeight: 0,
    PictureWidth: def.width,
    PictureHeight: def.height,
    PictureUseMaximumSize: true,
    PictureAllowUpscaling: false,
    PictureForceHeight: 0,
    PictureForceWidth: 0,
    PicturePadMode: "none",
    PicturePadTop: 0,
    PicturePadBottom: 0,
    PicturePadLeft: 0,
    PicturePadRight: 0,
    PicturePadColor: "black",

    // Video Settings
    VideoAvgBitrate: 0,
    VideoColorRange: "auto",
    VideoColorMatrixCode: 0,
    VideoEncoder: def.encoder,
    VideoFramerateMode: "cfr",
    VideoGrayScale: false,
    VideoScaler: "swscale",
    VideoPreset: "slow",
    VideoTune: "",
    VideoProfile: isModern ? "main10" : "auto",
    VideoLevel: "auto",
    VideoOptionExtra: "",
    VideoQualityType: 2,
    VideoQualitySlider: def.rf,
    VideoMultiPass: false,
    VideoTurboMultiPass: false,
    VideoPasshtruHDRDynamicMetadata: "all",
    x264UseAdvancedOptions: false,
    PresetDisabled: false,
    MetadataPassthru: true,

    // Audio Settings
    AlignAVStart: false,
    AudioCopyMask: ["copy:aac", "copy:ac3", "copy:eac3"],
    AudioEncoderFallback: "av_aac",
    AudioLanguageList: ["eng"],
    AudioList: def.audio.map(a => ({
      AudioBitrate: a.bitrate,
      AudioCompressionLevel: 0,
      AudioEncoder: a.codec === "aac" ? "av_aac" : a.codec,
      AudioMixdown: a.mixdown,
      AudioNormalizeMixLevel: false,
      AudioSamplerate: "auto",
      AudioTrackQualityEnable: false,
      AudioTrackQuality: -1,
      AudioTrackGainSlider: 0,
      AudioTrackDRCSlider: 0
    })),
    AudioSecondaryEncoderMode: true,
    AudioTrackSelectionBehavior: "first",
    AudioTrackNamePassthru: true,
    AudioAutomaticNamingBehavior: "unnamed",
    ChapterMarkers: true,

    // Subtitle Settings
    SubtitleAddCC: false,
    SubtitleAddForeignAudioSearch: false,
    SubtitleAddForeignAudioSubtitle: false,
    SubtitleBurnBehavior: "none",
    SubtitleBurnBDSub: false,
    SubtitleBurnDVDSub: false,
    SubtitleLanguageList: ["eng", "fra", "spa"],
    SubtitleTrackSelectionBehavior: "none",
    SubtitleTrackNamePassthru: true,

    Default: false,
    FileFormat: "av_mkv",
    FolderOpen: false,
    Optimize: false,
    Mp4iPodCompatible: false
  };
}

export function buildUnifiedPresetsJson(): string {
  // We'll organize them into folders for a super clean import inside HandBrake
  const categories = ['Modern+', 'Legacy+'];
  const qualities = ['Space Saver', 'Balanced', 'Kinda Silly'];

  const rootChildren: HandbrakePreset[] = categories.map(catName => {
    return {
      PresetName: `${catName} Standards`,
      Folder: true,
      Type: 0, // Folders are Type 0 in standard Handbrake presets
      ChildrenArray: qualities.map(qName => {
        // Find matching presets for this category and quality tier
        const matchingDefs = PRESET_BLUEPRINTS.filter(p => p.standard === catName && p.quality === qName);
        return {
          PresetName: qName,
          Folder: true,
          Type: 0, // Folders are Type 0
          ChildrenArray: matchingDefs.map(def => createHandbrakePresetObject(def))
        };
      })
    };
  });

  const fullStructure = {
    PresetList: [
      {
        PresetName: "BitScribe DMLS Presets",
        Folder: true,
        Type: 0, // Root folder is Type 0
        ChildrenArray: rootChildren
      }
    ],
    VersionMajor: 72, // Matches Handbrake's modern .NET layout version to prevent import parser crashes
    VersionMinor: 0,
    VersionMicro: 0
  };

  return JSON.stringify(fullStructure, null, 2);
}

export async function downloadUnifiedPresets() {
  const jsonContent = buildUnifiedPresetsJson();
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  await downloadOrSaveFile('BitScribe_HandBrake_Presets.json', blob);
}

export async function downloadPresetsZip() {
  const zip = new JSZip();

  // Create folder structure in zip and add individual json files
  PRESET_BLUEPRINTS.forEach(def => {
    const singlePreset = {
      PresetList: [createHandbrakePresetObject(def)],
      VersionMajor: 72,
      VersionMinor: 0,
      VersionMicro: 0
    };
    
    // Normalize path names
    const folderPath = `${def.standard} Standards/${def.quality}`;
    const fileName = `${def.name.replace(/[\/\\?%*:|"<>\s]+/g, '_')}.json`;
    
    zip.folder(folderPath)?.file(fileName, JSON.stringify(singlePreset, null, 2));
  });

  const content = await zip.generateAsync({ type: 'blob' });
  await downloadOrSaveFile('BitScribe_HandBrake_Presets_Collection.zip', content);
}
