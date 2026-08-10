<div align="center">
  <img src="docs/assets/BitScribe_Logo_Full_Transparent.svg" alt="BitScribe Logo" width="600" />
  
  # Welcome to BitScribe Steward
  
  **Your Digital Media Library Suite**

  [Official Website](https://www.bitscribe.app)
  
  *Make sense of your digital media collection, whether you're a seasoned archivist, an audiophile, or just someone looking to get their digital life in order!*

  <p align="center">
    <a href="#-who-is-this-for">Who Is This For?</a> •
    <a href="#-what-does-it-do">What Does It Do?</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-key-features">Key Features</a>
  </p>
</div>

---

<div align="center">
  <img src="docs/assets/Library%20Page.jpg" alt="BitScribe Library Interface" width="800" />
</div>

## 👋 Hello and Welcome!

Do you have drives full of movies, TV shows, and music, but no idea what format they're in? Do you wonder if you have three copies of the same video or song taking up precious space? Or maybe you're setting up a home media server (like Plex or Jellyfin) and want to make sure your movies will play smoothly on your TV without stuttering? **You are in the right place.**

**BitScribe Digital Media Library Steward** is here to help you audit, catalog, and understand your media. We designed this tool to be incredibly powerful, yet warm, approachable, and easy to use for anyone who simply wants to get a handle on their digital media. It's very easy to use, but also a very powerful data gathering and diagnostic tool for your movies, shows and music.

Think of BitScribe as a friendly librarian who patiently checks every file, reads the labels, checks for damages, looks for duplicates, and hands you a beautifully organized report.

---

## 🎯 Who is this for?

Whether you're deeply technical or just organizing a messy drive, BitScribe adapts to your needs:

- **The Everyday Organizer:** Find duplicate movies and songs, save drive space, and finally get a complete list of everything you own.
- **Home Theater Enthusiasts:** Ensure your files are in the right video formats (like `HEVC` or `H.264`) and audio tracks (like `Surround Sound` or `TrueHD`) to play beautifully on your TV, streaming stick or game console.
- **Audiophiles:** Easily find low-quality MP3s so you can upgrade them to crisp, lossless formats like FLAC.
- **Server Admins (Plex/Jellyfin/Emby):** Stop your server from working overtime! BitScribe highlights files that could force your server to transcode, helping you optimize for Direct Play.

---

## ✨ What Does It Do?

BitScribe runs specialized (but totally safe!) scans on your media folders. It **never deletes or modifies your files**—it just reads them and gives you insights. Here are the superpowers it brings to your collection:

### 📺 1. Streaming Compatibility Check
Ever try to play a video and it keeps pausing to buffer? BitScribe checks your movies to see if they're in modern, efficient formats that stream smoothly to smart TVs and mobile devices. 
<div align="center"><img src="docs/assets/Analyze%20Page.jpg" width="600" /></div>

### 🧹 2. The Duplicate Hunter
We all accidentally save things twice. Or three times. 
- **For Video:** It looks past confusing file names to find actual duplicates (like having both a 4K and a 1080p version of the same movie). 
- **For Music:** It checks song titles, artists, and track lengths to find hidden duplicate audio files.
<div align="center"><img src="docs/assets/Duplicates-Block-Dashboard.jpg" width="600" /></div>

### 🩺 3. Health & Anomaly Scan
Is a file corrupted and unplayable? Is a song taking up way too much space for its quality? BitScribe flags these anomalies so you can fix or replace them.

### 📝 4. Subtitle Detective
If you rely on subtitles, BitScribe can scan your library to ensure your videos either have built-in subtitles or the correct companion `.srt` files sitting right next to them.

---

## 🎛️ Your Command Center

When you open BitScribe, you get five beautiful, easy-to-use Dashboards:

1. **💻 Media Scan & Report Export:** Tools to queue up your media folders for a deep scan. When it's done.
2. **📊 Analyze:** A beautiful visual overview with charts and immediate alerts for duplicates or broken files. See only what you want with easy toggles to turn off clutter.
<div align="center"><img src="docs/assets/Media%20Scanner.jpg" width="600" /></div>
3. **📚 Library:** A highly searchable, sortable list of every single piece of media you scanned.
4. **⚙️ Options:** Want to tell BitScribe exactly what to look for? Use simple toggles to adjust what counts as "good" or "bad" media for YOUR devices. If you're not sure, BitScribe Steward includes basic defaults covering older, newer and bleeding edge hardware compatibility types.
<div align="center"><img src="docs/assets/Options%20Page.jpg" width="600" /></div>
5. **💬 Help:** A friendly guide explaining technical terms (like "transcoding" or "bitrate") in plain English with tutorials on specific features.
<div align="center"><img src="docs/assets/Help%20Page.jpg" width="600" /></div>

---

## 📤 Beautiful, Shareable Reports

Once your scan is done, you aren't trapped in the app! You can export your results in ways that make sense for you:

- **Excel Spreadsheets:** Beautifully formatted, color-coded sheets that are ready to review, print or share.
<div align="center"><img src="docs/assets/BitScribe%20Metadata%20Excel%20Report%20Overview.jpg" width="600" /></div>
- **Interactive Web Reports:** A standalone web page you can save and open anywhere, complete with charts and a searchable grid.
- **Raw Data (CSV/JSON):** Perfect for power users who want to plug their data into other tools.
<div align="center"><img src="docs/assets/Export%20Block.jpg" width="600" /></div>

---

<div align="center">
  <i>Built with ❤️ using React 19, Vite, Tauri and Tailwind CSS.</i><br>
  <b>License:</b> Apache-2.0
</div>
