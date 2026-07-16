# BitScribe Shared Database Structure

This document defines the complete SQLite database schema for the shared `BitScribeDB.sqlite` file. This database is shared bi-directionally between **BitScribe Steward** (the Audit tool) and **BitScribe RX** (the Remediation tool). 

---

## 1. Physical Configuration
*   **Database Filename:** `BitScribeDB.sqlite`
*   **Location:** Portable workspace folder `./BitScribeDB/BitScribeDB.sqlite` (or inside the user's local application data directory when packaged).
*   **Write Mode:** Multi-process WAL (Write-Ahead Logging) mode is recommended to allow concurrent read access by Steward while RX performs batch metadata updates and remux operations.

---

## 2. Table Schema: `scanned_files`

The main repository storing file metadata, stream metrics, and compliance statuses.

| Column Name | SQLite Data Type | Nullability | Constraints / Defaults | Description & RX Mapping |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `NOT NULL` | `PRIMARY KEY` | Physical absolute file path. *Note: RX file renames will update this value. Matches `filePath`.* |
| `filename` | `TEXT` | `NOT NULL` | - | The raw file name on disk (e.g., `Daredevil - S01E03.mkv`). |
| `filePath` | `TEXT` | `NOT NULL` | - | Full path to the file. Duplicated from `id` for query convenience. |
| `topLevelFolder` | `TEXT` | `NULL` | - | The parent/root catalog name (e.g., `/media/TV Shows`). |
| `category` | `TEXT` | `NOT NULL` | - | Resolved media category (e.g., `Movie`, `TV Show`, `Music`, `Corrupted`, `Specials`). |
| `container` | `TEXT` | `NOT NULL` | - | Container envelope format (e.g., `matroska`, `mp4`, `flac`). |
| `sizeGB` | `REAL` | `NOT NULL` | - | Total size of the file on disk, expressed in Gigabytes. |
| `durationMins` | `REAL` | `NOT NULL` | `DEFAULT 0.0` | Chronological duration of the track in minutes. |
| `year` | `INTEGER` | `NULL` | - | 4-digit release year parsed from filename or container tags. |
| `videoCodec` | `TEXT` | `NULL` | - | Primary video stream encoder (e.g., `hevc`, `h264`, `av1`, `vp9`). |
| `videoResolution` | `TEXT` | `NULL` | - | Standard resolution label (e.g., `4K`, `1080p`, `720p`, `SD`). |
| `videoBitrateMbps` | `REAL` | `NULL` | `DEFAULT 0.0` | Video stream network throughput. |
| `audioTracks` | `TEXT` | `NOT NULL` | `DEFAULT '[]'` | **JSON Array String** containing details of embedded audio tracks. See *Audio Track Schema* below. |
| `subtitleTracks` | `TEXT` | `NOT NULL` | `DEFAULT '[]'` | **JSON Array String** containing details of embedded subtitle tracks. See *Subtitle Track Schema* below. |
| `tags` | `TEXT` | `NOT NULL` | `DEFAULT '{}'` | **JSON Object String** representing raw key-value metadata tags found in the file header. |
| `audioBitrate` | `REAL` | `NULL` | `DEFAULT 0.0` | Measured audio stream bitrate in kbps. |
| `isCorrupted` | `INTEGER` | `NOT NULL` | `CHECK (isCorrupted IN (0, 1)) DEFAULT 0` | Flag representing binary unreadability or parser failures. |
| `errorMessage` | `TEXT` | `NULL` | - | Raw ffprobe error traceback if `isCorrupted` is 1. |
| `hasEmbeddedPoster`| `INTEGER` | `NOT NULL` | `CHECK (hasEmbeddedPoster IN (0, 1)) DEFAULT 0` | Physical container includes embedded cover artwork (0=No, 1=Yes). |
| `bitrateAnomaly` | `INTEGER` | `NOT NULL` | `CHECK (bitrateAnomaly IN (0, 1)) DEFAULT 0` | Mismatch in standard bitrate-to-resolution expectations (0=Normal, 1=Anomaly). |
| `bitrateAnomalyReason`| `TEXT` | `NULL` | - | Explanation of anomaly (e.g., "Starved resolution", "Excessive bitrate bloating"). |
| `streamFriendlyLevel`| `TEXT` | `NOT NULL` | - | Resolved level: `perfect`, `good`, `acceptable`, `unfriendly`, `corrupted`, `pending`. |
| `streamFriendlyReason`| `TEXT` | `NULL` | - | Detailed text description explaining why the level was selected. |
| `streamFriendlySuggestion`| `TEXT` | `NULL` | - | Recommended fix action (serves as the primary direct trigger input for RX remediation). |
| `streamFriendlyEvaluated`| `INTEGER` | `NULL` | `DEFAULT 0` | UNIX timestamp of when the Plex evaluation was calculated. |
| `createdAt` | `TEXT` | `NOT NULL` | `DEFAULT CURRENT_TIMESTAMP` | Row insertion timestamp. |
| `fileHash` | `TEXT` | `NULL` | - | **RX Parity:** Fast hash (header/size metadata combination) protecting record identities across physical renames. |
| `matchedOnlineId` | `TEXT` | `NULL` | - | **RX Parity:** External scraper ID mapping (e.g., `tmdb-12345` or `tvdb-6789`). |
| `hasExternalSubtitles`| `INTEGER` | `NULL` | `CHECK (hasExternalSubtitles IN (0, 1)) DEFAULT 0` | **RX Parity:** Indicates detection of sidecar `.srt` or `.ass` translation tracks in the folder (0=No, 1=Yes). |
| `embeddedSubtitleLanguages`| `TEXT` | `NULL` | - | **RX Parity:** Comma-separated uppercase string listing all internal subtitle languages (e.g., `ENG,SPA,FRA`). |
| `rawAudioCodec` | `TEXT` | `NULL` | - | **RX Parity:** Exact format of primary audio track before simplified formatting (e.g., `truehd`, `dts`, `ac3`). |
| `physicalAudioChannels`| `INTEGER`| `NULL` | - | **RX Parity:** Exact physical audio stream layout channel count (e.g., `1` for mono, `2` for stereo, `6` for 5.1). |
| `videoBitDepth` | `TEXT` | `NULL` | - | **RX Parity:** Primary video color rendering bit depth (e.g., `8-bit`, `10-bit`). |
| `audioSampleRate` | `INTEGER` | `NULL` | - | **RX Parity:** Digital audio sample frequency in Hertz (e.g., `44100`, `48000`, `96000`). |
| `chapterCount` | `INTEGER` | `NOT NULL` | `DEFAULT 0` | **RX Parity:** Count of embedded chapter indices within the container (0 = no chapters). |

---

## 3. Sub-Schema JSON Representations

These structures are serialized as JSON strings inside text columns.

### `audioTracks` Schema (JSON Array)
Each object inside the `audioTracks` array has the following schema:
```json
[
  {
    "index": 1,
    "codec": "aac",
    "channels": 2,
    "language": "eng",
    "title": "Stereo Fallback"
  }
]
```

### `subtitleTracks` Schema (JSON Array)
Each object inside the `subtitleTracks` array has the following schema:
```json
[
  {
    "index": 2,
    "codec": "subrip",
    "language": "eng",
    "title": "English Forced",
    "forced": true,
    "isExternal": false
  }
]
```

### `tags` Schema (JSON Object)
Represents parsed container properties:
```json
{
  "title": "Harry Potter and the Order of the Phoenix",
  "artist": "John Williams",
  "album": "Original Soundtrack",
  "director": "David Yates",
  "encoder": "HandBrake"
}
```

---

## 4. Database Indices & Performance Tuning

To enable instant queries and prevent lock-ups when RX reorganizes thousands of files:

```sql
-- Speed up scans and queries by absolute pathway
CREATE UNIQUE INDEX IF NOT EXISTS idx_scanned_files_filepath ON scanned_files(filePath);

-- Fast file identification across path moves during RX reorganizations
CREATE INDEX IF NOT EXISTS idx_scanned_files_hash ON scanned_files(fileHash);

-- Quick categorization filters for the Dashboard and reports
CREATE INDEX IF NOT EXISTS idx_scanned_files_category ON scanned_files(category);

-- Instant filtering of files requiring transcode remediation
CREATE INDEX IF NOT EXISTS idx_scanned_files_friendly_level ON scanned_files(streamFriendlyLevel);
```
