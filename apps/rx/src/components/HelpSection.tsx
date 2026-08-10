import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Heart,
  Sparkles,
  Shield,
  FileText,
  Sliders,
  CheckCircle,
  Terminal,
} from 'lucide-react';
import paypalQr from '../assets/paypal_qr.png';

interface TutorialAccordionProps {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const TutorialAccordion: React.FC<TutorialAccordionProps> = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="py-2.5 px-3.5 border rounded-xl shadow-md transition-all duration-300 bg-[#0c0f17] border-red-950/40 hover:border-red-900/50">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 w-fit rounded-lg bg-red-950/60 text-red-400 border border-red-900/40">
            <Icon className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">{title}</h4>
        </div>
        <div className="text-slate-500 hover:text-slate-300 transition-colors">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[850px] mt-3 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed font-sans pb-1 pl-10 border-t border-red-950/30 pt-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};

interface FaqItemProps {
  question: string;
  children: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="py-2.5 px-3.5 border rounded-xl shadow-md transition-all duration-300 bg-[#0c0f17] border-slate-800/80 hover:border-red-950/50">
      <div
        className="flex items-center justify-between cursor-pointer select-none gap-3 font-bold text-slate-200 hover:text-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 w-fit rounded-lg bg-red-950/40 text-red-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-snug">{question}</span>
        </div>
        <span className="text-slate-500 shrink-0">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[500px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="text-xs text-slate-400 leading-relaxed font-sans border-t border-slate-800/60 pt-2 mt-2 pl-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export const HelpSection: React.FC = () => {
  const [openTutorials, setOpenTutorials] = useState<Record<string, boolean>>({
    presets: true,
  });

  const toggleTutorial = (key: string) => {
    setOpenTutorials((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#04060a] space-y-8">
      {/* Overview Blurb Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d0f17] via-[#120b12] to-[#0d0f17] border border-red-900/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-950/80 border border-red-800/50 text-red-400 rounded-xl shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              BitScribe RX <span className="text-red-500 font-extrabold">• Digital Media Doctor</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              BitScribe RX is the dedicated remediation engine and active file renamer within the BitScribe Digital Media suite. Designed for media enthusiasts, collectors, and server administrators, RX cures chaotic file names, standardizes episodic TV titles, cleans movie metadata tokens, and guarantees collision-free dry-run preflights before executing any disk operations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Tutorials & FAQs + Donation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Tutorials & FAQs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tutorials Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-red-950/40 pb-2">
              <BookOpen className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Tutorials & Guided Workflows
              </h3>
            </div>

            <div className="space-y-3">
              <TutorialAccordion
                title="1. Preset Templates & Custom Token Rules"
                icon={Sliders}
                isOpen={!!openTutorials.presets}
                onToggle={() => toggleTutorial('presets')}
              >
                <p>
                  RX offers built-in presets tailored for common media library conventions:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li>
                    <strong className="text-red-300">Simple Movie:</strong> <code className="text-cyan-300 font-mono text-[11px]">{`{Title} ({Year})`}</code>
                  </li>
                  <li>
                    <strong className="text-red-300">Detailed Media Movie:</strong> <code className="text-cyan-300 font-mono text-[11px]">{`{Title} ({Year}) [{Resolution} {VideoCodec} {AudioCodec}]`}</code>
                  </li>
                  <li>
                    <strong className="text-red-300">Standard TV Series:</strong> <code className="text-cyan-300 font-mono text-[11px]">{`{Title} - {SeasonEpisode} - {EpTitle}`}</code>
                  </li>
                  <li>
                    <strong className="text-red-300">Compact / Initials TV:</strong> <code className="text-cyan-300 font-mono text-[11px]">{`{Initials} {SeasonEpisode}`}</code> (e.g. <em>BtVS S01E02</em>)
                  </li>
                </ul>
                <p className="pt-1">
                  You can click any token chip in the left panel to insert it directly into your pattern template.
                </p>
              </TutorialAccordion>

              <TutorialAccordion
                title="2. Pre-Flight Dry-Run & Collision Detection"
                icon={Shield}
                isOpen={!!openTutorials.collisions}
                onToggle={() => toggleTutorial('collisions')}
              >
                <p>
                  Before applying changes to disk, RX calculates a dry-run diff matrix:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li>Checks if multiple source files map to the exact same target path.</li>
                  <li>Detects if a target file name already exists on disk.</li>
                  <li>Flags suspicious titles or missing required tags (Season, Year, Resolution).</li>
                  <li>Flags illegal OS characters (<code className="text-red-400 font-mono">: * ? " &lt; &gt; |</code>) and sanitizes them automatically.</li>
                </ul>
              </TutorialAccordion>

              <TutorialAccordion
                title="3. Sidecar Tracking (.srt, .nfo, .sub)"
                icon={FileText}
                isOpen={!!openTutorials.sidecars}
                onToggle={() => toggleTutorial('sidecars')}
              >
                <p>
                  When <strong>Auto-track sidecars</strong> is enabled in configuration, RX scans the parent directory for matching subtitle and metadata files sharing the original base name and automatically renames them in tandem with the primary video file.
                </p>
              </TutorialAccordion>
            </div>
          </div>

          {/* FAQs Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-red-950/40 pb-2">
              <HelpCircle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="space-y-3">
              <FaqItem question="Does RX rename files immediately on disk?">
                No! RX operates on a strict dry-run model. Proposed target file names are calculated live in memory first. Files on disk are only modified when you click <strong>Execute Renames</strong>.
              </FaqItem>

              <FaqItem question="Can RX load my BitScribe Steward catalog database?">
                Yes! Click <strong>Load Steward DB</strong> in the top header or in the options tab. RX seamlessly imports items scanned by Steward so you can apply batch renamer rules across your whole catalog.
              </FaqItem>

              <FaqItem question="What happens if a collision is detected?">
                If two files would result in the same target name, RX marks the items with a red <strong>COLLISION</strong> badge and automatically deselects them to prevent file overwrites.
              </FaqItem>

              <FaqItem question="Where can I find execution logs if something fails?">
                Navigate to the <strong>Options</strong> tab to view real-time transaction event logs. You can export complete diagnostics or error logs with a single click.
              </FaqItem>
            </div>
          </div>
        </div>

        {/* Right Column: Support & PayPal Donation */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#0c0f17] border border-red-900/40 shadow-lg space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 shadow-inner">
              <Heart className="w-6 h-6 fill-red-500/20" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white tracking-tight">Support BitScribe Development</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                BitScribe RX is free and open-source software built for the media preservation community.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl w-44 h-44 mx-auto border-2 border-red-900/30 shadow-inner flex items-center justify-center">
              <img
                src={paypalQr}
                alt="Support via PayPal"
                className="w-full h-full object-contain rounded"
              />
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Scan with your phone camera or PayPal app to donate and help support ongoing feature development!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
