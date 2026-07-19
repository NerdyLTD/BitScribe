import React, { useState, useEffect } from 'react';
import { HelpCircle, Terminal, BookOpen, Settings, Layers, Calendar, Info, Subtitles, AlertCircle, ChevronDown, ChevronRight, HelpCircle as FaqIcon, CheckCircle, Folder, Heart, Download, Sliders, Monitor, FileJson, Zap } from 'lucide-react';
import { APP_NAME, APP_VERSION, APP_VERSION_DATE } from '../types';
import paypalQr from '../assets/paypal_qr.png';

interface HelpSectionProps {
  highlightId?: string | null;
  isTourActive?: boolean;
  tourStepIndex?: number;
  activeDemo?: number | null;
}

interface OSSProject {
  name: string;
  url: string;
}

const OSS_PROJECTS: OSSProject[] = [
  { name: "React & React DOM", url: "https://react.dev" },
  { name: "Vite", url: "https://vite.dev" },
  { name: "esbuild", url: "https://esbuild.github.io" },
  { name: "SQLite", url: "https://sqlite.org" },
  { name: "better-sqlite3", url: "https://github.com/WiseLibs/better-sqlite3" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
  { name: "ffprobe-static", url: "https://github.com/eugeneware/ffprobe-static" },
  { name: "exceljs", url: "https://github.com/exceljs/exceljs" },
  { name: "Recharts", url: "https://recharts.org" },
  { name: "Lucide React", url: "https://lucide.dev" },
  { name: "Motion", url: "https://motion.dev" },
  { name: "file-saver", url: "https://github.com/eligrey/FileSaver.js" },
  { name: "Express", url: "https://expressjs.com" },
  { name: "TypeScript", url: "https://www.typescriptlang.org" },
  { name: "Tauri V2", url: "https://v2.tauri.app" }
];

const TutorialAccordion = ({ title, icon: Icon, colorClass, bgClass, isOpen, onToggle, children, id, isHighlighted }: any) => {
  return (
    <div id={id} className={`py-2 px-3 border rounded-xl shadow-md transition-all duration-300 ${isHighlighted ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.01] bg-emerald-500/20' : 'bg-[#14171F] border-[#1e232e]'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 w-fit rounded-lg ${bgClass} ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">{title}</h4>
        </div>
        <div className="text-slate-500 hover:text-slate-300 transition-colors">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[850px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed font-sans pb-1 pl-10">
          {children}
        </div>
      </div>
    </div>
  );
};

interface FaqItemProps {
  id?: string;
  question: string;
  isHighlighted?: boolean;
  children: React.ReactNode;
}

const FaqItem = ({ id, question, isHighlighted, children }: FaqItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div id={id} className={`py-2 px-3 border rounded-xl shadow-md transition-all duration-300 ${isHighlighted ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.01] bg-blue-500/20' : 'bg-[#14171F] border-[#1e232e]'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer select-none gap-3 font-bold text-slate-200 hover:text-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 w-fit rounded-lg bg-blue-500/10 text-blue-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-snug">{question}</span>
        </div>
        <span className="text-slate-500 shrink-0">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="text-[11px] text-slate-400 leading-relaxed font-sans border-t border-[#1e232e]/50 pt-2 mt-2 pl-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function HelpSection({ highlightId, isTourActive, tourStepIndex, activeDemo }: HelpSectionProps) {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [highlightedProjectIndex, setHighlightedProjectIndex] = useState<number>(-1);
  const [highlightedTutorialId, setHighlightedTutorialId] = useState<string | null>(null);
  const [highlightedFaqId, setHighlightedFaqId] = useState<string | null>(null);

  const isOssSlideActive = isTourActive && (tourStepIndex === 36 || activeDemo === 34);
  const isSupportSlideActive = isTourActive && (tourStepIndex === 37 || activeDemo === 35);

  useEffect(() => {
    if (!isOssSlideActive) {
      setHighlightedProjectIndex(-1);
      return;
    }

    setHighlightedProjectIndex(0);
    const interval = setInterval(() => {
      setHighlightedProjectIndex(prev => (prev + 1) % OSS_PROJECTS.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isOssSlideActive]);

  useEffect(() => {
    if (activeDemo === null) {
      setOpenPanels({});
    }
  }, [activeDemo]);

  // Sequential cascading highlights for Step-by-Step Tutorials
  useEffect(() => {
    if (activeDemo === 33 && openPanels['tutorials-main'] === true) {
      const tutorialIds = [
        'help-discovery',
        'help-streaming',
        'help-subtitle-scan',
        'help-duplication-scan',
        'help-anomaly-scan',
        'help-metadata-scan',
        'help-folder-structure',
        'help-streaming-standards',
        'help-data-blueprint'
      ];
      
      let index = 0;
      const initialTimeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (index < tutorialIds.length) {
            setHighlightedTutorialId(tutorialIds[index]);
            index++;
          } else {
            clearInterval(interval);
            setHighlightedTutorialId(null);
            setTimeout(() => {
              setOpenPanels(prev => ({ ...prev, 'tutorials-main': false }));
            }, 300);
          }
        }, 440);
        return () => clearInterval(interval);
      }, 300);

      return () => {
        clearTimeout(initialTimeout);
        setHighlightedTutorialId(null);
      };
    } else {
      setHighlightedTutorialId(null);
    }
  }, [activeDemo, openPanels['tutorials-main']]);

  // Sequential cascading highlights for FAQs
  useEffect(() => {
    if (activeDemo === 33 && openPanels['faqs-main'] === true) {
      const faqIds = [
        'faq-what-is',
        'faq-video-music',
        'faq-streaming-unfriendly',
        'faq-folder-depth',
        'faq-folder-names',
        'faq-specials',
        'faq-extras',
        'faq-bleeding-edge',
        'faq-hardware-examples'
      ];
      
      let index = 0;
      const initialTimeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (index < faqIds.length) {
            setHighlightedFaqId(faqIds[index]);
            index++;
          } else {
            clearInterval(interval);
            setHighlightedFaqId(null);
            setTimeout(() => {
              setOpenPanels(prev => ({ ...prev, 'faqs-main': false }));
            }, 300);
          }
        }, 440);
        return () => clearInterval(interval);
      }, 300);

      return () => {
        clearTimeout(initialTimeout);
        setHighlightedFaqId(null);
      };
    } else {
      setHighlightedFaqId(null);
    }
  }, [activeDemo, openPanels['faqs-main']]);
  
  useEffect(() => {
    if (highlightId) {
      // Map legacy/backwards-compatible IDs correctly
      let targetId = highlightId;
      if (highlightId === 'help-custom-rules') {
        targetId = 'help-discovery'; // fallback to Discovery Mode tutorial
      }
      setOpenPanels(prev => ({ 
        ...prev, 
        [targetId]: true, 
        'help-custom-rules': true,
        'help-streaming': true,
        'tutorials-main': true,
        'faqs-main': true 
      }));
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [highlightId]);

  const togglePanel = (id: string) => {
    setOpenPanels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. FOCUSED VIEW: Open Source Acknowledgments Tour Slide
  if (isOssSlideActive) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center p-4 bg-[#0a0c10]/95 z-[9999] overflow-y-auto animate-fadeIn`} id="help-tab-panel">
        <div 
          id="oss-section" 
          className="space-y-2.5 p-6 sm:p-8 rounded-2xl bg-[#10131b]/95 border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.4)] relative mt-48 z-[10000] max-w-[580px] w-full text-center transform scale-[1.01] transition-all duration-500"
        >
          <h4 className="text-lg font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 animate-pulse fill-rose-500" />
            Open Source Acknowledgments
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto font-sans">
            BitScribe stands on the shoulders of giants! We sincerely thank and celebrate the amazing developers and vibrant open-source communities who made this work freely usable for everyone.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] font-sans list-none pl-0 mt-5">
            {OSS_PROJECTS.map((project, idx) => {
              const isHighlighted = idx === highlightedProjectIndex;
              return (
                <li 
                  key={project.name}
                  className={`transition-all duration-300 p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${
                    isHighlighted 
                      ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-400 text-white scale-105 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10' 
                      : 'bg-[#14171F] border-[#1e232e] text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`font-semibold hover:underline ${isHighlighted ? 'text-indigo-300 text-xs' : 'text-slate-300'}`}
                  >
                    {project.name}
                  </a>
                  {isHighlighted && (
                    <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-bold mt-1 flex items-center gap-1 animate-pulse">
                      ❤️ Thank you!
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // 2. FOCUSED VIEW: PayPal Support Tour Slide
  if (isSupportSlideActive) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center p-4 bg-[#0a0c10]/95 z-[9999] overflow-y-auto animate-fadeIn`} id="help-tab-panel">
        <div 
          id="support-section" 
          className="space-y-2.5 p-6 sm:p-8 rounded-2xl bg-[#10131b]/95 border-2 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)] relative mt-48 z-[10000] max-w-[580px] w-full text-left transform scale-[1.01] transition-all duration-500"
        >
          <h3 className="text-base font-extrabold text-purple-400 flex items-center gap-2 uppercase tracking-wide">
            <Layers className="w-5 h-5 text-purple-400 animate-pulse" />
            Support BitScribe Development
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-center">
            <div className="md:col-span-3 space-y-2 text-slate-300">
              <p className="text-[11px] leading-relaxed font-sans">
                BitScribe is the direct product of a highly collaborative creative partnership between a <strong>Human Product Director</strong> and an <strong>AI Software Architect</strong>.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Together, we have invested well over <strong className="text-emerald-400 font-semibold">300 combined hours</strong> across over 30 consecutive versions to engineer this production-ready library management ecosystem.
              </p>
              <div className="pt-1 text-[11px] text-slate-300 font-sans font-semibold">
                🎁 Leave a Tip or Buy a Coffee
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                If BitScribe has saved you hours of checking codecs, analyzing subtitles, or hunting down duplicates, please consider supporting ongoing maintenance, hosting, and features development!
              </p>
            </div>

            <div className="md:col-span-2 flex flex-col items-center justify-center p-3 bg-[#0d0e12] border border-slate-800/80 rounded-xl space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Support the Project</span>
              
              <div id="support-qr-code" className="p-1.5 bg-white rounded-lg shadow-lg flex items-center justify-center">
                <img 
                  src={paypalQr} 
                  alt="Project QR" 
                  className="w-28 h-28 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <a 
                href="https://www.paypal.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <span>Tip via PayPal</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. STANDARD FULL LAYOUT (Accordions side-by-side, About & OSS lower left, Support lower right)
  return (
    <div className="space-y-3 pt-4 animate-fadeIn" id="help-tab-panel">
      
      {/* Header Bar */}
      <div className="py-2.5 px-4 bg-[#14171F] border border-[#1e232e] rounded-xl shadow-2xl animate-slideDown" id="help-header-bar">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500 font-bold" />
          {APP_NAME} Help Center & Learn Docs
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          The help you need, when you need it.
        </p>
      </div>

      {/* Side-by-side Tutorials and FAQs row under header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full" id="help-accordions-row">
          {/* Step-by-Step Tutorials Section */}
        <div className="space-y-3" id="help-tutorials-container">
          <div 
            id="tutorials-main-header"
            className={`py-2.5 px-4 bg-[#14171F] border rounded-xl shadow-md cursor-pointer select-none transition-all duration-300 ${
              openPanels['tutorials-main'] === true 
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.4)] bg-emerald-500/5' 
                : 'border-[#1e232e] hover:border-emerald-500/30'
            }`}
            onClick={() => togglePanel('tutorials-main')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-emerald-400 font-bold" />
                  Step-by-Step Tutorials
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                  Interactive guides to help you master library scanning features and quality audits.
                </p>
              </div>
              <div className="text-slate-500 hover:text-slate-300 transition-colors">
                {openPanels['tutorials-main'] === true ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>
          </div>
          
          <div className={`space-y-3 transition-all duration-300 ${openPanels['tutorials-main'] === true ? 'block animate-slideDown' : 'hidden'}`}>
            <TutorialAccordion 
              id="help-discovery"
              title="1. Media Discovery" 
              icon={Settings} 
              colorClass="text-blue-400" 
              bgClass="bg-blue-500/10"
              isOpen={openPanels['help-discovery']}
              onToggle={() => togglePanel('help-discovery')}
              isHighlighted={highlightId === 'help-discovery' || highlightedTutorialId === 'help-discovery'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Scans your entire media library into the database. This is the essential starting point to catalog movies, TV shows, and music.
                </p>
              </div>
              <div className="mt-2"><strong>How to Catalog your Inventory:</strong></div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Enable <strong className="text-blue-400">Media Discovery</strong> inside the <strong className="text-white">Options</strong> tab.</li>
                <li>Use specialized presets: <strong className="text-white">Video Only</strong>, <strong className="text-white">Music Only</strong>, or <strong className="text-white">Corruption Scan</strong>.</li>
                <li>Items using rare/unrecognized codecs are logged as "Discovery Skip/Unresolved" for review.</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion 
              id="help-streaming"
              title="2. Stream Audit Scan" 
              icon={Layers} 
              colorClass="text-emerald-400" 
              bgClass="bg-emerald-500/10"
              isOpen={openPanels['help-streaming'] || openPanels['help-custom-rules']}
              onToggle={() => togglePanel('help-streaming')}
              isHighlighted={highlightId === 'help-streaming' || highlightId === 'help-custom-rules' || highlightedTutorialId === 'help-streaming'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Evaluates compatibility against standard playback constraints. Identifies files that require server transcoding for seamless streaming.
                </p>
              </div>
              <div className="mt-2"><strong>How to Optimize Compatibility:</strong></div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Open <strong className="text-white">Options</strong> and check <strong className="text-emerald-400">Stream Audit Scan</strong>.</li>
                <li>Toggle standard presets: <strong className="text-white">Modern Standards (2015+ HW)</strong> (HEVC & EAC3), <strong className="text-white">Legacy Standards</strong> (H.264 & AAC), or <strong className="text-rose-400">Bleeding Edge</strong> (lossless audio).</li>
                <li><strong>Note:</strong> DTS is disabled in Modern by default due to dropped TV vendor support, but can be enabled in Options manually!</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion 
              id="help-subtitle-scan"
              title="3. Subtitle Audit" 
              icon={Subtitles} 
              colorClass="text-purple-400" 
              bgClass="bg-purple-500/10"
              isOpen={openPanels['help-subtitle-scan']}
              onToggle={() => togglePanel('help-subtitle-scan')}
              isHighlighted={highlightId === 'help-subtitle-scan' || highlightedTutorialId === 'help-subtitle-scan'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Identifies files with missing subtitles and classifies formats (SRT, PGS, VOB). Image-based subtitle formats (PGS/VOB) often force high-CPU server-side transcoding.
                </p>
              </div>
              <div className="mt-2"><strong>How to Audit Subtitles:</strong></div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Check <strong className="text-purple-400">Subtitle Audit</strong> in Options.</li>
                <li>The system indexes internal tracks and checks adjacent paths for companion <strong className="text-white">.srt</strong> files.</li>
                <li>Dashboard displays missing subtitles highlights to ensure full streaming accessibility.</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion 
              id="help-duplication-scan"
              title="4. Media Duplication Audit" 
              icon={Layers} 
              colorClass="text-orange-400" 
              bgClass="bg-orange-500/10"
              isOpen={openPanels['help-duplication-scan']}
              onToggle={() => togglePanel('help-duplication-scan')}
              isHighlighted={highlightId === 'help-duplication-scan' || highlightedTutorialId === 'help-duplication-scan'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Identifies redundant assets (e.g., duplicate 1080p and 4K movies) to save storage.
                </p>
              </div>
              <div className="mt-2"><strong>How to Audit Duplicates:</strong></div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Enable general duplication check or select <strong className="text-white">Video</strong> / <strong className="text-white">Music</strong> toggles.</li>
                <li><strong>Video matches:</strong> Normalizes paths and groups files within a <strong className="text-white">3-minute duration window</strong>.</li>
                <li><strong>Music matches:</strong> Evaluates ID3 Tags (Title & Artist) with a tight <strong className="text-white">30-second duration gate</strong>.</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion 
              id="help-anomaly-scan"
              title="5. Quality Audit" 
              icon={AlertCircle} 
              colorClass="text-rose-400" 
              bgClass="bg-rose-500/10"
              isOpen={openPanels['help-anomaly-scan']}
              onToggle={() => togglePanel('help-anomaly-scan')}
              isHighlighted={highlightId === 'help-anomaly-scan' || highlightedTutorialId === 'help-anomaly-scan'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Analyzes bitrate-to-resolution ratios to detect bloated or starved files (e.g. 1080p transcodes exceeding 30 Mbps, or pixelated low-bitrate feeds).
                </p>
              </div>
              <div className="mt-2"><strong>How to Identify Anomalies:</strong></div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Check <strong className="text-rose-400">Quality Audit</strong> in Options.</li>
                <li><strong>Bloated Files:</strong> Highlights files eating extreme bitrates.</li>
                <li><strong>Starved Files:</strong> Pins down extremely compressed video streams below acceptable benchmarks.</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion
              id="help-metadata-scan"
              title="6. Metadata Completeness Audit"
              icon={Info}
              colorClass="text-teal-400"
              bgClass="bg-teal-500/10"
              isOpen={openPanels['help-metadata-scan']}
              onToggle={() => togglePanel('help-metadata-scan')}
              isHighlighted={highlightId === 'help-metadata-scan' || highlightedTutorialId === 'help-metadata-scan'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">What it does</span>
                <p className="mt-0.5 text-slate-300 leading-normal">
                  Scans embedded container tags to ensure Title, Artist, Director, and Release Year properties are fully populated.
                </p>
              </div>
              <div className="mt-2"><strong>How to Validate Metadata:</strong></div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Check <strong className="text-teal-400">Metadata Audit</strong> in Options.</li>
                <li>Reviews missing tag charts and compares raw tags to clean, parsed filenames side-by-side in Excel.</li>
              </ol>
            </TutorialAccordion>

            <TutorialAccordion
              id="help-folder-structure"
              title="7. Recommended Folder Structure"
              icon={Folder}
              colorClass="text-amber-400"
              bgClass="bg-amber-500/10"
              isOpen={openPanels['help-folder-structure']}
              onToggle={() => togglePanel('help-folder-structure')}
              isHighlighted={highlightId === 'help-folder-structure' || highlightedTutorialId === 'help-folder-structure'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dynamic Layout Organization</span>
                <p className="mt-0.5 text-slate-300 leading-normal font-sans">
                  BitScribe parses paths based on folder names: <span className="text-amber-400 font-semibold">Movies, TV, Series, Documentaries, DocuSeries, Plays, Specials, Shorts, Extras, Music, Audio, Soundtracks, Compilations, and Concerts</span>.
                </p>
              </div>
              <div className="mt-2 text-slate-300 font-semibold mb-1">Recommended Library Blueprint:</div>
              <div className="p-2.5 bg-[#0a0c10] border border-[#1e232e] rounded-lg font-mono text-[10px] text-emerald-400 leading-tight space-y-1 overflow-x-auto whitespace-pre animate-fadeIn">
                {`📂 MediaRoot/
├── 📂 Movies/
│   ├── 📂 A/
│   │   └── 📂 MovieNameFolder/
│   │       └── 🎬 Animal Party (2019).mkv
│   └── 📂 A/ (Alternative Nested Layout)
│       ├── 🎬 Animal Party (2019).mkv
│       └── 📂 Extras (Featurettes, Interviews, Deleted Scenes, etc)/
│           └── 🎥 Deleted Scene Name.mp4
├── 📂 TV/
│   └── 📂 Show Name Folder/
│       ├── 📂 Season Number Folder/
│       │   └── 🎬 Show Name - S01E02 - Episode Title.mkv
│       └── 📂 Extras/
│           └── 🎥 Interview.mp4
├── 📂 Documentaries/
│   └── 📂 Documentary Folder/
│       └── 🎬 Documentary Title (2019).mkv
├── 📂 DocuSeries/
│   └── 📂 DocuSeries Folder/
│       └── 🎬 DocuSeries Title - Episode Number - (2022).mkv
├── 📂 Plays/
│   └── 🎬 Play Title - (1982).mp4
├── 📂 Specials/
│   └── 🎬 Special Title (1964).mkv
├── 📂 Shorts/ (or Shorts/Short Films/)
│   └── 📂 Short Film Title Folder/
│       └── 🎬 Title - (2013).mkv
└── 📂 Music/
    ├── 📂 By Artist/
    │   └── 📂 Artist Name Folder/
    │       └── 📂 Album Title Folder/
    │           └── 🎵 Track Number - Song Title.flac (.mp3/.aiff)
    ├── 📂 Soundtracks/
    │   └── 📂 Movie/TV/Game Name Folder/
    │       └── 📂 Disk Number (if present)/
    │           └── 🎵 Track Number - Song Title.mp3
    ├── 📂 Compilations/
    │   └── 📂 Compilation Name Folder/
    │       └── 📂 Disk Number (if present)/
    │           └── 🎵 Track Number - Song Title.aiff
    └── 📂 Concerts/
        └── 📂 Concert Name Folder/
            └── 📂 Disk Number (if present)/
                └── 🎵 Track Number - Song Title.aiff`}
              </div>
            </TutorialAccordion>

            <TutorialAccordion
              id="help-streaming-standards"
              title="8. Streaming Standards Explained"
              icon={BookOpen}
              colorClass="text-pink-400"
              bgClass="bg-pink-500/10"
              isOpen={openPanels['help-streaming-standards']}
              onToggle={() => togglePanel('help-streaming-standards')}
              isHighlighted={highlightId === 'help-streaming-standards' || highlightedTutorialId === 'help-streaming-standards'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Direct Play Optimization Rules</span>
                <p className="mt-0.5 text-slate-300 leading-normal font-sans">
                  The primary goal of streaming standards is to maximize <strong>Direct Play</strong>, avoiding high-CPU server-side transcoding that triggers buffering and freezes on client devices.
                </p>
              </div>
              <div className="space-y-3 font-sans text-[11px] text-slate-300 leading-relaxed">
                <div>
                  <strong className="text-white block mb-0.5">🟢 Modern Standards (2015+ HW):</strong>
                  <p className="pl-3 border-l border-emerald-500/30">
                    Targets standard streaming hardware (Apple TV 4K, Nvidia Shield, modern Smart TVs, Chromecast with Google TV).
                    <br />• <strong>Video:</strong> HEVC (H.265) or H.264 codecs. Fully supports <strong>8-bit</strong> and premium cinematic <strong>10-bit video bit depth</strong> for perfect High Dynamic Range (HDR10 and Dolby Vision) rendering.
                    <br />• <strong>Audio:</strong> EAC3 (Dolby Digital Plus / Atmos), AC3 (Dolby Digital 5.1/Stereo), and highly compatible AAC stereo up to 48 kHz.
                  </p>
                </div>
                <div>
                  <strong className="text-white block mb-0.5">🟡 Legacy Standards (Broad/Older HW):</strong>
                  <p className="pl-3 border-l border-amber-500/30">
                    Targets older, legacy, or entry-level media players, browsers, and mobile devices.
                    <br />• <strong>Video:</strong> Strict H.264 codec, limited to standard <strong>8-bit color space</strong>.
                    <br />• <strong>Audio:</strong> Safe AAC and MP3 stereo tracks, or legacy Dolby Digital AC3 surround streams.
                  </p>
                </div>
                <div>
                  <strong className="text-rose-400 block mb-0.5">🔮 Bleeding Edge (High Fidelity & Audiophile):</strong>
                  <p className="pl-3 border-l border-rose-500/30">
                    Requires flagship media playback hardware or dedicated A/V receivers with passthrough configuration.
                    <br />• <strong>Video:</strong> AV1, VVC, or VP9 high-efficiency codecs.
                    <br />• <strong>Audio:</strong> TrueHD (including Atmos metadata), DTS-HD Master Audio, and lossless high-fidelity formats like FLAC or PCM. Fully indexes audiophile-grade <strong>high-resolution audio sample rates</strong> (e.g., 44.1 kHz, 48 kHz, up to high-fidelity 96 kHz or 192 kHz).
                  </p>
                </div>
                <div>
                  <strong className="text-red-400 block mb-0.5">🚨 Streaming Unfriendly (Transcoding Risk):</strong>
                  <p className="pl-3 border-l border-red-500/30">
                    Outdated codecs (DivX, Xvid, WMV), legacy containers (such as AVI), or image-based subtitles (PGS, VOBSub). These force heavy, real-time CPU transcoding cycles and are flagged by Steward as immediate remediation targets.
                  </p>
                </div>
              </div>
            </TutorialAccordion>

            <TutorialAccordion
              id="help-data-blueprint"
              title="9. Data Collection, Storage, and Processing Blueprint"
              icon={Info}
              colorClass="text-blue-400"
              bgClass="bg-blue-500/10"
              isOpen={openPanels['help-data-blueprint']}
              onToggle={() => togglePanel('help-data-blueprint')}
              isHighlighted={highlightId === 'help-data-blueprint' || highlightedTutorialId === 'help-data-blueprint'}
            >
              <div className="mb-2 px-2.5 py-2 rounded bg-slate-500/5 border border-slate-800/30">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Privacy & Storage Integrity</span>
                <p className="mt-0.5 text-slate-300 leading-normal font-sans">
                  A transparent breakdown of how BitScribe protects your data privacy, handles file characteristics, and executes its scanning algorithms.
                </p>
              </div>
              <div className="space-y-3 font-sans text-[11px] text-slate-300 leading-relaxed">
                <div>
                  <strong className="text-white block mb-0.5">🔒 Data Collection & Privacy Policy:</strong>
                  <p className="text-slate-400 pl-3 border-l border-blue-500/30">
                    BitScribe Digital Media Library Steward operates under a strict, absolute <strong>Zero Telemetry Policy</strong>. The application does not collect, track, aggregate, or upload your media directory lists, filenames, tag titles, file hashes, or storage statistics to any external servers, cloud analytics platforms, or third-party tracking databases. Your media library is entirely your own private asset.
                  </p>
                </div>
                <div>
                  <strong className="text-white block mb-0.5">💾 Local Database Storage:</strong>
                  <p className="text-slate-400 pl-3 border-l border-blue-500/30">
                    All scanned library coordinates, file system paths, technical codec layouts, structural properties (bit depths, sample rates, chapter counts), and audit logs are stored strictly inside a local, highly lightweight <strong>SQLite database</strong> located entirely on your own local hard drive. The database is housed inside the <code className="text-blue-400 font-mono text-[10px]">./BitScribeDB</code> directory or standard sandboxed local app folders (under Tauri). No account setup, passwords, or active cloud database services are ever utilized.
                  </p>
                </div>
                <div>
                  <strong className="text-white block mb-0.5">⚙️ Offline Local Processing:</strong>
                  <p className="text-slate-400 pl-3 border-l border-blue-500/30">
                    All media analytical processing occurs <strong>100% locally</strong> on your own system CPU. Analysis is executed using an offline, sandboxed, bundled <code className="text-emerald-400 font-mono text-[10px]">ffprobe</code> binary wrapper executed as a secure native desktop sidecar. Video, audio, and subtitle stream headers are read and parsed completely offline. No third-party APIs, web scraping, or online metadata indexes are contacted.
                  </p>
                </div>
              </div>
            </TutorialAccordion>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-3" id="help-faqs-container">
          <div 
            id="faqs-main-header"
            className={`py-2.5 px-4 bg-[#14171F] border rounded-xl shadow-md cursor-pointer select-none transition-all duration-300 ${
              openPanels['faqs-main'] === true 
                ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.4)] bg-blue-500/5' 
                : 'border-[#1e232e] hover:border-blue-500/30'
            }`}
            onClick={() => togglePanel('faqs-main')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                  <FaqIcon className="w-4 h-4 text-blue-400 font-bold" />
                  Frequently Asked Questions
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                  Troubleshooting checklists, scanner parameters, and client direct play support answers.
                </p>
              </div>
              <div className="text-slate-500 hover:text-slate-300 transition-colors">
                {openPanels['faqs-main'] === true ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>
          </div>

          <div className={`space-y-3 transition-all duration-300 ${openPanels['faqs-main'] === true ? 'block animate-slideDown' : 'hidden'}`}>
            <FaqItem 
              id="faq-what-is"
              question="What is BitScribe Steward?"
              isHighlighted={highlightedFaqId === 'faq-what-is'}
            >
              <p>
                <strong>BitScribe Digital Media Library Steward (DMLS)</strong> is a powerful discovery tool that seamlessly catalogs movies, TV shows, music, and documentaries.
              </p>
              <p className="mt-1.5">
                Once scanned, it provides actionable insights—helping you locate missing subtitles, pinpoint bloated files, and uncover duplicate media assets.
              </p>
            </FaqItem>

            <FaqItem 
              id="faq-video-music"
              question="How does Video vs Music Duplication reporting differ?"
              isHighlighted={highlightedFaqId === 'faq-video-music'}
            >
              <p>
                <strong>Video Duplication:</strong> Strips release tags and groups matching films within a 3-minute playtime limit.
              </p>
              <p className="mt-1">
                <strong>Music Duplication:</strong> Matches ID3 metadata (Title + Artist) within a tight 30-second playtime window, highlighting lower-bitrate duplicates to keep lossless or 320Kbps standards.
              </p>
            </FaqItem>

            <FaqItem 
              id="faq-streaming-unfriendly"
              question="What makes a video file &quot;Streaming Unfriendly&quot;?"
              isHighlighted={highlightedFaqId === 'faq-streaming-unfriendly'}
            >
              Files are flagged as unfriendly if they use mismatched codecs, outdated containers (like AVI), or rare codecs that lack native consumer hardware acceleration, forcing high-CPU server-side transcoding.
            </FaqItem>

            <FaqItem 
              id="faq-folder-depth"
              question="Can I organize my movies into alphabetical or nested subfolders?"
              isHighlighted={highlightedFaqId === 'faq-folder-depth'}
            >
              <strong>Yes, absolutely!</strong> BitScribe scans all directory levels. As long as some parent folder contains a matching category keyword (like <code className="text-amber-400 font-mono text-[10px]">Movies</code>, even nested like <code className="text-blue-400 font-mono text-[10px]">Movies/A/Inception/Inception.mkv</code>), it is cataloged perfectly!
            </FaqItem>

            <FaqItem 
              id="faq-folder-names"
              question="What folder names does BitScribe recognize natively?"
              isHighlighted={highlightedFaqId === 'faq-folder-names'}
            >
              <ul className="list-disc list-inside space-y-0.5 mt-1 text-slate-300">
                <li><strong className="text-amber-400">Movies:</strong> Movies, Movie, Films, Film, Cinema, UHD, Foreign</li>
                <li><strong className="text-amber-400">TV Shows:</strong> TV Shows, TV Show, TV, Series, Shows, Cartoons, Anime</li>
                <li><strong className="text-amber-400">DocuSeries:</strong> DocuSeries, Documentary Series, Documentary Show</li>
                <li><strong className="text-amber-400">Documentaries:</strong> Documentaries, Documentary, Docs, Doc</li>
                <li><strong className="text-amber-400">Music:</strong> Music, Audio, Soundtracks, Compilations</li>
              </ul>
            </FaqItem>

            <FaqItem 
              id="faq-specials"
              question="I have a top-level library folder called &quot;Specials&quot;. How is this handled?"
              isHighlighted={highlightedFaqId === 'faq-specials'}
            >
              <p>
                <strong>BitScribe handles this beautifully!</strong> Top-level folders named <code className="text-amber-400 font-mono text-[10px]">Specials</code> are categorized as a standalone <strong>Specials</strong> section instead of being mixed into general TV shows or movies.
              </p>
            </FaqItem>

            <FaqItem 
              id="faq-extras"
              question="What happens if an &quot;Extras&quot; folder is inside a &quot;Season&quot; folder?"
              isHighlighted={highlightedFaqId === 'faq-extras'}
            >
              BitScribe recursively climbs the folder tree to ignore the season container (e.g. <code className="text-blue-400 font-mono text-[10px]">Season 01</code>) and correctly maps the extra files to the parent TV Show group.
            </FaqItem>

            <FaqItem 
              id="faq-bleeding-edge"
              question="Why are 'Bleeding Edge' files flagged as a transcoding or buffering risk?"
              isHighlighted={highlightedFaqId === 'faq-bleeding-edge'}
            >
              They use lossless codecs (TrueHD, DTS-HD MA) or uncommon formats (AV1) that are not natively decoded by the vast majority of standard smart TVs or streaming sticks, triggering forced, high-CPU transcode cycles on your server.
            </FaqItem>

            <FaqItem 
              id="faq-hardware-examples"
              question="What are some examples of hardware supported at each streaming level?"
              isHighlighted={highlightedFaqId === 'faq-hardware-examples'}
            >
              <div className="space-y-3 mt-2 font-sans">
                <div>
                  <strong className="text-slate-200">Legacy Standards</strong>
                  <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5 pl-1">
                    <li>Apple TV (3rd Gen & older), Chromecast (1st/2nd Gen), Web Browsers.</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-white">Modern Standards</strong>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5 pl-1">
                    <li>Apple TV 4K, Nvidia Shield TV, Roku Ultra, Fire TV 4K, Modern Smart TVs.</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-rose-400">Bleeding Edge</strong>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5 pl-1">
                    <li>Nvidia Shield Pro, Premium AVRs with eARC, Flagship AV1 TVs (2022+).</li>
                  </ul>
                </div>
              </div>
            </FaqItem>
          </div>
        </div>
      </div>



      {/* Lower Details Row (About Box, OSS section, and PayPal Support Section) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 w-full" id="help-details-row">
        
        {/* Left Column: About Box and Open Source Acknowledgments */}
        <div className="space-y-4" id="help-left-details">
          
          {/* About Box */}
          <div className="py-3 px-4 bg-[#14171F] border border-[#1e232e] rounded-xl shadow-2xl space-y-4" id="about-bitscribe-card">
            <h3 className="text-xs font-bold text-[#a855f7] flex items-center gap-2 uppercase tracking-wide">
              <Info className="w-4 h-4" />
              BitScribe's Lineage
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-b border-slate-800 py-4 text-xs font-sans">
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">App Name</div>
                <div className="text-slate-200 font-semibold mt-1">{APP_NAME}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Release Version</div>
                <div className="text-slate-200 font-bold font-mono mt-1 text-blue-400">{APP_VERSION}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Publication Date</div>
                <div className="text-slate-200 font-semibold mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {APP_VERSION_DATE}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-b border-slate-800/40 pb-3">
              <div 
                className="flex items-center justify-between cursor-pointer select-none py-1 group"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              >
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">Feature Release History:</h4>
                <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
                  {isHistoryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${isHistoryExpanded ? 'max-h-[1400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed font-sans list-disc list-inside pl-1">
                  <li><strong className="text-slate-300">v0.1</strong>: The genesis version! Began as a humble PowerShell script leveraging ffprobe to identify "Plex friendly" media, featuring a rudimentary UI and simple Excel reporting.</li>
                  <li><strong className="text-slate-300">v0.2 - v0.7</strong>: Transitioned to Python, establishing early graphical foundations using Tkinter, and progressively unlocking deeper ffprobe analysis with refined user controls.</li>
                  <li><strong className="text-slate-300">v0.8</strong>: Side-by-side configurations layout, iOS-style rounded corners similar to mobile sheets, simplified layperson step tutorials, and full audio codecs distribution parsing.</li>
                  <li><strong className="text-slate-300">v0.9</strong>: Dashboard UX improvements, removal of classic menu bar, chart limit removal, unified path entries.</li>
                  <li><strong className="text-slate-300">v1.0 (BitScribe Rebirth)</strong>: A massive architectural pivot. The tool was completely rewritten as a React application packaged with Electron (transitioning from Tkinter), adopting a stunning, highly-responsive modern web UI.</li>
                  <li><strong className="text-slate-300">v1.1</strong>: Combined Video and Music scan controls into unified logic, resolving duplication and discrepancy errors. Enabled exact dimensional property resolution mapping (width x height) instead of generic markers.</li>
                  <li><strong className="text-slate-300">v1.2</strong>: Subtitle PGS/VOB formatting analyzer, explicit container vs. codec tracking (separating MP4/MKV metrics from H264/HEVC), and introduced the dynamic tour guide layer.</li>
                  <li><strong className="text-slate-300">v1.3</strong>: Migrated desktop runtime from Electron to Tauri V2 (Rust) for performance, lightweight packaging, and direct system execution. Added custom Excel columns generator and interactive rule editor schemas.</li>
                  <li><strong className="text-slate-300">v1.4.0</strong>: Restored full-stack scanning environment through Tauri, resolved directory mapping bugs for Docuseries/Documentary Series to guarantee database column parity, and established automated linter validation.</li>
                  <li><strong className="text-slate-300">v1.4.1</strong>: Resolved Discovery Mode grid spacing stretching on standard screens, and introduced adaptive flex-wrap layout wrappers on Discovery Mode headers to prevent overlapping control links.</li>
                  <li><strong className="text-slate-300">v1.4.2</strong>: Implemented toggling for custom metric presets (C1, C2, C3) on a second click, and streamlined Media Discovery audits by excluding the "Corrupted" category from report exports.</li>
                  <li><strong className="text-slate-300">v1.4.3 (Latest Release)</strong>: Split missing Title/Year tags into distinct Video/Music categories to guarantee pristine metrics, renamed metrics filter to "Music Only", and established strict asset protections for core branding files.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Open Source Acknowledgments */}
          <div id="oss-section" className="space-y-2 p-3 rounded-xl bg-slate-900/30 border border-[#1e232e] transition-all duration-300">
            <h4 className="text-xs font-bold text-slate-200">Open Source Acknowledgments</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              This application is built using the following awesome open-source software libraries. We sincerely appreciate the developers who made this app possible!
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400 font-sans list-none pl-0 mt-2">
              {OSS_PROJECTS.map((project) => (
                <li key={project.name} className="hover:bg-slate-800/20 px-1.5 py-0.5 rounded">
                  <a href={project.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">
                    {project.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Human-AI Collaboration & Support Section */}
        <div className="space-y-4" id="help-right-details">
          <div id="support-section" className="py-4 px-5 bg-gradient-to-br from-[#1b172a] to-[#14171F] border border-purple-500/30 rounded-xl shadow-2xl space-y-4 transition-all duration-300">
            <h3 className="text-xs font-bold text-purple-400 flex items-center gap-2 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-purple-400" />
              The Story Behind BitScribe: Human-AI Collaboration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-3 space-y-3 text-slate-300">
                <p className="text-xs leading-relaxed font-sans">
                  BitScribe Digital Media Library Steward (DMLS) is the direct product of a close, highly iterative creative partnership between a <strong>Human Product Director</strong> and an <strong>AI Software Architect</strong>.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Together, we have invested well over <strong className="text-emerald-400 font-semibold">300 combined hours</strong> of dedication across 22+ consecutive versions—from a tiny experimental command line script (v0.1) into this production-grade, highly-optimized full-stack management dashboard. 
                </p>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The human half of the team provided a comprehensive vision, direction, usability standards, and hours of hands-on testing. The AI half of the team built complex analytics engines, database integrations and responsive UI components.
                </p>
                <div className="pt-2 text-xs text-slate-300 font-sans font-semibold">
                  🎁 Support the Project
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  If BitScribe has saved you hours of checking formats or searching for duplicates, please consider buying me a coffee! Your support directly sustains ongoing maintenance and hosting research.
                </p>
              </div>

              <div className="md:col-span-2 flex flex-col items-center justify-center p-4 bg-[#0d0e12] border border-slate-800/80 rounded-xl space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Support the Project</span>
                
                <div id="support-qr-code" className="p-2 bg-white rounded-lg shadow-lg flex items-center justify-center">
                  <img 
                    src={paypalQr} 
                    alt="Project QR" 
                    className="w-32 h-32 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <a 
                  href="https://www.paypal.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <span>Leave a Tip via PayPal</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
