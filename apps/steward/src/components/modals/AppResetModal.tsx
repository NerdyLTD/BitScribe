import React, { useEffect, useState } from "react";
import { BitsyCharacter } from "@bitscribe/ui-components";

export default function AppResetModal({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'holding' | 'exploding'>('holding');

  useEffect(() => {
    // 2.5 seconds holding breath, turning red
    const t1 = setTimeout(() => {
      setPhase('exploding');
    }, 2500);

    // 0.5 seconds exploding, then complete
    const t2 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center justify-center space-y-6">
        <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest animate-pulse">
          Initiating Clean Slate Protocol...
        </h2>
        
        {phase === 'holding' ? (
          <div className="relative">
            <style>{`
              @keyframes turnRed {
                0% { filter: hue-rotate(0deg) saturate(100%) brightness(100%); transform: scale(1); }
                100% { filter: hue-rotate(140deg) saturate(300%) brightness(80%) drop-shadow(0 0 20px red); transform: scale(1.3); }
              }
              .bitsy-mad {
                animation: turnRed 2.5s ease-in forwards;
              }
            `}</style>
            <BitsyCharacter 
              className="w-48 h-48 bitsy-mad"
              mood="thinking"
              talking={false}
              pointing={false}
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center w-48 h-48">
            <style>{`
              @keyframes explode {
                0% { transform: scale(0.5); opacity: 1; }
                50% { transform: scale(3); opacity: 0.8; }
                100% { transform: scale(5); opacity: 0; }
              }
              .explosion {
                animation: explode 0.5s ease-out forwards;
                background: radial-gradient(circle, #ff0000 0%, #ff7700 50%, transparent 100%);
              }
            `}</style>
            <div className="absolute inset-0 explosion rounded-full blur-md"></div>
          </div>
        )}
      </div>
    </div>
  );
}
