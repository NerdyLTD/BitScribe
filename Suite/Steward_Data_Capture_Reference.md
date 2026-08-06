# BitScribe Steward - Data Capture & Pipeline Reference

This reference explains how **BitScribe Steward** captures, processes, and refines digital library data. It serves as a blueprint for **BitScribe RX** to understand how raw files are analyzed, parsed, and logged in the shared registry.

---

## 1. Technical Data Extraction Engine (`ffprobe`)

Steward uses `ffprobe` to extract deep codec parameters, streams, and physical container structures. 

### Core Stream Inspection Steps
1.  **Format Extraction:** Extracts container wrapper characteristics (`duration`, `size`, `bit_rate`, and global `tags`).
2.  **Stream Decomposition:** Splits the file container into separate visual, auditory, and subtitle streams:
    *   **Video Streams:** Collects codec (`codec_name`), height/width resolutions, HDR properties (color space and metadata like `HDR10`, `Dolby Vision`), and specific bitrates.
    *   **Audio Streams:** Enumerates every audio stream, mapping its codec, physical channel count (e.g., `1` for mono, `2` for stereo, `6` for 5.1 surround), language tags, and custom track titles.
    *   **Subtitle Streams:** Enumerates embedded subtitle assets, mapping the stream index, codec formats (e.g., `subrip`/`srt`, `hdmv_pgs`, `ass`, `mov_text`), language tags, and whether the stream is flagged as forced.

### Raw `ffprobe` Attribute-to-Database Mapping

The following outline documents how raw JSON keys parsed from `ffprobe -v error -show_format -show_streams -of json <filePath>` translate to columns in `scanned_files`:

*   **File Size:** Calculated from `format.size` (converted from bytes to Gigabytes: `sizeBytes / (1024 * 1024 * 1024)`).
*   **Duration:** Captured from `format.duration` (converted to fractional minutes: `seconds / 60`).
*   **Video Resolution Label:** Resolved from `video_stream.width` and `height`:
    *   `width >= 3840` or `height >= 2160` $\rightarrow$ `4K`
    *   `width >= 1920` or `height >= 1080` $\rightarrow$ `1080p`
    *   `width >= 1280` or `height >= 720` $\rightarrow$ `720p`
    *   Any smaller dimensions $\rightarrow$ `SD`
*   **Video Bitrate:** Extracted from the video stream's `bit_rate` parameter (divided by `1,000,000` to yield Megabits per second, `Mbps`). If missing, it is calculated programmatically using:
    $$\text{Video Bitrate} \approx \frac{\text{File Size (bits)} - (\text{Audio Bitrate} \times \text{Duration})}{\text{Duration}}$$
*   **HDR Format Detection:** Determined by inspecting color spacing records (`color_space`, `color_transfer`, and `color_primaries`):
    *   Presence of `smpte2084` or `arib-std-b67` $\rightarrow$ `HDR10` or `HLG`.
    *   Presence of Dolby Vision sidecar streams or mastering display metadata $\rightarrow$ `Dolby Vision`.
    *   Fallback $\rightarrow$ `SDR`.
*   **Video Bit Depth:** Resolved from `video_stream.bits_per_raw_sample` or inferred from `video_stream.pix_fmt` (e.g. if pixel format contains `10` or `12`, it is resolved to `10-bit` or `12-bit` respectively, falling back to `8-bit`).
*   **Audio Sample Rate:** Extracted directly from `audio_stream.sample_rate` of the primary audio stream, representing the sampling frequency in Hz (e.g., `44100`, `48000`, or audiophile-grade `96000`).
*   **Chapter Count:** Counts the number of entries in the `chapters` array returned by `ffprobe` when called with the `-show_chapters` flag.

---

## 2. Filename & Directory Parsing Engine

Steward incorporates regex parsing rules to extract release parameters (such as series names, seasons, episodes, and movie release years) directly from directory hierarchies and raw filenames when embedded headers are missing.

### TV Show Parsing Regex Tiers
Steward sequentially tests the filename against these expressions to parse show structures:
1.  **Standard SxxExx:** `/^(.*?)\s*[-_.]?\s*[sS](\d{1,2})[eE](\d{1,3})/`
    *   *Matches:* `Daredevil.S01E03.mkv` $\rightarrow$ Title: `Daredevil`, Season: `1`, Episode: `3`
2.  **XoY Format:** `/^(.*?)\s*[-_.]?\s*(\d{1,2})[xX](\d{1,3})/`
    *   *Matches:* `Daredevil 1x03 Episode Title.mp4` $\rightarrow$ Title: `Daredevil`, Season: `1`, Episode: `3`
3.  **Slash/Spaced Season/Episode:** `/Season\s*(\d{1,2})[-_.\/ ]*Episode\s*(\d{1,3})/i`
    *   *Matches:* `TV/Daredevil/Season 1/Episode 3.mkv` $\rightarrow$ Season: `1`, Episode: `3`

### Movie Title & Release Year Extraction
*   **Year Parser Regex:** `/\b(19\d{2}|20\d{2})\b/`
    *   Extracts the first 4-digit sequence beginning with `19` or `20` to populate the `year` column.
*   **Clean Title Parser:** Splits the filename at the detected year boundary, trimming trailing punctuation, resolution keywords (e.g. `1080p`, `UHD`, `BluRay`), and codec tags (e.g. `x264`, `HEVC`) to isolate the true movie name.
    *   *Example:* `The.Prestige.2006.1080p.BluRay.x264.mkv` $\rightarrow$ Title: `The Prestige`, Year: `2006`.

---

## 3. Metadata Completeness Audit

Steward audits the file to verify if key informational tags are physically embedded. If any required fields are blank or missing, they are appended to the `Missing Metadata` column list.

### Required Tag Schema by Media Category

#### Movies Group
*   **Tags Verified:** `Title`, `Release Year`, `Director`, `Studio`
*   **Mapping:** Read from `format.tags.title`, `format.tags.date`/`year`, `format.tags.director`, and `format.tags.studio`/`publisher`.

#### TV Shows Group
*   **Tags Verified:** `Series Title`, `Season`, `Episode`, `Episode Title`
*   **Mapping:** Parses chronological fields. If container tags are blank, Steward falls back to the Filename Parsing Engine outputs, flagging fields as present if parsed successfully.

#### Music Group
*   **Tags Verified:** `Song Title`, `Artist`, `Album Title`, `Release Year`
*   **Mapping:** Mapped from standard audio metadata atoms: `format.tags.title`, `format.tags.artist`, `format.tags.album`, and `format.tags.date` or `format.tags.year`.

---

## 4. Remediation Flags and Direct Inputs for RX

Steward writes explicit evaluation fields into the database that BitScribe RX can read directly to trigger matching remediation actions:

1.  **Audio Codec Remuxing (`rawAudioCodec` = `ac3` & `physicalAudioChannels` = `2`):**
    *   Steward logs legacy AC3 stereo audio. RX reads this combination to trigger a fast stream copy of video (`-c:v copy`) and transcoding of audio to AAC stereo (`-c:a aac -ac 2`).
2.  **Mono-to-Stereo Up-Transcoding (`physicalAudioChannels` = `1`):**
    *   Steward logs mono audio. RX detects this and runs a dual-channel upmix (`-ac 2`), leaving video untouched.
3.  **Transcode-Risk Subtitles (`subtitleTracks` contains `hdmv_pgs` or `vobsub`):**
    *   Steward logs image-based or complex stylized subtitles. RX utilizes this log to prompt the user to purge transcoding-risk subtitles or download soft text-based `.srt` sidecar subtitles to replace them.
4.  **Bitrate Anomaly (`bitrateAnomaly` = `1`):**
    *   Steward identifies starved or bloated bitrates. RX reads this to suggest either a H.265 compression pass for bloated files or replacement recommendations for starved items.
5.  **Chapter Restoration Wizard (`chapterCount` = `0`):**
    *   Steward logs video files that are completely missing chapters. RX reads this flag to recommend the Chapter Restoration Wizard, enabling lossless chapter timing injection from online scraper sources or uniform block calculations.
