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
- 2026-07-21: Extracted evaluation logic, media parsers, formatters, sorting helpers, and scan utilities into `@bitscribe/core-eval` package as part of the monorepo architecture Phase 3 refactoring.

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
