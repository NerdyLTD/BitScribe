const fs = require('fs');
const content = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');
const toReplace = `    scanPaths
  });





  useTourSimulation({`;
const newText = `    scanPaths
  });

  const {
    showTour, setShowTour,
    tourStepIndex, setTourStepIndex,
    demoMessage, setDemoMessage,
    demoReelTarget, setDemoReelTarget,
    demoMsgRef,
    activeDemo, setActiveDemo,
    isDemoPaused, setIsDemoPaused,
    isDemoPausedRef,
    tourMenuOpen, setTourMenuOpen,
    tourPosition, setTourPosition,
    isTourDragging, setIsTourDragging,
    tourDragStart, setTourDragStart,
    isReelEndingAnimation, setIsReelEndingAnimation,
    handleTourMouseDown,
    finishTour,
    cancelTour,
    remindLaterTour,
    goToTourStep,
    handleJoyrideCallback
  } = useAppTour({
    activeTab,
    handleTabChange,
    setShowMetrics,
    setShowDiagnostic,
    setCustomRules,
    resetToDiscoveryPreset,
    scannedFilesList, 
    setShowDemoCleanupModal,
    setShowCustomColumnsMenu,
    injectDemoData: handlePopulateDemo
  });

  useTourSimulation({`;
const updated = content.replace(toReplace, newText);
fs.writeFileSync('apps/steward/src/App.tsx', updated);
console.log("Replaced:", updated !== content);
