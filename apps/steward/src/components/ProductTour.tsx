import React from 'react';
import { BitsyCharacter } from '@bitscribe/ui-components';
import { Joyride, EventData, Step, TooltipRenderProps } from 'react-joyride';

interface ProductTourProps {
  run: boolean;
  stepIndex: number;
  onFinish: () => void;
  onCancel: () => void;
  onRemindLater: () => void;
  onJoyrideCallback: (data: EventData) => void;
  isDemoRunning?: boolean;
}

export const TOUR_STEPS: Step[] = [
  // ----------------------------------------------------
  // WELCOME (REVISED)
  // ----------------------------------------------------
  {
    target: 'body',
    skipBeacon: true,
    placement: 'center',
    isIntro: true,
    bitsyMood: 'excited',
    bitsyTalking: true,
    title: 'Welcome to BitScribe',
    content: "I'm Bitsy! I'll be your guide, showing you the many useful features of BitScribe Media Library Steward. In the Media Scanner section, we'll learn how to add your library folders, start scanning, export pre-made and custom reports, and where you can find technical troubleshooting information.",
  },
  // ----------------------------------------------------
  // LEFT PANE (SIDEBAR) - TOP TO BOTTOM
  // ----------------------------------------------------
  {
    target: '#paths-section',
    skipBeacon: true,
    placement: 'right',
    title: 'Scan Paths',
    content: 'Add the directories where your media files are stored. You can add local or network paths and toggle them individually before scanning.',
  },
  {
    target: '#scan-controls-section',
    skipBeacon: true,
    placement: 'right',
    title: 'Scan Controls',
    content: 'Control your scans here. Start, pause, or stop the analysis. Use Quick Refresh to rapidly scan for new or modified files without re-processing unchanged ones.',
  },
  {
    target: '#export-section',
    skipBeacon: true,
    placement: 'right',
    title: 'Export & Reports',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>Choose your export formats and report types here. You can pick which columns you want using the Custom Fields profile or the Columns selector.</p>
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
      </div>
    ),
  },
  {
    target: '#btn-custom-fields-popover',
    skipBeacon: true,
    placement: 'right',
    title: 'Custom Report Columns',
    content: "Deselect or select individual columns to craft the perfect bespoke spreadsheet report structure before downloading your custom asset audit.",
  },
  {
    target: '#troubleshooting-section',
    skipBeacon: true,
    placement: 'right',
    title: 'Troubleshooting',
    content: (
      <div className="flex flex-col gap-2">
        <p>Access Diagnostics, Logs and this tour from here. The Clear Cache button safely clears dashboard data without affecting the database.</p>
        
      </div>
    ),
  },
  // ----------------------------------------------------
  // APP HEADER (MAIN SCANNER - SCAN MODE / LIBRARY INVENTORY)
  // ----------------------------------------------------
  {
    target: '#scan-mode-header-display',
    skipBeacon: true,
    placement: 'right',
    title: 'Scan Mode',
    content: "Active Scan Mode. Choose from the dropdown or visit Options to customize your scan",
  },
  {
    target: '#library-inventory-header-display',
    skipBeacon: true,
    placement: 'left',
    title: 'Library Inventory',
    content: "Monitor the exact total number of items indexed in your server database in real-time.",
  },
  // ----------------------------------------------------
  // METRICS FILTER ROW
  // ----------------------------------------------------
  {
    target: '#metrics-dashboard-filter-wrapper',
    skipBeacon: true,
    placement: 'left',
    title: 'Metrics Filter Mode',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
        <p>The <strong>Metrics Filter Mode</strong> lets you control how charts aggregate your media metrics:</p>
        <ul className="list-disc list-inside text-xs space-y-1 text-amber-950">
          <li><strong>Category Mode:</strong> Aggregates metrics globally across all paths by media type (e.g. Movies, TV, Music).</li>
          <li><strong>Folder Mode:</strong> Dynamically isolates charts to focus only on specific root directories and sub-folders you've scanned.</li>
        </ul>
      </div>
    ),
  },
    // ----------------------------------------------------
  // METRICS BLOCKS - ROW 1
  // ----------------------------------------------------
{
    target: '#library-overview-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Library Overview',
    content: "Get a high-level summary of your media library footprint, including the total count of scanned files, aggregate storage size, and unrecognized assets.",
  },
{
    target: '#stream-audit-card',
    skipBeacon: true,
    placement: 'left',
    title: 'Streaming Readiness',
    content: "Review streaming compatibility against clear cutoffs (like 2015+ HW). Detects 'Bleeding Edge' streams (lossless or uncommon audio/video formats) carrying high transcoding & buffering risks.",
  },
  // ----------------------------------------------------
  // METRICS BLOCKS - ROW 2
  // ----------------------------------------------------
{
    target: '#video-codecs-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Video Codecs',
    content: "Review the distribution of video codecs across your library. Identify older or unsupported formats easily.",
  },
{
    target: '#audio-codecs-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Audio Codecs',
    content: "See what audio codecs your videos use, helping you spot formats that might trigger audio transcoding on your playback devices.",
  },
{
    target: '#containers-card',
    skipBeacon: true,
    placement: 'left',
    title: 'Containers',
    content: "A breakdown of video containers (like MKV, MP4) in your library. Consistency in container formats improves direct play compatibility on streaming devices.",
  },
{
    target: '#music-codecs-card',
    skipBeacon: true,
    placement: 'left',
    title: 'Music Codecs',
    content: "A breakdown of the music codecs used in your library, such as FLAC or MP3.",
  },
  // ----------------------------------------------------
  // METRICS BLOCKS - ROW 3
  // ----------------------------------------------------
{
    target: '#metadata-completeness-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Metadata Completeness',
    content: "View the overall embedded metadata accuracy and verification rate of your music and video libraries.",
  },
{
    target: '#missing-metadata-card',
    skipBeacon: true,
    placement: 'left',
    title: 'Missing Metadata',
    content: "Shows files lacking critical embedded tags like Title, Artist, or Release Year. Video Excel reports now feature side-by-side 'Cleaned Title' comparisons to audit raw tags against cleaned ones.",
  },
  // ----------------------------------------------------
  // METRICS BLOCKS - ROW 4
  // ----------------------------------------------------
{
    target: '#subtitle-audit-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Missing Subtitles',
    content: "Highlights video files that are missing embedded or external subtitle tracks.",
  },
{
    target: '#quality-anomalies-card',
    skipBeacon: true,
    placement: 'left',
    title: 'Quality Anomalies',
    content: "Detect stream encoding issues with abnormal bitrates, such as starved audio tracks or bloated video profiles.",
  },
  // ----------------------------------------------------
  // METRICS BLOCKS - ROW 5
  // ----------------------------------------------------
{
    target: '#media-duplicates-card',
    skipBeacon: true,
    placement: 'right',
    title: 'Media Duplicates',
    content: "Identify duplicate video or music files taking up unnecessary space in your library.",
  },
  // ----------------------------------------------------
  // OTHER SECTIONS (LIBRARY GRID, OPTIONS, HELP, DONATION)
  // ----------------------------------------------------
  {
    target: 'body',
    skipBeacon: true,
    placement: 'center',
    isIntro: true,
    bitsyMood: 'excited',
    bitsyTalking: true,
    title: "Let's Talk Media!",
    content: "Welcome to the Media Library! We'll learn how to search & sort your indexed files, filter lists, customize columns, and visually review your media library.",
  },
  {
    target: '#file-registry-header',
    skipBeacon: true,
    placement: 'bottom',
    title: 'Library Scan Details',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p className="text-[#5c3f11] text-sm font-semibold">An interactive, responsive grid for viewing and sorting your media library's scanned items and properties.</p>
      </div>
    ),
  },
  {
    target: '#table-filter-bar',
    skipBeacon: true,
    placement: 'left',
    title: 'See only what you need',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
        <p className="text-[#5c3f11] text-sm font-semibold leading-relaxed">
          The Library Scan Details offers complete interactive control over your files:
        </p>
        <ul className="list-disc list-inside text-xs text-[#5c3f11]/90 space-y-1.5 pl-1 font-semibold leading-relaxed">
          <li><strong>Category Filter:</strong> Instantly switch between Movies, TV Shows, and Music.</li>
          <li><strong>Sort Columns:</strong> Click column headers to toggle sorting orders.</li>
          <li><strong>Customize Columns:</strong> Choose exactly which metadata fields to display.</li>
          <li><strong>Search Queries:</strong> Filter your library by names, codecs, or containers.</li>
          <li><strong>Smart Audio Display:</strong> Audio codecs are combined with exact channel counts (e.g. AAC (2ch), AC3 (6ch)) directly inside the library grid.</li>
        </ul>
      </div>
    ),
  },
  {
    target: 'body',
    skipBeacon: true,
    placement: 'center',
    isIntro: true,
    bitsyMood: 'neutral',
    bitsyTalking: true,
    title: "We have Options!",
    content: "Here on the Options page, we'll learn how to customize scan filters, adjust global and data options, and manage our simulated demo database environment.",
  },
  {
    target: '#options-header-bar',
    skipBeacon: true,
    placement: 'left',
    title: 'Options & Scan Profiles',
    content: 'Customize the specific parameters for each scan profile here. Tweak codecs, metadata requirements, and custom report columns to mold the analysis to your exact media standards.',
  },
  {
    target: '#btn-options-reset-defaults',
    skipBeacon: true,
    placement: 'right',
    title: 'Reset to Defaults',
    content: 'Instantly restore all codecs, bitrates, subtitle rules, and column settings to the factory-recommended values.',
  },

  {
    target: '#discovery-mode-settings-card',
    skipBeacon: true,
    placement: 'right',
    floaterProps: { disableFlip: true },
    title: 'Discovery Mode Options',
    content: 'Configure whether rare/unknown codecs are skipped or allowed during scan, and select which categories are scanned.',
  },
  {
    target: '#streaming-compatibility-settings',
    skipBeacon: true,
    placement: 'left',
    floaterProps: { disableFlip: true },
    title: 'Streaming Compatibility',
    content: 'Customize the Modern, Legacy, or Bleeding Edge scan types and choose which scan types are conducted during the streaming scan.',
  },
  {
    target: '#subtitle-scan-settings',
    skipBeacon: true,
    placement: 'right',
    floaterProps: { disableFlip: true },
    title: 'Subtitle Audit',
    content: 'Ensure your media library satisfies subtitle accessibility requirements by validating language tags or detecting files that lack external sidecars or embedded text tracks.',
  },
  {
    target: '#duplication-scan-settings',
    skipBeacon: true,
    placement: 'left',
    floaterProps: { disableFlip: true },
    title: 'Duplication Scan',
    content: 'Define guidelines for detecting duplicate media files. You can configure scan bounds for either video or music libraries individually.',
  },
  {
    target: '#anomaly-scan-settings',
    skipBeacon: true,
    placement: 'right',
    floaterProps: { disableFlip: true },
    title: 'Quality Audit',
    content: 'Enable deep analysis to audit file quality. Tweak bitrate thresholds to flag starved encodings or bloated files.',
  },
  {
    target: '#metadata-scan-settings',
    skipBeacon: true,
    placement: 'left',
    floaterProps: { disableFlip: true },
    title: 'Metadata Completeness',
    content: 'Enable automated tag verification for video or music files. Identify files missing crucial headers like director, artist, release year, or album.',
  },
  {
    target: '#global-options-col',
    skipBeacon: true,
    placement: 'right',
    floaterProps: { disableFlip: true },
    title: 'Global Options',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>Configure general preferences that apply application-wide:</p>
        <ul className="list-disc pl-4 text-xs space-y-1 text-slate-700">
          <li><strong>Fix Music Grouping</strong>: Strips 'OST' tags, groups soundtracks by folder, and overrides foreign characters.</li>
          <li><strong>Diagnostic Logging</strong>: Enable verbose debugging and error output directly into the scan log.</li>
          <li><strong>Export Directory</strong>: Set a default target folder for your exported media reports.</li>
          <li><strong>Fluid Wrap Layout</strong>: Toggle between a responsive fluid layout and a fixed 1280px container width.</li>
        </ul>
      </div>
    ),
  },
  {
    target: '#app-data-options-col',
    skipBeacon: true,
    placement: 'left',
    floaterProps: { disableFlip: true },
    title: 'App Data Options',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>Manage application databases, mock datasets, and configuration profiles:</p>
        <ul className="list-disc pl-4 text-xs space-y-1 text-slate-700">
          <li><strong>Backup & Restore</strong>: Save or load your custom scanning rules and indexed library data.</li>
          <li><strong>Demo Data</strong>: Populate the database with premium mock records to experience the dashboard in full, or clear it.</li>
          <li><strong>Danger Zone</strong>: Destructive database wiping or complete application state resetting.</li>
        </ul>
      </div>
    ),
  },
  {
    target: 'body',
    skipBeacon: true,
    placement: 'center',
    isIntro: true,
    bitsyMood: 'excited',
    bitsyTalking: true,
    title: "Help when you need it",
    content: "Here in the Help Center, we'll learn where to find feature tutorials, get common troubleshooting answers, show off our roots, and tell you a little about how bitscribe Digital Media Steward came to be and how you can help us grow.",
  },
  {
    target: '#help-header-bar',
    skipBeacon: true,
    placement: 'bottom',
    title: 'Help & Tutorials',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>Expand these detailed step-by-step tutorials and FAQs to understand how each of the powerful auditing engines work.</p>
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
      </div>
    ),
  },
  {
    target: '#oss-section',
    skipBeacon: true,
    placement: 'top',
    disableScrolling: true,
    floaterProps: { disableFlip: true },
    title: 'Open Source Acknowledgments',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>We stand on the shoulders of giants. This section honors the amazing open-source projects and communities that made BitScribe possible.</p>
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
      </div>
    ),
  },
  {
    target: '#support-section',
    skipBeacon: true,
    placement: 'top',
    disableScrolling: true,
    floaterProps: { disableFlip: true },
    title: 'Support Development',
    content: (
      <div className="flex flex-col gap-2 text-left">
        <p>If you find BitScribe useful, consider supporting the development. Your contributions help keep the project alive! When you end this tour, you can choose to keep or clear the demo data.</p>
        <p className="text-indigo-700 font-bold text-xs mt-1 bg-indigo-100/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-sm animate-pulse">👉 Click 'Show Demo' on the remote!</p>
      </div>
    ),
  }
] as any;

export const ProductTour: React.FC<ProductTourProps> = ({
  run,
  stepIndex,
  onFinish,
  onCancel,
  onRemindLater,
  onJoyrideCallback,
  isDemoRunning = false,
}) => {
  const handleJoyrideCallback = (data: EventData) => {
    if (isDemoRunning) return;
    onJoyrideCallback(data);
  };

  const CustomTooltip = ({
    index,
    step,
    tooltipProps,
  }: TooltipRenderProps) => {
    const opacityClass = isDemoRunning ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100";
    const isIntroStep = !!(step as any).isIntro;

    if (isIntroStep) {
      const mood = (step as any).bitsyMood || 'excited';
      const talking = (step as any).bitsyTalking !== undefined ? (step as any).bitsyTalking : true;
      const speechText = step.content;
      const showRemoteNotice = index === 0;

      return (
        <div
          id="joyride-custom-tooltip"
          {...tooltipProps}
          className={`flex flex-col items-center justify-center p-8 z-[999999] transition-all duration-500 transform ${opacityClass} animate-fade-in-up`}
        >
          <BitsyCharacter 
            className="w-48 h-48 mb-6 drop-shadow-[0_0_40px_rgba(129,140,248,0.5)]" 
            talking={talking} 
            pointing={false} 
            mood={mood} 
          />
          <div className="bg-[#14171F] border-2 border-indigo-500 shadow-[0_15px_50px_rgba(99,102,241,0.4)] rounded-2xl p-6 w-96 lg:w-[28rem] font-sans text-center relative overflow-visible">
             {/* Speech bubble pointer */}
             <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[16px] border-r-[16px] border-b-[20px] border-l-transparent border-r-transparent border-b-indigo-500 drop-shadow-xl" />
             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[18px] border-l-transparent border-r-transparent border-b-[#14171F]" />
             
             {step.title && (
              <h2 className="text-xl font-extrabold text-indigo-100 uppercase tracking-wide mb-3">
                {step.title}
              </h2>
            )}
            <div className="text-slate-300 text-sm leading-relaxed font-medium">
              {speechText}
              {showRemoteNotice && (
                <> Use the <strong className="text-indigo-400">BitScribe Remote</strong> below to navigate through the tour or trigger live interactive demos.</>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-4 italic">
              {index === TOUR_STEPS.length - 1 ? "Click 'Finish' to complete the tour!" : "Click 'Next' on the remote to continue!"}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        id="joyride-custom-tooltip"
        {...tooltipProps} 
        className={`bg-[#fffbeb] border-2 border-amber-500 shadow-[0_15px_50px_rgba(217,119,6,0.3)] rounded-2xl p-5 w-72 md:w-[24rem] lg:w-[27rem] font-sans z-[999999] transition-all duration-500 transform ${opacityClass}`}
      >
        <div className="flex items-center justify-between mb-3 border-b border-amber-200 pb-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
            Step {index + 1} of {TOUR_STEPS.length}
          </span>
          <span className="text-[10px] text-amber-700/80 font-mono tracking-widest uppercase font-bold">Active Slide</span>
        </div>

        {step.title && (
          <h2 className="text-base font-extrabold text-[#3b2314] uppercase tracking-wide mb-2">
            {step.title}
          </h2>
        )}
        <div className="text-[#5c3f11] text-sm leading-relaxed font-semibold">
          {step.content}
        </div>
      </div>
    );
  };

  // Convert TOUR_STEPS and override disableScroll correctly to prevent shaking
  const stepsWithDisableScroll = TOUR_STEPS.map(s => ({
    ...s,
    disableScroll: true,
    disableOverlayClose: true,
    hideBackButton: true,
    hideCloseButton: true,
  }));

  return (
    <Joyride
      steps={stepsWithDisableScroll}
      run={run}
      continuous={true}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      options={{ zIndex: 100002 }}
    />
  );
};
