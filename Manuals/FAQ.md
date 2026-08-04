# BitScribe Steward - FAQ (Wiki)

## General

**What is BitScribe Steward?**
BitScribe Steward is a Digital Media Library Suite designed to help you audit, catalog, and understand your media collection. It scans your folders and provides detailed insights into video formats, audio codecs, potential playback issues, and hidden duplicates.

**Does BitScribe modify or delete my files?**
No! BitScribe operates strictly in a read-only capacity. It scans your files and reads their metadata without ever altering, renaming, or deleting the actual media files on your drives.

**What operating systems are supported?**
BitScribe Steward supports Windows and macOS (including native Apple Silicon support).

## Features & Capabilities

**How does the Duplicate Hunter work?**
The Duplicate Hunter uses advanced heuristics to find duplicates. For video files, it looks past confusing file names and compares structural metadata to find instances where you might have multiple versions of the same movie (e.g., a 4K copy and a 1080p copy). For music, it cross-references song titles, artists, and track lengths to identify duplicate audio files.

**What is the Streaming Compatibility Check?**
If you run a home media server like Plex, Jellyfin, or Emby, playing incompatible formats causes your server to "transcode" (convert) the video on the fly, which strains the CPU. The Streaming Compatibility Check analyzes codecs (like HEVC, H.264) and audio tracks to tell you if a file will "Direct Play" smoothly on your TV or streaming stick.

**Can it detect corrupted files?**
Yes. BitScribe flags anomalies and corrupted files that fail to probe properly, helping you identify media that might be unplayable.

**How does Subtitle Detective work?**
BitScribe checks your video files to see if they have built-in (embedded) subtitles, or if they have an accompanying external subtitle file (like a `.srt` file) in the same directory.

## Usage & Interface

**What export options are available?**
You can export your scan results directly from the Media Scan dashboard. Supported formats include:
*   **Excel Spreadsheets**: Formatted, color-coded sheets.
*   **Interactive Web Reports (HTML)**: A standalone web page with charts and a searchable grid.
*   **CSV & JSON**: Raw data formats for power users.

**What can I do in the Analyze Dashboard?**
The Analyze Dashboard provides a beautiful visual overview of your library with charts. It highlights immediate alerts for duplicates, corrupted files, and bitrate anomalies. You can easily toggle clutter to see exactly what needs your attention.

**Can I customize what counts as "compatible" media?**
Yes! In the **Options** dashboard, you can adjust the hardware compatibility rules. You can define what bitrates, resolutions, and codecs match your specific devices. If you aren't sure, the app provides standard default presets.
