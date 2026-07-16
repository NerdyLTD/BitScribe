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
- 2026-07-16: Fixed an issue where the duplicate files summary displayed zero duplicates due to activeRules not being properly computed within the dupSummary block. Restored the calculation logic for activeRules within Dashboard.tsx.
- 2026-07-16: Fixed duplicate detection logic in report exporters. The duplicate pipeline was computing duplicates over filtered datasets resulting in missed duplicates, and the CSV exporter was ignoring the duplication scan entirely. Fixed by passing the global library to exporter functions and computing duplicate pairs globally, then filtering the resulting pairs for visibility.
