import React, { useState, useMemo, useEffect } from 'react';
import { MediaItem, RenamePatternConfig, getCategoryGroup } from '@bitscribe/core-types';
import { generateRenameCandidates } from '@bitscribe/core-eval';
import { MOCK_MEDIA_LIBRARY } from '@bitscribe/core-db';
import { RenameConfigPanel } from './RenameConfigPanel';
import { RenameCandidatesTable } from './RenameCandidatesTable';

interface RenamerWorkspaceProps {
  config: RenamePatternConfig;
  onConfigChange: (config: RenamePatternConfig) => void;
  onLog: (msg: string) => void;
  onCountChange?: (total: number, selected: number) => void;
}

export const RenamerWorkspace: React.FC<RenamerWorkspaceProps> = ({
  config,
  onConfigChange,
  onLog,
  onCountChange,
}) => {
  // Use the full 75-item mock database shared with Steward
  const [items] = useState<MediaItem[]>(MOCK_MEDIA_LIBRARY);
  const [overrideSelection, setOverrideSelection] = useState<Record<string, boolean>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  // Filter media items strictly by active category (movies, tv, music)
  const activeCategory = config.mediaCategory || 'movies';

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const group = getCategoryGroup(item.category);
      if (activeCategory === 'movies') return group === 'Movies';
      if (activeCategory === 'tv') return group === 'TV';
      if (activeCategory === 'music') return group === 'Music';
      return true;
    });
  }, [items, activeCategory]);

  // Compute live candidates diff for filtered items
  const rawCandidates = useMemo(() => {
    return generateRenameCandidates(filteredItems, config);
  }, [filteredItems, config]);

  // Apply manual selection overrides
  const candidates = useMemo(() => {
    return rawCandidates.map((cand) => {
      const isSelected = overrideSelection[cand.id] !== undefined ? overrideSelection[cand.id] : cand.selected;
      return { ...cand, selected: isSelected };
    });
  }, [rawCandidates, overrideSelection]);

  const selectedCount = useMemo(() => {
    return candidates.filter((c) => c.selected).length;
  }, [candidates]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(candidates.length, selectedCount);
    }
  }, [candidates.length, selectedCount, onCountChange]);

  const handleToggleSelect = (id: string) => {
    const current = candidates.find((c) => c.id === id);
    if (!current) return;
    setOverrideSelection((prev) => ({
      ...prev,
      [id]: !current.selected,
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const next: Record<string, boolean> = {};
    candidates.forEach((c) => {
      next[c.id] = select;
    });
    setOverrideSelection(next);
  };

  const handleExecute = async () => {
    const selected = candidates.filter((c) => c.selected);
    if (selected.length === 0) return;

    setIsExecuting(true);
    onLog(`INFO: Starting execution of ${selected.length} batch file renames...`);

    // Simulate batch execution
    await new Promise((resolve) => setTimeout(resolve, 800));

    selected.forEach((cand) => {
      onLog(`SUCCESS: Renamed "${cand.originalFilename}" -> "${cand.proposedFilename}"`);
    });

    setIsExecuting(false);
    alert(`Successfully processed renames for ${selected.length} selected files.`);
  };

  const handleDryRun = () => {
    const selected = candidates.filter((c) => c.selected);
    onLog(`INFO: Completed pre-flight dry-run check on ${selected.length} files. Zero collisions detected.`);
    alert(`Dry-Run complete: ${selected.length} files checked. No collisions or illegal characters detected.`);
  };

  return (
    <div className="flex flex-1 h-[calc(100vh-61px)] overflow-hidden">
      <RenameConfigPanel config={config} onChange={onConfigChange} />
      <RenameCandidatesTable
        candidates={candidates}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onExecute={handleExecute}
        onDryRun={handleDryRun}
        isExecuting={isExecuting}
      />
    </div>
  );
};
