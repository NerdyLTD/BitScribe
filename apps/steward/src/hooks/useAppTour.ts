import { useState, useRef, useEffect } from 'react';
import { EventData, Step } from 'react-joyride';
import { scrollToElement } from '../utils/domHelpers';
import { RuleCriteria } from '@bitscribe/core-types';
import { MediaItem } from '@bitscribe/core-types';
import { TOUR_STEPS } from '../components/ProductTour';




export function useAppTour({
  activeTab,
  handleTabChange,
  setShowMetrics,
  setShowDiagnostic,
  setCustomRules,
  resetToDiscoveryPreset,
  scannedFilesList,
  setShowDemoCleanupModal,
  setShowCustomColumnsMenu,
  injectDemoData
}: any) {
  const [showTour, setShowTour] = useState(() => {
    const tourStatus = localStorage.getItem("bitscribe_tour_status");
    if (!tourStatus) return false;
    try {
      const parsed = JSON.parse(tourStatus);
      if (parsed.status === 'active') return true;
      if (parsed.status === 'remind' && parsed.remindAt) {
        return new Date().getTime() > parsed.remindAt;
      }
    } catch(e) {}
    return false;
  });

  const [tourStepIndex, setTourStepIndex] = useState(() => {
    try {
      const tourStatus = localStorage.getItem("bitscribe_tour_status");
      if (tourStatus) {
        const parsed = JSON.parse(tourStatus);
        if (parsed.status === 'active' && parsed.startStep !== undefined) {
          return parsed.startStep;
        }
      }
    } catch(e) {}
    return 0;
  });
  
  const [demoMessage, setDemoMessage] = useState<{text: string, targetId?: string, position?: 'top' | 'bottom' | 'right' | 'left', offset?: number} | null>(null);
  const [demoReelTarget, setDemoReelTarget] = useState<string | null>(null);
  const demoMsgRef = useRef<HTMLDivElement>(null);

  const [activeDemo, setActiveDemo] = useState<'hover' | 'click' | 'type' | 'wait' | number | null>(null);
  const [isDemoPaused, setIsDemoPaused] = useState(false);
  const isDemoPausedRef = useRef(false);

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
        demoMsgRef.current.style.left = `${x}px`;
        demoMsgRef.current.style.top = `${y}px`;
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

  useEffect(() => {
    isDemoPausedRef.current = isDemoPaused;
  }, [isDemoPaused]);

  const [tourMenuOpen, setTourMenuOpen] = useState(false);
  const [tourPosition, setTourPosition] = useState({ x: 20, y: 0 });
  const [isTourDragging, setIsTourDragging] = useState(false);
  const [tourDragStart, setTourDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [isReelEndingAnimation, setIsReelEndingAnimation] = useState(false);

  const handleTourMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsTourDragging(true);
    setTourDragStart({
      x: e.clientX,
      y: e.clientY,
      initialX: tourPosition.x,
      initialY: tourPosition.y
    });
  };

  useEffect(() => {
    if (!isTourDragging) return;

    const handleTourMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - tourDragStart.x;
      const dy = e.clientY - tourDragStart.y;
      
      const newX = tourDragStart.initialX + dx;
      const newY = tourDragStart.initialY + dy;
      
      const maxX = window.innerWidth - 300; 
      const maxY = window.innerHeight - 100;
      
      setTourPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY)
      });
    };

    const handleTourMouseUp = () => {
      setIsTourDragging(false);
    };

    document.addEventListener('mousemove', handleTourMouseMove);
    document.addEventListener('mouseup', handleTourMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleTourMouseMove);
      document.removeEventListener('mouseup', handleTourMouseUp);
    };
  }, [isTourDragging, tourDragStart]);

  useEffect(() => {
    if (activeDemo !== null) {
      document.body.classList.add("demo-active");
    } else {
      document.body.classList.remove("demo-active");
    }
    return () => {
      document.body.classList.remove("demo-active");
    };
  }, [activeDemo]);

  useEffect(() => {
    if (showTour) {
      document.body.classList.add("tour-active");
    } else {
      document.body.classList.remove("tour-active");
    }
    return () => {
      document.body.classList.remove("tour-active");
    };
  }, [showTour]);

  const finishTour = () => {
    setActiveDemo(null);
    setDemoMessage(null);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'completed' }));
    
    setIsReelEndingAnimation(true);
    
    const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
    if (!demoInserted) {
      injectDemoData();
      localStorage.setItem("bitscribe_demo_data_inserted", "true");
    }

    setTimeout(() => {
      setIsReelEndingAnimation(false);
      setShowTour(false);
      setTourStepIndex(0);
      if (scannedFilesList.length > 0) {
        setShowDemoCleanupModal(true);
      }
    }, 2800);
  };

  const cancelTour = async () => {
    setShowTour(false);
    setActiveDemo(null);
    setDemoMessage(null);
    setTourStepIndex(0);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'skipped' }));
    setCustomRules(resetToDiscoveryPreset);
    const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
    if (!demoInserted) {
      await injectDemoData();
      localStorage.setItem("bitscribe_demo_data_inserted", "true");
    }
  };

  const remindLaterTour = async () => {
    setShowTour(false);
    setActiveDemo(null);
    setDemoMessage(null);
    setTourStepIndex(0);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    const oneWeek = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'remind', remindAt: oneWeek }));
    setCustomRules(resetToDiscoveryPreset);
    const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
    if (!demoInserted) {
      await injectDemoData();
      localStorage.setItem("bitscribe_demo_data_inserted", "true");
    }
  };

  const goToTourStep = (step: number) => {
    if (step < 0 || step >= TOUR_STEPS.length) return;
    
    // Stop any active running demo/simulation when navigating to a new tour step
    setActiveDemo(null);
    setDemoMessage(null);
    
    if (step === 8) {
      setTourPosition({ x: 264 - window.innerWidth, y: 0 });
    }

    let targetTab = "scan";
    if (step >= 20 && step <= 22) targetTab = "library";
    else if (step >= 23 && step <= 33) targetTab = "rules";
    else if (step >= 34) targetTab = "help";

    const targetSelector = (TOUR_STEPS[step]?.target as string);
    
    if (targetTab !== activeTab) {
      document.body.classList.add("tour-transitioning");
      handleTabChange(targetTab);
      
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const elExists = targetSelector === 'body' || !!document.querySelector(targetSelector);
        if (elExists || attempts > 20) { // Max 2 seconds (20 * 100ms)
          clearInterval(checkInterval);
          setTourStepIndex(step);
          if (targetSelector && targetSelector !== 'body') {
            scrollToElement(targetSelector);
          }
          setTimeout(() => document.body.classList.remove("tour-transitioning"), 50);
        }
      }, 100);
    } else {
      setTourStepIndex(step);
      if (targetSelector && targetSelector !== 'body') {
        setTimeout(() => scrollToElement(targetSelector), 50);
      }
    }
  };

  const handleJoyrideCallback = (data: EventData) => {
    const { status, type, index, action } = data;
    
    if (action === 'close' || status === 'skipped') {
      cancelTour();
    } else if (status === 'finished') {
      finishTour();
    } else if (type === 'step:after') {
      if (action === 'next') {
        goToTourStep(index + 1);
      } else if (action === 'prev') {
        goToTourStep(index - 1);
      }
    }
  };

  return {
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
  };
}
