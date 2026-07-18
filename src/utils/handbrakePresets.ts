import JSZip from 'jszip';
import { downloadOrSaveFile } from './downloader';

export interface HandbrakePreset {
  PresetName: string;
  Folder: boolean;
  Type?: number;
  PresetDescription?: string;
  Picture?: {
    Width?: number;
    Height?: number;
    KeepRatio?: boolean;
    AutoAnamorphic?: boolean;
    DeinterlaceFilter?: string;
  };
  Video?: {
    Encoder?: string;
    QualityType?: number;
    Quality?: number;
    QualityRF?: number;
    Framerate?: string;
    FramerateMode?: string;
    Profile?: string;
    Level?: string;
  };
  Audio?: {
    AudioList?: Array<{
      AudioCodec: string;
      AudioBitrate: number;
      AudioMixdown: string;
      AudioTrackQuality: number;
      AudioTrackGainSlider: number;
    }>;
  };
  Subtitle?: {
    SubtitleList?: Array<{
      SubtitleCodec: string;
      SubtitleBurn: boolean;
      SubtitleDefault: boolean;
      SubtitleForce: boolean;
    }>;
  };
  Children?: HandbrakePreset[];
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
    Picture: {
      Width: def.width,
      Height: def.height,
      KeepRatio: true,
      AutoAnamorphic: true,
      DeinterlaceFilter: "decomb"
    },
    Video: {
      Encoder: def.encoder,
      QualityType: 2,
      Quality: def.rf,
      QualityRF: def.rf,
      Framerate: "auto",
      FramerateMode: "vfr",
      Profile: "auto",
      Level: "auto"
    },
    Audio: {
      AudioList: def.audio.map(a => ({
        AudioCodec: a.codec,
        AudioBitrate: a.bitrate,
        AudioMixdown: a.mixdown,
        AudioTrackQuality: -1,
        AudioTrackGainSlider: 0
      }))
    },
    Subtitle: {
      SubtitleList: [
        {
          SubtitleCodec: "srt",
          SubtitleBurn: false,
          SubtitleDefault: false,
          SubtitleForce: false
        }
      ]
    }
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
      Children: qualities.map(qName => {
        // Find matching presets for this category and quality tier
        const matchingDefs = PRESET_BLUEPRINTS.filter(p => p.standard === catName && p.quality === qName);
        return {
          PresetName: qName,
          Folder: true,
          Children: matchingDefs.map(def => createHandbrakePresetObject(def))
        };
      })
    };
  });

  const fullStructure = {
    PresetList: [
      {
        PresetName: "BitScribe DMLS Presets",
        Folder: true,
        Children: rootChildren
      }
    ],
    VersionMajor: 19,
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
      VersionMajor: 19,
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
