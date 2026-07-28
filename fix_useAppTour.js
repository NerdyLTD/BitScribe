const fs = require('fs');
let hook = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');

// Insert the demoMsgRef coordinate update loop
const loopCode = `
  useEffect(() => {
    if (!demoMessage || !demoMessage.targetId) {
      return;
    }
    const updateCoords = () => {
      if (!demoMsgRef.current) return;
      const el = document.getElementById(demoMessage.targetId.replace('#', '')) || document.querySelector(demoMessage.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const msgWidth = demoMsgRef.current.offsetWidth || 200;
        const msgHeight = demoMsgRef.current.offsetHeight || 52;
        let x = rect.left + rect.width / 2;
        let y = demoMessage.position === 'top' ? rect.top - msgHeight - (demoMessage.offset || 0) - 8 : rect.bottom + 12 + (demoMessage.offset || 0);
        let transform = 'translateX(-50%)';
        if (demoMessage.position === 'right') {
          x = rect.right + 16 + (demoMessage.offset || 0);
          y = rect.top + rect.height / 2 - msgHeight / 2;
          transform = 'none';
        } else if (demoMessage.position === 'left') {
          x = rect.left - msgWidth - 16 - (demoMessage.offset || 0);
          y = rect.top + rect.height / 2 - msgHeight / 2;
          transform = 'none';
        } else {
          if (y < 10 && demoMessage.position === 'top') {
            y = rect.bottom + 12 + (demoMessage.offset || 0);
          }
          const minX = msgWidth / 2 + 10;
          const maxX = window.innerWidth - msgWidth / 2 - 10;
          x = Math.max(minX, Math.min(x, maxX));
        }
        demoMsgRef.current.style.left = \`\${x}px\`;
        demoMsgRef.current.style.top = \`\${y}px\`;
        demoMsgRef.current.style.bottom = 'auto';
        demoMsgRef.current.style.transform = transform;
        demoMsgRef.current.style.opacity = '1';
      } else {
        demoMsgRef.current.style.opacity = '0';
      }
    };
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    let frame;
    const loop = () => {
      updateCoords();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
      cancelAnimationFrame(frame);
    };
  }, [demoMessage]);
`;

if (!hook.includes('updateCoords')) {
  hook = hook.replace('export function useAppTour', loopCode + '\nexport function useAppTour');
}
fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', hook);
