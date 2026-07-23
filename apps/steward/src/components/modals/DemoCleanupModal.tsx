import React from "react";
import { Trash2, Database, CheckCircle } from "lucide-react";
import { BitsyCharacter } from "@bitscribe/ui-components";

interface DemoCleanupModalProps {
  hasDemoData: boolean;
  onWipe: () => Promise<void>;
  onKeep: () => void;
  onExit: () => void;
}

export const DemoCleanupModal: React.FC<DemoCleanupModalProps> = ({
  hasDemoData,
  onWipe,
  onKeep,
  onExit,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 animate-fade-in">
      <div className="bg-[#141724] border-2 border-indigo-500/20 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-md w-full text-center relative overflow-hidden">
        {/* Ambient accent top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-60" />

        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400" title="Bitsy says hi!">
          <BitsyCharacter className="w-8 h-8 text-indigo-400 animate-bounce" mood="excited" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-100 mb-2 uppercase tracking-wide">Tour Complete!</h3>
        {hasDemoData ? (
          <>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              The BitScribe tour is now finished! We populated the database with realistic mock media files so you could explore the charts and interactive tables.
              <br /><br />
              Would you like to <strong>keep the demo data</strong> to play around further, or <strong>wipe the demo data</strong> to start fresh with your own files?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onWipe}
                className="flex-1 py-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe Demo Data
              </button>
              <button
                onClick={onKeep}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Keep Demo Data
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              The BitScribe tour is now finished! You can now start using the app with your own media library.
            </p>
            <div className="flex justify-center">
              <button
                onClick={onExit}
                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Exit Tour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DemoCleanupModal;
