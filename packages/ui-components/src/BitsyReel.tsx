import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';


export const BitsyReel: React.FC<{ 
  targetSelector: string | null; 
  isVisible: boolean;
  isEndingAnimation?: boolean;
}> = ({ targetSelector, isVisible, isEndingAnimation }) => {
  const [position, setPosition] = useState<{ x: number, y: number, opacity: number }>({ x: 0, y: 0, opacity: 0 });

  useEffect(() => {
    let animationFrameId: number;

    const updatePosition = () => {
      let actualTarget = targetSelector;
      
      // Override target during ending animation to point at QR Code image inside support section
      

      if ((!isVisible && !isEndingAnimation) || !actualTarget || actualTarget === 'body') {
        setPosition(prev => ({ ...prev, opacity: 0 }));
        return;
      }
      
      const el = document.querySelector(actualTarget);
      if (el) {
        const rect = el.getBoundingClientRect();
        // If element is hidden (e.g. during tab transitions), don't fly to 0,0
        if (rect.width === 0 && rect.height === 0) {
          setPosition(prev => ({ ...prev, opacity: 0 }));
          return;
        }
        
        let targetX = 0;
        let targetY = 0;

        // Position to the left or right side depending on available space
        const leftSpace = rect.left;
        const rightSpace = window.innerWidth - rect.right;
        
        if (actualTarget === '#support-section') {
          targetX = rect.left + (rect.width / 2);
          targetY = rect.bottom; // exact bottom center
        } else if (actualTarget.includes('btn-metrics-filter-')) {
          targetX = rect.left - 45;
          const effectiveHeight = Math.min(rect.height, 200);
          targetY = rect.top + (effectiveHeight / 2) - 20;
        } else if (rightSpace > 60) {
          targetX = rect.right + 10;
          const effectiveHeight = Math.min(rect.height, 200);
          targetY = rect.top + (effectiveHeight / 2) - 20;
        } else {
          targetX = rect.left - 50;
          const effectiveHeight = Math.min(rect.height, 200);
          targetY = rect.top + (effectiveHeight / 2) - 20;
        }

        setPosition({ x: targetX, y: targetY, opacity: 1 });
      } else {
        // Retry if not found immediately
        setPosition(prev => ({ ...prev, opacity: 0 }));
      }
      animationFrameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetSelector, isVisible, isEndingAnimation]);

  const showReel = position.opacity === 1;

  return (
    <AnimatePresence>
      {showReel && (
        <motion.div
          id="bitsy-reel"
          initial={{ opacity: 0, scale: 0.5, x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          animate={{ opacity: 1, scale: 1, x: position.x, y: position.y }}
          exit={{ opacity: 0, scale: 0.5, x: position.x, y: position.y }}
          transition={{
            x: { type: "tween", duration: 0.8, ease: "easeInOut" },
            y: { type: "tween", duration: 0.8, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          }}
          style={{ position: 'fixed', zIndex: 999999, top: 0, left: 0, pointerEvents: 'none' }}
        >
          {/* Light Trail Effects */}
          <motion.div
            className="absolute w-8 h-8 rounded-full bg-indigo-500/30 blur-md"
            animate={(isEndingAnimation || targetSelector === '#support-qr-code') ? {
              scale: [1, 2, 1], opacity: [0.8, 0, 0.8]
            } : {
              scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5]
            }}
            transition={{ duration: (isEndingAnimation || targetSelector === '#support-qr-code') ? 0.5 : 1.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -inset-4 rounded-full bg-cyan-400/20 blur-xl"
            animate={(isEndingAnimation || targetSelector === '#support-qr-code') ? {
              scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6]
            } : {
              scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: (isEndingAnimation || targetSelector === '#support-qr-code') ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            animate={(isEndingAnimation || targetSelector === '#support-qr-code') ? {
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.2, 1, 1.2, 1],
              y: [0, -15, 0, -15, 0]
            } : { 
              rotate: 360, 
              y: [0, -10, 0] 
            }}
            transition={(isEndingAnimation || targetSelector === '#support-qr-code') ? { 
              duration: 1, repeat: Infinity, ease: "easeInOut"
            } : { 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <svg className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.8)]" viewBox="0 0 100 100" fill="none">
  <circle cx="50" cy="50" r="45" fill="currentColor" />
  <circle cx="50" cy="50" r="8" fill="#0F1117" />
  <circle cx="50" cy="23" r="13" fill="#0F1117" />
  <circle cx="75.68" cy="41.66" r="13" fill="#0F1117" />
  <circle cx="65.87" cy="71.84" r="13" fill="#0F1117" />
  <circle cx="34.13" cy="71.84" r="13" fill="#0F1117" />
  <circle cx="24.32" cy="41.66" r="13" fill="#0F1117" />
</svg>
          {(isEndingAnimation || targetSelector === '#support-qr-code') && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: [0.5, 1.5], 
                    x: (i % 2 === 0 ? 1 : -1) * (20 + i * 15),
                    y: -80 - i * 20
                  }}
                  transition={{ 
                    duration: 1.5 - (i * 0.1),
                    repeat: Infinity,
                    delay: i * 0.2 
                  }}
                  className="absolute text-pink-500 font-bold text-2xl z-50 drop-shadow-md"
                  style={{ top: '50%', left: '50%', pointerEvents: 'none', marginLeft: '-12px', marginTop: '-12px' }}
                >
                  ❤️
                </motion.div>
              ))}
            </>
          )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
