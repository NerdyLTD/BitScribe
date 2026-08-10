import React, { useState } from 'react';
import {
  RenamePatternConfig,
  RenamerPreset,
  EpisodicFormat,
  ArticleOption,
  CaseStyle,
  DelimiterOption,
  SingleWordInitialsMode,
} from '@bitscribe/core-types';
import {
  Sliders,
  Sparkles,
  Film,
  Tv,
  Music,
  GripVertical,
  X,
  ChevronLeft,
  ChevronRight,
  Code,
  Plus,
} from 'lucide-react';

interface RenameConfigPanelProps {
  config: RenamePatternConfig;
  onChange: (newConfig: RenamePatternConfig) => void;
}

export function parseTokensFromTemplate(template: string): string[] {
  if (!template || !template.trim()) return [];
  const tokenRegex = /(\(\{[A-Za-z0-9]+\}\)|\[\{[A-Za-z0-9]+\}\]|\{[A-Za-z0-9]+\})/g;
  const matches = template.match(tokenRegex);
  return matches ? matches : [];
}

export function stringifyTokensToTemplate(tokens: string[]): string {
  if (!tokens || tokens.length === 0) return '';
  let result = '';
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    if (i === 0) {
      result += curr;
      continue;
    }
    if (curr.startsWith('(') || curr.startsWith('[')) {
      result += ` ${curr}`;
    } else {
      const prev = tokens[i - 1];
      if (prev.endsWith(')') || prev.endsWith(']')) {
        result += ` - ${curr}`;
      } else {
        result += ` - ${curr}`;
      }
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

export const RenameConfigPanel: React.FC<RenameConfigPanelProps> = ({ config, onChange }) => {
  const currentCategory = config.mediaCategory || 'movies';
  const [draggedTokenIdx, setDraggedTokenIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [showRawInput, setShowRawInput] = useState<boolean>(false);

  const updateField = <K extends keyof RenamePatternConfig>(field: K, value: RenamePatternConfig[K]) => {
    onChange({ ...config, [field]: value });
  };

  const handleCategoryChange = (cat: 'movies' | 'tv' | 'music') => {
    let defaultPreset: RenamerPreset = 'simple-movie';
    let defaultTemplate = '{Title} ({Year})';

    if (cat === 'tv') {
      defaultPreset = 'standard-tv';
      defaultTemplate = '{Title} - {SeasonEpisode} - {EpTitle}';
    } else if (cat === 'music') {
      defaultPreset = 'artist-track-title';
      defaultTemplate = '{Artist} - {Track} - {Title}';
    }

    onChange({
      ...config,
      mediaCategory: cat,
      preset: defaultPreset,
      customTemplate: defaultTemplate,
    });
  };

  const handlePresetSelect = (preset: RenamerPreset) => {
    let customTemplate = config.customTemplate;
    if (preset === 'simple-movie') customTemplate = '{Title} ({Year})';
    if (preset === 'detailed-movie') customTemplate = '{Title} ({Year}) [{Resolution} {VideoCodec} {AudioCodec}]';
    if (preset === 'scene-movie') customTemplate = '{Title}.{Year}.{Resolution}.{VideoCodec}';
    if (preset === 'standard-tv') customTemplate = '{Title} - {SeasonEpisode} - {EpTitle}';
    if (preset === 'compact-tv') customTemplate = '{Initials} {SeasonEpisode}';
    if (preset === 'plex-tv') customTemplate = '{Title} - {SeasonEpisode}';
    if (preset === 'artist-track-title') customTemplate = '{Artist} - {Track} - {Title}';
    if (preset === 'track-title') customTemplate = '{Track}. {Title}';
    if (preset === 'album-track-title') customTemplate = '{Album} - {Track} - {Title}';

    onChange({
      ...config,
      preset,
      customTemplate,
    });
  };

  // Parsing tokens for interactive token builder
  const tokens = parseTokensFromTemplate(config.customTemplate || '');

  const handleRemoveToken = (indexToRemove: number) => {
    const nextTokens = tokens.filter((_, idx) => idx !== indexToRemove);
    const newTemplate = stringifyTokensToTemplate(nextTokens);

    onChange({
      ...config,
      customTemplate: newTemplate,
      preset: 'custom',
    });
  };

  const handleMoveToken = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= tokens.length || toIdx >= tokens.length) return;

    const nextTokens = [...tokens];
    const [moved] = nextTokens.splice(fromIdx, 1);
    nextTokens.splice(toIdx, 0, moved);

    const newTemplate = stringifyTokensToTemplate(nextTokens);

    onChange({
      ...config,
      customTemplate: newTemplate,
      preset: 'custom',
    });
  };

  const insertToken = (tokenToInsert: string) => {
    const nextTokens = [...tokens, tokenToInsert];
    const newTemplate = stringifyTokensToTemplate(nextTokens);

    onChange({
      ...config,
      customTemplate: newTemplate,
      preset: 'custom',
    });
  };

  // Category specific preset definitions
  const moviePresets = [
    { id: 'simple-movie', label: 'Simple Movie', desc: '{Title} ({Year})' },
    { id: 'detailed-movie', label: 'Detailed Media Movie', desc: '{Title} ({Year}) [{Res} {Codec}]' },
    { id: 'scene-movie', label: 'Scene / Release Format', desc: '{Title}.{Year}.{Res}.{Codec}' },
    { id: 'custom', label: 'Custom Token Pattern', desc: 'User-defined template string' },
  ];

  const tvPresets = [
    { id: 'standard-tv', label: 'Standard TV Series', desc: '{Title} - {S01E02} - {EpTitle}' },
    { id: 'compact-tv', label: 'Compact / Initials TV', desc: '{Initials} {S01E02}' },
    { id: 'plex-tv', label: 'Plex Standard TV', desc: '{Title} - {S01E02}' },
    { id: 'custom', label: 'Custom Token Pattern', desc: 'User-defined template string' },
  ];

  const musicPresets = [
    { id: 'artist-track-title', label: 'Artist - Track - Title', desc: '{Artist} - {Track} - {Title}' },
    { id: 'track-title', label: 'Track. Title', desc: '{Track}. {Title}' },
    { id: 'album-track-title', label: 'Album - Track - Title', desc: '{Album} - {Track} - {Title}' },
    { id: 'custom', label: 'Custom Token Pattern', desc: 'User-defined template string' },
  ];

  const activePresets =
    currentCategory === 'movies' ? moviePresets : currentCategory === 'tv' ? tvPresets : musicPresets;

  // Category specific token chips
  const tokenChips =
    currentCategory === 'movies'
      ? ['{Title}', '({Year})', '{Resolution}', '{VideoCodec}', '{AudioCodec}', '{Channels}', '{ReleaseGroup}']
      : currentCategory === 'tv'
      ? ['{Title}', '{SeasonEpisode}', '{EpTitle}', '({Year})', '{Initials}', '{Resolution}', '{VideoCodec}', '{AudioCodec}']
      : ['{Artist}', '{Title}', '{Album}', '{Track}', '({Year})', '{AudioCodec}', '{BitDepth}'];

  // Calculate tokens list
  let tokenCount = 0;

  return (
    <aside className="w-[368px] border-r border-red-950/30 bg-[#090b10] p-4 space-y-5 overflow-y-auto shrink-0">
      <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm border-b border-red-950/40 pb-3">
        <Sliders className="w-4 h-4 text-red-500" />
        Renamer Configuration
      </div>

      {/* Media Type Selector Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Target Media Format
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-red-900/30">
          <button
            onClick={() => handleCategoryChange('movies')}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              currentCategory === 'movies'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Film className="w-4 h-4 text-red-200" />
            <span>Movies</span>
          </button>

          <button
            onClick={() => handleCategoryChange('tv')}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              currentCategory === 'tv'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Tv className="w-4 h-4 text-red-200" />
            <span>TV / Series</span>
          </button>

          <button
            onClick={() => handleCategoryChange('music')}
            className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
              currentCategory === 'music'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Music className="w-4 h-4 text-red-200" />
            <span>Music</span>
          </button>
        </div>
      </div>

      {/* Preset Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Preset Templates
          </label>
          <span className="text-[10px] text-red-400/90 font-medium capitalize">
            {currentCategory === 'tv' ? 'TV Series' : currentCategory}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {activePresets.map((item) => (
            <button
              key={item.id}
              onClick={() => handlePresetSelect(item.id as RenamerPreset)}
              className={`p-2.5 rounded-lg border text-left transition-all text-xs ${
                config.preset === item.id
                  ? 'border-red-500/80 bg-red-950/40 text-red-200 shadow-sm shadow-red-950/30'
                  : 'border-slate-800/80 bg-slate-950/50 hover:bg-slate-900/60 text-slate-300'
              }`}
            >
              <div className="font-semibold flex items-center justify-between">
                <span>{item.label}</span>
                {config.preset === item.id && <Sparkles className="w-3 h-3 text-red-400" />}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Pattern Template Box */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pattern Template
          </label>
          <button
            onClick={() => setShowRawInput(!showRawInput)}
            className="text-[10px] text-red-400 hover:text-red-300 font-medium flex items-center gap-1 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30 transition"
            title="Toggle raw template string editor"
          >
            <Code className="w-3 h-3" />
            {showRawInput ? 'Interactive View' : 'Raw String'}
          </button>
        </div>

        {/* Interactive Drag-and-Drop / Click-to-Remove Token Box */}
        <div className="p-2.5 bg-slate-950 border border-red-900/40 rounded-xl space-y-2 shadow-inner">
          {!showRawInput ? (
            <div className="flex flex-wrap items-center gap-1.5 min-h-[44px] p-1">
              {tokens.length === 0 ? (
                <span className="text-xs text-slate-600 italic">No template tokens added. Click below to insert.</span>
              ) : (
                tokens.map((token, idx) => {
                  const isDragging = draggedTokenIdx === idx;
                  const isDropTarget = dropTargetIdx === idx;

                  return (
                    <div
                      key={`${token}_${idx}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(idx));
                        setDraggedTokenIdx(idx);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dropTargetIdx !== idx) {
                          setDropTargetIdx(idx);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetIdx === idx) {
                          setDropTargetIdx(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!isNaN(sourceIdx)) {
                          handleMoveToken(sourceIdx, idx);
                        }
                        setDraggedTokenIdx(null);
                        setDropTargetIdx(null);
                      }}
                      onDragEnd={() => {
                        setDraggedTokenIdx(null);
                        setDropTargetIdx(null);
                      }}
                      className={`group relative inline-flex min-w-[68px] justify-center items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[10px] select-none transition-all shadow-sm overflow-hidden ${
                        isDragging
                          ? 'opacity-40 border-slate-700 bg-slate-900'
                          : isDropTarget
                          ? 'border-red-400 bg-red-950/80 text-white scale-105 shadow-md shadow-red-950'
                          : 'border-red-800/60 bg-gradient-to-r from-red-950/70 to-slate-900/90 text-red-200 hover:border-red-500 hover:text-white'
                      }`}
                    >
                      {/* Drag handle */}
                      <GripVertical className="w-3.5 h-3.5 text-red-400/60 cursor-grab active:cursor-grabbing shrink-0" />

                      {/* Token Label */}
                      <span className="font-semibold text-[10px] tracking-wide">
                        {token.replace(/[\{\}\(\)\[\]]/g, '')}
                      </span>

                      {/* Absolute Overlay Controls on hover (< > x) */}
                      <div className="absolute inset-0 bg-red-950/95 border border-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 px-1 z-10 pointer-events-none group-hover:pointer-events-auto">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToken(idx, idx - 1);
                            }}
                            className="p-0.5 hover:bg-red-800/80 text-red-200 hover:text-white rounded transition"
                            title="Move token left"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < tokens.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToken(idx, idx + 1);
                            }}
                            className="p-0.5 hover:bg-red-800/80 text-red-200 hover:text-white rounded transition"
                            title="Move token right"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveToken(idx);
                          }}
                          className="p-0.5 hover:bg-red-800/80 text-red-200 hover:text-white rounded transition"
                          title="Click to remove token"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <input
              type="text"
              value={config.customTemplate}
              onChange={(e) => {
                updateField('customTemplate', e.target.value);
                if (config.preset !== 'custom') updateField('preset', 'custom');
              }}
              placeholder="{Title} ({Year})"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-red-300 focus:outline-none focus:border-red-500"
            />
          )}

          <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-900 pt-1 px-0.5">
            <span>Drag chips to reorder • Click X to remove</span>
            <span className="font-mono text-red-400/80">{tokens.length} tokens</span>
          </div>
        </div>

        {/* Token Chips Palette */}
        <div className="space-y-1 pt-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Plus className="w-3 h-3 text-red-400" /> Insert Available Tokens
          </label>
          <div className="flex flex-wrap gap-1">
            {tokenChips.map((token) => (
              <button
                key={token}
                onClick={() => insertToken(token)}
                className="px-2 py-1 bg-slate-900 hover:bg-red-950/70 text-slate-300 hover:text-red-200 text-[10px] rounded-lg font-mono border border-slate-800 hover:border-red-800/60 transition flex items-center gap-1"
              >
                <span>+</span>
                <span>{token.replace(/[\{\}\(\)\[\]]/g, '')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Format Controls */}
      <div className="space-y-3.5 pt-2 border-t border-red-950/40">
        {currentCategory === 'tv' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Episodic S/E Format</label>
            <select
              value={config.episodicFormat}
              onChange={(e) => updateField('episodicFormat', e.target.value as EpisodicFormat)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="S01E02">S01E02 (Standard padded)</option>
              <option value="1x02">1x02 (Classic format)</option>
              <option value="s1e2">s1e2 (Minimalist)</option>
              <option value="S01.E02">S01.E02 (Dot separator)</option>
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Article Rules ('The', 'A', 'An')</label>
          <select
            value={config.articleOption}
            onChange={(e) => updateField('articleOption', e.target.value as ArticleOption)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="keep">Keep Articles in Title</option>
            <option value="strip">Strip Leading Articles</option>
            <option value="move_to_end">Move Article to End (Title, The)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Case Styling</label>
          <select
            value={config.caseStyle}
            onChange={(e) => updateField('caseStyle', e.target.value as CaseStyle)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="clean_case">Clean Case (Preserve Metadata)</option>
            <option value="title_case">Title Case Every Word</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Space Separators / Delimiters</label>
          <select
            value={config.delimiter}
            onChange={(e) => updateField('delimiter', e.target.value as DelimiterOption)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="space">Spaces ( Standard )</option>
            <option value="dot">Dots ( File.Name.Format )</option>
            <option value="dash">Dashes ( File-Name-Format )</option>
            <option value="underscore">Underscores ( File_Name_Format )</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Single-Word Title Initials</label>
          <select
            value={config.singleWordInitialsMode || 'three_letters'}
            onChange={(e) => updateField('singleWordInitialsMode', e.target.value as SingleWordInitialsMode)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="three_letters">3 Letters Subset (e.g. 'Sev', 'Far')</option>
            <option value="full_word">Full Single Word (e.g. 'Severance', 'Fargo')</option>
            <option value="single_letter">Single Letter (e.g. 'S', 'F')</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

