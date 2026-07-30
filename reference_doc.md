# BitScribe Technical Reference (Current State)

## Repository Structure & Packages
The application follows a monorepo architecture with a React (Vite) frontend and a Tauri (Rust) backend.

- `apps/steward`: The main frontend application and Tauri backend.
  - `src/`: React frontend (UI components, hooks, utilities).
  - `src-tauri/`: Rust backend (SQLite DB, filesystem interactions, FFprobe execution).
- `packages/core-db`: Database interactions and scanning orchestration (`api.ts`).
- `packages/core-eval`: Core evaluation logic for Plex compatibility, parsing, deduplication, and anomaly detection.
- `packages/core-export`: Export logic for Excel, CSV, JSON, and HTML reports.
- `packages/core-types`: Shared TypeScript interfaces and configuration types.
- `packages/desktop-api`: Tauri IPC wrappers for filesystem and shell commands.
- `packages/ui-components`: Shared UI components (Tailwind CSS).

## Main Entrypoints

### Scan Entrypoint
- **Primary Orchestrator**: `scanDirectories` in `packages/core-db/src/api.ts`
  - Handles directory traversal, deduplication against existing database records, calling the FFprobe probe pipeline, and saving back to the SQLite DB.
- **Rust Filesystem Walk**: The actual directory walking is offloaded to Tauri `walk_dir` command (zero-allocation pattern) in `apps/steward/src-tauri/src/lib.rs`.

### Export Entrypoints
- **Excel Export**: `exportMediaLibraryToExcel` in `packages/core-export/src/excelExporter.ts`
- **CSV/JSON/HTML Exports**: `exportMediaLibraryToCSV`, `exportMediaLibraryToJSON`, `exportMediaLibraryToHTML` in `packages/core-export/src/reportExporter.ts`

## Current Database Schema & Indexes
The backend is a local SQLite database (via Tauri).

**Table: `scanned_files`**
```sql
id TEXT PRIMARY KEY,
filename TEXT, filePath TEXT, category TEXT, container TEXT,
sizeGB REAL, durationMins REAL, year INTEGER,
videoCodec TEXT, videoResolution TEXT, videoBitrateMbps REAL, videoBitDepth TEXT, videoFrameRate REAL,
audioTracks TEXT, subtitleTracks TEXT, tags TEXT, audioBitrate REAL, audioSampleRate INTEGER,
isCorrupted INTEGER, errorMessage TEXT, hasEmbeddedPoster INTEGER, 
bitrateAnomaly INTEGER, bitrateAnomalyReason TEXT, topLevelFolder TEXT,
streamFriendlyLevel TEXT, streamFriendlyReason TEXT, streamFriendlySuggestion TEXT, streamFriendlyEvaluated INTEGER,
chapterCount INTEGER, rawAudioCodec TEXT, physicalAudioChannels INTEGER,
matchedOnlineId TEXT, fileUuid TEXT, hasExternalSubtitles INTEGER, embeddedSubtitleLanguages TEXT,
author TEXT, narrator TEXT, publisher TEXT, bookSeries TEXT, seriesIndex REAL, isbn TEXT, pageCount INTEGER
```

**Indexes**
- `PRIMARY KEY (id)`
- `idx_scanned_files_filePath ON scanned_files(filePath)`

*Note: The SQLite connection is tuned with `PRAGMA mmap_size = 268435456`, `PRAGMA threads = 4`, `PRAGMA journal_mode = WAL`, and `PRAGMA synchronous = NORMAL`.*

## Recent Architectural Optimizations
We recently addressed memory allocation bottlenecks and slow file-tree traversal during scanning. If evaluating regressions or slowness, refer to these changes:
1. **Zero-Allocation Rust Walk**: Reconstructed folder exclusions and media extension checking in `walk_dir` to use allocation-free case-insensitive matches (`eq_ignore_ascii_case`) on existing `&str` references, preventing heavy transient lowercase string allocations and heap-churn for ignored/non-media files.
2. **String Caching & Fast Basename**: Implemented a `fastBasename` helper in TypeScript to avoid regex and string-split allocations inside O(N) duplicate loops. Caches normalized path strings (`normPath`) to prevent redundant `replace` operations during DB pruning phases.
3. **Memoized Mappings**: Added a `_topLevelPathCache` for top-level folder calculations to reduce redundant logic executions during the file traversal.
4. **Concurrency & Threading**: SQLite queries are mapped by explicit column names (removing wildcard overhead) and memory-mapped I/O is utilized to bypass user-space system call overheads during bulk data transfer.

*No external raw profiling logs or timing breakdown charts are available yet. Analysis should focus on structural code efficiency (Big-O, memory overhead, DB serialization boundaries) surrounding the `scanDirectories` orchestrator and how objects are mapped into SQLite batches.*
