export const ALL_POSSIBLE_HEADERS = [
    "Alert Level",
    "Stream Audit",
    "Container",
    "Video Codec",
    "Resolution",
    "Frame Rate",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    "Subtitle Type",
    "Cleaned Title",
    "Metadata Title",
    "Series Title",
    "Episode Title",
    "Season",
    "Episode Number",
    "Episode",
    "Title",
    "Release Year",
    "Year",
    "Artist",
    "Album Title",
    "Song Title",
    "Track",
    "Director",
    "Writer",
    "Cast",
    "Studio",
    "Video Bit Depth",
    "Audio Sample Rate",
    "Chapters",
    "Poster",
    "Cover Art",
    "File Format/Codec",
    "Video Bitrate",
    "Audio Bitrate",
    "Bitrate",
    "Corruption Type",
    "Recommendation",
    "Analysis Notes",
    "Remediation Action",
    "Path",
    "Duplicate Path",
    "Flag Reason",
    "Duplicate File",
    "File Name",
    "File",
    "File Path",
    "Online ID",
    "HDR Format"
];

export function getCategoryGroupInBrowser(cat: string): string {
    const isTvTab = ["TV Shows", "TV", "Docuseries", "Documentary Series"].includes(cat);
    if (isTvTab) return "TV";
    const isMusicTab = ["Music Albums", "Soundtracks", "Music Compilations", "Music"].includes(cat);
    if (isMusicTab) return "Music";
    const isCorrupted = cat === "Corrupted";
    if (isCorrupted) return "Corrupted";
    const isStatic = cat === "Static";
    if (isStatic) return "Static";
    return "Video";
}

export function getColsForScanAndCat(scanType: string, cat: string, useSubtitleScan: boolean = false): string[] {
    const isDiscovery = scanType === "Media Discovery" || scanType === "Modern Direct Play";
    const isStreaming = scanType === "Stream Audit Scan";
    const isMetadata = scanType === "Metadata Scan" || scanType === "Video Metadata Scan" || scanType === "Music Metadata Scan";
    const isQuality = scanType === "Anomaly Scan" || scanType === "Quality Audit";
    const isSubtitle = scanType === "Subtitle Scan";
    const isDuplication = scanType === "Duplication Scan";

    if (isDuplication) {
        return ["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"];
    }

    const group = getCategoryGroupInBrowser(cat);
    const isTv = group === "TV";
    const isVideo = group === "Video";
    const isMusic = group === "Music";

    if (isDiscovery) {
        if (isTv) return ["Series Title", "Episode Title", "Season", "Episode", "Video Codec", "Resolution", "Audio Codecs", "Audio Tracks", "Release Year", "File Path"];
        if (isVideo) return ["Title", "Video Codec", "Resolution", "Audio Codecs", "Audio Tracks", "Release Year", "File Path"];
        if (isMusic) return ["Artist", "Album Title", "Song Title", "File Format/Codec", "File Path"];
        if (cat === "Corrupted") return ["Container", "Corruption Type", "Recommendation", "File Path"];
        if (cat === "Static") return ["Container", "File Path"];
        if (cat === "Other") return ["Title", "Video Codec", "Audio Codecs", "File Path"];
        return ["Title", "File Path"];
    }

    if (isStreaming) {
        if (isTv) return ["Stream Audit", "Series Title", "Episode Title", "Season", "Episode", "Video Codec", "Audio Codecs", "Audio Tracks", "Analysis Notes", "Remediation Action", "File Path"];
        if (isVideo) return ["Stream Audit", "Title", "Video Codec", "Audio Codecs", "Audio Tracks", "Analysis Notes", "Remediation Action", "File Path"];
        if (isMusic) return ["Artist", "Album Title", "Song Title", "File Format/Codec", "Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
        return ["File Path"];
    }

    if (isMetadata) {
        if (isMusic) {
            return ["Cleaned Title", "Metadata Title", "Album Title", "Artist", "Year", "Track", "Audio Sample Rate", "Cover Art", "File Path"];
        }
        if (isTv) {
            return ["Cleaned Title", "Metadata Title", "Series Title", "Episode Title", "Season", "Episode Number", "Director", "Writer", "Year", "Cast", "Studio", "Video Bit Depth", "Audio Sample Rate", "Chapters", "Poster", "File Path"];
        }
        return ["Cleaned Title", "Metadata Title", "Director", "Writer", "Year", "Cast", "Studio", "Online ID", "Video Bit Depth", "Audio Sample Rate", "Chapters", "Poster", "File Path"];
    }

    if (isQuality) {
        if (isTv) return ["Series Title", "Episode Title", "Season", "Episode", "Resolution", "Video Bitrate", "Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
        if (isVideo) return ["Title", "Resolution", "Video Bitrate", "Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
        if (isMusic) return ["Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
        return ["Audio Bitrate", "Analysis Notes", "Remediation Action", "File Path"];
    }

    if (isSubtitle) {
        if (isTv) return ["Alert Level", "Series Title", "Episode Title", "Season", "Episode", "Audio Codecs", "Subtitles", (useSubtitleScan ? "Subtitle Type" : ""), "Analysis Notes", "Remediation Action", "File Path"].filter(Boolean);
        if (isVideo) return ["Alert Level", "Title", "Audio Codecs", "Subtitles", (useSubtitleScan ? "Subtitle Type" : ""), "Analysis Notes", "Remediation Action", "File Path"].filter(Boolean);
        return ["Alert Level", "Audio Codecs", "Subtitles", (useSubtitleScan ? "Subtitle Type" : ""), "Analysis Notes", "Remediation Action", "File Path"].filter(Boolean);
    }

    if (cat === "Corrupted") return ["Corruption Type", "Recommendation", "File Path"];
    if (cat === "Static") return ["File Path"];

    return ["File Path"];
}
