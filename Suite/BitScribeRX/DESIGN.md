# BitScribeRX Design Document

## Overview
BitScribeRX is a companion application (or major functional module) in the BitScribe suite, designed to execute actionable operations based on the metadata and insights gathered by BitScribe Steward. While Steward handles the scanning, parsing, and storing of metadata, BitScribeRX acts upon that data to organize, rename, and clean up the user's files and folders.

## GUI & Layout Philosophy
The UI should maintain the aesthetic language of the Steward app (dark, modern, Tailwind-based, clean layout) but reorganized to emphasize task execution and batch processing.

### Layout Structure
- **Top Header:** 
  - Left: **Mode Dropdown** to easily switch between different functional modes (e.g., File Renamer, Metadata Editor).
  - Center: **BitScribeRX Logo**.
  - Right: **Global Settings & Progress Indicators** (e.g., Queue status, processing progress).
- **Left Column (Scope & Task Configuration):**
  - **Data Scope / Pre-load:** Controls to restrict which subset of data is loaded into the workspace (e.g., "Only TV Shows", "Only items starting with D"). This ensures the app handles large libraries gracefully and keeps the user focused.
  - **Task Configuration:** Specific settings for the active mode. For the File Renamer, this includes selecting presets, building custom naming patterns, and setting confidence thresholds for execution.
- **Right Column (Target Selection & Live Preview):**
  - **Hierarchical Library View:** A collapsible tree-view (Series -> Season -> Episodes) allowing users to select or deselect items at any level (single file, whole season, whole series).
  - **Live Preview:** Displays the original state (e.g., current filename) alongside the proposed state (e.g., new filename) so the user can verify changes before committing them.
  - **Inline Editing:** Certain modes (like Metadata Editor) will support inline manual editing directly in the grid, saving corrections to the DB for later use in renaming/organizing.

## First Core Feature: File Renamer
The initial feature focus is the File Renamer, aiming to safely and intelligently rename media files using Steward's database.

### Key Capabilities
- **Confidence Levels:** Evaluates the safety and accuracy of a proposed rename.
  - *High Confidence:* All required tokens (Season, Episode, Title, etc.) are present and parsed accurately.
  - *Medium/Low Confidence:* Missing data (e.g., missing Video Codec in DB) or unable to parse season/episode.
- **Naming Presets & Customization:**
  - Built-in presets (e.g., Standard Plex/Jellyfin naming, Minimalist, Data Hoarder).
  - Custom format builder allowing users to insert tokens derived from paths (e.g., `{Season}`, `{Episode}`) and tokens sourced from Steward's DB (e.g., `{Resolution}`, `{VideoCodec}`).
- **Batch Processing:** Ability to execute renames across the selected, scoped dataset with a single action, prioritizing high-confidence items if configured to do so.

## Future Operations
- **Library Reorganization:** Moving files into proper folder structures based on metadata.
- **Automated Metadata Collection:** Fetching accurate metadata from external sources (TMDB, TVDB, etc.) to enrich the database for even better renaming and organizing.
- **Metadata Editing:** Manual correction of release groups, titles, or other tags that Steward couldn't parse perfectly.

