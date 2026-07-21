import { MediaItem } from '@bitscribe/core-types';
import { getDisplayArtist, getDisplayAlbum } from "./musicHelper";
import { getExtrasGroupTitle, parseVideoMetadata } from "./mediaParser";

export const normalizeTitleForSort = (title: string): string => {
  if (!title) return "";
  return title.trim().replace(/^(the|a|an)\s+/i, "").trim();
};

export const getSectionHeaderForTitle = (title: string): string => {
  const normalized = normalizeTitleForSort(title);
  if (!normalized) return "#";
  const firstChar = normalized[0].toUpperCase();
  if (/[0-9]/.test(firstChar)) {
    return "#";
  } else if (/[A-Z]/.test(firstChar)) {
    return firstChar;
  } else {
    return "#";
  }
};

export const normalizeGroupTitle = (title: string): string => {
  return String(title)
    .replace(/['"\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const getMusicGroupTitle = (item: MediaItem, customRules: any, catType?: string): string => {
  const artist = getDisplayArtist(item, customRules) || 'Unknown Artist';
  const album = getDisplayAlbum(item, customRules) || 'Unknown Album';
  if (catType === "Soundtracks" || catType === "Music Compilations") {
    return album;
  }
  return `${artist} - ${album}`;
};

export const getGroupTitleInit = (
  item: MediaItem,
  isTv: boolean = false,
): string => {
  if (item.category === "Extras") {
    return getExtrasGroupTitle(item);
  }
  const meta = parseVideoMetadata(item);
  if (isTv && meta.season && meta.season !== "-") {
    const p = parseInt(meta.season, 10);
    return `${meta.title || "Unknown"} - ${isNaN(p) ? meta.season : "Season " + p}`;
  }
  return meta.title || "Ungrouped";
};
