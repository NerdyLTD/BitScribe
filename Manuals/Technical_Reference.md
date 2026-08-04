# BitScribe Steward - Technical Reference (v1.5.0)

## 1. Architecture Overview
BitScribe Steward follows a monorepo architecture, bridging a high-performance Rust backend with a modern React frontend.

*   **Frontend**: React 19, Vite, Tailwind CSS. Handles state management, data visualization, and user interactions.
*   **Backend**: Tauri (Rust). Handles native OS interactions, zero-allocation filesystem traversal, and executes sidecar binaries.
*   **Database**: Local SQLite database, optimized with memory-mapped I/O and WAL journaling for high-speed bulk ingestion.

## 2. Package Structure
The workspace is divided into specialized packages:

*   `apps/steward`: The primary entry point containing the React UI (`src/`) and Tauri backend (`src-tauri/`).
*   `packages/core-db`: Orchestrates database interactions and the primary scanning loop (`api.ts`).
*   `packages/core-eval`: Contains the heuristic logic for stream compatibility (Plex rules), deduplication mapping, and anomaly detection.
*   `packages/core-export`: Handles data serialization and formatting for Excel, CSV, JSON, and HTML reports.
*   `packages/core-types`: Shared TypeScript interfaces ensuring type safety across IPC boundaries.
*   `packages/desktop-api`: Tauri IPC wrappers abstracting filesystem and shell command execution.
*   `packages/ui-components`: Shared React components utilizing Tailwind CSS.

## 3. Database Schema
The core of the application relies on the `scanned_files` SQLite table. 

**Table: `scanned_files`**
```sql
id TEXT PRIMARY KEY,
filename TEXT, filePath TEXT, category TEXT, container TEXT,
sizeGB REAL, durationMins REAL, year INTEGER,
videoCodec TEXT, videoResolution TEXT, videoBitrateMbps REAL, videoBitDepth TEXT, videoFrameRate REAL,
audioTracks TEXT, subtitleTracks TEXT, tags TEXT, audioBitrate REAL, audioSampleRate INTEGER,
isCorrupted INTEGER, errorMessage TEXT, hasEmbeddedPoster INTEGER, bitrateAnomaly INTEGER, bitrateAnomalyReason TEXT, topLevelFolder TEXT,
streamFriendlyLevel TEXT, streamFriendlyReason TEXT, streamFriendlySuggestion TEXT, streamFriendlyEvaluated INTEGER,
chapterCount INTEGER, rawAudioCodec TEXT, physicalAudioChannels INTEGER,
matchedOnlineId TEXT, fileUuid TEXT, hasExternalSubtitles INTEGER, embeddedSubtitleLanguages TEXT,
author TEXT, narrator TEXT, publisher TEXT, bookSeries TEXT, seriesIndex REAL, isbn TEXT, pageCount INTEGER
```
**Indexes**:
*   `PRIMARY KEY (id)`
*   `idx_scanned_files_filePath ON scanned_files(filePath)`

*Note: The SQLite connection is optimized using `PRAGMA mmap_size = 268435456`, `PRAGMA threads = 4`, `PRAGMA journal_mode = WAL`, and `PRAGMA synchronous = NORMAL`.*

## 4. Core Execution Flows

### 4.1 Scanning Engine
1.  **Traversal**: The scanning process is initiated via `scanDirectories` (`core-db`). It offloads directory walking to a Tauri IPC command (`walk_dir`).
2.  **Zero-Allocation Rust Walk**: The Rust backend performs allocation-free, case-insensitive exclusion checks and media extension validations, drastically reducing heap churn. Hidden files (e.g., macOS `._` AppleDouble files or `__MACOSX` directories) are strictly ignored.
3.  **Probing**: Valid media files are passed to a bundled `ffprobe` sidecar binary to extract deep structural metadata.
4.  **Ingestion**: Results are batched and inserted into the SQLite database.

### 4.2 Evaluation & Caching
*   **Stream Compatibility**: `core-eval` parses the probed metadata against user-defined hardware limits to determine Direct Play viability.
*   **Global Memoization (Phase 3)**: Expensive O(N) operations, such as duplicate mapping and Plex rule evaluation, are decoupled from React's render cycle. Results are stored in persistent global Maps (`_globalEvalCache`, `_globalMetadataCache`), reducing CPU overhead to near-zero during UI state changes.
*   **Search**: The Library dashboard utilizes React 18's `useDeferredValue` hook to segregate rapid typing updates from heavy array filtering, ensuring 60fps UI responsiveness even with datasets exceeding 30,000 records.

### 4.3 Export Engine
The `core-export` package handles report generation. It reads directly from the SQLite database (or memory cache) and utilizes libraries like `xlsx` to construct formatted, color-coded workbooks or standalone HTML templates containing embedded JSON payloads for interactive web viewing.

## 5. Platform-Specific Implementations
*   **macOS Gatekeeper Bypass**: To prevent Apple Gatekeeper from blocking the bundled `ffprobe` binary, the Tauri backend extracts a zipped payload of the native Apple Silicon (`arm64`) executable to the user's `~/Library/Application Support/` directory at runtime.
*   **Asynchronous IPC**: All heavy filesystem interactions (`walk_dir`, `get_db_files`) operate asynchronously across the Tauri IPC bridge to prevent UI thread lockups (spinning pinwheels) on macOS during massive library scans.
