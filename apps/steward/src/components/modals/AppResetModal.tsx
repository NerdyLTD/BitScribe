import React, { useEffect, useState } from "react";
import { BitsyCharacter } from "@bitscribe/ui-components";
import confetti from "canvas-confetti";

export default function AppResetModal({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'holding' | 'exploding'>('holding');

  useEffect(() => {
    // 2.5 seconds holding breath, concentrating
    const t1 = setTimeout(() => {
      setPhase('exploding');
    }, 2500);

    // 1.0 second exploding, then complete (changed from 0.5 to 1.0 to show Kaboom longer)
    const t2 = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase === 'exploding') {
      // 360 degree explosion
      confetti({
        particleCount: 200,
        spread: 360,
        startVelocity: 60,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#ff0000', '#ff7700', '#ffff00', '#ff4400', '#ffffff'],
        disableForReducedMotion: true,
        zIndex: 10000,
        ticks: 100
      });
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center justify-center space-y-6">
        <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest animate-pulse">
          Initiating Clean Slate Protocol...
        </h2>
        
        {phase === 'holding' ? (
          <div className="relative">
            <style>{`
              @keyframes trembleHolding {
                0%, 100% { transform: scale(1.1) translate(0, 0); }
                20% { transform: scale(1.1) translate(-2px, 2px) rotate(-1deg); }
                40% { transform: scale(1.1) translate(2px, -2px) rotate(1deg); }
                60% { transform: scale(1.1) translate(-2px, -2px) rotate(-1deg); }
                80% { transform: scale(1.1) translate(2px, 2px) rotate(1deg); }
              }
              .bitsy-mad {
                animation: trembleHolding 0.15s ease-in-out infinite;
                filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.5));
              }
            `}</style>
            <BitsyCharacter 
              className="w-48 h-48 bitsy-mad"
              mood="concentrating"
              talking={false}
              pointing={false}
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center h-48">
            <style>{`
              @keyframes popIn {
                0% { transform: scale(0.1) rotate(-10deg); opacity: 0; }
                50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
              .kaboom-text {
                font-family: 'Impact', 'Bangers', system-ui, sans-serif;
                font-size: 7rem;
                font-weight: 900;
                color: #ffeb3b;
                text-transform: uppercase;
                letter-spacing: 2px;
                text-shadow: 
                  4px 4px 0 #ff5722,
                  -4px -4px 0 #ff5722,
                  4px -4px 0 #ff5722,
                  -4px 4px 0 #ff5722,
                  8px 8px 0 #f44336,
                  -8px -8px 0 #f44336,
                  8px -8px 0 #f44336,
                  -8px 8px 0 #f44336,
                  0 0 40px rgba(255, 68, 0, 0.8),
                  0 0 80px rgba(255, 0, 0, 0.6);
                animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                transform-origin: center;
              }
            `}</style>
            <div className="kaboom-text">KABOOM!</div>
          </div>
        )}
      </div>
    </div>
  );
}
