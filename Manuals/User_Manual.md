# BitScribe Steward - Comprehensive User Manual (v1.5.0)

## 1. Introduction and Philosophy
Welcome to BitScribe Steward, the premier Digital Media Library Suite. BitScribe Steward was created to solve a modern problem: digital hoarding without diagnostic insight. Whether you are a casual user with a messy hard drive, an audiophile looking for lossless audio, or a home theater enthusiast managing a dedicated Plex, Jellyfin, or Emby server, BitScribe acts as your "friendly digital librarian." 

**Core Design Intent:**
*   **Zero-Modification (Read-Only):** BitScribe Steward is designed to be completely safe. It reads your files, analyzes their structure, and presents reports. It will **never** rename, move, delete, or alter your media files. 
*   **Deep Diagnostics:** Using industry-standard probing (FFprobe), it inspects the actual metadata inside your files—not just the filenames. 
*   **Accessibility:** High-performance data analysis is paired with a warm, approachable graphical user interface (GUI) to make complex technical data easy to digest.

---

## 2. Navigating the Interface (The 5 Dashboards)

BitScribe Steward is built around five main dashboards. This section meticulously covers every function available in each.

### 2.1 Media Scan & Report Export
This dashboard is the starting point and the final step of your workflow.

**The Scan Queue:**
*   **Adding Directories:** You can add one or multiple top-level directories (e.g., `D:\Movies`, `E:\TV Shows`). BitScribe processes these sequentially and concurrently.
*   **Execution:** When you click "Start Scan," BitScribe begins traversing the directories. It safely skips system folders (like macOS `__MACOSX` or `._` hidden files) and non-media files, focusing purely on recognized video and audio extensions.
*   **Progress Tracking:** The UI provides real-time feedback on the number of files scanned, corrupted files encountered, and time elapsed.

**Exporting Reports:**
Once a scan concludes, you are not locked into the application. You can export your data in several highly formatted ways:
*   **Excel Spreadsheet (`.xlsx`):** Generates a multi-sheet, beautifully formatted, and color-coded Excel file. Ideal for printing, sharing with less technical family members, or manual review. Empty reports (e.g., 0 corrupted files) are still generated to confidently show a clean bill of health.
*   **Interactive Web Report (`.html`):** Generates a standalone, portable HTML file that contains a deeply interactive grid and charts. You can email this to a friend, and they can search and filter your library in their web browser without installing BitScribe.
*   **CSV & JSON:** Generates raw, unformatted data dumps. Ideal for power users wanting to ingest their library metadata into custom Python scripts, SQL databases, or other external tools.

### 2.2 Analyze Dashboard
The Analyze Dashboard is your macro-level command center. It provides a visual snapshot of your library's overall health and distribution.

*   **Categorical Breakdowns:** Donut charts and bar graphs show the distribution of your media (Movies vs. TV Shows vs. Audio). 
*   **Codec & Resolution Charts:** Instantly see how much of your library is legacy `H.264` versus modern `HEVC`, or how many 1080p files you have compared to 4K.
*   **The Duplicate Hunter:** This is one of BitScribe's most powerful features. 
    *   *Video Duplicates:* It ignores confusing file naming schemes and looks at structural metrics (duration, resolution, categories) to group files that are likely the exact same movie or show episode, allowing you to easily identify that you accidentally kept both a 720p and a 4K copy.
    *   *Audio Duplicates:* Cross-references title, artist, and track length to group duplicate songs.
*   **Health Alerts (Anomalies):**
    *   *Corrupted Files:* Files that fail the FFprobe scan. These are usually incomplete downloads, 0-byte files, or severely corrupted video headers that will crash media players.
    *   *Bitrate Anomalies:* Identifies media that is inefficiently encoded (e.g., a massive file size for a low resolution) or dangerously compressed (e.g., a 4K movie with a bitrate so low it will look like pixelated mush).
*   **Folder Clutter Toggle:** A UI option that allows you to group metrics by your top-level root folders rather than seeing hundreds of individual subfolders, keeping the charts readable.

### 2.3 Library Dashboard
The Library dashboard is the micro-level view, offering a granular, searchable grid of every single file parsed during the scan.

*   **Performance:** Built to handle tens of thousands of files without stuttering. Typing in the search bar instantly filters the grid without UI lag.
*   **Advanced Filtering:** Toggle switches allow you to instantly filter by:
    *   Media Category (Movies, TV, Audio, Unknown).
    *   Anomaly Status (Show only corrupted, or only duplicates).
    *   Streaming Compatibility (Show only files that will force your server to transcode).
*   **Metadata Grid Columns:**
    *   *Basic Info:* Filename, Path, Size (GB), Duration.
    *   *Video Specs:* Container (MP4, MKV), Video Codec, Resolution, Bitrate, Bit Depth, Frame Rate.
    *   *Audio Specs:* Audio Tracks, Channels, Raw Audio Codec, Audio Sample Rate.
    *   *Subtitle Specs:* BitScribe detects both embedded subtitle tracks (inside the MKV/MP4) and external subtitles (e.g., a `.srt` file sitting next to the video file).
*   **Direct Play Indicators:** Each file receives a compatibility badge (e.g., Stream Friendly, Transcode Required) based on your hardware rules.

### 2.4 Options Dashboard (Rules Engine)
The Options Dashboard is what makes BitScribe Steward a true "Steward." This is where you teach the app about your specific hardware capabilities (like your Smart TV, Apple TV, or Roku).

*   **Hardware Compatibility Rules:** Not all TVs can play all files. If a TV cannot play a file, a home server (like Plex) has to "transcode" it, which burns massive CPU power. You can configure:
    *   *Maximum Video Resolution:* (e.g., cap at 1080p or allow 4K).
    *   *Maximum Video Bitrate:* (e.g., cap at 20 Mbps for slower Wi-Fi networks).
    *   *Allowed Video Codecs:* (e.g., enforce modern `HEVC` or allow legacy `H.264`).
    *   *Maximum Audio Channels:* (e.g., 2.0 Stereo vs. 7.1 Surround).
*   **Dynamic Re-evaluation:** This is a crucial power-user feature. When you change a rule in the Options Dashboard, you **do not** need to rescan your hard drives. The app instantly re-evaluates all 20,000+ files in memory and updates their compatibility scores in the Library and Analyze tabs in real-time.
*   **Default Presets:** If you aren't sure what your hardware supports, BitScribe offers built-in default presets for "Older Hardware," "Standard Modern Setup," and "Bleeding Edge (Enthusiast)."

### 2.5 Help Dashboard
An integrated knowledge base designed to bridge the gap between technical jargon and everyday understanding.
*   **Terminology Guide:** Detailed, plain-English explanations of terms like "Container," "Codec," "Transcoding," "Bitrate," and "Direct Play."
*   **Feature Tutorials:** In-app explanations of how to read the charts and effectively utilize the export tools.

---

## 3. Stewardship Workflows (Power User Scenarios)

### Scenario A: Achieving 100% Direct Play on Plex
1. Go to the **Options Dashboard**. Set your rules to match your weakest playback device (e.g., an older Roku stick that only supports 1080p, H.264, and Stereo audio).
2. Run a scan on your media directory in the **Media Scan Dashboard**.
3. Go to the **Library Dashboard** and click the filter for "Transcode Required".
4. You now have an exact list of every file that will strain your Plex server. You can export this list to CSV, send it to your video converter of choice (like Handbrake), and replace the incompatible files.

### Scenario B: Recovering Wasted Disk Space
1. Run a complete library scan.
2. Open the **Analyze Dashboard** and review the **Duplicate Hunter** module.
3. Review the flagged duplicates. Often, you will find you have both a 720p WEB-DL and a 1080p BluRay rip of the same film. 
4. Note the file paths provided by BitScribe, navigate to them in your operating system's file explorer, and manually delete the lower-quality versions to recover terabytes of wasted space.
5. Review the **Bitrate Anomalies** module to find files that are excessively large for their resolution (e.g., a 1080p file that is 30GB), indicating poor encoding practices that are eating up your storage.

### Scenario C: Auditing Subtitle Completeness
1. Perform a scan of your foreign film or anime collection.
2. Go to the **Library Dashboard**.
3. Check the "Subtitle Tracks" column. You can instantly see which files have embedded subtitles and which ones have an external `.srt` matched to them. 
4. If a file is lacking both, you know you need to go out and acquire a subtitle file for that specific media.
