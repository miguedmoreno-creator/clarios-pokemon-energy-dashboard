import { useState, useEffect, useCallback } from 'react';
import { ViewId } from '../../lib/domain';
import { TUTORIAL_STEPS, TutorialStep, getStepsForSection } from './tutorialSteps';

const STORAGE_KEY = 'clarios_tutorial_completed';

interface UseTutorialOptions {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function useTutorial({ activeView, onNavigate }: UseTutorialOptions) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFullTour, setIsFullTour] = useState<boolean>(false);
  const [activeSteps, setActiveSteps] = useState<TutorialStep[]>([]);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Comprobar si el usuario entra por primera vez
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Lanzar Tour Completo automáticamente
        startFullTour();
      }
    } catch {
      // Si localStorage no está disponible, continuar sin error
    }
  }, []);

  const startFullTour = useCallback(() => {
    setIsFullTour(true);
    setActiveSteps(TUTORIAL_STEPS);
    setStepIndex(0);
    setIsActive(true);
    if (TUTORIAL_STEPS.length > 0 && TUTORIAL_STEPS[0].section !== activeView) {
      onNavigate(TUTORIAL_STEPS[0].section);
    }
  }, [activeView, onNavigate]);

  const startSectionTutorial = useCallback(
    (section: ViewId) => {
      const steps = getStepsForSection(section);
      if (steps.length === 0) return;
      setIsFullTour(false);
      setActiveSteps(steps);
      setStepIndex(0);
      setIsActive(true);
    },
    []
  );

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const closeTutorial = useCallback(() => {
    setIsActive(false);
    if (isFullTour) {
      markCompleted();
    }
  }, [isFullTour, markCompleted]);

  const nextStep = useCallback(() => {
    if (stepIndex < activeSteps.length - 1) {
      const nextIdx = stepIndex + 1;
      const nextItem = activeSteps[nextIdx];
      setStepIndex(nextIdx);
      if (isFullTour && nextItem.section !== activeView) {
        onNavigate(nextItem.section);
      }
    } else {
      closeTutorial();
    }
  }, [stepIndex, activeSteps, isFullTour, activeView, onNavigate, closeTutorial]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1;
      const prevItem = activeSteps[prevIdx];
      setStepIndex(prevIdx);
      if (isFullTour && prevItem.section !== activeView) {
        onNavigate(prevItem.section);
      }
    }
  }, [stepIndex, activeSteps, isFullTour, activeView, onNavigate]);

  const currentStep = activeSteps[stepIndex] || null;

  return {
    isActive,
    isFullTour,
    currentStep,
    stepIndex,
    totalSteps: activeSteps.length,
    startFullTour,
    startSectionTutorial,
    nextStep,
    prevStep,
    skipTutorial: closeTutorial,
  };
}
