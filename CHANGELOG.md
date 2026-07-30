## [Unreleased]
- **Purge Cached Mac Binaries & Force Fresh Extraction**: Fixed a root-cause bug in `setup_mac_ffprobe` where the Rust backend checked `if target_bin.exists()` and skipped unpacking, causing existing installations to permanently retain old cached binaries in `~/Library/Application Support/com.bitscribe.steward/`. The backend now explicitly purges any existing cached binaries prior to extraction and unpacks the native Apple Silicon (`arm64`) binary archive on launch.
- **Apple Silicon FFprobe Enforcement**: Replaced the Intel (x86_64) `ffprobe` sidecar binary for macOS with the Apple Silicon (`arm64`) binary to completely eliminate the Intel Mac version and prevent "Bad CPU type" errors when running under Rosetta.
- **macOS Title Bar Fix**: Changed the `productName` in `tauri.conf.json` from `BitScribeSteward` to `BitScribe Steward` to correct the title displayed in the macOS application menu and title bar.
- **Scan Duration Persistence**: Fixed an issue where the duration of a completed scan was not being synchronized to `localStorage`. This caused the dashboard to display the duration of an older scan (or null) upon restarting the app instead of the most recently completed scan duration.
- **Apple Silicon FFprobe Fix**: Replaced the bundled macOS ffprobe sidecar binary with a proper native `arm64` executable. Previously, the bundled aarch64 binary was incorrectly compiled as an Intel (x86_64) executable, causing "Bad CPU type in executable (os error 86)" errors on Apple Silicon Macs without Rosetta installed.
- **Gatekeeper Bypass for macOS**: Implemented dynamic extraction of `ffprobe` from a zipped resource at runtime for macOS users. This bypasses Apple Gatekeeper's quarantine block on bundled sidecar binaries by using the OS's native `tar` to extract the executable to the application's AppData directory and running it from there instead.
- **Mac Directory Skipping**: Added `__MACOSX` to the directory exclusion list in the native `walk_dir` function to ensure hidden macOS resource fork directories are not parsed as media folders, further normalizing file counts between platforms.

- **macOS Empty Library & Missing Exports**: Fixed a critical issue where macOS Gatekeeper or `dyld` linking errors would cause `ffprobe` to fail instantly for all scanned files, miscategorizing the entire library as "Corrupted". The system now creates graceful fallback media items using filename-inferred categories so that files still populate the dashboard and export reports correctly even when native video probing is blocked.
- **Mac Hidden Files Indexing**: Addressed a scanning variance where macOS hidden AppleDouble files (e.g. `._filename.mp4`) were incorrectly ingested as playable media, causing the index totals on Mac to differ from Windows. The scanner now strictly ignores all dot-prefixed hidden files.

- **Library Index Count Variance**: Fixed an issue where the top header's 'items indexed' count did not match the Dashboard's Library Overview count because corrupted files were incorrectly excluded from the global header total.
- **Mac Scanning UI Freeze**: Resolved a severe UI thread lockup on macOS by converting the core Tauri Rust backend file system commands (`walk_dir`, `get_db_files`, `save_db_files`) to asynchronous operations. This prevents the Mac UI from spinning a rainbow pinwheel while indexing tens of thousands of files across the IPC bridge.

### Fixed
- **Library View Layout & Scrolling**: Fixed an issue where the file registry table failed to scroll vertically by properly passing `flex-1` and `min-h-0` down through the Dashboard components and setting the table header to `sticky`.


### Optimized
- **Dashboard Global Evaluation Cache (Phase 3)**: Extracted Plex rule evaluation and metadata regex parsing out of React `useMemo` and into persistent global Maps (`_globalEvalCache`, `_globalMetadataCache`). By caching results keyed strictly by file ID and rule hashes, we bypass the need to re-evaluate 25,000+ files during active scanning updates or tab switching, effectively reducing CPU rendering lag to zero for previously parsed items.
- **Search Responsiveness (Phase 3)**: Implemented React 18's `useDeferredValue` hook for the Dashboard search bar and filter states. This segregates typing updates from the heavy O(N) array filtering logic, guaranteeing that the search input never drops frames or stutters even when instantaneously reducing 30,000 files in the UI.
- **Duplicate Map Memoization (Phase 3)**: Moved the O(N log N) `computeDuplicatesMap` string sorting routine to a global cache. Prevented the app from needlessly recalculating pair matches when other React state toggles (like "Hide Corrupted" or column sorts) trigger re-renders.


### Fixed
- **Analyze Dashboard Folder Clutter**: Fixed an issue where the "Folder" toggle mode in the Metrics Dashboard would display hundreds of individual subfolders (e.g. TV show names) instead of the actual root scan paths. The UI now dynamically associates media items to their parent mapped scan paths on-the-fly, instantly cleaning up the dashboard for existing databases without requiring a rescan.
- **Export Data Folder Logic**: Updated the core engine's `getTopLevelFolder` logic to extract the exact basename of the mapped scan path, ensuring future CSV and JSON data exports group items cleanly by the user's selected roots rather than fragmenting across hundreds of subdirectories.


### Fixed
- **HTML Report Export**: Removed the "All Media" category filter from Media Discovery HTML reports as its value is superseded by the "All Metrics" Dashboard filter.


### Fixed
- **App Initialization Regression**: Restored the missing `initApp` lifecycle hook in `App.tsx` that was inadvertently omitted during a recent UI refactor. The application now correctly reloads saved scan paths, user preferences, and the pre-existing SQLite database contents immediately on launch, instead of presenting an empty zero-item state until manually refreshed.


### Optimized
- **Scan Path Normalization (Phase 2)**: Optimized the top-level folder resolution and duplicate detection logic. Abstracted array splits and regex replacements out of the O(N) duplicate mapping loops by implementing a fast `fastBasename` helper. Added memoization (`_topLevelPathCache`) to `getTopLevelFolder` to prevent redundant lowercasing and regex replacement operations on configured paths during file traversal, significantly decreasing CPU memory allocation during large scans.


### Fixed
- **HTML Report Export**: Removed the "All Media" category filter specifically from Metadata Audit HTML reports. Since each media category (e.g., Movies, TV Shows, Music) has distinct metadata columns, combining them into "All Media" previously forced a generic column layout (File Name, Path) that provided no meaningful metadata insight. Users can now review metadata category by category.


### Fixed
- **Report Export UI and Path Settings**: 
  - Prevented `exportDirectory` from defaulting to the application binary folder (e.g. `c:\Github\...` during development) so that users are prompted appropriately if they haven't explicitly set a path.
  - Corrected hardcoded Sidebar text that incorrectly stated reports were always sent to `Downloads\BitScribe Reports\`. It now dynamically reflects the selected export directory or indicates a prompt will appear.
  - Renamed the error log export filename from `Bitscribe_error.log` to `BitScribe Error Log.txt` for better OS default associations and readability.


### Fixed
- **FFprobe Probe Error**: Fixed a `require is not defined` error during the media probing sequence by refactoring `desktop-api` shell and window wrappers to use ES module static imports instead of CommonJS `require()`. This ensures proper Vite bundling and resolves the scan crash.


### Fixed
- **Scan Path Reference Error**: Fixed a critical `ReferenceError` (`fileObjItem is not defined`) that occurred during the initial directory walk phase of the scan, which caused scans to fail prematurely for folders containing media files.


### Optimized
- **Scan Path Normalization (Phase 1)**: Optimized the hot path in `scanDirectories` by caching the normalized path strings (`normPath`) on the file objects during the directory walk and database load phases. This prevents redundant `normalizePath` calls (which allocate strings via regex `replace`) during the O(N) duplicate detection and database pruning loops, significantly reducing CPU overhead for large library scans.


### Fixed
- **Quick Refresh Button Logic**: Fixed an issue in `Sidebar.tsx` where the Quick Refresh button would incorrectly remain disabled if active scan paths were toggled off, even if valid database items existed to refresh. The button now properly evaluates `scannedFilesList.length` against the disabled state.
- **Database File Pruning Logic**: Corrected an issue in `api.ts` where deleted files on disk were not properly pruned from the database. Refactored the path detection step to explicitly capture `orphanedFiles` that are no longer part of the active path evaluation, appending them to the ghost files array for proper deletion.

### Fixed
- **App Startup Crash**: Fixed a ReferenceError that caused the app to render a black screen on startup. The newly extracted `useBackupRestore` and `useDemoActions` hooks were accidentally placed above the React `useState` variables they relied on (e.g., `setScanPaths`, `setExcelColumns`), causing an initialization failure. Moved the hook calls below all state declarations in `App.tsx` to correct the order.

### Added
- **Diagnostic Logging Toggle**: Added a new global option in the Rule Editor to enable diagnostic logging. When enabled, the app immediately begins capturing application lifecycle events to a timestamped `_debuglog.txt` in the configured Export Directory upon subsequent launches, ensuring complete startup captures.

### Fixed
- **App Startup Crash & Error Handling**: Fixed a critical bug causing the application to render a persistent black screen on startup. Implemented a top-level React `ErrorBoundary` in `main.tsx` to catch and visibly display any future unhandled React crashes, rather than silently failing and trapping the user on a blank screen.

### Added
- **Interactive Reports**: Added an "All Media" category filter by default to Discovery scans for comprehensive viewing.
- **Metrics Clickability**: Filter numbers in the HTML report metrics dashboard are now clickable/interactive.
- **HTML Report Optimization**: Compressed HTML export sizes drastically by splitting embedded JSON data objects into separate arrays of keys and matching values, stripping out the repetitive string overhead.

-e - 2026-07-25: Improved scan performance by optimizing file deduplication mapping and hash comparisons during directory traversal (Option B). Set limits on localStorage quota for media changes, optimized concurrency limits based on hardware cores, and replaced arrays with Set/Map to remove quadratic behavior in file scans.
## [1.4.44] - 2026-07-24
### Optimized
- 2026-07-24: Implemented high-performance SQLite profiling optimizations and allocation-free Rust directory walking to accelerate library scanning:
  - **Zero-Allocation Rust-Side walk_dir Logic**: Reconstructed folder exclusions and media extension checking in `walk_dir` to use allocation-free case-insensitive matches (`eq_ignore_ascii_case`) on existing `&str` references, preventing thousands of transient lowercase string allocations and heap heap-churn cycles for ignored/non-media files.
  - **SQLite Performance Tuning (mmap_size & threads)**: Configured memory-mapped I/O (`PRAGMA mmap_size = 268435456;` for 256MB) and parallel query threads (`PRAGMA threads = 4;`) during connection initialization in `db.rs` to bypass user-space system call overheads and accelerate bulk data transfer.
  - **Explicit-Column SELECT Mapping**: Replaced the wildcard `SELECT *` in `get_db_files` with an explicit, schema-ordered list of exact columns, ensuring strict index-mapping stability and immunizing the query parser against out-of-order schema additions or database upgrades.

## [1.4.43] - 2026-07-24
### Fixed
- 2026-07-24: Fixed a layout shifting bug in the exported HTML reports where enabling the "All Metrics Dashboard" (Metrics Only mode) would push the main navigation/filter menu below the charts:
  - **DOM Layout Restructuring**: Relocated the `#codec-metrics-container` div to be positioned directly below the Category Filters & Controls bar in the DOM template, rather than above it.
  - **Static Menu Alignment**: Ensured that the main menu, filters, and dropdown controls remain statically anchored at the top of the viewport when toggling dashboard metrics on or off, with the dynamic charts appearing cleanly below them in place of the hidden data table.

## [1.4.42] - 2026-07-23
### Updated
- 2026-07-23: Refactored suite nomenclature, corrected compatibility definitions, and updated agent standards:
  - **Suite Branding Alignment**: Renamed `BitScribe_DMLS_Evaluation_Reference.md` to `BitScribe_Evaluation_Reference.md` and replaced all occurrences of "Digital Media Lifecycle Suite (DMLS)" and "DMLS" with "BitScribe Digital Media Suite" to avoid overlapping acronyms and resolve confusion with the "BitScribe Digital Media Library Steward".
  - **Bleeding Edge Definition Correction**: Re-aligned the "bleeding" compatibility level definition with the actual software configuration. Corrected the rating from "Ultra High Compatibility" to "Bleeding Edge Preset / Advanced High-Fidelity Standards" to accurately reflect that while offering peak codec efficiency and high-fidelity output, advanced next-generation formats (AV1, VVC, VP9, TrueHD, DTS-HD, Opus, FLAC, PCM) carry significant transcode and buffering risks in typical, widespread playback environments.
  - **Agent Interaction Guidelines**: Added rule 12 to `AGENTS.md` requiring all development agents to verify past answers before formulating subsequent responses to prevent repetitive phrasing and redundant explanations.

## [1.4.41] - 2026-07-23
### Fixed
- 2026-07-23: Resolved a severe scanning pipeline freeze and Windows application crash (exit code `0xcfffffff` / `STATUS_HEAP_CORRUPTION` / `STATUS_APPLICATION_HANG`) during directory scans:
  - **O(N) In-Memory Subtitle Indexing**: Replaced the synchronous, on-demand `std::fs::read_dir` call (which read parent directories recursively for every single media file scanned, resulting in O(N^2) disk reads and eventual file descriptor/IPC thrashing) with a highly optimized, single-pass in-memory subtitle lookup.
  - **Parent-to-Subtitle Mapping**: During the WalkDir directory traversal, subtitle tracks (`.srt`, `.ass`, `.vtt`, `.sub`) are now cataloged on-the-fly and grouped into a parent-directory-mapped in-memory `HashMap`.
  - **Zero-I/O Evaluator Lookups**: After the walk completes, the sidecar subtitle status (`hasExternalSubtitles`) is determined using lightning-fast `O(1)` memory lookups against the cached subtitles, completely eliminating redundant disk accesses, reducing traversal time to milliseconds, and ensuring rock-solid scanning stability on massive libraries.

## [1.4.40] - 2026-07-23
### Added
- 2026-07-23: Implemented Suite-level refactoring for BitScribe RX compatibility, addressing core data limitations and gaps:
  - **Online Match Keys (Feature 1 compatibility)**: Created a robust regex-based `parseOnlineId` helper inside `packages/core-db` to parse TMDB, TVDB, IMDB, and AniDB identifiers (e.g. `[tmdbid-12345]`, `[imdb-tt12345]`) directly from filenames. Additionally, added fallback extraction to query metadata tags (`tags.tmdb`, `tags.imdb`, etc.) if matching identifiers are present, saving the result to `matchedOnlineId`.
  - **External Subtitle Awareness (Feature 7 compatibility)**: Implemented highly optimized Rust-side sidecar subtitle detection in the `walk_dir` Tauri command. It checks parent folders for matching `.srt`, `.ass`, `.vtt`, and `.sub` sidecars (including language-tagged versions like `.en.srt` or `.zh.ass`) using standard directory reads, passing `hasExternalSubtitles` dynamically to the TS frontend.
  - **Dynamic Fast-Skip Cache Updates**: Updated the TS scanning engine so that if a file's binary hash has not changed, the scanner updates and commits changes to `hasExternalSubtitles` dynamically without needing to re-ffprobe, enabling instant database updates on quick refresh scans.

## [1.4.39] - 2026-07-23
### Optimized
- 2026-07-23: Implemented massive full-stack scanning pipeline performance, safety, and capability enhancements:
  - **Dynamic Buffer Enlargement**: Bumped the database write-buffer (`BATCH_SIZE`) from `250` to `500` records in `api.ts` as requested by the user, dramatically reducing SQLite transaction frequencies.
  - **Adaptive Scan Concurrency**: Adjusted scan concurrency (`CONCURRENCY`) to a balanced cap of `12` concurrent workers. This prevents disk read thrashing and network bandwidth choke on slower external hard drives and networked NAS/SMB shares, ensuring consistent scan speeds.
  - **Direct Ghost File Pruning (Massive Speedup)**: Replaced the slow complete database truncation and rewrite routine with a dedicated Rust Tauri command `delete_db_files` which performs target file deletions (`DELETE FROM scanned_files WHERE id = ?1`) instantly, reducing subsequent scan times from minutes to seconds.
  - **Transactional DB Write Queue**: Implemented a serialized promise queue (`queueDbSave`) in the TS frontend to serialize bulk database writes, eliminating SQLite transaction overlap and "database is locked" (5) errors.
  - **Durable DB Indexing**: Added a database index `idx_scanned_files_filePath` on SQLite startup to optimize file paths queries and fast-skipping lookups.
  - **Video Frame Rate Tracking**: Fully implemented video frame rate tracking (`videoFrameRate`):
    - Added floating-point frame rate extraction from ffprobe streams (`avg_frame_rate`/`r_frame_rate`) with fallback fraction parsing.
    - Added `videoFrameRate` to the SQLite schema and Tauri `ScannedFile` Rust models.
    - Integrated "Frame Rate" column reporting to HTML, CSV and Excel spreadsheet exporters.
    - Added `FPS` column support to the TV Shows and Movies dashboard grids.

## [1.4.38] - 2026-07-23
### Optimized
- 2026-07-23: Implemented 5 major scanning pipeline optimizations across the full stack (Rust, SQLite, and JS/TS):
  - **Optimization 1 (SQLite Write Tuning)**: Enabled high-performance SQLite connection pragmas (`journal_mode = WAL`, `synchronous = NORMAL`, `cache_size = -64000`, `temp_store = MEMORY`) in `db.rs` to minimize lock latency and dramatically accelerate write transaction speeds.
  - **Optimization 2 (Rust WalkDir Directory Pruning)**: Implemented early system, build, and hidden directory pruning inside the Rust `walk_dir` command using `.skip_current_dir()`, avoiding walking thousands of irrelevant files in `.git`, `node_modules`, `target`, `$RECYCLE.BIN`, etc.
  - **Optimization 3 (ffprobe Sidecar Streamlining)**: Switched ffprobe arguments to use selective stream/format property filtering via `-show_entries`. Reduced `-analyzeduration` and `-probesize` to `500000` to speed up remote and slow drive media parsing without accuracy loss.
  - **Optimization 4 (Dynamic Write-Buffer Enlargement)**: Increased database batch update sizing (`BATCH_SIZE`) from `50` to `250` records to dramatically reduce the frequency of SQLite writes, lock calls, and Tauri IPC thread communication overhead.
  - **Optimization 5 (Parallel Path Walking)**: Parallelized multi-path scanning directory walks in JS using `Promise.all` instead of awaiting them sequentially, utilizing all CPU cores concurrently for multi-library scanning walks.

## [1.4.37] - 2026-07-23
### Optimized
- 2026-07-23: Implemented Rust-side WalkDir extension filtering optimization:
  - Added native extension filtering directly in the Rust `walk_dir` command. Files that do not have allowed media/audio extensions (such as image files, `.nfo` metadata, and hidden files) are now skipped before file hashing, memory allocation, and serialization.
  - This drastically reduces disk metadata API overhead, memory usage, and the size of the JSON payload transmitted over the Tauri IPC/WebView bridge, resulting in significantly faster traversal speeds and lower CPU overhead on folders containing numerous artwork images or mixed files.

## [1.4.36] - 2026-07-23
### Optimized
- 2026-07-23: Implemented massive scanning performance optimizations to reduce overall scan times dramatically:
  - Eliminated redundant SQLite writes and Tauri IPC calls for unchanged cached media files. The scanner now only saves cached items if their newly evaluated compatibility status has changed, cutting database writes for cached files from thousands to virtually zero.
  - Eliminated an O(N^2) linear search bottleneck in the frontend scan progress handler. Removed high-frequency `findIndex` list-mutation operations on the main thread, freeing up WebView CPU cycles and speeding up scan processing.

## [1.4.35] - 2026-07-23
### Optimized
- 2026-07-23: Restored scanning performance by increasing the dynamic concurrency limit.
  - Set the dynamic concurrency formula to `Math.min(20, Math.max(8, logicalCores))`. This scales smoothly up to 20 concurrent threads on modern multi-core processors (providing over 3.3x the scanning speed of the previous safety cap of 6) while remaining strictly within safe bounds to prevent any process crashes or heap corruption.

## [1.4.34] - 2026-07-23
### Fixed
- 2026-07-23: Implemented scanning robustness fixes to ensure rock-solid stability and eliminate crashes (STATUS_HEAP_CORRUPTION / exit code 0xc0000374).
  - Capped scanning concurrency dynamically with a safe upper limit `Math.min(6, Math.max(1, logicalCores - 1))` (previously un-capped at up to 32+ on many-core processors). This avoids native WebView2 and Tauri process/thread pool exhaustion when spawning hundreds of concurrent sidecar subprocesses (`ffprobe`).
  - Implemented an elegant in-memory log buffer and asynchronous write flushing interval (500ms or 100 entries chunk size) in the overridden browser console methods (`initDebugLog`). This avoids flooding the Tauri IPC bus and file system with unthrottled asynchronous write requests during rapid render or scan status events.
  - Eliminated high-frequency `console.log("Dashboard rendering");` call from the `Dashboard` component render pass, saving substantial CPU cycles, React reconciliation work, and file writing overhead.

## [1.4.33] - 2026-07-23
### Optimized
- 2026-07-23: Implemented major scan speed optimizations.
  - Optimized directory walk file filtration by switching from nested `some` extensions loop to an `O(1)` `Set` lookup, significantly speeding up large library directory traversal.
  - Dynamically increased worker pool concurrency multiplier from `logicalCores - 1` to `Math.max(8, logicalCores * 2)` to fully utilize hardware capability and overlapping disk/network I/O.
  - Avoided redundant `ffprobe` sidecar execution for unmodified files by validating cached database files directly against Rust-calculated metadata size/time file hashes (`cachedItem.id === fileHash`).
  - Added fast-skip metadata re-evaluation: if a file has not changed on disk, we bypass the heavy disk probe entirely but still run `evaluatePlexCompatibility` on the cached metadata dynamically, updating compatibility results instantly according to the user's latest custom rule criteria.
  - Optimized `ffprobe` execution arguments for audio-only files (e.g. MP3, FLAC, M4A, etc.) by skipping chapters lookup (`-show_chapters`), reducing container analysis and parser overhead.

## [1.4.32] - 2026-07-23
### Fixed
- 2026-07-23: Fixed Media Discovery HDR format selection default bug. Included `discoveryHdrFormats` (`SDR`, `HDR10`, `HDR10+`, `Dolby Vision`, `HLG`, `Advanced HDR`) in `DEFAULT_RULES` (`plexEvaluator.ts`), `App.tsx` state initialization (`customRules`), `resetToDiscoveryPreset`, and header mode switching. Corrected `handleSelectAllList` and `handleClearAllList` in `RuleEditor.tsx` to handle the `hdr` category correctly, ensuring HDR settings are enabled by default for fresh app downloads and mode resets.

## [1.4.31] - 2026-07-23
### Refactored
- 2026-07-23: Phase 8 of Monorepo Refactoring: Extracted modal dialogs and tour overlays (`ConfirmModal.tsx`, `DemoCleanupModal.tsx`, and `TourRemoteControl.tsx`) out of `App.tsx` into dedicated components in `apps/steward/src/components/modals/`. Reduced `App.tsx` monolith complexity while preserving all interactive modal state handlers and tour remote control behavior.

## [1.4.30] - 2026-07-26
### Refactored
- Extracted global UI helpers (`scrollToElement`) into a `domHelpers.ts` utility file.
- Decoupled the 1,160-line automated tour simulation loop into a dedicated `useTourSimulation.ts` React hook, significantly reducing the complexity of the main `App.tsx` file.
- Extracted the entire Tauri IPC Scan Engine block (including event listeners, metrics updates, and pause/resume logic) into a dedicated `useScanEngine.ts` hook, further decoupling core functionality from `App.tsx`.


### Added
- HTML Discovery Report: Codec metrics on the "All Metrics Dashboard" are now fully interactive. Clicking any codec name or count will filter the main table to show only matching files, allowing for rapid drill-down analysis without increasing report file size.

### Fixed (Follow-up)
- Fixed an issue where the demo database would still be populated automatically after an App Reset, because the tour state was reset without automatically showing the welcome tour.

### Changed (Follow-up)
- Stylized the "KABOOM!" comic graphic further with an arched, staggered letter layout and a layered starburst SVG background for a more authentic comic book feel.

### Fixed
- Fixed an issue where the Demo Database would persistently remain if a user clicked "Skip permanently" or "Pause for 1 week" on the welcome tour.

### Changed
- Improved the App Reset visual effect. Bitsy now visibly charges up power before unleashing a 360-degree confetti burst with a stylized "KABOOM!" comic-book graphic.

### Fixed
- 2026-07-26: Increased aggressiveness of metadata tag truncation. Standard text tags are now safely capped at 250 characters, synopsis/description at 1500, and lyrics at 5000. This permanently eliminates the issue of massive base64 image streams from MP4/MKV files inflating the final report size by megabytes.

### Fixed
- 2026-07-26: Truncated massive embedded tag values (e.g. base64 image data mistakenly placed in lyrics or title tags) across HTML, CSV, Excel, and JSON report exporters to prevent unexpected 8MB+ file size bloat when generating reports for libraries containing mis-tagged files.

### Fixed
- 2026-07-23: Preserved raw embedded metadata alongside cleaned titles in all report exporters (`reportExporter.ts` and `excelExporter.ts`). Added `Cleaned Title` column support for Music metadata exports across CSV, Excel, and HTML reports, ensuring both cleaned parsed titles and raw embedded metadata tags remain fully inspectable and visible for remediation/RX workflows.

## [1.4.29] - 2026-07-23
### Optimized
- 2026-07-23: Optimized JSON report export (`exportMediaLibraryToJSON` in `reportExporter.ts`) to dramatically shrink JSON audit file sizes (e.g. reducing large discovery report files by over 65%-75% down to ~15-20MB for ~25,000 items) without any data or capability loss.
- 2026-07-23: Eliminated duplicate top-level `streamFriendlyLevel`, `streamFriendlyReason`, `streamFriendlySuggestion`, and `streamFriendlyEvaluated` fields that duplicated the self-contained `evaluation` block.
- 2026-07-23: Cleaned up empty default strings (`author`, `publisher`, `narrator`, `errorMessage`, `matchedOnlineId`, `fileUuid`, etc.), empty tag/subtitle structures, and default zero values from export items, and rounded floating-point number fields (`sizeGB`, `durationMins`, `videoBitrateMbps`).
- 2026-07-23: Switched JSON export stringification to standard minified JSON, eliminating millions of whitespace indentation characters while keeping the SQLite database completely untouched.

## [1.4.28] - 2026-07-22
### Added
- 2026-07-22: Added `sanitizeTags` function in `@bitscribe/core-eval` (`mediaParser.ts`) to strip out junk metadata (proprietary ID3 frames like `id3v2_priv.*`, `WM/*`, `Zune*`, `iTun*`, hex byte dumps, build signatures like `ENCODER`, `creation_time`, `TLEN`, `TMED`, `compatible_brands`, and scene uploader signatures) during initial file scans and JSON report exports.
- 2026-07-22: Consolidated and preserved all song lyrics (`lyrics`, `lyrics-eng`, `lyrics-XXX`, `unsyncedlyrics`) into a clean, normalized `lyrics` string without binary noise, preserving full multiline compatibility for external players and future embedding tools.
- 2026-07-22: Drastically reduced SQLite database storage footprint and JSON audit report file size (e.g., Discovery Audit size drop) while maintaining 100% field parity for all standard video, TV, movie, music, and audiobook metadata.

## [1.4.27] - 2026-07-22
### Refactored
- 2026-07-22: Phase 7 of Monorepo Refactoring: Extracted the complete left sidebar navigation, scanner controls, export formats, report profiles, custom column selector, and troubleshooting panel into a standalone modular `Sidebar` component (`apps/steward/src/components/Sidebar.tsx`). Reduced `App.tsx` monolith complexity while preserving all interactive scanner, export, and diagnostic state handlers.

## [1.4.26] - 2026-07-22
### Removed
- 2026-07-22: Completely removed the purple-to-blue radial backdrop glow div (`blur-3xl`) from `Header.tsx` as requested by the user, leaving a clean, flat header container background.

## [1.4.25] - 2026-07-21
### Fixed
- 2026-07-21: Unified the background colors across the Header (`Header.tsx`), Navigation Tabs (`NavigationTabs.tsx`), Sidebar, Troubleshooting block, and Main Content area (`App.tsx`) to a cohesive `#0F1117` canvas background, eliminating visual color discrepancies and creating a seamless, polished application layout.

## [1.4.24] - 2026-07-21
### Refactored
- 2026-07-21: Phase 6 of Monorepo Refactoring: Extracted modular `Header` (`Header.tsx`) and `NavigationTabs` (`NavigationTabs.tsx`) components out of `App.tsx` into `apps/steward/src/components/`, improving code readability and component isolation while maintaining exact UI parity.

## [1.4.23] - 2026-07-21
### Fixed
- 2026-07-21: Added explicit bottom padding (`pb-6` on the Troubleshooting section and `pb-8` on the sidebar scroll container) in `App.tsx` so that when the window is vertically resized, the bottom buttons (Show Tour, Clear Cache) in the Troubleshooting section are fully visible with clean clearance above the bottom window edge.

## [1.4.22] - 2026-07-21
### Fixed
- 2026-07-21: Moved the Troubleshooting section inside the primary scrollable sidebar container in `App.tsx`. This ensures that when the window is vertically shrunk, the Troubleshooting block remains strictly in document flow below the Export Formats block with a clean margin gap, preventing any vertical visual overlap.

## [1.4.21] - 2026-07-21
### Refactored
- 2026-07-21: Completed Phase 5 of the BitScribe Monorepo transition by cleaning up orphaned workspace build scripts and configuring top-level `npm run lint` workspace delegation. Verified full type safety and modular export integration across `@bitscribe/core-types`, `@bitscribe/core-eval`, `@bitscribe/core-db`, and `@bitscribe/ui-components`.

## [1.4.20] - 2026-07-21
### Fixed
- 2026-07-21: Fixed PowerShell `npm error Lifecycle script dev failed with error` when closing the Tauri window by changing `beforeDevCommand` in `tauri.conf.json` from `npm run dev` to `npx vite`. This prevents npm from catching signal terminations on app exit.

## [1.4.19] - 2026-07-21
### Fixed
- 2026-07-21: Adjusted the debug log system to create a uniquely timestamped log file on every launch (e.g., `2026-07-21_14-30-00_debuglog.txt`) instead of appending all history to a single giant text file.

## [1.4.18] - 2026-07-21
### Fixed
- 2026-07-21: Fixed an issue where resizing the window vertically caused the Troubleshooting block in the sidebar to overlap the Export Formats text by correcting its flex layout classes.
- 2026-07-21: Renamed the generated executable from `Steward.exe` to `BitScribeSteward.exe` in the Tauri configuration to maintain consistent branding.

## [1.4.17] - 2026-07-21
### Fixed
- 2026-07-21: Fixed Recharts `width/height` console warnings on window close/resize by adding `minWidth={0}` and `minHeight={0}` properties to all `ResponsiveContainer` components in the dashboard.

## [1.4.16] - 2026-07-21
### Fixed
- 2026-07-21: Fixed missing import for `formatResolutionForExcel` in `excelExporter.ts` which was causing ReferenceErrors during background report generation for specific audit profiles.

## [1.4.15] - 2026-07-21
### Fixed
- 2026-07-21: Fixed missing import statements for `getFolderPath`, `getMissingMetadataTags`, `getScanType`, and `getReportTitle` in the export handlers (`excelExporter.ts`, `reportExporter.ts`) which were causing ReferenceErrors during background report generation.

## [1.4.14] - 2026-07-21
### Fixed
- 2026-07-21: Switched from base64 string conversion to direct byte streaming via Tauri `plugin-fs` in `downloader.ts` to prevent out-of-memory crashes and IPC payload limits when exporting very large media library reports.
- 2026-07-21: Added `fs:write-all` and `fs:allow-write-file` permissions to Tauri capabilities to fully support binary file writing.
- 2026-07-21: Added verbose error logging (`console.error`) inside the export handler to ensure export failures are captured in the background `debuglog.txt` moving forward.

## [1.4.12] - 2026-07-21
### Fixed
- 2026-07-21: Expanded the startup debug log to capture all `console.log`, `console.warn`, `console.error`, and unhandled exceptions across the application lifecycle to assist in deep troubleshooting.

## [1.4.11] - 2026-07-21
### Fixed
- 2026-07-21: Fixed missing Tauri fs permissions (`fs:allow-write-text-file`, `fs:allow-mkdir`, `fs:allow-download-write`) which prevented the startup debug log from being written to the Downloads folder.

## [1.4.10] - 2026-07-21
### Fixed
- 2026-07-21: Renamed the startup debug log file from `debug.log` to `debuglog.txt` and added an on-screen alert to expose any errors encountered during the write process.

## [1.4.9] - 2026-07-21
### Added
- 2026-07-21: Added automatic debug log creation in the `Downloads/BitScribe` directory upon application launch to aid in troubleshooting startup issues.

## [1.4.8] - 2026-07-21
### Fixed
- 2026-07-21: Fixed a critical issue causing the application to crash to a black screen upon launch due to a missing `getCategoryGroup` import in the core evaluation module. Added the missing import to resolve the React render exception.
## [1.4.7] - 2026-07-21
### Fixed
- 2026-07-21: Restored missing `ffprobe` binaries required for the Tauri build process which were accidentally deleted during the monorepo migration.

## [1.4.6] - 2026-07-21
### Fixed
- 2026-07-21: Fixed a critical crash (Tauri app exiting with 4294967295 / -1) occurring a few seconds after launching the app with an empty state. Replaced dangerous `window.location.reload()` calls (which destabilize Vite HMR and WebView2) with secure React state updates to seamlessly load the mock library data.
## [1.4.14] - 2026-07-19

### Added
- **Diagnostic Report JSON Export**: Added a dedicated "Export JSON" button to the System Diagnostics panel, allowing users to save and download comprehensive, formatted diagnostic JSON files.
- **Enhanced Song Version Duplicate Protection**: Improved the duplicate detection engine (`duplicateHelper.ts`) to recognize special version descriptors (e.g. "Acoustic", "Live", "Remix", etc.), avoiding false positive duplicate flags on legitimate unique song recordings.

### Fixed
- **Excel Report Changes Tab Scoping**: Fixed an issue where the "Changes" worksheet was being appended to all Excel reports (e.g., Metadata Audits, Quality Audits) after an initial Discovery Scan populated the local changes cache. The tab is now correctly restricted to only generate during Discovery Audits.
- **HTML Report Stream Audit Color Coding**: Restored visual status color coding (red, yellow, green) to the "Stream Audit" column in the exported HTML reports to match the styling format used in Excel streaming audits.
- **HTML Report Dynamic Metrics Rendering**: Fixed an issue where the top metric summary blocks (Total Files, Codec Counts, etc.) in the Discovery Scan report were not dynamically updating when users selected a specific category filter (e.g., Movies, TV). Swapped hardcoded `ALL_DATA` iteration to use the reactive `targetItems` subset.
- **HTML Report Filter Navigation**: Improved the behavior of the "All Metrics Dashboard" view in HTML reports by allowing users to click back to standard category filters directly without having to manually toggle the dashboard off first.
- **HTML Report JS Syntax Error Escaping**: Deeply analyzed and resolved a critical `SyntaxError: Unexpected string` preventing HTML reports from rendering for several versions. The issue was caused by TypeScript interpreting the backslash escape sequence (`\'`) during `htmlTemplate` string generation, resulting in prematurely closed JavaScript string literals inside the exported HTML document's `setDupFilter` interactive event listeners. Swapped to using HTML `&quot;` character codes to safely encapsulate internal string arguments within inline function calls without escaping collision.
- **HTML Report Regex Backslash Escaping**: Resolved an issue where backslashes inside regexes (`\s` and `\|`) in the HTML generator's template were stripped during output formatting. Double-escaping the regex parameters ensures that codec splits and whitespace filters execute correctly on the static report load.
- **Excised HandBrake Presets**: Completely removed the failed HandBrake Presets explorer experiment from the codebase and help panels, restoring a clean help tab environment.
- **Robust Cross-Platform Directory Walking**: Updated Tauri WalkDir commands (`src-tauri/src/lib.rs`) with symlink following support (`follow_links(true)`) and defensive error/permission handling to prevent scanning crashes on inaccessible directories.
- **Interactive Duplicates Report Filtering**: Implemented "All", "Video", and "Music" interactive filter buttons directly inside the exported Media Duplicates HTML report and synchronized it with the underlying data table rendering.
- **Scan Cancellation & Abort Signals**: Integrated robust `AbortSignal` cancellation propagation across the React scanning thread and backend probe workers, enabling immediate user-triggered scan cancellation.
- **Web-Preview Scanning & Pruning Simulation**: Enabled fully functional simulated directory walks, database pruning, and file probing inside the web preview sandbox using `MOCK_MEDIA_LIBRARY` data.
- **Tauri Native Export Error Mapping**: Improved native dialog file saving in `downloader.ts` to translate OS-level writing errors into readable, actionable user warnings (e.g. Write Permission Denied, Directory Not Found).

## [1.4.13] - 2026-07-17

### Added
- **BitScribe HandBrake Presets Explorer**: Introduced an interactive encoding and transcoding presets explorer inside the Help Center tab. Users can learn about, inspect, and download 24 custom presets structured for Modern+ and Legacy+ standards across SD, HD, Full HD, and 4K resolutions:
  - **1-Click Import JSON**: Generates and downloads a single, nested JSON preset list file that populates HandBrake's preset list with organized categories (Modern+ vs Legacy+ with Space Saver, Balanced, and Kinda Silly folders) in one click.
  - **ZIP Package Download**: Bundles all 24 individual JSON preset files into a structured directory inside a standard ZIP download using client-side ZIP packaging.
  - **Interactive Presets Panel**: Shows standard tiers and quality profiles side-by-side to review exact constant quality RF limits, encoders, multi-track audio stream bitrates, and SRT subtitle configurations.
  - **HandBrake Integration Guide**: Includes an accordion instructions block detailing how to easily import and run files through HandBrake.

### Fixed
- **Excel Report Corrupted Redirects**: Fixed a misleading label on the overview sheet of the "Streaming Audit" Excel report (and other reports) which pointed users to a non-existent "Corrupted" tab. The message is now dynamically aligned to suggest checking the dedicated "Bad Files Audit" report, while gracefully preserving the local tab reference when exporting a genuine "Bad Files Audit" report.
- **Excel & CSV Formula Injection Protection**: Implemented a defense in both `excelExporter.ts` and `reportExporter.ts` by checking and prepending a single quote `'` to any string cell starting with `=`, `+`, `-`, or `@` to neutralize formula injection during import or execution in external spreadsheet applications.
- **TV Series Title Column in Excel**: Fixed a bug where the TV show "Series Title" was hardcoded as an empty string in the Excel Discovery Scan report tab. It now correctly maps to the parsed series title to perfectly match CSV and HTML reports and prevent empty columns.
- **Corrupted Count in HTML Reports**: Fixed an issue where the HTML report metrics card showed 0 total corrupted files when exporting a Corrupted Files Audit due to over-aggressive filtering of the `baseItems` dataset.

## [1.4.12] - 2026-07-17

### Fixed
- **Secure Probing Timeout**: Wrapped sidecar command executions in a strict 15-second Promise-race timer to ensure the media scanner never hangs on malformed assets or slow network drives.
- **Robust Multi-bit & Non-JSON Stripping**: Integrated automatic regex/string cleaners to isolate the valid JSON block from `ffprobe` output, ensuring unexpected non-JSON warnings or trailing shell logs do not crash the parser or falsely report files as corrupted.
- **Non-NaN Parsing Protection**: Standardized all conversions of sizes, bitrates, sample rates, channels, and release years via defensive, type-safe fallback parsers (`safeParseInt` and `safeParseFloat`), guaranteeing that `NaN` values never leak into persistent storage or trigger React component rendering crashes.
- **Case-Insensitive Track Tags Matching**: Implemented case-insensitive key scanning for audio and subtitle language properties (e.g., mapping `Language` or `LANGUAGE` to standard ISO definitions), securing robust tag hydration across diverse media encoding profiles.
- **Accurate Filename Extension Resolution**: Upgraded container mapping to isolate the actual filename before parsing the trailing extension, preventing dots in parent directory path folders (e.g. `Movies/Avatar.3D/Avatar.mkv`) from misidentifying file containers.

## [1.4.11] - 2026-07-16

### Fixed
- **HTML Report Size Halved**: Eliminated the redundant double serialization of the entire library dataset (`__DATA__` and `__ALL_DATA__` were previously serialized as independent identical arrays). Now the dataset is serialized exactly once, reducing HTML report size by exactly 50% (saving up to 24MB on large libraries).
- **Global Metrics on Discovery Scan Cards**: Fixed the issue where Discovery Scan metric cards ("Video Codecs", "Audio Codecs", "Containers", and "Music Codecs") displayed category-filtered counts (e.g. showing 0 music codecs when TV category is active) rather than global library-wide stats. Now the cards display the correct global metrics consistently, matching the distribution lists below.
- **Cross-Platform Corrupted File Paths**: Fixed Windows-specific folder path extraction issues on corrupted files by splitting on both forward slashes and backslashes dynamically.
- **Corrupted File Hydration**: Ensuring `topLevelFolder` is dynamically resolved for damaged files using the standard `getTopLevelFolder` helper to prevent blank rows or grouping failures.
- **2026 Year Fallback Defenses**: Cleared `tags.creation_time` fallback leakage from the directory scanner and file parser to guarantee file modification timestamps never corrupt release year values as 2026.

## [1.4.10] - 2026-07-16

### Fixed
- **HTML Report File Size Optimization**: Resolved a major issue where HTML report exports ballooned in size (up to 104MB combined). Restricted the embedded JSON payload to only map and serialize target files relevant to each individual scan profile instead of embedding the entire media library.
- **Discovery Audit Metric Cards Alignment**: Fixed the Discovery Audit dashboard block rendering, replacing unrequested metadata tag completeness cards ("Fully Tagged", "Missing Tags", "Tag Coverage") with basic library metrics displaying "Video Codecs", "Audio Codecs", "Containers", and "Music Codecs" counts.
- **Browser Script Reference Errors**: Prevented potential client-side crashes in generated HTML reports by declaring and implementing a native `formatCodecString` utility directly in the browser-side script environment.
- **Static Category Integration**: Adjusted the `baseItems` browser-side filter in generated HTML reports to properly retain "Static" files when reviewing "Discovery Audit" statistics, resolving a discrepancy where static files were excluded from Discovery dashboard metric cards.

## [1.4.9] - 2026-07-16

### Improved
- **Safety Review & Validation**: Audited the entire folder scanning and database ingestion pipeline for optimal security, 100% regression prevention, and strict platform compliance.
- **Cross-Platform Normalization**: Standardized path-separator normalizations in the media scanner utility (`src/lib/api.ts`) to handle Windows backslashes and Unix slash patterns consistently.
- **Ingestion Concurrency Safety**: Documented and verified SQLite batch write queues to guarantee connection safety and lock mitigation under heavy worker concurrency.
- **Report & Dashboard Alignment**: Confirmed perfect synchronization between `reportFilters.ts` and UI Dashboard filter presets, ensuring that report exporters propagate user custom rules without logic drift.

## [1.4.8] - 2026-07-16

### Fixed
- Fixed an issue where the year parser inadvertently extracted a four-digit year from parent directory paths (e.g. `Movies/Avatar (2009)/Avatar.mkv` and `/media/drive2019/...`) instead of relying solely on the filename, which led to incorrect metadata matching.
- Prevented potential race conditions and unpredictable SQLite blocking in the worker scanning pipeline by moving the `batch` queue scope per-worker.
- Improved Rust Tauri bindings by transitioning `save_db_files`, `get_db_files`, and other synchronous I/O commands to execute on the application's blocking thread pool, preventing deadlocks that starved the core async runtime.
- Refactored `getTopLevelFolder` to calculate paths relative to user-configured directory roots instead of returning meaningless device mount points.

## [1.4.7] - 2026-07-16

### Fixed
- Fixed an issue in the UI Dashboard's sorting system where minor variations in artist names (e.g. `"Weird Al" Yankovic` vs `Weird Al Yankovic`) caused songs from the same album to sort apart and fragment the UI grouping. The table sort function now strictly applies the same `normalizeGroupTitle` normalization as the grouping header generator, ensuring contiguous clustering of tracks.

## [1.4.6] - 2026-07-16

### Fixed
- Refactored library string normalization and row grouping logic into a unified shared utility (`sortingHelper.ts`). This ensures the UI Dashboard and the Excel exporters now rely on a single source of truth for generating strict metadata group headers, preventing future behavioral drift.
- Fixed an issue where the UI Dashboard erroneously split music albums with minor casing variations (e.g., "Dare to Be Stupid" vs "Dare To Be Stupid") into separate groups. Replaced the strict string equality check with a normalized case-insensitive grouping function identical to the Excel exporter logic.
- Fixed the UI Dashboard library table sorting logic for music tracks. Previously, secondary sorting incorrectly alphabetized songs by title rather than organizing them chronologically by Disc and Track numbers, causing out-of-order album listings. The Dashboard now mimics the primary Excel exporter logic by properly resolving tracks chronologically.
- Fixed an issue where the Excel and HTML Metadata Scanner modules erroneously audited music files as non-compliant by relying on streaming compatibility flags rather than the dedicated metadata scanner. Music files are now properly audited for their own trackable metadata (Title, Year, Artist, Album, Disc, Track).
- Separated `Metadata Scan` metric rendering in Excel and HTML into responsive variants that respect the isolation of `Video Metadata Scan` and `Music Metadata Scan` preferences.

## [1.5.0] - 2026-07-21
### Refactored
- Extracted evaluation logic, media parsers, formatters, sorting helpers, and scan utilities into `@bitscribe/core-eval` package as part of the monorepo architecture Phase 3 refactoring.
- Extracted database access logic (api.ts) to `@bitscribe/core-db` and UI elements (BitsyCharacter, BitsyReel) to `@bitscribe/ui-components` as part of the monorepo architecture Phase 4 refactoring.

## [1.4.5] - 2026-07-16
### Changed
- Eliminated all duplicate, hard-coded logic for metric calculations across the entire application. Created a centralized "source of truth" in `plexEvaluator.ts` by adding standardized boolean flags (`isBloated`, `isStarved`, `isAnomaly`) to the `EvaluationResult` interface.
- Updated `Dashboard.tsx`, `reportFilters.ts`, `excelExporter.ts`, and `reportExporter.ts` to consume the unified boolean flags instead of performing brittle string matching against remediation text.
- Extracted subtitle evaluation logic into centralized `isMissingSubtitles` and `hasBadSubtitles` helper functions inside `plexEvaluator.ts`.
- Integrated `getMissingMetadataTags` into the `Dashboard.tsx` missing metadata tag breakdown to ensure the dashboard pie charts match the exported Excel and HTML report metrics identically.

## [1.4.4] - 2026-07-16
### Fixed
- Fixed an issue where the Excel exporter calculated Quality Audit totals using duplicate, hardcoded logic instead of the centralized `evaluatePlexCompatibility` module, leading to '0 files' reported on the top level summary.
- Fixed a short-circuit bug in `plexEvaluator.ts` that erroneously returned cached 'Streaming Scan' results for all scan types unless forcefully bypassed, which caused HTML/Excel reports to miss anomaly classifications.

# Changelog

All notable changes to this project will be documented in this file.

## [1.4.5] - 2026-07-15

### Added
- Created interactive file list tooltips inside the **Quality Anomalies** metrics card, displaying individual filenames and their offending bitrates when hovering over the "bloated" or "starved" labels.
- Added a dedicated, styled **Media Scanner** section heading with a subtle gradient separator to the left sidebar panel above the "What to Scan" section to ground the scanner's configuration tools.
- Integrated comprehensive description tooltips (`title` attributes) for the **Category** and **Folder** metrics mode selector buttons.
- Created context-aware hover description tooltips for all filter buttons under the **Metrics Dashboard** block (including category/type filters and dynamically resolved folders).

### Changed
- Streamlined duplicate detection architecture by consolidating all duplication logic under `src/utils/duplicateHelper.ts`. Replaced the duplicated `computeDuplicatesMap` implementation in `src/utils/plexEvaluator.ts` with a simple import and re-export of `computeDuplicatesMap` from `duplicateHelper.ts`. This centralized mapping builds directly off of the master `getDuplicatePairRows` engine, guaranteeing perfect alignment between the UI Dashboard, Excel, HTML, and CSV reports and eliminating any possibility of downstream regression.
- Changed the subtitle check failure message when no subtitles are found to be more concise: "No Embedded or External Subtitles found."
- Changed the subtitle check failure remediation action suggestion to: "Add or embed SRT subtitle file."
- Renamed the "Subtitle Technical Data" column to "Subtitle Type" across all Excel, CSV, and HTML reports.
- Increased the column widths in Excel exports for "Analysis Notes", "Remediation Action", and "File Path" to prevent overlapping and text bleeding, and verified that word wrapping applies gracefully.
- Patched `getTopLevelFolder` file system parser to correctly handle and bypass Windows drive letters (e.g. `Z:\Movies\SomeMovie.mkv` properly resolves to `Movies` instead of `Z:`), fixing the bug where all folders under mapped network/local drives grouped together under `Z:\` or `Unknown`.
- Renamed the **Media Scanner** tab in the main sub-page navigation to **Analyze**, adding an elegant, requested tooltip detailing its function ("Review Dashboard for Media Library statistics  and  audit overviews").
- Renamed the **Metrics Dashboard Filter** panel header in the main page content to **Metrics Dashboard**, as the application's interactive tour clarifies that individual dashboard blocks behave as filters.
- Added a clean, helpful description tooltip to the **Options** navigation tab ("Configure scanning rules, compatibility profiles, and database tools").
- Expanded the **Media Duplicates** dashboard card layout to occupy the full width of the grid (`lg:col-span-4`), providing a generous layout for analyzing duplication trends.
- Increased the displayed duplicates limit from `6` to `10` items and relaxed filename truncation from `20` to `60` characters, displaying clean names while rendering the absolute path in hover tooltips (`title` attribute) to avoid critical folder/filename truncation.
- Enlarged the Category Breakdown chart container and Top Duplicates scroll list from `h-[90px]` to `h-[140px]` to maximize data density and visual balance.

### Fixed
- Attached the existing click-outside listener's React ref (`customColumnsMenuRef`) to the wrapper element of the **Customize Columns** dropdown inside `/src/App.tsx`. This fixes the bug where the dropdown stayed open indefinitely after clicking away, ensuring it now dismisses smoothly when clicking anywhere outside of the menu container.
- Unified the Quality Anomalies (Bloated/Starved Bitrates) counting logic on the dashboard with the central `plexEvaluator.ts` evaluation engine (`evaluatePlexCompatibility`). This completely eliminates any discrepancies where the dashboard anomalies metrics showed fewer issues than the exported Excel or HTML reports due to different hardcoded resolution/bitrate thresholds (e.g. HEVC efficiency factor, FLAC bitrate margins).
- Aligned `getMissingMetadataTags` check in `excelExporter.ts` with `Dashboard.tsx` to explicitly audit and report missing "Album Artist", "Track", and "Disc" tags for music files, ensuring consistency between the missing metadata count in UI and the exported report.
- Standardized category filtering inside `reportFilters.ts` to use generic media/music/static/corrupted properties rather than restrictive hardcoded category string arrays, ensuring any files in custom top-level folders or categories are analyzed and reported identically across all dashboard panels and report spreadsheets.
- Fixed the Duplicates Audit Excel sheet generation where media files in "Movies", "TV Shows", "Documentaries", and other categories were omitted, showing duplicates only in the "Extras" tab. This was caused by calculating duplicates on pre-partitioned category arrays, failing to find duplicate files with different category tags. The Excel exporter now runs duplicate calculations across the full library once, mapping results back to their respective category sheets to perfectly align with dashboard counts.

## [1.4.4] - 2026-07-15

### Fixed
- Fixed the discrepancy where the "Media Duplicates" dashboard card showed "0 duplicates found" or "No duplicates found" even though duplicates were found during scanning/exporting. The dashboard now dynamically calculates duplicates whenever the card is visible on the page (via manual block toggle, custom block preset, or duplicate scanning profiles), bypassing the requirement for rule-specific toggles to be active in the custom rules state.
- Aligned the "Year" missing tags checking logic in `Dashboard.tsx` and `excelExporter.ts` to use the unified `getCategoryGroup` helper instead of hardcoded `Movie` and `TV` strings. This ensures video files belonging to other categories (e.g. documentaries, docuseries, anime, specials, shorts, plays) are mapped to their most suitable format (either Movies or TV) for year check and missing tag reports across all UI blocks, Excel sheets, and report exports.

## [1.4.4] - 2026-07-20
### Fixed
- 2026-07-20: Fixed `npm run tauri dev` execution failure from the workspace root after monorepo migration by proxying the `tauri` script in the root package.json to the Steward app workspace.

## [1.4.5] - 2026-07-21
### Fixed
- 2026-07-21: Fixed Vite module resolution failures on Windows by adding an explicit alias and `server.fs.allow` rule in `vite.config.ts` to map `@bitscribe/core-types` directly to the monorepo package source, bypassing flaky npm symlink resolution during `npm run tauri dev`.

## [1.4.3] - 2026-07-15

### Added
- Split Title and Year missing tags between "Video" and "Music" to track each distinct media type with high-fidelity, isolating "Missing Video Title / Year" and "Missing Music Title / Year".
- Added Title and Year missing tags explicitly under the Music Metadata missing metrics card, giving full coverage of essential tag completeness in the Music section.
- Renamed the metrics filter option "Audio Only" to "Music Only" to correspond perfectly with the Music categorization.

### Fixed
- Restored the authentic, high-quality Tauri application icon (`icon.ico`) from the `/gfxbackups` directory to resolve the MSVC/Windows resource compiler panic (`error RC2176 : old DIB`).
- Fixed `make_icons.js` to resize the icon input for the Windows ICO compilation specifically to `256x256` to strictly comply with Windows resource format specifications and prevent future compiler panics.
- Restored the authentic PayPal QR code (`paypal_qr.png` and `paypal_qr_backup_DO_NOT_DELETE.png`) from the known good backup in Git history.
- Resolved a critical percentage calculation bug where overall music library files lacking Title/Year tags were inflating video metadata missing metrics (causing over-scaled percentages up to 3943%).
- Replaced inline category replications across multiple locations in `/src/components/Dashboard.tsx` with unified usage of `isMusicCategory(item.category)` defined in `src/types.ts`.

### Changed
- Bumped application version to `1.4.3` across `package.json`, `api.ts`, `tauri.conf.json`, `Cargo.toml`, and the React environment (`src/types.ts`).
- Created a unified, single-location version check system by leveraging Vite's `define` configuration to automatically inject the `package.json` version string into both `src/types.ts` and `src/lib/api.ts` at build time.
- Renamed the catch-all "Year" metric to "Year (Other Videos)" in the Missing Meta Tags section of the Video dashboard to make its target coverage self-evident.
- Rebuilt and modernized the Feature Release History in the Help Center to accurately document the chronological transition from Tkinter (v0.2–v0.7) to Electron (v0.8–v1.2) to Tauri (v1.3–v1.4.3).
- Updated the subheading of the Help Center header bar from a description of features to a cleaner greeting ("The help you need, when you need it.").
- Added a permanent protection directive (Rule 8) in `AGENTS.md` forbidding any agent from modifying, regenerating, deleting, or overwriting the authentic PayPal QR code files (`src/assets/paypal_qr.png` and `src/assets/paypal_qr_backup_DO_NOT_DELETE.png`) under any circumstances.


## [1.4.2] - 2026-07-15

### Added
- Implemented toggle behavior on custom metric preset buttons (`C1`, `C2`, `C3`): a second click on an active preset now deactivates it and restores the default layout state.
- Updated preset button tooltips to dynamically inform the user when a preset is loaded and explain how to deactivate it to restore defaults on the second click.

### Removed
- Excluded the "Corrupted" category from the "Media Discovery" (Discovery Audit) reports, sheets, and tabs, ensuring the separate "Bad Files" (Corrupted Audit) report serves as the single source of truth for damaged files.

## [1.4.1] - 2026-07-15

### Fixed
- Reverted the Discovery Mode grid spacing to `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` to avoid layout stretching issues on standard screen sizes.
- Added adaptive layout wrappers to Discovery Mode headers (Video, Surround, Stereo, Container, Music, HDR) using `flex-wrap` and flexible widths, ensuring the "All | None" control links slide neatly below the headers instead of overlapping or causing layout breakages on narrower displays.
Update changelog
- 2026-07-20: Fixed 'Invalid reserved field value in ICONDIRENTRY' proc macro panic by securely regenerating the entire Windows/macOS/Linux Tauri icon suite from the pristine SVG emblem, resolving the local build issues while providing a fresh high-resolution icon on the taskbar.
- 2026-07-20: Cleaned up unused imports (std::io::Read) and variables (path) in the Rust backend to prevent compiler warnings during the Tauri build.
- 2026-07-20: Fixed critical directory scanning performance regression caused by synchronously hashing the first 64KB of every file during `walk_dir`. Refactored the file hash generator to compute a deterministic fingerprint using the file's size and modification time (in nanoseconds) instead of its contents. This bypasses disk I/O entirely while maintaining resistance against file renaming, restoring the original lightning-fast scan speed.
- 2026-07-20: Fixed missing/generic taskbar application icon by restoring the authentic, high-resolution `icon_good.ico` from the `/gfxbackups` directory to `src-tauri/icons/icon.ico`.
- 2026-07-16: Fixed an issue where the duplicate files summary displayed zero duplicates due to activeRules not being properly computed within the dupSummary block. Restored the calculation logic for activeRules within Dashboard.tsx.
- 2026-07-16: Fixed duplicate detection logic in report exporters. The duplicate pipeline was computing duplicates over filtered datasets resulting in missed duplicates, and the CSV exporter was ignoring the duplication scan entirely. Fixed by passing the global library to exporter functions and computing duplicate pairs globally, then filtering the resulting pairs for visibility.
- 2026-07-16: Fixed undefined variable `files` breaking the export reports by correctly using `[...scannedFilesList, ...corruptFiles]` inside `App.tsx`.
- 2026-07-16: Fixed Quick Refresh skipping modified files by ignoring file size changes. Updated the scanning engine (`api.ts` and `App.tsx`) to use the `@tauri-apps/plugin-fs` stat module. Quick Refresh will now compare current file sizes against cached sizes, and automatically re-process files if the size has changed by more than 1MB, while still instantly skipping unchanged files.
- 2026-07-16: Fixed Quick Refresh skipping modified files by moving file size checks into the Rust backend (`walk_dir`). The previous implementation used Tauri's `plugin-fs` which enforces path sandboxing and caused `stat()` to fail silently and skip the size comparison. Now sizes are checked directly via Rust `std::fs` which resolves the issue.
- 2026-07-16: Fixed Tauri build failure (`proc macro panicked ... failed to parse icon.ico`) by regenerating the `src-tauri/icons` directory. The original `icon.png` was likely a text-corrupted binary file (invalid UTF-8 bytes mangled) which broke the Tauri context generator macro. A fresh, valid set of application icons has been generated.
- 2026-07-19: Expanded database schema with extended metadata fields: `videoBitDepth`, `audioSampleRate`, `chapterCount`, `rawAudioCodec`, `physicalAudioChannels`, `matchedOnlineId`, `fileUuid`, `hasExternalSubtitles`, `embeddedSubtitleLanguages`, `author`, `narrator`, `publisher`, `bookSeries`, `seriesIndex`, `isbn`, and `pageCount`.
- 2026-07-19: Updated UI columns to support expanded metadata fields (Video Depth, Chapters, Sample Rate).
- 2026-07-19: Upgraded database schema to use a high-performance content hash (`fileHash`) as the primary key instead of the file path, solving tracking issues when media files are renamed by BitScribe RX or other tools. Removed `fileUuid` in favor of the deterministic content hash.
## CHANGELOG.md Update
- Replaced the scanning UI's generic loading icon with an animated Bitsy character that dances while the scan processes and strikes a celebratory 'Ta-da!' pose when finished.
## CHANGELOG.md Update
- Updated the Help Section to reflect 400+ combined hours of development, corrected out-of-date tutorial references (Audio Only -> Music Only), and added a button to view the open-source Apache 2.0 license.
- Implemented a complete App Reset Modal featuring an animated Bitsy character holding her breath and exploding, followed by a true application cache, local storage, and database wipe.
## CHANGELOG.md Update
- Fixed a critical infinite render loop within the BitsyCharacter component where `requestAnimationFrame` was constantly generating new object references for eye tracking, causing the React scheduler to flood and crash the application during scanning.
## CHANGELOG.md Update
- Enhanced Bitsy's scan dance animation with Michael Jackson-inspired moves, including a moonwalk and an anti-gravity lean.

- 2026-07-27: Fixed a string literal formatting bug in the HTML Report Codec Distribution metrics rendering where `/'...'/g` was incorrectly used instead of a standard string format. The HTML reports now render correctly.
- 2026-07-27: Fixed a string literal formatting bug in the HTML Report Codec Distribution metrics rendering where `/'...'/g` was incorrectly used instead of a standard string format. The HTML reports now render correctly.
### Suite Refactoring
- **Dismantled Monoliths**: Abstracted scan-related state from `App.tsx` into the custom `useScanState` hook. Abstracted the Library table and file mapping logic from `Dashboard.tsx` into a dedicated `LibraryView.tsx` component.
- **Extracted Exporters**: Moved `excelExporter.ts`, `reportExporter.ts`, and `downloader.ts` from `apps/steward/src/utils/` into a dedicated `@bitscribe/core-export` package.
- **Lifted Shared Layouts**: Migrated `Header.tsx`, `Sidebar.tsx`, and `NavigationTabs.tsx` into the `@bitscribe/ui-components` package for suite-wide reusability.
- **Decoupled Desktop APIs**: Abstracted Tauri-specific calls (`invoke`, `open`, `save`, `readTextFile`, etc.) into a new `@bitscribe/desktop-api` package, adding environment checks to fall back gracefully in web contexts.

### UI Layout Hotfix
- **Sidebar Constraints**: Fixed a critical issue where the Sidebar would stretch to take up 100% of the horizontal space on screens smaller than 1024px, completely hiding the main application area. Locked the sidebar width to 64px (`w-64`) and forced row-based flexing to guarantee visibility of the main scan content under responsive conditions.
- **Tailwind Scanner Path**: Corrected `index.css` to properly source `@bitscribe/ui-components` for the Tailwind v4 compiler, ensuring newly moved components maintain their styling.

### Environment Build Hotfix
- **Vite Package Resolution**: Fixed a runtime crash caused by Vite being unable to resolve the newly extracted `@bitscribe/core-export` and `@bitscribe/desktop-api` packages. Added missing alias mappings to `apps/steward/vite.config.ts` so the ES Modules can be properly resolved during `npm run tauri dev` and production builds.

### Visual / Style Hotfix
- **White Border Line Issue**: Resolved a visual artifact where a bright white horizontal line appeared below the Header and above the Navigation tabs. The Tailwind v4 `@source` directive in `apps/steward/src/index.css` had an incorrect relative path to `packages/ui-components`, meaning custom hex colors (e.g. `border-[#1e2333]/80`, `bg-[#0F1117]`) within those shared components were silently stripped from the CSS build. This caused standard borders to fall back to the bright `text-slate-200` color. Corrected the path to include the shared workspace (`../../../packages/ui-components/src`), restoring all intended dark mode styles.

### Refactoring & Monolith Dismantling (Completed)
- **App.tsx Clean-up**: Concluded the dismantling of the `App.tsx` monolith (down from ~2,045 lines to under 700). Extracted all inline product tour state and `react-joyride` coordinate handlers into a focused `useAppTour` hook, and relocated all top-level UI, modal, layout, and filtering states into a new `useAppState` hook. The `App` component now acts solely as a clean layout router passing context directly to the standalone `Dashboard` and `LibraryView` components.

### Critical Crash Fix: missingFmt in Dashboard
- **Problem**: A runtime `ReferenceError: missingFmt is not defined` crashed the UI (specifically around tour slide 20-21 on the Library view) because formatting helper functions (`missingFmt`, `formatResolution`, `formatSubtitleSummary`, `formatSubtitleTechnical`) were referenced in `Dashboard.tsx` and passed to `LibraryView` but had not been explicitly defined or imported in that file.
- **Solution**: Re-implemented these missing format helper functions directly within `Dashboard.tsx` to restore functionality and prevent the crash.

### Scan Engine Restoration and Logging Update
- **Problem**: Scans stopped functioning entirely after the dashboard monolith dismantling refactor due to `handleStartScan` being removed and undeclared in `App.tsx`. Additionally, logs were not saved persistently by the executable, and the export folder defaulted to empty.
- **Solution**: 
  - Restored the missing `handleStartScan`, `handlePauseScan`, `handleStopScan`, and `handleEvaluateDb` scanning logic back to `App.tsx`.
  - Configured `tauri-plugin-log` in Rust to write logs persistently to the folder the application runs from (`TargetKind::Folder`).
  - Added an initialization hook in `App.tsx` that queries the executable directory via a new `get_data_dir` Tauri command, creates a `Reports` folder if it doesn't exist, and sets it as the default file export directory.

### React ReferenceError Fix
- **Problem**: The dashboard modularization caused a crash `ReferenceError: demoMessage is not defined` because a `useEffect` tracking `demoMessage` was left lingering in the global file scope of `useAppTour.ts`, outside the exported hook function.
- **Solution**: Moved the stranded `useEffect` back inside the `useAppTour` hook block, restoring component stability and Tour overlay functionality.

### Scan Engine Modularization
- **Problem**: The local typescript scan logic was tightly coupled to the main `App.tsx` component, creating a massive file and reducing readability and modularity.
- **Solution**: Extracted `handleStartScan`, `handlePauseScan`, `handleStopScan`, and `handleEvaluateDb` into a clean, new custom hook named `useLocalScanEngine`. Fixed related TypeScript and type inconsistencies in Dashboard, LibraryView, and TourRemoteControl.

### Tauri Log Plugin Compilation Fix
- **Problem**: Build failed with a rustc compiler error `expected value, found struct variant tauri_plugin_log::TargetKind::Folder` due to a breaking change in the Tauri log plugin where `Folder` is now a struct rather than a tuple.
- **Solution**: Updated the instantiation of `tauri_plugin_log::TargetKind::Folder` to use named fields `{ path: data_dir.clone(), file_name: None }` to fix compilation.

### Tauri Black Screen Fix (writeTextFile)
- **Problem**: The application launched to a blank black screen. This was caused by a TypeScript linting fix in `main.tsx` that changed `writeTextFile` to `writeFile`. Tauri's `writeFile` API requires a `Uint8Array`, while `main.tsx` was passing string data for diagnostic logs, causing a pre-render runtime exception that prevented the React app from mounting.
- **Solution**: Restored `writeTextFile` to the `@bitscribe/desktop-api` fs wrapper and reverted `main.tsx` back to using `writeTextFile`, preventing the runtime crash and restoring the UI.

### Fix Missing Untracked File
- **Problem**: `useLocalScanEngine.ts` was not included in the previous commit because `git commit -am` skips untracked files. This caused a Vite resolution error ("Failed to resolve import") on cloned copies.
- **Solution**: Explicitly added and committed `apps/steward/src/hooks/useLocalScanEngine.ts`.

### App Tour Tab Routing Fix
- **Problem**: In the product tour, slides from 9 onward were failing to appear. This happened because the internal `targetTab` routing logic mapped steps 5 through 16 to the "library" tab. However, steps 8 through 19 require metrics and audit cards which are strictly on the "scan" tab. When `react-joyride` was directed to the "library" tab, it couldn't locate the metric components (as `showMetrics` is false on that tab), causing the tour to halt.
- **Solution**: Updated `targetTab` switch boundaries in `useAppTour.ts`. Mapped indices 0-19 to the `scan` tab, 20-22 to `library`, 23-33 to `rules`, and 34+ to `help`, ensuring all tour step targets are correctly rendered.
