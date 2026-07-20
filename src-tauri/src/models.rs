use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedFile {
    pub id: String,
    pub filename: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub category: String,
    pub container: String,
    #[serde(rename = "sizeGB")]
    pub size_gb: f64,
    #[serde(rename = "durationMins")]
    pub duration_mins: f64,
    pub year: i32,
    #[serde(rename = "videoCodec")]
    #[serde(default)]
    pub video_codec: String,
    #[serde(rename = "videoResolution")]
    #[serde(default)]
    pub video_resolution: String,
    #[serde(rename = "videoBitrateMbps")]
    #[serde(default)]
    pub video_bitrate_mbps: f64,
    #[serde(rename = "audioTracks")]
    #[serde(default)]
    pub audio_tracks: serde_json::Value,
    #[serde(rename = "subtitleTracks")]
    #[serde(default)]
    pub subtitle_tracks: serde_json::Value,
    #[serde(default)]
    pub tags: serde_json::Value,
    #[serde(rename = "audioBitrate")]
    #[serde(default)]
    pub audio_bitrate: f64,
    #[serde(rename = "isCorrupted")]
    #[serde(default)]
    pub is_corrupted: bool,
    #[serde(rename = "errorMessage")]
    #[serde(default)]
    pub error_message: String,
    #[serde(rename = "hasEmbeddedPoster")]
    #[serde(default)]
    pub has_embedded_poster: bool,
    #[serde(rename = "bitrateAnomaly")]
    #[serde(default)]
    pub bitrate_anomaly: bool,
    #[serde(rename = "bitrateAnomalyReason")]
    #[serde(default)]
    pub bitrate_anomaly_reason: String,
    #[serde(rename = "topLevelFolder")]
    #[serde(default)]
    pub top_level_folder: String,
    #[serde(rename = "streamFriendlyLevel")]
    #[serde(default)]
    pub stream_friendly_level: String,
    #[serde(rename = "streamFriendlyReason")]
    #[serde(default)]
    pub stream_friendly_reason: String,
    #[serde(rename = "streamFriendlySuggestion")]
    #[serde(default)]
    pub stream_friendly_suggestion: String,
    #[serde(rename = "streamFriendlyEvaluated")]
    #[serde(default)]
    pub stream_friendly_evaluated: i64,

    // NEW COLUMNS FOR BITSCRIBE SUITE
    #[serde(rename = "videoBitDepth")]
    #[serde(default)]
    pub video_bit_depth: String,
    
    #[serde(rename = "audioSampleRate")]
    #[serde(default)]
    pub audio_sample_rate: i32,
    
    #[serde(rename = "chapterCount")]
    #[serde(default)]
    pub chapter_count: i32,
    
    #[serde(rename = "rawAudioCodec")]
    #[serde(default)]
    pub raw_audio_codec: String,
    
    #[serde(rename = "physicalAudioChannels")]
    #[serde(default)]
    pub physical_audio_channels: i32,
    
    #[serde(rename = "matchedOnlineId")]
    #[serde(default)]
    pub matched_online_id: String,
    
    #[serde(rename = "fileUuid")]
    #[serde(default)]
    pub file_uuid: String,
    
    #[serde(rename = "hasExternalSubtitles")]
    #[serde(default)]
    pub has_external_subtitles: bool,
    
    #[serde(rename = "embeddedSubtitleLanguages")]
    #[serde(default)]
    pub embedded_subtitle_languages: String,

    #[serde(rename = "author")]
    #[serde(default)]
    pub author: String,

    #[serde(rename = "narrator")]
    #[serde(default)]
    pub narrator: String,

    #[serde(rename = "publisher")]
    #[serde(default)]
    pub publisher: String,

    #[serde(rename = "bookSeries")]
    #[serde(default)]
    pub book_series: String,

    #[serde(rename = "seriesIndex")]
    #[serde(default)]
    pub series_index: f64,

    #[serde(rename = "isbn")]
    #[serde(default)]
    pub isbn: String,

    #[serde(rename = "pageCount")]
    #[serde(default)]
    pub page_count: i32,
}
