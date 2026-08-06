# BitScribe Steward - Technical Reference

This document serves as the foundation for the BitScribe suite, detailing the data structures, architectural patterns, and visual identity of **BitScribe Steward**. When developing **BitScribe RX**, this reference must be strictly followed to ensure absolute parity, shared visual identity, and safe bi-directional database synchronization.

---

## 1. Core Data Model & SQLite Schema

BitScribe Steward uses a local SQLite database (`BitScribeDB.sqlite`) to store the results of deep `ffprobe` media scans.

### Current Schema (`scanned_files` table)
- `id` (TEXT PRIMARY KEY) - Currently maps to `filePath`. *(Note: Requires refactor for RX compatibility).*
- `filename` (TEXT)
- `filePath` (TEXT)
- `topLevelFolder` (TEXT)
- `category` (TEXT) - e.g., 'Movie', 'TV Show', 'Music', 'Corrupted'
- `container` (TEXT) - e.g., 'matroska,webm', 'mov,mp4,m4a,3gp'
- `sizeGB` (REAL)
- `durationMins` (REAL)
- `year` (INTEGER)
- `videoCodec` (TEXT)
- `videoResolution` (TEXT)
- `videoBitrateMbps` (REAL)
- `audioTracks` (TEXT) - JSON string array/object of audio streams
- `subtitleTracks` (TEXT) - JSON string array/object of subtitle streams
- `tags` (TEXT) - JSON string of metadata tags
- `audioBitrate` (REAL)
- `isCorrupted` (INTEGER) - 0 or 1
- `errorMessage` (TEXT)
- `hasEmbeddedPoster` (INTEGER) - 0 or 1
- `bitrateAnomaly` (INTEGER) - 0 or 1
- `bitrateAnomalyReason` (TEXT)
- `streamFriendlyLevel` (TEXT)
- `streamFriendlyReason` (TEXT)
- `streamFriendlySuggestion` (TEXT)
- `streamFriendlyEvaluated` (INTEGER)
- `createdAt` (DATETIME)

### Data Limitations & RX Wishlist Gaps
To fully support the RemediationApp (BitScribe RX) Wishlist, the schema currently lacks:
1. **Persistent Hash Identity**: `id` is currently the physical file path. This breaks as soon as RX renames or moves a file. We must implement a `file_hash` (e.g., fast xxHash or 1MB header hash) to persist identity across path mutations.
2. **Online Match Keys**: Missing `matched_online_id` to store TMDB/IMDB references after scraper interception.
3. **External Subtitle Awareness**: Missing `has_external_subtitles` (Steward currently only probes embedded subtitles, not sidecar `.srt` files).

---

## 2. Media Evaluation Engine (Plex Compatibility)

Steward evaluates files for Plex/Streaming compatibility. BitScribe RX should read the results of this evaluator to determine its remediation actions (like Mono-to-Stereo up-transcoding).

* **Evaluator Script:** `src/utils/plexEvaluator.ts`
* **Stream Friendly Levels:** `Perfect`, `Good`, `Acceptable`, `Requires Transcoding`, `Incompatible`
* **Bitrate Anomalies:** Evaluated based on resolution-to-bitrate ratios (e.g., 1080p should not be under 1.5 Mbps, or excessively high).

---

## 3. Visual Identity (Tailwind CSS + Lucide Icons)

BitScribe RX must strictly inherit the visual styling of Steward. No new themes should be introduced without parity.

### Color Palette (Dark Theme)
- **Backgrounds:** Deep slate/charcoal (e.g., `bg-[#0F1117]`, `bg-[#14171F]`)
- **Borders:** Subtle slate borders (e.g., `border-[#1e232e]`)
- **Accents:** 
  - Brand/Primary: Blue (`text-blue-500`, `bg-blue-600`)
  - Success: Emerald (`text-emerald-400`, `text-emerald-500`)
  - Warning: Amber (`text-amber-400`)
  - Error: Rose (`text-rose-400`, `text-rose-500`)
- **Typography:**
  - Base text: Slate variants (`text-slate-100`, `text-slate-300`, `text-slate-400`)
  - Mono-spaced elements: `font-mono text-[10px]` to `text-xs` for technical metadata (bitrates, file paths).

### UI Patterns
- **Glass/Shadow Elements:** Extensive use of `shadow-lg`, `shadow-inner`, and soft drop shadows to create depth on dark backgrounds.
- **Icons:** Exclusively uses `lucide-react` for all iconography.

---

## 4. Environment & Backend Architecture

- **Backend:** Node.js (Express) compiled to a single `.cjs` bundle.
- **Frontend:** React + Vite, packaged with Electron.
- **Binary Dependencies:** `ffprobe-static` handles media analysis. *Crucial:* In packaged Electron modes (`asar`), binary paths are carefully re-mapped to avoid pathing errors inside the read-only archive. RX will need equivalent path handling for FFmpeg when performing remediation (remuxing/transcoding).
- **Network:** Express API runs on port 3000 locally. IPC and data flow happen strictly via JSON API endpoints (e.g., `/api/scan`, `/api/diagnostic`).

## 5. Recent Database Updates for RX Parity

As part of the lockstep development preparation, the `BitScribeDB.sqlite` schema in Steward has been natively updated to support the RX wishlist features. 
The following columns have been added and are protected by `ON CONFLICT(id) DO UPDATE SET` clauses so Steward will not overwrite RX's enhancements:

- `fileHash` (TEXT): For persistent identity tracking across file renames (Feature 4/5/6).
- `matchedOnlineId` (TEXT): To store TMDB/IMDB references upon metadata matching (Feature 1).
- `hasExternalSubtitles` (INTEGER): Flag for sidecar `.srt` detection (Feature 7).
- `embeddedSubtitleLanguages` (TEXT): Track internal subtitle streams.
- `rawAudioCodec` (TEXT) & `physicalAudioChannels` (INTEGER): For audio remux and Mono-to-Stereo up-transcoding detection (Features 2 & 3).
