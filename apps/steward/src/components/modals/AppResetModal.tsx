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
          <div className="relative flex items-center justify-center h-64 w-full max-w-3xl">
            <style>{`
              @keyframes popIn {
                0% { transform: scale(0.1); opacity: 0; }
                60% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes expandBurst {
                0% { transform: scale(0); opacity: 0; }
                30% { transform: scale(1.5) rotate(15deg); opacity: 1; }
                100% { transform: scale(1.8) rotate(30deg); opacity: 0; }
              }
              .burst-bg {
                animation: expandBurst 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                transform-origin: center;
              }
              .kaboom-letter {
                display: inline-block;
                font-family: 'Impact', 'Bangers', system-ui, sans-serif;
                font-size: 8rem;
                font-weight: 900;
                color: #ffeb3b;
                text-transform: uppercase;
                letter-spacing: -4px;
                -webkit-text-stroke: 3px #d32f2f;
                text-shadow: 
                  6px 6px 0 #d32f2f,
                  10px 10px 0 #b71c1c,
                  0 0 30px rgba(255, 68, 0, 0.8);
                animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                transform-origin: center;
              }
            `}</style>
            
            {/* Comic Starburst SVG Background */}
            <svg className="absolute inset-0 w-full h-full burst-bg pointer-events-none" viewBox="0 0 100 100" style={{ transform: 'scale(2.5)' }}>
              <path d="M50 0 L58 35 L95 15 L70 45 L100 65 L65 70 L80 100 L50 75 L20 100 L35 70 L0 65 L30 45 L5 15 L42 35 Z" fill="#ff5722" />
              <path d="M50 15 L55 38 L85 25 L65 48 L90 65 L62 65 L70 90 L50 68 L30 90 L38 65 L10 65 L35 48 L15 25 L45 38 Z" fill="#ffeb3b" />
            </svg>
            
            {/* Staggered Arched Letters */}
            <div className="flex items-center justify-center z-10">
              <span className="inline-block" style={{ transform: 'translateY(30px) rotate(-18deg) scale(0.9)' }}>
                <span className="kaboom-letter">K</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(5px) rotate(-10deg) scale(1.1)' }}>
                <span className="kaboom-letter">A</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(-15px) rotate(-3deg) scale(1.2)' }}>
                <span className="kaboom-letter">B</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(-20px) rotate(3deg) scale(1.2)' }}>
                <span className="kaboom-letter">O</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(-10px) rotate(12deg) scale(1.1)' }}>
                <span className="kaboom-letter">O</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(15px) rotate(18deg) scale(0.9)' }}>
                <span className="kaboom-letter">M</span>
              </span>
              <span className="inline-block" style={{ transform: 'translateY(35px) rotate(25deg) scale(0.8)' }}>
                <span className="kaboom-letter">!</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
