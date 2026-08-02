import React, { useState } from "react";
import { RuleCriteria } from '@bitscribe/core-types';
import { Sliders, RotateCcw, Info, Check } from "lucide-react";
import { DEFAULT_RULES } from '@bitscribe/core-eval';

// Full options representing FFprobe-compatible codecs and container parameters
const ALL_DISCOVERY_VIDEO = [
  "hevc",
  "h265",
  "h264",
  "av1",
  "vp9",
  "mpeg2",
  "mpeg4",
  "vc1",
  "wmv",
  "flv",
  "theora",
  "divx",
  "xvid",
  "vp8",
  "prores",
  "h255",
  "h263",
];

const ALL_DISCOVERY_SURROUND = [
  "ac3",
  "eac3",
  "dts",
  "truehd",
  "flac",
  "aac",
  "opus",
  "vorbis",
  "wma",
  "dtshd",
  "alac",
  "pcm_s16le",
  "pcm_s24le",
  "mp3",
];

const ALL_DISCOVERY_STEREO = [
  "aac", "mp3", "flac", "pcm", "alac", "opus", "vorbis", "mp2", 
  "wma", "wav", "ogg", "ape", "realaudio", "wmapro", "wmav2", "adpcm_ms",
  "ac3", "eac3", "dts", "truehd", "dtshd"
];

const ALL_DISCOVERY_MUSIC = [
  "flac",
  "aac",
  "mp3",
  "alac",
  "wav",
  "ogg",
  "ape",
  "wma",
  "m4a",
  "opus",
];

const ALL_DISCOVERY_HDR = [
  "SDR",
  "HDR10",
  "HDR10+",
  "Dolby Vision",
  "HLG",
  "Advanced HDR",
];

const ALL_DISCOVERY_CONTAINERS = [
  "mkv",
  "mp4",
  "m4v",
  "avi",
  "ts",
  "mov",
  "flv",
  "webm",
  "wmv",
  "mpg",
  "vob",
  "m2ts",
  "ogg",
  "wav",
  "mp3",
  "flac",
];

interface RuleEditorProps {
  rules: RuleCriteria;
  onRulesChange: (rules: RuleCriteria) => void;
  excelColumns: Record<string, boolean>;
  onExcelColumnsChange: (columns: Record<string, boolean>) => void;
  exportDirectory?: string;
  setExportDirectory?: (val: string) => void;
  onBackup?: (type: 'full' | 'data' | 'settings') => void;
  onRestore?: () => void;
  onVideoOnlySelect?: () => void;
  onMusicOnlySelect?: () => void;
  onCorruptionScanSelect?: () => void;
  onStreamingCompatibilitySelect?: () => void;
  onDiscoveryModeSelect?: () => void;
  onMetadataScanSelect?: () => void;
  onHelpRequest?: (id: string) => void;
  isFluidLayout?: boolean;
  onFluidLayoutChange?: (val: boolean) => void;
  onAppReset?: () => void;
  onWipeDB?: () => void;
  onPopulateDemo?: () => void;
  onClearDemoData?: () => void;
}

export default function RuleEditor({
  rules,
  onRulesChange,
  excelColumns,
  onExcelColumnsChange,
  exportDirectory,
  setExportDirectory,
  onBackup,
  onRestore,
  onCorruptionScanSelect,
  onVideoOnlySelect,
  onMusicOnlySelect,
  onStreamingCompatibilitySelect,
  onDiscoveryModeSelect,
  onMetadataScanSelect,
  onHelpRequest,
  isFluidLayout = true,
  onFluidLayoutChange,
  onAppReset,
  onWipeDB,
  onPopulateDemo,
  onClearDemoData
}: RuleEditorProps) {
  const [backupAllFeedback, setBackupAllFeedback] = useState(false);
  const [backupSettingsFeedback, setBackupSettingsFeedback] = useState(false);

  // Custom toggles

  const toggleStreamingCompatibility = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useModernPreset: checked,
      useLegacyPreset: checked,
      useBleedingEdgePreset: checked,
      ...(checked
        ? {
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": true,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      });
      if (onStreamingCompatibilitySelect) {
        onStreamingCompatibilitySelect();
      }
    }
  };

  const toggleModernPreset = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useModernPreset: checked,
      ...(checked
        ? {
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
  };

  
  const toggleBleedingEdgeVideoCodec = (codec: string) => {
    const list = rules.bleedingEdgeVideoCodecs || [];
    const updated = list.includes(codec) ? list.filter((item: string) => item !== codec) : [...list, codec];
    onRulesChange({ ...rules, bleedingEdgeVideoCodecs: updated });
  };
  const toggleBleedingEdgeSurround = (codec: string) => {
    const list = rules.bleedingEdgeSurroundAudioCodecs || [];
    const updated = list.includes(codec) ? list.filter((item: string) => item !== codec) : [...list, codec];
    onRulesChange({ ...rules, bleedingEdgeSurroundAudioCodecs: updated });
  };
  const toggleBleedingEdgeStereo = (codec: string) => {
    const list = rules.bleedingEdgeStereoAudioCodecs || [];
    const updated = list.includes(codec) ? list.filter((item: string) => item !== codec) : [...list, codec];
    onRulesChange({ ...rules, bleedingEdgeStereoAudioCodecs: updated });
  };
const toggleBleedingEdgePreset = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useBleedingEdgePreset: checked,
      ...(checked
        ? {
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
  };

  const toggleModernVideoCodec = (codec: string) => {
    const list = rules.modernVideoCodecs || [];
    const updated = list.includes(codec)
      ? list.filter((item: string) => item !== codec)
      : [...list, codec];
    onRulesChange({ ...rules, modernVideoCodecs: updated });
  };

  const toggleSurroundAudio = (codec: string, isModern: boolean) => {
    if (isModern) {
      const list = rules.modernSurroundAudioCodecs || [];
      const updated = list.includes(codec)
        ? list.filter((item: string) => item !== codec)
        : [...list, codec];
      onRulesChange({ ...rules, modernSurroundAudioCodecs: updated });
    } else {
      const list = rules.legacySurroundAudioCodecs || [];
      const updated = list.includes(codec)
        ? list.filter((item: string) => item !== codec)
        : [...list, codec];
      onRulesChange({ ...rules, legacySurroundAudioCodecs: updated });
    }
  };

  const toggleStereoAudio = (codec: string, isModern: boolean) => {
    if (isModern) {
      const list = rules.modernStereoAudioCodecs || [];
      const updated = list.includes(codec)
        ? list.filter((item: string) => item !== codec)
        : [...list, codec];
      onRulesChange({ ...rules, modernStereoAudioCodecs: updated });
    } else {
      const list = rules.legacyStereoAudioCodecs || [];
      const updated = list.includes(codec)
        ? list.filter((item: string) => item !== codec)
        : [...list, codec];
      onRulesChange({ ...rules, legacyStereoAudioCodecs: updated });
    }
  };

  const toggleLegacyPreset = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useLegacyPreset: checked,
      ...(checked
        ? {
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
  };

  const toggleDiscoveryMode = (checked: boolean) => {
    const updatedRules = {
      ...rules,
      useDiscoveryPreset: checked,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
            discoveryVideoCodecs: [...ALL_DISCOVERY_VIDEO],
            discoverySurroundAudioCodecs: [...ALL_DISCOVERY_SURROUND],
            discoveryStereoAudioCodecs: [...ALL_DISCOVERY_STEREO],
            discoveryMusicCodecs: [...ALL_DISCOVERY_MUSIC],
            discoveryContainers: [...ALL_DISCOVERY_CONTAINERS],
            discoveryHdrFormats: [...ALL_DISCOVERY_HDR],
          }
        : {}),
    };
    onRulesChange(updatedRules);

    if (checked && onDiscoveryModeSelect) {
      onDiscoveryModeSelect();
    }

    // Default Excel toggles when checking Discovery Mode:
    if (checked) {
      const updatedExcel: Record<string, boolean> = {
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": false,
        "Remediation Action": false,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: true,
        "Album Title": true,
        "Song Title": true,
        "File Format/Codec": true,
        Bitrate: true,
      };
      onExcelColumnsChange(updatedExcel);
    }
  };

  const toggleDiscoveryVideoOnly = () => {
    const updatedRules = {
      ...rules,
      useDiscoveryPreset: true,
      useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
      discoveryVideoCodecs: [...ALL_DISCOVERY_VIDEO],
      discoverySurroundAudioCodecs: [...ALL_DISCOVERY_SURROUND],
      discoveryStereoAudioCodecs: [...ALL_DISCOVERY_STEREO],
      discoveryMusicCodecs: [],
      discoveryContainers: [...ALL_DISCOVERY_CONTAINERS],
      discoveryHdrFormats: [...ALL_DISCOVERY_HDR],
    };
    onRulesChange(updatedRules);

    const updatedExcel: Record<string, boolean> = {
      "Stream Audit": false,
      "File Name": true,
      Container: true,
      "Video Codec": true,
      Resolution: true,
      "HDR Format": true,
      "Audio Tracks": true,
      "Audio Codecs": true,
      Subtitles: true,
      "Analysis Notes": false,
      "Remediation Action": false,
      "Corruption Type": false,
      Recommendation: false,
      "Embedded Poster": false,
      "Bitrate Anomaly": false,
      "File Path": true,
      Artist: false,
      "Album Title": false,
      "Song Title": false,
      "File Format/Codec": false,
      Bitrate: false,
    };
    onExcelColumnsChange(updatedExcel);

    if (onVideoOnlySelect) {
      onVideoOnlySelect();
    }
  };

  const toggleDiscoveryMusicOnly = () => {
    const updatedRules = {
      ...rules,
      useDiscoveryPreset: true,
      useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
      discoveryVideoCodecs: [],
      discoverySurroundAudioCodecs: [],
      discoveryStereoAudioCodecs: [],
      discoveryMusicCodecs: [...ALL_DISCOVERY_MUSIC],
      discoveryContainers: [...ALL_DISCOVERY_CONTAINERS],
      discoveryHdrFormats: [...ALL_DISCOVERY_HDR],
    };
    onRulesChange(updatedRules);

    const updatedExcel: Record<string, boolean> = {
      "Stream Audit": false,
      "File Name": false,
      Container: false,
      "Video Codec": false,
      Resolution: false,
      "HDR Format": false,
      "Audio Tracks": false,
      "Audio Codecs": false,
      Subtitles: false,
      "Analysis Notes": false,
      "Remediation Action": false,
      "Corruption Type": false,
      Recommendation: false,
      "Embedded Poster": false,
      "Bitrate Anomaly": false,
      "File Path": true,
      Artist: true,
      "Album Title": true,
      "Song Title": true,
      "File Format/Codec": true,
      Bitrate: true,
    };
    onExcelColumnsChange(updatedExcel);

    if (onMusicOnlySelect) {
      onMusicOnlySelect();
    }
  };

  const toggleDiscoveryCorruptionScan = () => {
    const updatedRules = {
      ...rules,
      useDiscoveryPreset: true,
      useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
      discoveryVideoCodecs: [...ALL_DISCOVERY_VIDEO],
      discoverySurroundAudioCodecs: [...ALL_DISCOVERY_SURROUND],
      discoveryStereoAudioCodecs: [...ALL_DISCOVERY_STEREO],
      discoveryMusicCodecs: [...ALL_DISCOVERY_MUSIC],
      discoveryContainers: [...ALL_DISCOVERY_CONTAINERS],
      discoveryHdrFormats: [...ALL_DISCOVERY_HDR],
    };
    onRulesChange(updatedRules);

    const updatedExcel: Record<string, boolean> = {
      "Stream Audit": false,
      "File Name": true,
      Container: false,
      "Video Codec": false,
      Resolution: false,
      "HDR Format": false,
      "Audio Tracks": false,
      "Audio Codecs": false,
      Subtitles: false,
      "Analysis Notes": false,
      "Remediation Action": false,
      "Corruption Type": true,
      Recommendation: true,
      "Embedded Poster": false,
      "Bitrate Anomaly": false,
      "File Path": true,
      Artist: false,
      "Album Title": false,
      "Song Title": false,
      "File Format/Codec": false,
      Bitrate: false,
    };
    onExcelColumnsChange(updatedExcel);

    if (onCorruptionScanSelect) {
      onCorruptionScanSelect();
    }
  };

  const handleToggleSubtitleScan = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useSubtitleScan: checked,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      });
    }
  };

  const handleToggleDuplicationVideoScan = (checked: boolean) => {
    const updatedVideoOn = checked;
    const updatedMusicOn = rules.useDuplicationMusicScan ?? false;
    onRulesChange({
      ...rules,
      useDuplicationVideoScan: updatedVideoOn,
      useDuplicationScan: updatedVideoOn || updatedMusicOn,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: true,
      });
    }
  };

  const handleToggleDuplicationMusicScan = (checked: boolean) => {
    const updatedVideoOn = rules.useDuplicationVideoScan ?? false;
    const updatedMusicOn = checked;
    onRulesChange({
      ...rules,
      useDuplicationMusicScan: updatedMusicOn,
      useDuplicationScan: updatedVideoOn || updatedMusicOn,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: true,
        "Album Title": true,
        "Song Title": true,
        "File Format/Codec": true,
        Bitrate: true,
      });
    }
  };

  const handleToggleDuplicationScan = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useDuplicationScan: checked,
      useDuplicationVideoScan: checked,
      useDuplicationMusicScan: checked,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useAnomalyScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: true,
        "Album Title": true,
        "Song Title": true,
        "File Format/Codec": true,
        Bitrate: true,
      });
    }
  };

  const handleToggleAnomalyScan = (checked: boolean) => {
    onRulesChange({
      ...rules,
      useAnomalyScan: checked,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useMetadataScan: false,
            useVideoMetadataScan: false,
            useMusicMetadataScan: false,
          }
        : {}),
    });
    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": false,
        "Audio Codecs": true,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: true,
      });
    }
  };

  const handleToggleVideoMetadataScan = (checked: boolean) => {
    const nextRules = {
      ...rules,
      useVideoMetadataScan: checked,
      useMetadataScan: false,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
          }
        : {}),
    };
    onRulesChange(nextRules);

    if (checked) {
      const activeMusic = !!rules.useMusicMetadataScan;
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: activeMusic,
        "Album Title": activeMusic,
        "Song Title": activeMusic,
        "File Format/Codec": activeMusic,
        Bitrate: activeMusic,
      });
      if (onMetadataScanSelect) {
        onMetadataScanSelect();
      }
    }
  };

  const handleToggleMusicMetadataScan = (checked: boolean) => {
    const nextRules = {
      ...rules,
      useMusicMetadataScan: checked,
      useMetadataScan: false,
      ...(checked
        ? {
            useModernPreset: false, useLegacyPreset: false, useBleedingEdgePreset: false,
            useDiscoveryPreset: false,
            useSubtitleScan: false,
            useDuplicationScan: false,
            useDuplicationVideoScan: false,
            useDuplicationMusicScan: false,
            useAnomalyScan: false,
          }
        : {}),
    };
    onRulesChange(nextRules);

    if (checked) {
      onExcelColumnsChange({
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: true,
        "Album Title": true,
        "Song Title": true,
        "File Format/Codec": true,
        Bitrate: true,
      });
      if (onMetadataScanSelect) {
        onMetadataScanSelect();
      }
    }
  };

  // Discovery Mode column list updates
  const toggleDiscoveryItem = (
    codec: string,
    category: "video" | "surround" | "stereo" | "music" | "container" | "hdr",
  ) => {
    if (category === "video") {
      const list = [...(rules.discoveryVideoCodecs || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoveryVideoCodecs: list });
    } else if (category === "surround") {
      const list = [...(rules.discoverySurroundAudioCodecs || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoverySurroundAudioCodecs: list });
    } else if (category === "stereo") {
      const list = [...(rules.discoveryStereoAudioCodecs || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoveryStereoAudioCodecs: list });
    } else if (category === "music") {
      const list = [...(rules.discoveryMusicCodecs || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoveryMusicCodecs: list });
    } else if (category === "container") {
      const list = [...(rules.discoveryContainers || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoveryContainers: list });
    } else if (category === "hdr") {
      const list = [...(rules.discoveryHdrFormats || [])];
      const idx = list.indexOf(codec);
      if (idx > -1) list.splice(idx, 1);
      else list.push(codec);
      onRulesChange({ ...rules, discoveryHdrFormats: list });
    }
  };

  const handleSelectAllList = (
    key: "video" | "surround" | "stereo" | "music" | "container" | "hdr",
  ) => {
    if (key === "video") {
      onRulesChange({
        ...rules,
        discoveryVideoCodecs: [...ALL_DISCOVERY_VIDEO],
      });
    } else if (key === "surround") {
      onRulesChange({
        ...rules,
        discoverySurroundAudioCodecs: [...ALL_DISCOVERY_SURROUND],
      });
    } else if (key === "stereo") {
      onRulesChange({
        ...rules,
        discoveryStereoAudioCodecs: [...ALL_DISCOVERY_STEREO],
      });
    } else if (key === "music") {
      onRulesChange({
        ...rules,
        discoveryMusicCodecs: [...ALL_DISCOVERY_MUSIC],
      });
    } else if (key === "container") {
      onRulesChange({
        ...rules,
        discoveryContainers: [...ALL_DISCOVERY_CONTAINERS],
      });
    } else if (key === "hdr") {
      onRulesChange({
        ...rules,
        discoveryHdrFormats: [...ALL_DISCOVERY_HDR],
      });
    }
  };

  const handleClearAllList = (
    key: "video" | "surround" | "stereo" | "music" | "container" | "hdr",
  ) => {
    if (key === "video") {
      onRulesChange({ ...rules, discoveryVideoCodecs: [] });
    } else if (key === "surround") {
      onRulesChange({ ...rules, discoverySurroundAudioCodecs: [] });
    } else if (key === "stereo") {
      onRulesChange({ ...rules, discoveryStereoAudioCodecs: [] });
    } else if (key === "music") {
      onRulesChange({ ...rules, discoveryMusicCodecs: [] });
    } else if (key === "container") {
      onRulesChange({ ...rules, discoveryContainers: [] });
    } else if (key === "hdr") {
      onRulesChange({ ...rules, discoveryHdrFormats: [] });
    }
  };

  const handleReset = () => {
    onRulesChange(DEFAULT_RULES);
  };

  return (
    <div
      className="p-4 mt-4 bg-[#14171F] border border-[#1e232e] rounded-xl shadow-2xl space-y-4 w-full"
      id="rule-configurator-card"
    >
      <div className="flex justify-between items-center border-b border-[#1e232e] pb-4 select-none" id="options-header-bar">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#8B5CF6]" />
            Library Stewardship Options
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Select a scanning mode below. There are several options to help you ensure your digital library is healthy and ready for anything.
          </p>
        </div>
        <button
          id="btn-options-reset-defaults"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold bg-[#1E232E] border border-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-blue-500" />
          Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Discovery Mode (Section 3: Completely overhauled as custom checklist columns) */}
        <div
          className="p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl space-y-4 flex flex-col justify-between"
          id="discovery-mode-settings-card"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-slate-700/20 pb-3">
              <div className="flex items-start gap-2.5 select-none">
                <input
                  type="checkbox"
                  id="toggle-discovery-preset"
                  checked={rules.useDiscoveryPreset ?? false}
                  onChange={(e) => toggleDiscoveryMode(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <label
                      htmlFor="toggle-discovery-preset"
                      className="text-xs font-bold text-blue-400 uppercase tracking-wider cursor-pointer"
                    >
                      Discovery Mode
                    </label>
                    <button
                      className="w-4 h-4 ml-2 rounded-full border border-blue-500/50 text-blue-400 bg-blue-500/10 flex items-center justify-center cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
                      title="Click here to see a tutorial on using this scan type"
                      onClick={(e) => {
                        e.preventDefault();
                        onHelpRequest && onHelpRequest("help-discovery");
                      }}
                    >
                      <span className="text-[10px] font-bold leading-none">
                        ?
                      </span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Granular bypass filters - indexes all custom format
                    permutations
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                  (rules.useDiscoveryPreset ?? false)
                    ? "bg-blue-500/15 text-blue-400 animate-pulse"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {(rules.useDiscoveryPreset ?? false) ? "Active" : "Disabled"}
              </span>
            </div>

            {rules.useDiscoveryPreset && (
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <button
                  onClick={toggleDiscoveryVideoOnly}
                  title="Configures discovery to look only at video properties"
                  className="px-2 py-1 rounded bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-colors"
                >
                  Video Only Preset
                </button>
                <button
                  onClick={toggleDiscoveryMusicOnly}
                  title="Configures discovery to look only at music properties"
                  className="px-2 py-1 rounded bg-green-600/10 border border-green-500/30 text-green-400 text-[11px] font-bold hover:bg-green-500/20 transition-colors"
                >
                  Music Only Preset
                </button>
                <button
                  onClick={toggleDiscoveryCorruptionScan}
                  title="Retrieves all files, but focuses exports on identifying corrupted items. You can filter for 'Corrupted/Failed' on the dashboard."
                  className="px-2 py-1 rounded bg-rose-600/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-colors"
                >
                  Corruption Scan
                </button>
              </div>
            )}

            {rules.useDiscoveryPreset && (
              <div className="p-3 bg-blue-500/5 text-[11px] text-blue-300 rounded border border-blue-500/10 mb-2 leading-relaxed">
                💡 <strong>Preset Trigger Applied!</strong> Default columns
                updated based on selection. You can manually adjust report
                columns below.
              </div>
            )}

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-all duration-200 ${
                (rules.useDiscoveryPreset ?? false)
                  ? "opacity-100"
                  : "opacity-40 pointer-events-none"
              }`}
            >
              {/* Column 1: Video Codecs */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      Video
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("video")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("video")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_VIDEO.map((codec) => {
                      const isChecked = (
                        rules.discoveryVideoCodecs || []
                      ).includes(codec);
                      return (
                        <button
                          key={codec}
                          onClick={() => toggleDiscoveryItem(codec, "video")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}
                          {codec.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoveryVideoCodecs || []).length}
                </div>
              </div>

              {/* Column 2: Audio (Surround) */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      Surround
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("surround")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("surround")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_SURROUND.map((codec) => {
                      const isChecked = (
                        rules.discoverySurroundAudioCodecs || []
                      ).includes(codec);
                      return (
                        <button
                          key={codec}
                          onClick={() => toggleDiscoveryItem(codec, "surround")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}
                          {codec.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoverySurroundAudioCodecs || []).length}
                </div>
              </div>

              {/* Column 3: Audio (Stereo) */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      Stereo
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("stereo")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("stereo")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_STEREO.map((codec) => {
                      const isChecked = (
                        rules.discoveryStereoAudioCodecs || []
                      ).includes(codec);
                      return (
                        <button
                          key={codec}
                          onClick={() => toggleDiscoveryItem(codec, "stereo")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}
                          {codec.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoveryStereoAudioCodecs || []).length}
                </div>
              </div>

              {/* Column 4: Containers */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      Container
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("container")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("container")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_CONTAINERS.map((cont) => {
                      const isChecked = (
                        rules.discoveryContainers || []
                      ).includes(cont);
                      return (
                        <button
                          key={cont}
                          onClick={() => toggleDiscoveryItem(cont, "container")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}.{cont.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoveryContainers || []).length}
                </div>
              </div>

              {/* Column 5: Audio (Music) */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      Music
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("music")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("music")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_MUSIC.map((codec) => {
                      const isChecked = (
                        rules.discoveryMusicCodecs || []
                      ).includes(codec);
                      return (
                        <button
                          key={codec}
                          onClick={() => toggleDiscoveryItem(codec, "music")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}
                          {codec.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoveryMusicCodecs || []).length}
                </div>
              </div>

              {/* Column 6: HDR Profile */}
              <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                      HDR
                    </span>
                    <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
                      <button
                        onClick={() => handleSelectAllList("hdr")}
                        className="hover:text-blue-400 font-semibold cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => handleClearAllList("hdr")}
                        className="hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {ALL_DISCOVERY_HDR.map((hdr) => {
                      const isChecked = (
                        rules.discoveryHdrFormats || []
                      ).includes(hdr);
                      return (
                        <button
                          key={hdr}
                          onClick={() => toggleDiscoveryItem(hdr, "hdr")}
                          className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                            isChecked
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? "● " : "○ "}
                          {hdr}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-2 font-mono">
                  Selected: {(rules.discoveryHdrFormats || []).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        
{/* Stream Audit Scan Container */}
        <div
          className="space-y-4 p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl"
          id="streaming-compatibility-settings"
        >
          <div className="flex items-start justify-between border-b border-slate-700/20 pb-3">
            <div className="flex items-start gap-2.5 select-none">
              <input
                type="checkbox"
                id="toggle-streaming-compatibility"
                checked={rules.useModernPreset || rules.useLegacyPreset || rules.useBleedingEdgePreset}
                onChange={(e) => toggleStreamingCompatibility(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <div className="flex items-center">
                  <label htmlFor="toggle-streaming-compatibility" className="text-xs font-bold text-emerald-400 uppercase tracking-wider cursor-pointer">
                    Stream Audit Scan
                  </label>
                  <button 
                    className="w-4 h-4 ml-2 rounded-full border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center justify-center cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors"
                    onClick={(e) => { e.preventDefault(); onHelpRequest && onHelpRequest("help-streaming"); }}
                  >
                    <span className="text-[10px] font-bold leading-none">?</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-0.5 leading-tight">
                  Identifies media compatibility across modern network streamers, legacy devices, and bleeding edge clients.
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                (rules.useModernPreset || rules.useLegacyPreset || rules.useBleedingEdgePreset)
                  ? "bg-emerald-500/15 text-emerald-400 animate-pulse"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {(rules.useModernPreset || rules.useLegacyPreset || rules.useBleedingEdgePreset) ? "Active" : "Disabled"}
            </span>
          </div>

          <div className={`grid grid-cols-1 gap-4 transition ${rules.useModernPreset || rules.useLegacyPreset || rules.useBleedingEdgePreset ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            
            {/* Modern */}
            <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
                <input
                  type="checkbox"
                  checked={rules.useModernPreset}
                  onChange={(e) => toggleModernPreset(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 h-3 w-3 cursor-pointer"
                />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-emerald-400 uppercase">Modern Standards</h4>
                <p className="text-[10px] text-slate-400 leading-tight mt-1">Direct play for Apple TV 4K, Nvidia Shield, and recent smart TVs. Compatible with HEVC, H.264, AAC, and AC3 Stereo.</p>
              </div>

              <div className={`grid grid-cols-1 gap-3 ${rules.useModernPreset ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Video:</div>
                   <div className="flex flex-wrap gap-1">
                     {["hevc", "h264"].map(codec => {
                       const active = (rules.modernVideoCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleModernVideoCodec(codec)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow border border-emerald-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-emerald-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Surround:</div>
                   <div className="flex flex-wrap gap-1">
                     {["ac3", "eac3", "dts"].map(codec => {
                       const active = (rules.modernSurroundAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleSurroundAudio(codec, true)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow border border-emerald-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-emerald-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Stereo:</div>
                   <div className="flex flex-wrap gap-1">
                     {["aac", "mp3", "ac3", "eac3"].map(codec => {
                       const active = (rules.modernStereoAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleStereoAudio(codec, true)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow border border-emerald-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-emerald-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
              </div>
            </div>

            {/* Legacy */}
            <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
                <input
                  type="checkbox"
                  checked={rules.useLegacyPreset}
                  onChange={(e) => toggleLegacyPreset(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800 h-3 w-3 cursor-pointer"
                />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-amber-400 uppercase">Legacy Standards</h4>
                <p className="text-[10px] text-slate-400 leading-tight mt-1">Obsolete browsers, 1st Gen Chromecasts, and cellular remote clients. Compatible with H.264, AAC, and AC3 Stereo.</p>
              </div>

              <div className={`grid grid-cols-1 gap-3 ${rules.useLegacyPreset ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Video:</div>
                   <div className="flex flex-wrap gap-1">
                     <span className="py-0.5 px-2 rounded text-[10px] font-bold font-mono bg-amber-600 border border-amber-500 text-white cursor-default">H264</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Surround:</div>
                   <div className="flex flex-wrap gap-1">
                     {["ac3", "aac"].map(codec => {
                       const active = (rules.legacySurroundAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleSurroundAudio(codec, false)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-amber-600 hover:bg-amber-500 text-white shadow border border-amber-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-amber-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Stereo:</div>
                   <div className="flex flex-wrap gap-1">
                     {["aac", "mp3", "ac3"].map(codec => {
                       const active = (rules.legacyStereoAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleStereoAudio(codec, false)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-amber-600 hover:bg-amber-500 text-white shadow border border-amber-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-amber-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
              </div>
            </div>
{/* Bleeding Edge */}
            <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
                <input
                  type="checkbox"
                  checked={rules.useBleedingEdgePreset || false}
                  onChange={(e) => toggleBleedingEdgePreset(e.target.checked)}
                  className="rounded border-slate-700 text-purple-500 focus:ring-purple-500 bg-slate-800 h-3 w-3 cursor-pointer"
                />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-purple-400 uppercase">Bleeding Edge Standards</h4>
                <p className="text-[10px] text-slate-400 leading-tight mt-1">
                  Enforces strict next-generation codecs (AV1/VVC) and pure lossless immersive surround audio (TrueHD/DTS-HD).
                </p>
              </div>

              <div className={`grid grid-cols-1 gap-3 ${rules.useBleedingEdgePreset ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Video:</div>
                   <div className="flex flex-wrap gap-1">
                     {["av1", "vvc", "vp9"].map(codec => {
                       const active = (rules.bleedingEdgeVideoCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleBleedingEdgeVideoCodec(codec)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-purple-600 hover:bg-purple-500 text-white shadow border border-purple-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-purple-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Surround:</div>
                   <div className="flex flex-wrap gap-1">
                     {["truehd", "dtshd", "opus"].map(codec => {
                       const active = (rules.bleedingEdgeSurroundAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleBleedingEdgeSurround(codec)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-purple-600 hover:bg-purple-500 text-white shadow border border-purple-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-purple-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Stereo:</div>
                   <div className="flex flex-wrap gap-1">
                     {["flac", "pcm", "opus"].map(codec => {
                       const active = (rules.bleedingEdgeStereoAudioCodecs || []).includes(codec);
                       return <button key={codec} onClick={() => toggleBleedingEdgeStereo(codec)} className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-purple-600 hover:bg-purple-500 text-white shadow border border-purple-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-purple-500/50 text-slate-400"}`}>{codec.toUpperCase()}</button>
                     })}
                   </div>
                </div>
              </div>
            </div>

            


          </div>
        </div>
        

{/* Deep A/V Stream Audit */}
        <div
          className="space-y-4 p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col justify-start"
          id="subtitle-scan-settings"
        >
          <div className="flex items-start justify-between border-b border-slate-700/20 pb-3">
            <div className="flex items-start gap-2.5 select-none">
              <input
                type="checkbox"
                id="toggle-subtitle-scan"
                checked={rules.useSubtitleScan ?? false}
                onChange={(e) => handleToggleSubtitleScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <div className="flex items-center">
                  <label
                    htmlFor="toggle-subtitle-scan"
                    className="text-xs font-bold text-purple-400 uppercase tracking-wider cursor-pointer"
                  >
                    Deep A/V Stream Audit
                  </label>
                  <button
                    className="w-4 h-4 ml-2 rounded-full border border-purple-500/50 text-purple-400 bg-purple-500/10 flex items-center justify-center cursor-pointer hover:bg-purple-500 hover:text-white transition-colors"
                    title="Click here to see a tutorial on using this scan type"
                    onClick={(e) => {
                      e.preventDefault();
                      onHelpRequest && onHelpRequest("help-subtitle-scan");
                    }}
                  >
                    <span className="text-[10px] font-bold leading-none">
                      ?
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Deep auditing of Audio Tracks, Subtitle formats, languages, and external sidecars.
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${rules.useSubtitleScan ? "bg-purple-500/15 text-purple-400" : "bg-slate-800 text-slate-500"}`}
            >
              {rules.useSubtitleScan ? "Active" : "Disabled"}
            </span>
          </div>
          <div
            className={`transition ${rules.useSubtitleScan ? "opacity-100" : "opacity-40 pointer-events-none"}`}
          >
            <p className="text-xs text-slate-400 leading-relaxed">
              Identifies which files have missing subtitles, details every embedded/external language track, and maps complex audio streams (channels, languages, raw codecs). This deep extraction exposes hidden container contents that force high-CPU server transcoding.
            </p>
          </div>
        </div>

        {/* Media Duplication Scan */}
        <div
          className="space-y-4 p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col justify-start"
          id="duplication-scan-settings"
        >
          <div className="flex items-center justify-between border-b border-slate-700/20 pb-3">
            <div className="flex flex-col select-none">
              <div className="flex items-center">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Media Duplication Audit
                </span>
                <button
                  className="w-4 h-4 ml-2 rounded-full border border-orange-500/50 text-orange-400 bg-orange-500/10 flex items-center justify-center cursor-pointer hover:bg-orange-500 hover:text-white transition-colors"
                  title="Click here to see a tutorial on using this scan type"
                  onClick={(e) => {
                    e.preventDefault();
                    onHelpRequest && onHelpRequest("help-duplication-scan");
                  }}
                >
                  <span className="text-[10px] font-bold leading-none">
                    ?
                  </span>
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                Identifies redundant media assets and potential storage waste.
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${rules.useDuplicationScan ? "bg-orange-500/15 text-orange-400" : "bg-slate-800 text-slate-500"}`}
            >
              {rules.useDuplicationScan ? "Active" : "Disabled"}
            </span>
          </div>
          
          <div className="space-y-3.5 pt-1">
            {/* Video Duplication Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="toggle-duplication-video-scan"
                checked={rules.useDuplicationVideoScan ?? false}
                onChange={(e) => handleToggleDuplicationVideoScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-300">Video Duplication Scan</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Checks folder items for matching cleaned title & season/episode, cross-comparing movie and show durations within 3 minutes to filter redundant copies.
                </span>
              </div>
            </label>

            {/* Music Duplication Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="toggle-duplication-music-scan"
                checked={rules.useDuplicationMusicScan ?? false}
                onChange={(e) => handleToggleDuplicationMusicScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-300">Music Duplication Scan</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Identifies cloned music tracks by matching cleaned song titles & artist tags or parent folder/track signatures, verifying durations within 30 seconds to prevent false-positives.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Quality Audit */}
        <div
          className="space-y-4 p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col justify-start"
          id="anomaly-scan-settings"
        >
          <div className="flex items-start justify-between border-b border-slate-700/20 pb-3">
            <div className="flex items-start gap-2.5 select-none">
              <input
                type="checkbox"
                id="toggle-anomaly-scan"
                checked={rules.useAnomalyScan ?? false}
                onChange={(e) => handleToggleAnomalyScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <div className="flex items-center">
                  <label
                    htmlFor="toggle-anomaly-scan"
                    className="text-xs font-bold text-rose-400 uppercase tracking-wider cursor-pointer"
                  >
                    Quality Audit
                  </label>
                  <button
                    className="w-4 h-4 ml-2 rounded-full border border-rose-500/50 text-rose-400 bg-rose-500/10 flex items-center justify-center cursor-pointer hover:bg-rose-500 hover:text-white transition-colors"
                    title="Click here to see a tutorial on using this scan type"
                    onClick={(e) => {
                      e.preventDefault();
                      onHelpRequest && onHelpRequest("help-anomaly-scan");
                    }}
                  >
                    <span className="text-[10px] font-bold leading-none">
                      ?
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Flags incongruent bitrate to resolution ratios.
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${rules.useAnomalyScan ? "bg-rose-500/15 text-rose-400" : "bg-slate-800 text-slate-500"}`}
            >
              {rules.useAnomalyScan ? "Active" : "Disabled"}
            </span>
          </div>
          <div
            className={`transition ${rules.useAnomalyScan ? "opacity-100" : "opacity-40 pointer-events-none"}`}
          >
            <p className="text-xs text-slate-400 leading-relaxed">
              Performs an advanced bitrate-to-resolution ratio scan to detect bloated or starved files (e.g. ultra-low bitrate 1080p or excessively bloated 4K files). This audit flags efficiency anomalies to optimize storage usage and ensure optimal streaming performance.
            </p>
          </div>
        </div>

        {/* Metadata Completeness Audit */}
        <div
          className="space-y-4 p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col justify-start"
          id="metadata-scan-settings"
        >
          <div className="flex items-center justify-between border-b border-slate-700/20 pb-3">
            <div className="flex flex-col select-none">
              <div className="flex items-center">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Metadata Completeness Audit
                </span>
                <button
                  className="w-4 h-4 ml-2 rounded-full border border-teal-500/50 text-teal-400 bg-teal-500/10 flex items-center justify-center cursor-pointer hover:bg-teal-500 hover:text-white transition-colors"
                  title="Click here to see details on this scan type"
                  onClick={(e) => {
                    e.preventDefault();
                    onHelpRequest && onHelpRequest("help-metadata-scan");
                  }}
                >
                  <span className="text-[10px] font-bold leading-none">
                    ?
                  </span>
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                Audits embedded movie, show, or music tags like Title, Year, Artist, Album, and Director.
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${(rules.useMetadataScan || rules.useVideoMetadataScan || rules.useMusicMetadataScan) ? "bg-teal-500/15 text-teal-400" : "bg-slate-800 text-slate-500"}`}
            >
              {(rules.useMetadataScan || rules.useVideoMetadataScan || rules.useMusicMetadataScan) ? "Active" : "Disabled"}
            </span>
          </div>
          
          <div className="space-y-3.5 pt-1">
            {/* Video Metadata Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="toggle-video-metadata-scan"
                checked={rules.useVideoMetadataScan ?? false}
                onChange={(e) => handleToggleVideoMetadataScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-teal-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-300">Video Metadata Audit</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Audits embedded movie & show tags like Title, Year, Director. Supports FFmpeg & MKVToolNix tag recommendations.
                </span>
              </div>
            </label>

            {/* Music Metadata Toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="toggle-music-metadata-scan"
                checked={rules.useMusicMetadataScan ?? false}
                onChange={(e) => handleToggleMusicMetadataScan(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-teal-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-300">Music Metadata Audit</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Audits embedded ID3/Vorbis tags like Artist, Album Title, Year. Verifies key tags schemas.
                </span>
              </div>
            </label>


          </div>
        </div>
      </div>
      
      {/* Settings Grid (Global Options & App Data Options) */}
      <div className="pt-8 mt-8 border-t border-[#1e232e] grid grid-cols-1 lg:grid-cols-2 gap-8" id="settings-options-grid">
        {/* Left Column: Global Options */}
        <div className="space-y-4" id="global-options-col">
          <div>
            <div className="flex items-center gap-2 select-none mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Global Options
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              Preferences and settings that apply globally across the application.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Box 1: Fix Music Grouping */}            
            {/* Logging Options */}
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2 p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl">
              <span className="text-sm font-semibold text-slate-200 border-b border-slate-700/50 pb-2 mb-1">Logging Configuration</span>
              
              <label className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-700/30 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={rules.enableStandardLogging !== false}
                  onChange={(e) => onRulesChange({ ...rules, enableStandardLogging: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Enable Standard Logging</span>
                  <span className="text-[10px] text-slate-400 leading-relaxed mt-0.5 block">
                    Save basic application events (max 5MB, keeps 3 most recent).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-700/30 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={rules.diagnosticLoggingEnabled === true}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onRulesChange({ ...rules, diagnosticLoggingEnabled: checked });
                    localStorage.setItem("bitscribe_diagnostic_logging", checked ? "true" : "false");
                  }}
                  className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Enable Diagnostic Logging (Master Toggle)</span>
                  <span className="text-[10px] text-slate-400 leading-relaxed mt-0.5 block">
                    Capture deep application logs (max 10MB, keeps 2 most recent).
                  </span>
                </div>
              </label>

              {rules.diagnosticLoggingEnabled && (
                <div className="pl-6 grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.diagLogScanEngine !== false}
                      onChange={(e) => onRulesChange({ ...rules, diagLogScanEngine: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-2.5 w-2.5 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-300">Scan Engine</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.diagLogMediaParsing !== false}
                      onChange={(e) => onRulesChange({ ...rules, diagLogMediaParsing: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-2.5 w-2.5 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-300">Media Parsing</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rules.diagLogSystem !== false}
                      onChange={(e) => onRulesChange({ ...rules, diagLogSystem: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-2.5 w-2.5 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-300">System Events</span>
                  </label>
                </div>
              )}
            </div>


            <label className="flex flex-col p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors h-auto min-h-[7rem] justify-between">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="toggle-clean-non-latin-global"
                  checked={rules.useCleanNonLatinTags !== false}
                  onChange={(e) => onRulesChange({ ...rules, useCleanNonLatinTags: e.target.checked })}
                  className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Fix Music Grouping</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed mt-1 block">
                Strips 'OST' and groups Soundtracks by folder. Overrides foreign characters to English.
              </span>
            </label>

            {/* Box 2: Export Directory */}
            <div className="p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col justify-between h-auto min-h-[7rem]">
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Export Directory</span>
                <span className="text-[10px] text-slate-400 leading-relaxed block">
                  Default report folder. Leave empty to prompt.
                </span>
              </div>
              <div className="flex flex-row gap-1.5 items-center mt-auto">
                <input 
                  type="text" 
                  value={exportDirectory || ""}
                  onChange={(e) => setExportDirectory && setExportDirectory(e.target.value)}
                  placeholder="No default selected" 
                  className="flex-1 bg-[#0F1117] border border-[#2A303C] rounded px-2 text-[10px] focus:outline-none focus:border-blue-500 text-slate-300 h-6 min-w-0"
                />
                <button 
                  onClick={async () => {
                    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                      const { open } = await import('@bitscribe/desktop-api');
                      const selected = await open({ directory: true, multiple: false });
                      if (selected && typeof selected === "string" && setExportDirectory) {
                        setExportDirectory(selected);
                      }
                    } else {
                       alert('Directory selection is only available in the desktop app.');
                    }
                  }}
                  className="shrink-0 bg-[#2A303C] hover:bg-[#343B4A] text-slate-200 px-2.5 rounded text-[10px] font-medium transition-colors shadow-md cursor-pointer h-6 flex items-center justify-center"
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Box 3: App Layout Mode */}
            <label className="flex flex-col p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors h-auto min-h-[7rem] justify-between">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="toggle-app-layout-fluid"
                  checked={isFluidLayout}
                  onChange={(e) => onFluidLayoutChange && onFluidLayoutChange(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Fluid Wrap Layout</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 leading-relaxed mt-1 block">
                Wraps content dynamically to avoid horizontal scrolling. Disabling locks width to 1280px.
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: App Data Options */}
        <div className="space-y-4" id="app-data-options-col">
          <div>
            <div className="flex items-center gap-2 select-none mb-1">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                App Data Options
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              Manage and seed system library databases and configuration backups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Box 3: Backup & Restore */}
            <div className="p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col xl:flex-row items-start xl:items-center gap-3 xl:gap-2 h-auto min-h-[7rem]">
              <div className="flex-1 flex flex-col h-full justify-start">
                <span className="text-xs font-semibold text-slate-300 block mb-1">Backup & Restore</span>
                <span className="text-[10px] text-slate-400 leading-relaxed block">
                  Export scan data and settings, or restore from file.
                </span>
              </div>
              <div className="flex flex-col gap-1 w-full xl:w-[90px] shrink-0 justify-center mt-2 xl:mt-0">
                <button 
                  onClick={() => {
                    if (onBackup) onBackup('full');
                    setBackupAllFeedback(true);
                    setTimeout(() => setBackupAllFeedback(false), 2500);
                  }} 
                  title="Backup all media scan data and global settings to a JSON file."
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-semibold transition-all h-6 flex items-center justify-center shadow cursor-pointer active:scale-95 whitespace-nowrap px-1"
                >
                  {backupAllFeedback ? "Saved ✓" : "Backup All"}
                </button>
                <button 
                  onClick={() => {
                    if (onBackup) onBackup('settings');
                    setBackupSettingsFeedback(true);
                    setTimeout(() => setBackupSettingsFeedback(false), 2500);
                  }} 
                  title="Backup only your configuration rules and paths to a JSON file."
                  className="bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-semibold transition-all h-6 flex items-center justify-center shadow cursor-pointer active:scale-95 whitespace-nowrap px-1"
                >
                  {backupSettingsFeedback ? "Saved ✓" : "Backup Settings"}
                </button>
                <button 
                  onClick={() => onRestore && onRestore()} 
                  title="Restore your library data or settings from a previously saved JSON backup file."
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-semibold transition-all border border-emerald-500/50 h-6 flex items-center justify-center shadow cursor-pointer active:scale-95 whitespace-nowrap px-1"
                >
                  Restore Backup
                </button>
              </div>
            </div>

            {/* Box 4: Demo Data */}
            <div id="demo-data-section" className="p-3 bg-[#1E232E] border border-slate-700/30 rounded-xl flex flex-col xl:flex-row items-start xl:items-center gap-3 xl:gap-2 h-auto min-h-[7rem]">
              <div className="flex-1 flex flex-col h-full justify-start">
                <span className="text-xs font-semibold text-slate-300 block mb-1">Demo Data</span>
                <span className="text-[10px] text-slate-400 leading-relaxed block">
                  Populate or clear mock library data for testing features.
                </span>
              </div>
              <div className="flex flex-col gap-1 w-full xl:w-[90px] shrink-0 justify-center mt-2 xl:mt-0">
                <button
                  onClick={() => {
                    if (onPopulateDemo) onPopulateDemo();
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded shadow-md text-[9px] font-semibold transition-colors h-6 flex items-center justify-center cursor-pointer"
                >
                  Populate Demo
                </button>
                <button
                  onClick={() => {
                    if (onClearDemoData) onClearDemoData();
                  }}
                  className="w-full bg-[#1A1D27] hover:bg-slate-700 border border-slate-700/50 text-slate-300 rounded shadow-md text-[9px] font-semibold transition-colors h-6 flex items-center justify-center cursor-pointer"
                  title="Remove only the demo files from your library"
                >
                  Clear Demo Data
                </button>
              </div>
            </div>
            {/* Box 5: Danger Zone */}
            <div id="danger-zone" className="p-3 bg-[#1E232E] border border-red-900/30 rounded-xl flex flex-col xl:flex-row items-start xl:items-center gap-3 xl:gap-2 h-auto min-h-[7rem]">
              <div className="flex-1 flex flex-col h-full justify-start">
                <span className="text-xs font-semibold text-red-500 block mb-1">Danger Zone</span>
                <span className="text-[9px] text-red-400/80 leading-relaxed block">
                  Destructive actions to wipe data or reset app settings.
                </span>
              </div>
              <div className="flex flex-col gap-1 w-full xl:w-[90px] shrink-0 justify-center mt-2 xl:mt-0">
                <button
                  onClick={onWipeDB}
                  className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded shadow-md text-[9px] font-semibold border border-rose-900/50 hover:border-rose-600 transition-colors h-6 flex items-center justify-center cursor-pointer"
                  title="Wipe Database"
                >
                  Wipe DB
                </button>
                <button
                  onClick={onAppReset}
                  className="w-full bg-red-950/50 hover:bg-red-900/70 text-red-400 rounded shadow-md text-[9px] font-semibold border border-red-900/50 hover:border-red-500 transition-colors h-6 flex items-center justify-center cursor-pointer"
                  title="Full App Reset"
                >
                  App Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
