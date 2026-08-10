import React, { useState } from 'react';
import { Header } from './components/Header';
import { RenamerWorkspace } from './components/RenamerWorkspace';
import { HelpSection } from './components/HelpSection';
import { OptionsSection } from './components/OptionsSection';
import { RenamePatternConfig } from '@bitscribe/core-types';

export const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<string>('renamer');
  const [itemCount, setItemCount] = useState<number>(4);
  const [selectedCount, setSelectedCount] = useState<number>(4);

  const [config, setConfig] = useState<RenamePatternConfig>({
    mediaCategory: 'movies',
    preset: 'simple-movie',
    customTemplate: '{Title} ({Year})',
    episodicFormat: 'S01E02',
    articleOption: 'keep',
    caseStyle: 'clean_case',
    delimiter: 'space',
    sanitizeChars: true,
    autoTrackSidecars: true,
    singleWordInitialsMode: 'three_letters',
  });

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] INFO: BitScribe RX Digital Media Doctor initialized successfully.`,
    `[${new Date().toLocaleTimeString()}] INFO: Standard renamer rules & dry-run preflight ready.`,
    `[${new Date().toLocaleTimeString()}] SUCCESS: Loaded 4 initial candidate media items into workspace.`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleUpdateConfig = (updated: Partial<RenamePatternConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      return next;
    });
    addLog(`INFO: Updated configuration setting: ${Object.keys(updated).join(', ')}`);
  };

  const handleClearLogs = () => {
    setLogs([`[${new Date().toLocaleTimeString()}] INFO: Log buffer cleared.`]);
  };

  const handleLoadDatabase = () => {
    setItemCount((prev) => prev + 12);
    setSelectedCount((prev) => prev + 12);
    addLog(`SUCCESS: Imported 12 additional items from BitScribe Steward database.`);
    alert('BitScribe Steward Database successfully loaded into RX workspace!');
  };

  return (
    <div className="min-h-screen bg-[#04060a] text-slate-100 flex flex-col font-sans">
      <Header
        activeMode={activeMode}
        onModeChange={setActiveMode}
        itemCount={itemCount}
        selectedCount={selectedCount}
        onLoadDatabase={handleLoadDatabase}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeMode === 'renamer' && (
          <RenamerWorkspace
            config={config}
            onConfigChange={setConfig}
            onLog={addLog}
            onCountChange={(total, sel) => {
              setItemCount(total);
              setSelectedCount(sel);
            }}
          />
        )}

        {activeMode === 'organizer' && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-xs font-mono space-y-3 bg-[#04060a]">
            <div className="p-4 bg-red-950/40 border border-red-900/40 rounded-2xl text-red-300 font-sans text-sm font-bold">
              Folder Organizer & Folder Structure Remediation Mode
            </div>
            <p className="text-slate-500 max-w-md text-center font-sans">
              Organize movie and TV episode files into standardized directory structures (e.g., <code className="text-red-400">/Movies/Title (Year)/Title (Year).ext</code>).
            </p>
          </div>
        )}

        {activeMode === 'options' && (
          <OptionsSection
            config={config}
            onUpdateConfig={handleUpdateConfig}
            logs={logs}
            onClearLogs={handleClearLogs}
            onLoadStewardDB={handleLoadDatabase}
          />
        )}

        {activeMode === 'help' && <HelpSection />}
      </main>
    </div>
  );
};

export default App;
