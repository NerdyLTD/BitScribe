export function cleanAlbumTitle(title: string): string {
  if (!title) return "";
  let clean = title;

  // Remove common digital quality and source tags in brackets or parentheses
  // E.g., [FLAC], [FLAC 24bit-96kHz], [Mp3 320], (FLAC), [Web-DL], [CD], [Vinyl], [SACD], (Deluxe), [Special Edition]
  clean = clean.replace(/\[\s*(?:flac|mp3|m4a|wav|aac|ogg|alac|dsd|ape|opus|wv|lossless|320\s*kbps|320k?|24\s*bit|16\s*bit|24\s*-\s*96|192\s*khz|96\s*khz|high\s*res|hi-res|cd|vinyl|sacd|web|web-?dl|webrip|qobuz|tidal|remastered?|deluxe|expanded|bonus|special\s*edition|anniversary|box\s*set)\s*\]/gi, '');
  clean = clean.replace(/\(\s*(?:flac|mp3|m4a|wav|aac|ogg|alac|dsd|ape|opus|wv|lossless|320\s*kbps|320k?|24\s*bit|16\s*bit|24\s*-\s*96|192\s*khz|96\s*khz|high\s*res|hi-res|cd|vinyl|sacd|web|web-?dl|webrip|qobuz|tidal|remastered?|deluxe|expanded|bonus|special\s*edition|anniversary|box\s*set)\s*\)/gi, '');

  // Remove compound quality bracket patterns like [FLAC 24-96], [24bit 96kHz], [FLAC 192], etc.
  clean = clean.replace(/\[\s*(?:flac|mp3|alac|wav|cd|web|hi-res|lossless)[\s\d-a-z.kKzhH]*\]/gi, '');
  clean = clean.replace(/\(\s*(?:flac|mp3|alac|wav|cd|web|hi-res|lossless)[\s\d-a-z.kKzhH]*\)/gi, '');

  // Remove bracketed year like (1998) or [2004] (but keep it if it's the whole album name, e.g. "1984")
  const yearMatch = clean.match(/[\(\[]\s*(19\d{2}|20\d{2})\s*[\)\]]/);
  if (yearMatch && clean.trim().length > 7) {
    clean = clean.replace(/[\(\[]\s*(19\d{2}|20\d{2})\s*[\)\]]/g, '');
  }

  // Remove trailing and leading punctuation (e.g. trailing hyphens, dots, spaces)
  clean = clean.replace(/^\s*[-_+=~|/:.]+\s*|\s*[-_+=~|/:.]+\s*$/g, '');

  // Remove multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean || title;
}

const fallbackCache = new Map<string, { fallbackArtist: string, fallbackAlbum: string }>();

const displayArtistCache = new Map<string, string>();
const displayAlbumCache = new Map<string, string>();
const displaySongTitleCache = new Map<string, string>();

export const getMusicFallback = (item: any) => {
  const cacheKey = item.id || item.filePath;
  if (fallbackCache.has(cacheKey)) return fallbackCache.get(cacheKey)!;

  let fallbackArtist = '';
  let fallbackAlbum = '';
  const fp = (item.filePath || '').replace(/\\\\/g, '/').replace(/\\/g, '/');
  
  // Normally item.filePath includes the filename. We want the directory.
  let dirStr = fp;
  if (item.filename && fp.endsWith(item.filename)) {
    dirStr = fp.substring(0, fp.lastIndexOf(item.filename));
  }
  const folderParts = dirStr.split('/').filter((p: string) => p);
  
  const mIdx = folderParts.findIndex((p: string) => p.toLowerCase() === 'music' || p.toLowerCase() === 'audio');
  if (mIdx !== -1 && mIdx < folderParts.length) {
    const subCategory = mIdx + 1 < folderParts.length ? folderParts[mIdx + 1].toLowerCase() : '';
    
    if (subCategory === 'artists') {
      if (mIdx + 2 < folderParts.length) fallbackArtist = folderParts[mIdx + 2];
      if (mIdx + 3 < folderParts.length) fallbackAlbum = folderParts[mIdx + 3];
    } else if (subCategory === 'soundtracks' || subCategory === 'compilations') {
      fallbackArtist = 'Various Artists';
      if (folderParts.length > 0) fallbackAlbum = folderParts[folderParts.length - 1];
    } else {
      fallbackArtist = 'Various Artists';
      if (folderParts.length > 0) fallbackAlbum = folderParts[folderParts.length - 1];
    }
  } else if (folderParts.length > 0) {
    fallbackAlbum = folderParts[folderParts.length - 1];
  }

  // Check if fallbackAlbum is 'Disc X', 'Disk X', 'CD X', or similar
  let discStr = '';
  const discMatch = fallbackAlbum.match(/^(?:disc|disk|cd|vol(?:ume)?)\s*(\d+)$/i);
  if (discMatch && folderParts.length > 1) {
    discStr = discMatch[1];
    fallbackAlbum = folderParts[folderParts.length - 2];
  } else if (fallbackAlbum.match(/^(?:disc|disk|cd|vol(?:ume)?)$/i) && folderParts.length > 1) {
    // Just in case it's literally just "Disc" without a number
    fallbackAlbum = folderParts[folderParts.length - 2];
  }

  // Prevent generic categories from becoming the album name
  const genericallyIgnored = ['games', 'movies & tv', 'misc humor', 'artists', 'soundtracks', 'compilations', 'music', '!games', '!movies & tv'];
  if (genericallyIgnored.includes(fallbackAlbum.toLowerCase())) {
      fallbackAlbum = "Unknown Album"; 
  } else {
      fallbackAlbum = cleanAlbumTitle(fallbackAlbum);
  }

  if (discStr && fallbackAlbum !== "Unknown Album") {
      fallbackAlbum = `${fallbackAlbum} (Disc ${discStr})`;
  }

  const result = { fallbackArtist, fallbackAlbum };
  fallbackCache.set(cacheKey, result);
  return result;
};

export const getDisplayArtist = (item: any, rules?: any) => {
  const cacheKey = item.id || item.filePath;
  if (displayArtistCache.has(cacheKey)) return displayArtistCache.get(cacheKey)!;

  const { fallbackArtist, fallbackAlbum } = getMusicFallback(item);
  let artist = item.tags?.album_artist || item.tags?.ALBUM_ARTIST || item.tags?.artist || item.tags?.ARTIST;
  
  if (rules?.useCleanNonLatinTags !== false) {
    const isSpecialFolder = item.category === 'Soundtracks' || item.category === 'Music Compilations';
    const hasAsianChars = (str: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\uFAFF\uFF66-\uFF9F]/.test(str);
    
    // Only cleanse if the folder name (fallback) is English while the tag has Asian chars
    if (artist && hasAsianChars(String(artist)) && !hasAsianChars(fallbackAlbum)) {
      artist = fallbackArtist;
    }
    
    // Cleanse garbage URL artist names (e.g. game rips)
    if (artist && String(artist).toLowerCase().includes('www.') && isSpecialFolder) {
      artist = fallbackArtist;
    }
  }
  
  if (!artist || String(artist).toLowerCase() === '<unknown>') artist = fallbackArtist || 'Unknown Artist';
  const result = String(artist || '').trim();
  displayArtistCache.set(cacheKey, result);
  return result;
};

export const getDisplayAlbum = (item: any, rules?: any) => {
  const cacheKey = item.id || item.filePath;
  if (displayAlbumCache.has(cacheKey)) return displayAlbumCache.get(cacheKey)!;

  const { fallbackAlbum } = getMusicFallback(item);
  let album = item.tags?.album || item.tags?.ALBUM;
  if (album) {
    album = cleanAlbumTitle(album);
  }
  
  if (rules?.useCleanNonLatinTags !== false) {
    const isSpecialFolder = item.category === 'Soundtracks' || item.category === 'Music Compilations';
    
    if (isSpecialFolder && fallbackAlbum && fallbackAlbum !== 'Unknown Album') {
      // Strongly prefer folder names for compilations/soundtracks to guarantee perfect grouping
      // for tracks in the same folder, avoiding splintering from inconsistent ID3 tags.
      album = fallbackAlbum;
    } else {
      const hasAsianChars = (str: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\uFAFF\uFF66-\uFF9F]/.test(str);
      // Only cleanse if the folder name is English while the tag has Asian chars
      if (album && hasAsianChars(String(album)) && !hasAsianChars(fallbackAlbum)) {
        album = fallbackAlbum;
      }
    }
    
    if (album && item.category === 'Soundtracks') {
      let isDisc = '';
      const discMatch = String(album).match(/\s*\(Disc\s*\d+\)$/i);
      if (discMatch) { 
         isDisc = discMatch[0]; 
         album = String(album).replace(/\s*\(Disc\s*\d+\)$/i, '');
      }
      album = String(album).replace(/^(?:o\.?s\.?t\.?|soundtrack|original soundtrack)\s*[-_\])]*\s*|\s*[-_\[(]*\s*(?:o\.?s\.?t\.?|soundtrack|original soundtrack|original motion picture soundtrack)\s*[\])]*\s*$/gi, '').trim();
      if (isDisc) album += isDisc;
    }
  }
  
  if (!album || String(album).toLowerCase() === '<unknown>') {
    album = fallbackAlbum || 'Unknown Album';
  } else {
    // If the tag exists, but lacks a Disc indicator, and the folder HAS a Disc indicator, append it to the tag
    const folderDiscMatch = fallbackAlbum.match(/\(Disc (\d+)\)$/i);
    const hasDiscInTagContent = String(album).match(/\bdisc\b/i) != null;
    if (folderDiscMatch && !hasDiscInTagContent) {
      album = `${album} (Disc ${folderDiscMatch[1]})`;
    }
  }
  
  const disc = (item.tags?.disc || item.tags?.DISC || '').trim();
  if (disc && typeof disc === 'string' && disc !== '1' && disc !== '1/1' && !String(album).match(/\bdisc\b/i)) {
    album = `${album} (Disc ${disc})`;
  }
  
  const result = String(album || '').trim();
  displayAlbumCache.set(cacheKey, result);
  return result;
};

export const getDisplaySongTitle = (item: any, rules?: any) => {
  const cacheKey = item.id || item.filePath;
  if (displaySongTitleCache.has(cacheKey)) return displaySongTitleCache.get(cacheKey)!;

  let title = item.tags?.title || item.tags?.TITLE;
  const fileNameNoExt = item.filename ? item.filename.replace(/\.[^/.]+$/, '') : '';
  
  if (rules?.useCleanNonLatinTags !== false) {
    const hasAsianChars = (str: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\uFAFF\uFF66-\uFF9F]/.test(str);
    // Use filename if tag has asian chars but filename is ASCII
    if (title && hasAsianChars(String(title)) && !hasAsianChars(fileNameNoExt)) {
      title = fileNameNoExt;
    }
  }
  
  if (!title || String(title).toLowerCase() === '<unknown>') {
    title = fileNameNoExt;
  }
  
  const result = String(title).trim();
  displaySongTitleCache.set(cacheKey, result);
  return result;
};

