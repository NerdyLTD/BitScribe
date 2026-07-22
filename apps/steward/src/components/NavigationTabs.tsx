import React from "react";

export type TabType = "scan" | "library" | "rules" | "help" | "logs";

interface NavigationTabsProps {
  activeTab: TabType;
  handleTabChange: (tab: TabType) => void;
  total: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  handleTabChange,
  total,
}) => {
  return (
    <div className="flex items-center px-6 pt-5 gap-8 border-b border-[#1e232e] shrink-0 bg-[#0F1117]">
      <button
        title="Review Dashboard for Media Library statistics and audit overviews"
        onClick={() => handleTabChange("scan")}
        className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
          activeTab === "scan"
            ? "border-blue-500 text-white"
            : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
      >
        Analyze ({total})
      </button>
      <button
        title="Open Library Browser"
        onClick={() => handleTabChange("library")}
        className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
          activeTab === "library"
            ? "border-blue-500 text-white"
            : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
      >
        Library
      </button>
      <button
        title="Configure scanning rules, compatibility profiles, and database tools"
        onClick={() => handleTabChange("rules")}
        className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
          activeTab === "rules"
            ? "border-blue-500 text-white"
            : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
      >
        Options
      </button>
      <button
        title="Read Documentation & FAQs"
        onClick={() => handleTabChange("help")}
        className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
          activeTab === "help"
            ? "border-blue-500 text-white"
            : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
      >
        Help
      </button>
    </div>
  );
};

export default NavigationTabs;
