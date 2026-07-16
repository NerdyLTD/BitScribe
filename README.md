<div align="center">
  <img src="public/BitScribe_Logo_Full_Transparent.png" alt="BitScribe Logo" width="600" />

  # Welcome to BitScribe DMLS
  
  **Your Friendly Digital Media Library Steward**
  
  *Make sense of your digital media collection, whether you're a seasoned archivist, an audiophile, or just someone looking to get their digital life in order!*

  <p align="center">
    <a href="#-who-is-this-for">Who Is This For?</a> •
    <a href="#-what-does-it-do">What Does It Do?</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-key-features">Key Features</a>
  </p>
</div>

---

## 👋 Hello and Welcome!

Do you have hard drives full of movies, TV shows, and music, but no idea what format they're in? Do you wonder if you have three copies of the same home video taking up precious space? Or maybe you're setting up a home media server (like Plex or Jellyfin) and want to make sure your movies will play smoothly on your TV without stuttering? 

**You are in the right place.**

**BitScribe DMLS** (Digital Media Library Steward) is here to help you audit, catalog, and understand your media. We designed this tool to be incredibly powerful for sysadmins, yet warm, approachable, and easy to use for anyone who simply wants to get a handle on their digital media.

Think of BitScribe as a friendly librarian who patiently goes through every file on your hard drives, reads the labels, checks for damages, looks for duplicates, and hands you a beautifully organized report.

---

## 🎯 Who is this for?

Whether you're deeply technical or just organizing a messy hard drive, BitScribe adapts to your needs:

- **The Everyday Organizer:** Find duplicate movies and songs, save hard drive space, and finally get a complete list of everything you own.
- **Home Theater Enthusiasts:** Ensure your files have the right video formats (like `HEVC` or `H.264`) and audio tracks (like `Surround Sound` or `TrueHD`) to play beautifully on your TV.
- **Audiophiles:** Easily hunt down low-quality MP3s so you can upgrade them to crisp, lossless formats like FLAC.
- **Server Admins (Plex/Jellyfin/Emby):** Prevent your server from working too hard! BitScribe highlights files that would force your server to transcode, helping you optimize for Direct Play.

---

## ✨ What Does It Do?

BitScribe runs specialized (but totally safe!) scans on your media folders. It **never deletes or modifies your files**—it just reads them and gives you insights. 

Here are the superpowers it brings to your collection:

### 📺 1. Streaming Compatibility Check
Ever try to play a video and it keeps pausing to buffer? BitScribe checks your movies to see if they're in modern, efficient formats that stream smoothly to smart TVs and mobile devices. 

### 🧹 2. The Duplicate Hunter
We all accidentally save things twice. 
- **For Video:** It looks past confusing file names to find actual duplicates (like having both a 4K and a 1080p version of the same movie). 
- **For Music:** It checks song titles, artists, and track lengths to find hidden duplicate audio files.

### 🩺 3. Health & Anomaly Scan
Is a file corrupted and unplayable? Is a song taking up way too much space for its quality? BitScribe flags these anomalies so you can fix or replace them.

### 📝 4. Subtitle Detective
If you rely on subtitles, BitScribe can scan your library to ensure your videos either have built-in subtitles or the correct companion `.srt` files sitting right next to them.

---

## 🎛️ Your Command Center

When you open BitScribe, you get five beautiful, easy-to-use workspaces:

1. **📊 Scan Dashboard:** A beautiful visual overview with charts and immediate alerts for duplicates or broken files.
2. **📚 Library Registry:** A highly searchable, sortable list of every single piece of media you scanned.
3. **⚙️ Rules Editor:** Want to tell BitScribe exactly what to look for? Use simple toggles to adjust what counts as "good" or "bad" media.
4. **💬 Help Hub:** A friendly guide explaining technical terms (like "transcoding" or "bitrate") in plain English.
5. **💻 Logs Terminal:** For the technical folks, a real-time stream showing exactly what the engine is reading.

---

## 📤 Beautiful, Shareable Reports

Once your scan is done, you aren't trapped in the app! You can export your results in ways that make sense for you:
- **Excel Spreadsheets:** Beautifully formatted, color-coded sheets that are ready to print or share.
- **Interactive Web Reports:** A standalone web page you can save and open anywhere, complete with charts and a searchable grid.
- **Raw Data (CSV/JSON):** Perfect for power users who want to plug their data into other tools.

---

## 🚀 Getting Started

BitScribe runs on your own computer, keeping your library data completely private. 

### What you need:
- [Node.js](https://nodejs.org/) installed on your computer.

### Quick Start (Web Mode):
1. **Install the engine:**
   ```bash
   npm install
   ```
2. **Start the app:**
   ```bash
   npm run dev
   ```
3. **Open your browser:** Go to `http://localhost:3000` and start exploring your library!

### Desktop App Mode:
Prefer a standalone app on your computer? Run this command:
```bash
npm run electron:start
```

---

<div align="center">
  <i>Built with ❤️ using React 19, Vite, and Tailwind CSS.</i><br>
  <b>License:</b> Apache-2.0
</div>
