import { MediaItem } from "../types";

export function formatCodecString(codec: string | undefined | null | unknown): string {
  if (codec == null) return "";
  return String(codec).toUpperCase().trim();
}

export function getPrimaryVideoCodec(item: MediaItem): string {
  return formatCodecString(item.videoCodec);
}

export function getPrimaryAudioCodec(item: MediaItem): string {
  if (item.audioTracks && item.audioTracks.length > 0 && item.audioTracks[0].codec) {
    return formatCodecString(item.audioTracks[0].codec);
  }
  return getContainerFormat(item);
}

export function getFormattedAudioTracks(item: MediaItem): string {
  if (!item.audioTracks || item.audioTracks.length === 0) return "-";
  return item.audioTracks
    .map(t => {
      const codec = formatCodecString(t.codec);
      return t.channels ? `${codec} (${t.channels}ch)` : codec;
    })
    .join(", ");
}

export function getContainerFormat(item: MediaItem): string {
  if ((item.container || "").toLowerCase().includes("matroska")) {
    return "MKV";
  }
  return formatCodecString(item.filename.split('.').pop() || item.container || "UNKNOWN");
}

export function formatSubtitleSummary(item: MediaItem): string {
  const subs = item.subtitleTracks || [];
  if (subs.length === 0) return "None";

  const totalTracks = subs.length;
  const langMap: Record<string, number> = {};
  let hasRisk = false;

  subs.forEach(s => {
    const lang = (s.language || 'und').toUpperCase();
    langMap[lang] = (langMap[lang] || 0) + 1;

    const c = (s.codec || '').toLowerCase();
    if (c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa')) {
      hasRisk = true;
    }
  });

  const langParts = Object.entries(langMap).map(([lang, count]) => {
    return `${count} ${lang}`;
  });
  const langStr = langParts.join(', ');

  const statusText = hasRisk ? "Transcode risk" : "Stream OK";

  return `${totalTracks} Track${totalTracks > 1 ? 's' : ''} (${langStr} | ${statusText})`;
}

export function formatSubtitleTechnical(item: MediaItem): string {
  const subs = item.subtitleTracks || [];
  if (subs.length === 0) return "None";

  return subs
    .map((s) => {
      const codecStr = formatCodecString(s.codec);
      const originStr = s.isExternal ? 'Ext' : 'Emb';
      const langStr = (s.language || 'und').toLowerCase();
      return `${codecStr}(${originStr})[${langStr}]`;
    })
    .join(", ");
}
