# BitScribe Steward - User Manual

## 1. Introduction
BitScribe Steward is a powerful Digital Media Library Suite designed to audit, catalog, and diagnose your digital media collection. It provides deep insights into file formats, codecs, streaming compatibility, and library health—all through a warm, approachable graphical user interface (GUI). BitScribe is strictly read-only; it will never modify or delete your files.

---

## 2. Dashboards Overview

BitScribe's interface is divided into five distinct dashboards, accessible via the main navigation menu.

### 2.1 Media Scan & Report Export
This is the command center for ingesting data and exporting results.

*   **Scan Queue Management**: Add or remove root folders (e.g., your "Movies" or "Music" drives). 
*   **Scanning Engine**: Initiate the scanning process. The app displays real-time progress as it traverses your directories, skipping hidden files and non-media formats.
*   **Export Tools**: After a scan, export your entire library metadata. Available formats include:
    *   **Excel**: A richly formatted, color-coded spreadsheet ideal for printing or sharing.
    *   **HTML**: A standalone, interactive web report with built-in sorting and charts.
    *   **CSV / JSON**: Raw data dumps for power users looking to integrate with external databases or scripts.

### 2.2 Analyze
The Analyze dashboard provides a macro-level visual overview of your library's health.

*   **Visual Charts**: View distributions of your media by category (Movies, TV Shows, Audio), codecs, and resolutions.
*   **Health Alerts**: Instantly spot issues like corrupted files that failed to probe, or files with extreme bitrate anomalies.
*   **Duplicate Hunter**: Visually identify redundant files (e.g., a 1080p and 4K version of the same film).
*   **Folder Clutter Toggle**: View metrics grouped by your top-level scan paths, keeping the dashboard clean and focused.

### 2.3 Library
The Library dashboard is a comprehensive, granular grid view of every file in your collection.

*   **Search and Filter**: Instantly search for specific titles. Use the advanced filtering toggles to narrow down the view by category, anomaly presence, or streaming compatibility.
*   **Metadata Grid**: Review specific technical details for each file, including Container, Video Codec, Audio Tracks, Subtitles, Duration, and Size.
*   **Streaming Compatibility Flags**: See at a glance whether a file is optimized for Direct Play or if it will require transcoding on your home media server.

### 2.4 Options
The Options dashboard is where you tailor BitScribe to your specific hardware ecosystem.

*   **Compatibility Toggles**: Define the boundaries of "Stream Friendly" media. You can adjust acceptable maximum bitrates, preferred video codecs (e.g., HEVC, H.264), and max resolutions (e.g., 1080p vs 4K).
*   **Dynamic Re-evaluation**: Changing these rules instantly updates the compatibility scores across your Library and Analyze dashboards without requiring a rescan.
*   **Presets**: Use built-in default profiles covering older hardware, standard modern setups, or bleeding-edge compatibility.

### 2.5 Help
The Help dashboard serves as your in-app manual.

*   **Terminology Guide**: Explains technical jargon like "Transcoding," "Bitrate," and "Containers" in plain English.
*   **Tutorials**: Step-by-step guides for utilizing specific features of the application.

---

## 3. Core Capabilities

### 3.1 Streaming Compatibility Check
For users of Plex, Jellyfin, or Emby, BitScribe acts as a pre-flight checklist. By evaluating files against your hardware rules (set in the Options tab), it identifies media that will force your server to transcode. Optimizing your library for Direct Play saves CPU power and prevents buffering.

### 3.2 The Duplicate Hunter
BitScribe goes beyond simple filename matching:
*   **Video**: Matches structural similarities to group different versions of the same movie.
*   **Audio**: Cross-references metadata like song title, artist, and track length to find redundant music files, saving drive space.

### 3.3 Health & Anomaly Scan
*   **Corrupted Files**: Identifies files that are broken, unreadable, or missing critical header information.
*   **Bitrate Anomalies**: Flags files that are unusually large for their quality, or dangerously compressed, helping you prune inefficient media.

### 3.4 Subtitle Detective
BitScribe audits your subtitle accessibility. It checks if video files contain embedded subtitle tracks or if they are accompanied by valid external subtitle files (e.g., `.srt`) in the same directory.
