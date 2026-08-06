# BitScribe Steward - Features & Capabilities Log

This log documents the active, fully implemented features, presets, and capabilities of **BitScribe Steward** (v1.4 Beta) to serve as a design guide and functional baseline for **BitScribe RX** (the Remediation App).

---

## 1. Core Scanning & Categorization Pipeline

Steward scans a digital media library and parses file paths to classify items into structured library sections.

### Automatic Media Categorization
*   **Categories Tracked:**
    *   `Movies (4K)` and `Movies (1080p)`
    *   `Movies` / `Movie`
    *   `TV Shows (4K)` and `TV Shows (1080p)`
    *   `TV Shows` / `TV`
    *   `Documentaries` / `Docuseries`
    *   `Anime` / `Anime TV Shows` / `Anime Movies`
    *   `Specials`, `Shorts`, `Plays`, `Comedy`
    *   `Music` (Albums, Compilations, Soundtracks)
    *   `Concerts`, `Audiobooks`, `Podcasts`
    *   `Fitness`, `Home Videos`, `Photos`, `Backgrounds`, `Extras`
    *   `Corrupted` (unplayable files)
    *   `Uncategorized` / `Unrecognized`
*   **Folder-to-Group Resolution:**
    *   Steward classifies categories into broader groups: `Movies`, `TV`, `Music`, and `Other` to handle contextual rule evaluations and specific UI dashboard layouts.

---

## 2. Plex-Compatibility Evaluation Engine

Steward evaluates files for streaming compatibility to predict if they can be direct-played or if they will force server-side transcoding.

### Streaming Profiles & Alert Levels
1.  **Perfect (Bleeding Edge):**
    *   *Definition:* High-efficiency modern encode (e.g., AV1 video with modern lossless surround sound).
    *   *UX Indication:* Visual blue badge, highly optimal for bleeding-edge compatible players.
2.  **Good (Modern+):**
    *   *Definition:* Fully compliant with modern standard hardware (e.g., HEVC video with highly compatible surround/stereo sound).
    *   *UX Indication:* Visual green badge, safe for all modern devices.
3.  **Acceptable (Legacy+):**
    *   *Definition:* Uses older standards (e.g., H.264 video with AAC/MP3 stereo) playable on legacy mobile devices and older Smart TVs.
    *   *UX Indication:* Visual amber/yellow badge.
4.  **Transcode Required (Unfriendly):**
    *   *Definition:* Requires server-side transcoding due to incompatible container envelopes, complex codecs, or lack of direct play support on standard hardware.
    *   *UX Indication:* Visual red badge.
5.  **Incompatible / Corrupted:**
    *   *Definition:* Formats that are structurally broken or completely unplayable.
    *   *UX Indication:* Visual dark red badge.

### Custom Evaluator Rules
*   The scanning engine runs with customizable codec matching filters (`RuleCriteria`) that define which video and audio codecs fall into Bleeding Edge, Modern, Legacy, or Discovery tiers.

---

## 3. Subtitle Scan & Audit

Steward inspects embedded subtitle tracks to identify and categorize potential compatibility issues.

### Refined Subtitle Metrics
*   **Concise Summary Format:** Tracks are formatted universally across all displays as:
    `[Count] Tracks ([Count] [Lang_1], [Count] [Lang_2] | [Status])`
    *   *Example:* `2 Tracks (1 ENG, 1 SPA | Stream OK)`
*   **Subtitle Status Classifications:**
    *   **Stream OK:** Utilizes lightweight, text-based soft subtitles (like `SRT`, `VTT`, `UTF-8`) that can be rendered directly by any client browser or modern player without server transcoding.
    *   **Transcode risk:** Uses heavy image-based formats (like `PGS`, `VOBSub`/`DVD`, or complex stylized subtitles like `ASS` / `SSA`) that force Plex servers to transcode video to burn subtitles into the video frames.
*   **Subtitle Technical Data Column:** Exclusive to Subtitle Audit spreadsheets, this field provides condensed developer-friendly subtitle specifications:
    `[Codec]([Origin])[Language]`
    *   *Example:* `SRT(Emb)[eng], PGS(Emb)[spa]`
    *   *Origin:* `Emb` (Embedded) or `Ext` (External sidecar file).

---

## 4. Advanced Duplicate Detection

Steward detects duplicate items within Movies, TV Shows, and Music.

*   **Non-Strict Comparison Philosophy:** It identifies duplicates based on logical title matchings, year, and episode indicators, intentionally ignoring file sizes, bitrates, or formats. This lets users locate multiple copies of the same item (e.g., a bloated 1080p copy and an optimized HEVC copy).
*   **Deduplication Modes:**
    *   *Video Duplicates:* Matches series title, season number, episode number, or movie release name and year.
    *   *Music Duplicates:* Matches artist name and song title.

---

## 5. Metadata Tagging & Quality Audit

Inspects files to ensure they contain correct internal header metadata and tags.

*   **Metadata Checks:**
    *   *Videos:* Evaluates if Title, Release Year, Director, or Studio tags are missing from container structures.
    *   *Audio:* Evaluates if Song Title, Artist, Album, and Release Year tags are missing.
*   **Embedded Poster Detection:** Detects if the media container physically includes cover art attachments (atomic MP4 tags or MKV attachments).
*   **Bitrate Anomalies:** Flags files with extremely starved bitrates (e.g., 1080p below 1.5 Mbps) or bloated bitrates (e.g., 1080p above 50 Mbps) to detect corrupted encodes or raw rips needing optimization.

---

## 6. Multi-Format Exporters

Steward includes high-fidelity export runtimes to output media libraries for external storage, reporting, or ingestion by BitScribe RX.

### Excel Exporter (`excelExporter.ts`)
*   Generates a fully styled `.xlsx` workbook using `exceljs`.
*   Includes stylized category worksheets, auto-sized column widths, and custom color-coded streaming alert rows.
*   Natively exports the refined subtitle formats and the specialized **Subtitle Technical Data** columns for Subtitle Scan reports.

### Advanced HTML Exporter (`reportExporter.ts`)
*   Outputs a single, portable, self-contained interactive `.html` reporting webpage.
*   Includes integrated Tailwind CSS styling, responsive grid tables, multi-parameter client-side filters, and dynamic column sorting without external runtime dependencies.
*   Features a responsive drawer panel to inspect full media parameters per file directly.

### CSV & JSON Exporters
*   Generates highly standardized text datasets for programmatic parsing.
*   Features specific column structures mapped dynamically based on selected Scan Type Presets (e.g., Media Discovery, Subtitle Scan, Quality Audit).
