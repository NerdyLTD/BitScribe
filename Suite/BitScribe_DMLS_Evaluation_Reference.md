# BitScribe DMLS: Unified Design, Structure, and Evaluation Reference
## Digital Media Lifecycle Suite (DMLS) Specification & Evaluation Guide

This document is the **Single Source of Truth** for the **BitScribe Digital Media Lifecycle Suite (DMLS)**. It compiles the architectural design, directory scanning lifecycle, database specifications, evaluation rules, and compliance standards into a single, comprehensive reference.

This file is designed to be dropped directly into any **App Evaluation System** to enable full comprehension, automated review, and scoring of the BitScribe codebase.

---

## 1. Executive Summary & Core Suite Components

The **BitScribe Digital Media Lifecycle Suite (DMLS)** is an offline-first, professional media auditing and remediation pipeline designed to manage, catalog, and optimize local movie, television, music, audiobook, and e-book libraries. It comprises three specialized modules:

1. **BitScribe Steward** (The Scanner/Auditor): 
   A high-performance, read-only desktop application that walks user-selected directories, extracts deep media streams and tags via sidecar binaries, writes state to a shared database, and computes streaming compatibility scores.
2. **BitScribe RX** (The Remediation Tool - Sibling Module):
   An active management tool that reads the evaluations logged by Steward and offers lossless remuxing, mono-to-stereo audio up-mixing, subtitle track swapping, uniform chapter timing injection, and physical file restructuring.
3. **Codex** (Audiobook & E-book Module):
   A dedicated sub-engine within the suite specializing in physical folder directory sanitation and ID3v2/EPUB metadata container tagging for digital audiobooks and e-books, preserving raw metadata alongside cleaned titles.

---

## 2. Monorepo System Architecture

BitScribe is implemented as an NPM workspaces monorepo, pairing a high-fidelity React frontend with a performant Rust backend driven by Tauri.

```
Workspace Root (./)
├── apps/
│   └── steward/                 # Desktop visual dashboard & scanner
│       ├── src-tauri/           # Rust native core (Tauri, SQLite, WalkDir)
│       └── src/                 # React 18, Vite, Tailwind UI
├── packages/
│   ├── core-types/              # Unified TypeScript definitions (MediaItem, tracks)
│   ├── core-db/                 # TypeScript DB access and scanning coordinating layer
│   ├── core-eval/               # Static rules engine & Plex/Streaming compatibility evaluator
│   └── ui-components/           # Reusable Tailwind UI atomic components
└── Suite/                       # Shared design system specifications & logs
```

### Technology Stack Specifications
* **Frontend Runtime:** React 18 with TypeScript, compiled via Vite, and styled with strict Tailwind CSS utility classes.
* **Backend Runtime:** Rust 1.70+ compiling into a native Windows/macOS binary via Tauri v1.
* **Analysis Engine:** Streamlined, asynchronous native execution of static `ffprobe` sidecars.
* **Storage Layer:** High-performance local SQLite database (`BitScribeDB.sqlite`).

---

## 3. High-Performance, Anti-Crash Scanning Lifecycle

To analyze massive media libraries (10,000+ files) without blocking the UI thread or crashing, BitScribe utilizes a highly optimized, two-phase scanning pipeline:

```
[UI Select Directory] ──> [Rust walk_dir] ──> [Early Extension Filter] 
                                                    │
                                                    ▼
[In-Memory Subtitle Map] <── [O(1) Linkage] <── [Batch ffprobe (8-20 Workers)]
         │                                          │
         ▼                                          ▼
[SQLite Bulk Write (250 Rows)] <────── [Rules Engine Evaluation (core-eval)]
```

### Phase 1: Parallel WalkDir & In-Memory Subtitle Indexing
* **Rust Traversal:** Walks target folders recursively using Rust's `WalkDir`, skipping large system folders (`node_modules`, `$RECYCLE.BIN`, `.git`, `target`) early.
* **Early Extension Filter:** Standardizes paths and discards non-media files immediately on the Rust side, reducing IPC and memory allocation overhead.
* **O(N) Sidecar Subtitle Map (Anti-Crash):** Rather than performing expensive `std::fs::read_dir` calls on-demand for every media file (which results in `O(N^2)` file I/O operations and eventually triggers a Windows `STATUS_HEAP_CORRUPTION` crash under heavy workloads), the WalkDir step catalogs all external subtitle files (`.srt`, `.ass`, `.vtt`, `.sub`) on-the-fly. They are stored in an in-memory parent-to-subtitle lookup `HashMap`. Subtitle presence is resolved via sub-millisecond memory searches, ensuring 100% scanning stability.

### Phase 2: Asynchronous Multi-Core Metadata Extraction
* **Content-Addressable Hashing:** Every scanned file is hashed by combining its file size and metadata header into a deterministic `fileHash`. This hash is the database primary key, allowing **BitScribe RX** to rename, re-organize, or move files on disk without losing or breaking metadata records.
* **Dynamic Concurrency Throttle:** Spawns concurrent evaluation workers scaled to the user's CPU cores (`navigator.hardwareConcurrency`), safely capped between **8 and 20 parallel threads** to prevent Tauri/WebView2 thread pool exhaustion.
* **Streamlined Sidecar IPC:** Invokes the `ffprobe` sidecar with optimized arguments:
  * Analyzation window throttled via `-analyzeduration 500000 -probesize 500000`.
  * Chapter extractions skipped on audio-only files (`.mp3`, `.flac`, etc.) to speed up scans.
  * Extracted fields strictly restricted using `-show_entries` to minimize JSON serialization and IPC payload sizes.
* **Transaction Batching:** Results are cached by workers and committed to SQLite in batch write operations of **250 records** per transaction, reducing disk I/O bottlenecks.

---

## 4. Shared Database & Object Schema

### A. SQLite Table: `scanned_files`
The shared SQLite database (`BitScribeDB.sqlite`) utilizes multi-process WAL (Write-Ahead Logging) mode, allowing concurrent read queries while background processes write.

| Column Name | SQLite Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| **id** | `TEXT` | `PRIMARY KEY` | Deterministic file content hash (`fileHash`). Supports path mutations. |
| **filename** | `TEXT` | `NOT NULL` | Base name on disk (e.g., `Inception (2010).mkv`). |
| **filePath** | `TEXT` | `NOT NULL` | Full system absolute path. |
| **topLevelFolder** | `TEXT` | `NULL` | Root catalog name (e.g., `/media/Movies`). |
| **category** | `TEXT` | `NOT NULL` | Resolved category (e.g., `Movies`, `TV Shows`, `Music`, `Audiobooks`). |
| **container** | `TEXT` | `NOT NULL` | Container wrapper extension (e.g., `matroska`, `mp4`, `flac`). |
| **sizeGB** | `REAL` | `NOT NULL` | File size on disk in Gigabytes. |
| **durationMins** | `REAL` | `NOT NULL DEFAULT 0.0` | Chronological duration in minutes. |
| **year** | `INTEGER` | `NULL` | Year parsed from filename or metadata header tags. |
| **videoCodec** | `TEXT` | `NULL` | Video codec code name (e.g., `hevc`, `h264`, `av1`). |
| **videoResolution**| `TEXT` | `NULL` | Standardized resolution label (e.g., `4K`, `1080p`, `720p`, `SD`). |
| **videoBitrateMbps**| `REAL` | `NOT NULL DEFAULT 0.0` | Video track bitrate in Mbps. |
| **videoFrameRate** | `REAL` | `NOT NULL DEFAULT 0.0` | Average video stream framerate (e.g. `23.976`, `60.0`). |
| **videoBitDepth** | `TEXT` | `NULL` | Color depth (e.g., `8-bit`, `10-bit`, `12-bit`). |
| **hdrFormat** | `TEXT` | `NULL` | HDR profile (e.g., `SDR`, `HDR10`, `Dolby Vision`). |
| **audioTracks** | `TEXT` | `NOT NULL DEFAULT '[]'` | **JSON Array String** of embedded audio track schemas. |
| **subtitleTracks** | `TEXT` | `NOT NULL DEFAULT '[]'` | **JSON Array String** of embedded subtitle track schemas. |
| **tags** | `TEXT` | `NOT NULL DEFAULT '{}'` | **JSON Object String** of raw container tags (e.g. artist, book title). |
| **audioBitrate** | `REAL` | `NULL DEFAULT 0.0` | Digital audio stream average bitrate in kbps. |
| **audioSampleRate**| `INTEGER` | `NULL` | Audio frequency in Hertz (e.g., `48000`). |
| **chapterCount** | `INTEGER` | `NOT NULL DEFAULT 0` | Total embedded chapter markers in container. |
| **rawAudioCodec** | `TEXT` | `NULL` | Raw unformatted primary audio codec (e.g., `truehd`, `dts`). |
| **physicalAudioChannels**| `INTEGER`| `NULL` | Layout channel count (e.g., `6` for 5.1 surround). |
| **hasExternalSubtitles**| `INTEGER`| `DEFAULT 0` (0=No, 1=Yes) | Indicates presence of sidecar subtitle files. |
| **embeddedSubtitleLanguages**| `TEXT`| `NULL` | Comma-separated uppercase string (e.g. `ENG,SPA`). |
| **matchedOnlineId**| `TEXT` | `NULL` | ID parsed from filename or tags (e.g., `tmdb-27205`). |
| **isCorrupted** | `INTEGER` | `DEFAULT 0` (0=No, 1=Yes) | Mapped flag indicating corrupt file or parse failure. |
| **errorMessage** | `TEXT` | `NULL` | Underlying stderr output if the file is corrupted. |
| **streamFriendlyLevel**| `TEXT` | `NOT NULL` | Compatibility evaluation (`bleeding`, `modern`, `legacy`, `unfriendly`). |
| **streamFriendlyReason**| `TEXT` | `NULL` | Human-readable explanation of compatibility rating. |
| **streamFriendlySuggestion**| `TEXT` | `NULL` | Actionable fix directive triggering **BitScribe RX** remux/transcode. |
| **streamFriendlyEvaluated**| `INTEGER`| `DEFAULT 0` | UNIX timestamp representing calculations. |
| **author** | `TEXT` | `NULL` | Audiobook artist or E-book writer. |
| **narrator** | `TEXT` | `NULL` | Audiobook narrator extracted from tags. |
| **bookSeries** | `TEXT` | `NULL` | Book series title (e.g., `The Saxon Stories`). |
| **seriesIndex** | `REAL` | `NULL` | Volume index within the series (e.g., `1.5`). |
| **isbn** | `TEXT` | `NULL` | Industry book standard ID. |
| **pageCount** | `INTEGER` | `NULL` | PDF or EPUB parsed count of physical pages. |

---

## 5. Unified Type Definitions (TypeScript)

These core models are imported from `@bitscribe/core-types` across all workspaces to maintain structural parity:

```typescript
export interface AudioTrack {
  index: number;
  codec: string;
  channels: number;
  language?: string;
  title?: string;
}

export interface SubtitleTrack {
  index: number;
  codec: string;       // srt, ass, subrip, hdmv_pgs, mov_text
  language?: string;
  title?: string;
  forced: boolean;
  isExternal?: boolean;
}

export interface MediaItem {
  id: string; // Deterministic content hash
  filename: string;
  filePath: string;
  category: string;
  container: string;
  sizeGB: number;
  durationMins: number;
  year: number;
  videoCodec: string;
  videoResolution: string;
  videoBitrateMbps: number;
  videoFrameRate?: number;
  videoBitDepth?: string;
  hdrFormat?: string;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  audioBitrate?: number;
  audioSampleRate?: number;
  chapterCount?: number;
  tags?: Record<string, string>;
  topLevelFolder?: string;
  
  // Suite/RX Integration Fields
  rawAudioCodec?: string;
  physicalAudioChannels?: number;
  hasExternalSubtitles?: boolean;
  embeddedSubtitleLanguages?: string;
  matchedOnlineId?: string;
  
  // Performance and Corruption Flags
  isCorrupted?: boolean;
  errorMessage?: string;
  bitrateAnomaly?: boolean;
  bitrateAnomalyReason?: string;
  
  // Plex Evaluator Outcomes
  streamFriendlyLevel?: PlexFriendlyLevel;
  streamFriendlyReason?: string;
  streamFriendlySuggestion?: string;
  streamFriendlyEvaluated?: number;

  // Codex E-book / Audiobook Fields
  author?: string;
  narrator?: string;
  publisher?: string;
  bookSeries?: string;
  seriesIndex?: number;
  isbn?: string;
  pageCount?: number;
}

export type PlexFriendlyLevel = 'bleeding' | 'modern' | 'legacy' | 'unfriendly' | 'corrupted' | 'pending';
```

---

## 6. Rules Engine & Compatibility Rubric (`core-eval`)

The compatibility evaluator (`core-eval`) grades movie and TV files based on their direct direct-play suitability across modern streaming backends (like Plex, Jellyfin, and Emby).

### Compatibility Levels Definition
1. **`bleeding` (Ultra High Compatibility):**
   * **Trigger:** Video is `AV1` or `HEVC` (H.265) wrapped in `mp4` or `mkv` containers; Audio is stereo `AAC` or `Opus`; Subtitles are soft `.srt` or sidecar external SRT.
   * **Justification:** Can direct-play on almost any modern mobile device, smart TV, or browser without incurring server-side transcoding.
2. **`modern` (Direct Play Standard):**
   * **Trigger:** Video is `H.264` (AVC) or `HEVC`; Audio is Dolby Digital (`AC3` / `E-AC3` 5.1 surround); Subtitles are soft text-based formats (SRT, WebVTT).
   * **Justification:** Standard direct-play for home theaters. May trigger client-side audio transcoding on web browsers lacking AC3 decoders, but highly compatible overall.
3. **`legacy` (Safe Direct-Stream):**
   * **Trigger:** Older video formats (MPEG-4, VC1) or audio formats (MP3 stereo, AAC 5.1); containers like `avi` or `wmv`.
   * **Justification:** Often requires direct-stream remuxing (wrapping audio/video inside a modern container on-the-fly) but rarely triggers full video transcode.
4. **`unfriendly` (Transcode Warning):**
   * **Trigger:** Image-based subtitles (`PGS` / `HDMV`, `VOBSUB` / `IDX`) embedded inside an `MKV` container, or stylized subtitle scripts (`ASS`/`SSA`) played on client devices lacking rendering engines. Video bitrates exceeding resolution safety envelopes (e.g. 1080p video > 40 Mbps).
   * **Justification:** Forcing the client to burn image-based or heavy ASS subtitles over high-bitrate video forces the Plex server to transcode the video stream on-the-fly, thrashing server CPU/GPU resources.
5. **`corrupted` (Parser Failure):**
   * **Trigger:** `isCorrupted` is true, indicating an unreadable media file, a missing video stream, or a native ffprobe crash.

---

## 7. App Evaluation System Rubric (Scoring Guidelines)

When testing, auditing, and grading the BitScribe codebase, the App Evaluation System should evaluate compliance against the following strict parameters:

### A. Scanning Performance and Crash Safety (Weight: 35%)
* **[  ] In-Memory Map Lookup:** Verify that sidecar subtitles are checked via the in-memory lookup `HashMap` mapping parents to subtitle file lists. *Failing criteria: Executing `std::fs::read_dir` or recursive disk calls for every file scanned.*
* **[  ] Concurrency Caps:** Verify that the concurrent scanning workers are capped between **8 and 20** (`Math.min(20, Math.max(8, logicalCores))`) to prevent native OS heap corruption.
* **[  ] Sidecar Arguments:** Verify that `ffprobe` arguments utilize selective `-show_entries` format to avoid shipping bulky chapter tables and redundant tags over Tauri IPC.

### B. Database Integrity and Mapping (Weight: 25%)
* **[  ] WAL Activation:** Verify that SQLite connection initialization executes `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL`.
* **[  ] Hashing as Primary Key:** Verify that `id` mapping has migrated to use `fileHash` instead of physical `filePath`. This preserves data records when RX shifts or renames files.
* **[  ] Data Pipeline Parity:** Verify that all data fields (e.g., `videoFrameRate`, `videoBitDepth`, `hasExternalSubtitles`) flow perfectly from the Tauri command output (`lib.rs`) into `core-db` (`api.ts`), through `core-types` structures, and out through both the Excel Exporter (`excelExporter.ts`) and HTML/CSV Exporters (`reportExporter.ts`).

### C. Aesthetic & Layout Quality (Weight: 20%)
* **[  ] No Clichés:** Ensure the app does not employ purple-to-blue gradients, glow drop-shadows on dark frames, or arbitrary glassmorphism.
* **[  ] Typography Pairing:** Standard Display fonts paired with high-readability body scales.
* **[  ] Mathematical Nested Radii:** For rounded elements nested inside outer containers, verify that the corner nested layout fits `Inner Radius = Outer Radius - Padding` to prevent visual collision.

### D. Security & Critical Assets Protection (Weight: 20%)
* **[  ] Public Environment Safety:** Ensure no secrets or real API keys are committed. All variables must be lazy-initialized and listed inside `.env.example`.
* **[  ] Binary QR Code Protection:** Verify that the user's payment files (`src/assets/paypal_qr.png` and `src/assets/paypal_qr_backup_DO_NOT_DELETE.png`) have not been deleted, regenerated, or overwritten. They must be untouched.
