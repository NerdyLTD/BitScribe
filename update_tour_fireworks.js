const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');

if (!content.includes('import confetti')) {
  content = content.replace("import { useState", "import confetti from 'canvas-confetti';\nimport { useState");
}

const goToTourStepReplacement = `  const goToTourStep = (step: number) => {
    if (step < 0 || step >= TOUR_STEPS.length) return;

    // Stop any active running demo/simulation when navigating to a new tour step
    setActiveDemo(null);
    setDemoMessage(null);

    // Slide 37 (index 36): Open Source Acknowledgments
    if (step === 36) {
      const duration = 5 * 1000;
      const end = Date.now() + duration;
      const festivalColors = ['#ff3366', '#33ff99', '#3399ff', '#ffcc00', '#ff00ff', '#00ffff', '#ff6600', '#9933ff'];

      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: festivalColors, zIndex: 100005 });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: festivalColors, zIndex: 100005 });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }

    // Slide 38 (index 37): Support Development
    if (step === 37) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;
      const scalar = 2;
      const heart = confetti.shapeFromPath({
        path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
        matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
      });

      (function frame() {
        confetti({ particleCount: 1, angle: 90, spread: 60, origin: { x: 0.5, y: 0.8 }, colors: ['#ef4444', '#ec4899', '#f43f5e'], shapes: [heart], scalar, zIndex: 100005 });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }
`;

content = content.replace(
  "  const goToTourStep = (step: number) => {\n    if (step < 0 || step >= TOUR_STEPS.length) return;\n\n\n    \n    // Stop any active running demo/simulation when navigating to a new tour step\n    setActiveDemo(null);\n    setDemoMessage(null);",
  goToTourStepReplacement
);

fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', content);
console.log("Updated goToTourStep in useAppTour.ts");
