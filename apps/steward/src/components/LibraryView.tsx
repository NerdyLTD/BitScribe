import React from 'react';
import { MediaItem, getCategoryGroup, isMusicCategory } from '@bitscribe/core-types';
import { getSectionHeaderForTitle, getMusicGroupTitle, normalizeGroupTitle, getDisplayArtist, getDisplayAlbum, getDisplaySongTitle, getFormattedAudioTracks, formatCodecString, getPrimaryVideoCodec, getPrimaryAudioCodec, getContainerFormat, DuplicatePairRow } from '@bitscribe/core-eval';
import { ArrowUp, ArrowDown, ArrowUpDown, FileVideo, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface LibraryViewProps {
  customRules: any;
  parsedMetadataMap: any;
  selectedCategories: string[];
  visibleColumns: Record<string, boolean>;
  columnWidths: Record<string, number>;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  handleSort: (key: string) => void;
  paginatedFiles: any[];
  resizingColKey?: string;
  handleColumnResize?: (e: any, key: string, defaultWidth: number) => void;
  missingFmt: (val: any) => React.ReactNode;
  formatResolution: (w?: number, h?: number, parsed?: any) => React.ReactNode;
  formatSubtitleSummary: (parsed?: any) => React.ReactNode;
  formatSubtitleTechnical: (parsed?: any) => React.ReactNode;
}

export function LibraryView({
  customRules,
  parsedMetadataMap,
  selectedCategories,
  visibleColumns,
  columnWidths,
  sortColumn,
  sortDirection,
  handleSort,
  paginatedFiles, resizingColKey, handleColumnResize,
  missingFmt,
  formatResolution,
  formatSubtitleSummary,
  formatSubtitleTechnical
}: LibraryViewProps) {
  const group = selectedCategories.length > 0 ? getCategoryGroup(selectedCategories[0]) : 'Other';
  let headers = [];
  if (group === 'Music') {
    headers = [
      {label: 'Artist', key: 'artist', width: '150px'},
      {label: 'Album', key: 'album', width: '180px'},
      {label: 'Song Title', key: 'songTitle', width: '220px'},
      {label: 'Format/Codec', key: 'format', center: true, width: '110px'},
      {label: 'Bitrate', key: 'bitrate', center: true, width: '100px'},
      {label: 'Sample Rate', key: 'audioSampleRate', center: true, width: '100px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else if (group === 'TV') {
    headers = [
      {label: 'Stream Friendly?', key: 'stream', width: '130px'},
      {label: 'Series Title', key: 'seriesTitle', width: '180px'},
      {label: 'Season', key: 'season', width: '80px', center: true},
      {label: 'Episode', key: 'episode', width: '80px', center: true},
      {label: 'Episode Title', key: 'epTitle', width: '200px'},
      {label: 'Filename', key: 'filename', width: '250px'},
      {label: 'Video Codec', key: 'videoCodec', center: true, width: '100px'},
      {label: 'FPS', key: 'videoFrameRate', center: true, width: '80px'},
      {label: 'Video Depth', key: 'videoBitDepth', center: true, width: '90px'},
      {label: 'Audio Codec', key: 'audioCodec', center: true, width: '120px'},
      {label: 'Container', key: 'container', center: true, width: '90px'},
      {label: 'Chapters', key: 'chapterCount', center: true, width: '80px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else if (group === 'Movies') {
    headers = [
      {label: 'Stream Friendly?', key: 'stream', width: '130px'},
      {label: 'Title', key: 'title', width: '200px'},
      {label: 'Filename', key: 'filename', width: '250px'},
      {label: 'Video Codec', key: 'videoCodec', center: true, width: '100px'},
      {label: 'FPS', key: 'videoFrameRate', center: true, width: '80px'},
      {label: 'Video Depth', key: 'videoBitDepth', center: true, width: '90px'},
      {label: 'Audio Codec', key: 'audioCodec', center: true, width: '120px'},
      {label: 'Container', key: 'container', center: true, width: '90px'},
      {label: 'Chapters', key: 'chapterCount', center: true, width: '80px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else {
    headers = [
      {label: 'Filename', key: 'filename', width: '400px'},
      {label: 'File Path', key: 'path', width: '600px'}
    ];
  }
  
  headers = headers.filter(h => visibleColumns[h.key]);

  const getCompatibilityColor = (lvl) => {
    if (lvl === 'pending') {
      return 'text-slate-400 bg-[#1A1D27] border-slate-700/50';
    }
    switch(lvl) {
      case 'legacy': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'modern': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'bleeding': return 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20';
      case 'unfriendly': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };
  const getCompatibilityLabel = (lvl) => {
    if (lvl === 'pending') {
      return 'Pending Scan';
    }
    switch(lvl) {
      case 'legacy': return 'Legacy+';
      case 'modern': return 'Modern+';
      case 'bleeding': return 'Bleeding Edge';
      case 'unfriendly': return 'Transcode Req.';
      default: return 'Unknown';
    }
  };
  const getCompatibilityTooltip = (lvl) => {
    if (lvl === 'pending') {
      return "Pending Scan: Run the Streaming compatibility scanner to evaluate streaming compatibility.";
    }
    switch(lvl) {
      case 'legacy': return "Direct Streams to most legacy and modern hardware without server transcoding";
      case 'modern': return "Direct Streams to most modern hardware without transcoding. May trigger server transcoding on older clients.";
      case 'bleeding': return "Requires transcoding on most modern and legacy hardware. Manual transcode recommended.";
      case 'unfriendly': return "This file should be transcoded to a format compatible with Legacy+ or Modern+ standards or it will need server transcoding";
      default: return "";
    }
  };

  return (
    <table className="text-left border-collapse text-xs whitespace-nowrap" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
      <thead>
        <tr id="registry-table-header-row" className="border-b border-[#1e232e] bg-[#1E232E] text-slate-400 font-bold uppercase text-[10px] tracking-wide relative">
          {headers.filter(h => visibleColumns[h.key] !== false).map((h, i) => (
            <th 
              key={i} 
              id={`th-header-${h.key}`}
              onClick={() => handleSort(h.key)}
              className="p-3 font-semibold select-none align-middle text-left cursor-pointer hover:bg-[#252b36] hover:text-slate-200 transition-colors border-r border-[#1e232e]/50 last:border-r-0 relative group" 
              style={{ width: columnWidths[h.key] ? `${columnWidths[h.key]}px` : (h.width || '150px'), minWidth: '80px', maxWidth: '800px', overflow: 'hidden' }}
            >
              <div className="flex items-center justify-between gap-1 w-full pr-2">
                <span dangerouslySetInnerHTML={{ __html: h.label.replace(' ', '&nbsp;') }} className="truncate" />
                <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
                  {sortColumn === h.key ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </span>
              </div>
              <div 
                onMouseDown={(e) => handleColumnResize(e, h.key, parseInt(h.width || '150'))}
                className={`absolute top-0 right-0 w-[8px] h-full cursor-col-resize select-none z-10 hover:bg-blue-500/30 transition-colors ${
                  resizingColKey === h.key ? 'bg-blue-500/40 border-r border-blue-400' : ''
                }`}
                title="Drag to resize column"
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1e232e]/50 font-medium">
        {paginatedFiles.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="p-8 text-center text-slate-500 font-mono text-xs leading-relaxed whitespace-normal align-top">
              No matching files identified in library. Change filter selection or run scan.
            </td>
          </tr>
        ) : (() => {
          let lastSectionNorm: string | null = null;
          return paginatedFiles.map((dataRow) => {
            const { item, level } = dataRow || {};
            if (!item) return null;
            const isMus = group === 'Music' || isMusicCategory(item.category);
            const parsed = !isMus ? parsedMetadataMap.get(item.id) : null;
            const cStyle = "p-3 align-top text-left text-slate-300 whitespace-nowrap truncate max-w-[0px]";
            const cCenter = "p-3 align-top text-left text-slate-300 font-mono text-[10px] whitespace-nowrap truncate max-w-[0px]";
            
            const cellStream = () => visibleColumns.stream ? (
              <td className={cCenter} title={getCompatibilityTooltip(level)}>
                 <span className={`px-2 py-0.5 rounded border ${getCompatibilityColor(level)}`}>
                   {getCompatibilityLabel(level)}
                 </span>
              </td>
            ) : null;

            const showHeaders = ((group === 'Movies' || group === 'TV') && 
                                (sortColumn === null || sortColumn === 'title' || sortColumn === 'seriesTitle')) ||
                                (group === 'Music' && 
                                (sortColumn === null || sortColumn === 'artist' || sortColumn === 'album'));

            let sectionHeaderRow = null;
            if (showHeaders) {
              let section = '';
              if (group === 'Movies') {
                const rawTitle = parsed?.title || item.filename || '';
                section = getSectionHeaderForTitle(rawTitle);
              } else if (group === 'TV') {
                section = parsed?.title || 'Ungrouped';
              } else if (group === 'Music') {
                section = getMusicGroupTitle(item, customRules, item.category);
              }

              const normSection = normalizeGroupTitle(section);
              if (normSection !== lastSectionNorm) {
                lastSectionNorm = normSection;
                if (group === 'Movies') {
                  sectionHeaderRow = (
                    <tr key={`section-${section}-${item.id}`} className="border-y border-[#00B0F0]/30" style={{ backgroundColor: '#00B0F0', height: '18px' }}>
                      <td colSpan={headers.length} className="px-4 text-left font-bold text-white select-none align-middle" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16px', lineHeight: '18px', paddingTop: '0px', paddingBottom: '0px', height: '18px' }}>
                        {section}
                      </td>
                    </tr>
                  );
                } else {
                  sectionHeaderRow = (
                    <tr key={`section-${section}-${item.id}`} className="border-y border-sky-500/15" style={{ backgroundColor: '#ADD8E6', height: '18px' }}>
                      <td colSpan={headers.length} className="px-4 text-left font-bold text-slate-950 select-none align-middle" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16px', lineHeight: '18px', paddingTop: '0px', paddingBottom: '0px', height: '18px' }}>
                        {section}
                      </td>
                    </tr>
                  );
                }
              }
            }

            const rowContent = (() => {
              if (group === 'Music') {
                const codec = getPrimaryAudioCodec(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {visibleColumns.artist && <td className={cStyle} title={getDisplayArtist(item, customRules)}>{getDisplayArtist(item, customRules)}</td>}
                    {visibleColumns.album && <td className={cStyle} title={getDisplayAlbum(item, customRules)}>{getDisplayAlbum(item, customRules)}</td>}
                    {visibleColumns.songTitle && <td className={cStyle} title={getDisplaySongTitle(item, customRules)}>{getDisplaySongTitle(item, customRules)}</td>}
                    {visibleColumns.format && <td className={cCenter}>{codec}</td>}
                    {visibleColumns.bitrate && <td className={cCenter}>{item.audioBitrate ? Math.round(item.audioBitrate / 1000) + ' kbps' : '-'}</td>}
                    {visibleColumns.audioSampleRate && <td className={cCenter}>{item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else if (group === 'TV' && parsed) {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {cellStream()}
                    {visibleColumns.seriesTitle && <td className={cStyle} title={parsed?.title}>{parsed?.title || '-'}</td>}
                    {visibleColumns.season && <td className={cCenter}>{parsed?.season !== '-' ? parsed?.season : '-'}</td>}
                    {visibleColumns.episode && <td className={cCenter}>{parsed.episode !== '-' ? parsed.episode : '-'}</td>}
                    {visibleColumns.epTitle && <td className={cStyle} title={parsed.epTitle}>{parsed.epTitle || '-'}</td>}
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.videoCodec && <td className={cCenter}>{getPrimaryVideoCodec(item)}</td>}
                    {visibleColumns.videoFrameRate && <td className={cCenter}>{item.videoFrameRate ? `${item.videoFrameRate} fps` : '-'}</td>}
                    {visibleColumns.videoBitDepth && <td className={cCenter}>{item.videoBitDepth || '-'}</td>}
                    {visibleColumns.audioCodec && <td className={cCenter}>{getFormattedAudioTracks(item)}</td>}
                    {visibleColumns.container && <td className={cCenter}>{getContainerFormat(item)}</td>}
                    {visibleColumns.chapterCount && <td className={cCenter}>{item.chapterCount !== undefined && item.chapterCount > 0 ? item.chapterCount : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else if (group === 'Movies' && parsed) {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {cellStream()}
                    {visibleColumns.title && <td className={cStyle} title={parsed.title}>{parsed.title || '-'}</td>}
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.videoCodec && <td className={cCenter}>{getPrimaryVideoCodec(item)}</td>}
                    {visibleColumns.videoFrameRate && <td className={cCenter}>{item.videoFrameRate ? `${item.videoFrameRate} fps` : '-'}</td>}
                    {visibleColumns.videoBitDepth && <td className={cCenter}>{item.videoBitDepth || '-'}</td>}
                    {visibleColumns.audioCodec && <td className={cCenter}>{getFormattedAudioTracks(item)}</td>}
                    {visibleColumns.container && <td className={cCenter}>{getContainerFormat(item)}</td>}
                    {visibleColumns.chapterCount && <td className={cCenter}>{item.chapterCount !== undefined && item.chapterCount > 0 ? item.chapterCount : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              }
            })();

            return (
              <React.Fragment key={item.id}>
                {sectionHeaderRow}
                {rowContent}
              </React.Fragment>
            );
          });
        })()}
      </tbody>
    </table>
  );
}
