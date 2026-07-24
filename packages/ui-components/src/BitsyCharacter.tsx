import React, { useId, useRef, useState, useEffect } from 'react';

export default function BitsyCharacter({
  className = "w-10 h-10",
  pointing = false,
  talking = false,
  mood = 'happy',
  targetSelector = null,
  dancing = false,
  pose = 'default'
}: {
  className?: string,
  pointing?: boolean,
  talking?: boolean,
  mood?: 'happy' | 'thinking' | 'excited',
  targetSelector?: string | null,
  dancing?: boolean,
  pose?: 'default' | 'tada'
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId: number;
    let isActive = true;

    const updateEyePosition = () => {
      if (!isActive) return;

      if (targetSelector && svgRef.current) {
        let el = document.querySelector(targetSelector);
        if (targetSelector === '#metrics-dashboard-filter' && !el) {
          el = document.getElementById("metrics-dashboard-filter");
        }
        if (el) {
          const targetRect = el.getBoundingClientRect();
          const svgRect = svgRef.current.getBoundingClientRect();

          const targetX = targetRect.left + (targetRect.width / 2);
          const targetY = targetRect.top + (targetRect.height / 2);
          
          const svgX = svgRect.left + (svgRect.width / 2);
          const svgY = svgRect.top + (svgRect.height / 2);

          const dx = targetX - svgX;
          const dy = targetY - svgY;
          const angle = Math.atan2(dy, dx);
          
          const maxDistance = 2.5;
          const distance = Math.min(maxDistance, Math.sqrt(dx*dx + dy*dy) / 80);

          setEyeOffset({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
          });
        } else {
          setEyeOffset({ x: 0, y: 0 });
        }
      } else {
        setEyeOffset({ x: 0, y: 0 });
      }

      animationFrameId = requestAnimationFrame(updateEyePosition);
    };

    updateEyePosition();

    return () => {
      isActive = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [targetSelector]);

  const clipId = `clapper-top-clip-${useId().replace(':', '')}`;

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" className={`${className} ${dancing ? 'dancing-bitsy' : ''}`} style={{ overflow: 'visible' }}>
      <style>{`
        @keyframes blink {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }
        @keyframes talk {
          0%, 100% { d: path('M 45 65 Q 50 65 55 65'); }
          50% { d: path('M 45 65 Q 50 72 55 65'); }
        }
        @keyframes clappyTopTalk {
          0%, 100% { transform: rotate(-15deg); }
          5% { transform: rotate(-25deg); }
          10% { transform: rotate(-5deg); }
          15% { transform: rotate(-25deg); }
          20% { transform: rotate(-5deg); }
          25% { transform: rotate(-15deg); }
        }
        @keyframes dance {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(-5deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-5px) rotate(5deg); }
        }
        .dancing-bitsy {
          animation: dance 1s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .clappy-eyes {
          animation: blink 4s infinite;
          transform-origin: 50% 55px;
        }
        .clappy-mouth {
          animation: ${talking ? 'talk 0.3s infinite' : 'none'};
        }
        .clappy-top {
          transform-origin: 20px 40px;
          transform: ${pose === 'tada' ? 'rotate(0deg)' : 'rotate(-15deg)'};
          animation: ${talking && pose !== 'tada' ? 'clappyTopTalk 2.5s ease-in-out infinite' : 'none'};
        }
      `}</style>
      
      {/* Clapper Base (Body) */}
      <rect x="20" y="40" width="60" height="40" rx="8" fill="#ffffff" stroke="currentColor" strokeWidth="4" />
      <path d="M22 48 L78 48 M22 51 L78 51 M22 72 L78 72 M22 75 L78 75" stroke="#1e232e" strokeWidth="1" opacity="0.2" />

      {/* Legs */}
      <path d="M35 80 L35 92 M65 80 L65 92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* Feet */}
      <path d="M35 92 L40 92 M65 92 L70 92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

      {/* Arms */}
      {pose === 'tada' ? (
        <>
          <path d="M20 55 Q5 50 -5 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 55 Q95 50 105 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : pointing ? (
        <>
          <path d="M20 55 Q5 50 -5 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 55 Q90 65 85 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M20 55 Q10 65 15 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 55 Q90 65 85 75" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {/* Clapper Top (Head/Hat) */}
      <g className="clappy-top">
        <clipPath id={clipId}>
          <rect x="20" y="25" width="60" height="15" rx="4" />
        </clipPath>
        
        <rect x="20" y="25" width="60" height="15" rx="4" fill="#ffffff" stroke="currentColor" strokeWidth="4" />
        
        <g clipPath={`url(#${clipId})`}>
          <polygon points="10,40 15,25 25,25 20,40" fill="#1e232e" />
          <polygon points="20,40 25,25 35,25 30,40" fill="#1e232e" />
          <polygon points="30,40 35,25 45,25 40,40" fill="#22c55e" />
          <polygon points="40,40 45,25 55,25 50,40" fill="#eab308" />
          <polygon points="50,40 55,25 65,25 60,40" fill="#3b82f6" />
          <polygon points="60,40 65,25 75,25 70,40" fill="#ef4444" />
          <polygon points="70,40 75,25 85,25 80,40" fill="#ffffff" />
        </g>
        
        <rect x="20" y="25" width="60" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
        
        {/* Pink Bow */}
        <path d="M45 20 Q50 15 55 20 Q50 25 45 20 Z" fill="#ec4899" stroke="#be185d" strokeWidth="1" />
        <path d="M55 20 Q60 15 65 20 Q60 25 55 20 Z" fill="#ec4899" stroke="#be185d" strokeWidth="1" />
        <circle cx="55" cy="20" r="3" fill="#fbcfe8" />
      </g>

      {/* Face */}
      <g className="clappy-eyes">
        {/* Left Eye */}
        <circle cx="34" cy="55" r="7.5" fill="white" stroke="#1e232e" strokeWidth="2" />
        <g style={{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }}>
          <circle cx="34" cy="55.5" r="5" fill="#1e293b" />
          <circle cx="32" cy="53" r="2.2" fill="white" />
          <circle cx="36.5" cy="58" r="1" fill="white" />
          <circle cx="32" cy="58" r="0.8" fill="white" />
        </g>
        
        {/* Left Eyelashes */}
        <path d="M 24 53 Q 32 43 43 51" stroke="#1e232e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 26 49 Q 22 43 21 46" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 31 46 Q 28 39 27 41" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 36 46 Q 35 38 34 40" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Right Eye */}
        <circle cx="66" cy="55" r="7.5" fill="white" stroke="#1e232e" strokeWidth="2" />
        <g style={{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }}>
          <circle cx="66" cy="55.5" r="5" fill="#1e293b" />
          <circle cx="64" cy="53" r="2.2" fill="white" />
          <circle cx="68.5" cy="58" r="1" fill="white" />
          <circle cx="64" cy="58" r="0.8" fill="white" />
        </g>
        
        {/* Right Eyelashes */}
        <path d="M 57 51 Q 68 43 76 53" stroke="#1e232e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 74 49 Q 78 43 79 46" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 69 46 Q 72 39 73 41" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 64 46 Q 65 38 66 40" stroke="#1e232e" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Cheeks */}
      <ellipse cx="25" cy="62" rx="4" ry="2.5" fill="#ec4899" opacity="0.4" />
      <ellipse cx="75" cy="62" rx="4" ry="2.5" fill="#ec4899" opacity="0.4" />

      {/* Mouth */}
      {mood === 'happy' && (
        <path d="M45 65 Q50 72 55 65" className="clappy-mouth" stroke="#1e232e" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {mood === 'thinking' && (
        <path d="M48 68 Q50 68 52 68" stroke="#1e232e" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {mood === 'excited' && (
        <path d="M45 65 Q50 75 55 65 Z" className="clappy-mouth" fill="#ec4899" stroke="#1e232e" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
