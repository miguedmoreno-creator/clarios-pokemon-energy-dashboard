import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TutorialStep } from './tutorialSteps';

interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isActive,
  currentStep,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateRect = useCallback(() => {
    if (!currentStep) {
      setRect(null);
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    } else {
      setRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setRect(null);
      return;
    }

    let isCancelled = false;

    // Búsqueda resiliente con reintentos para soportar cambios de pestaña y transiciones
    const attemptFind = (retriesLeft: number) => {
      if (isCancelled) return;

      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        });
      } else if (retriesLeft > 0) {
        retryTimerRef.current = setTimeout(() => {
          attemptFind(retriesLeft - 1);
        }, 120);
      }
    };

    attemptFind(10); // Hasta 10 intentos (1.2s total de ventana de montaje)

    const handleWindowChange = () => updateRect();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      isCancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isActive, currentStep, updateRect]);

  if (!isActive || !currentStep) return null;

  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      className="tutorial-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'auto',
      }}
    >
      {/* Marco Spotlight sobre el elemento activo */}
      {rect ? (
        <div
          className="tutorial-spotlight"
          style={{
            position: 'fixed',
            top: `${Math.max(0, rect.top - 6)}px`,
            left: `${Math.max(0, rect.left - 6)}px`,
            width: `${rect.width + 12}px`,
            height: `${rect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(5, 9, 17, 0.85), 0 0 24px rgba(34, 211, 238, 0.85)',
            border: '3px solid #22d3ee',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      ) : (
        /* Fondo oscuro fallback si el elemento aún no ha terminado de montar */
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 9, 17, 0.85)',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Cuadro de Diálogo GBA / Pokémon (Fijado abajo centrado) */}
      <aside
        role="dialog"
        aria-label="Guía interactiva"
        className="tutorial-dialog"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '680px',
          background: '#0d1527',
          border: '3px solid #000',
          boxShadow: 'inset 0 0 0 2px #38bdf8, 4px 4px 0 #000',
          padding: '16px 20px',
          zIndex: 9999,
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Cabecera del diálogo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-retro-title)',
                fontSize: '0.62rem',
                background: '#0284c7',
                color: '#fff',
                padding: '3px 8px',
                border: '1px solid #000',
              }}
            >
              {currentStep.badgeText}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              ({stepIndex + 1}/{totalSteps})
            </span>
          </div>

          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontFamily: 'var(--font-retro-title)',
              fontSize: '0.58rem',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
            title="Cerrar el tutorial"
          >
            ✕ SALTAR
          </button>
        </div>

        {/* Título en Press Start 2P */}
        <h3
          style={{
            fontFamily: 'var(--font-retro-title)',
            fontSize: '0.82rem',
            color: '#38bdf8',
            margin: '2px 0',
            lineHeight: 1.4,
          }}
        >
          {currentStep.title}
        </h3>

        {/* Explicación en VT323 legible */}
        <p
          style={{
            fontFamily: 'var(--font-retro-body)',
            fontSize: '20px',
            lineHeight: 1.35,
            color: '#f8fafc',
            margin: '0',
          }}
        >
          {currentStep.explanation}
        </p>

        {/* Botones de navegación estilo Game Boy Advance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <button
            className="btn-gba"
            onClick={onPrev}
            disabled={stepIndex === 0}
            style={{
              padding: '8px 14px',
              fontSize: '0.62rem',
              opacity: stepIndex === 0 ? 0.4 : 1,
              cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ◀ ANTERIOR
          </button>

          <button
            className="btn-gba"
            onClick={onNext}
            style={{
              padding: '8px 18px',
              fontSize: '0.62rem',
              background: isLast ? '#059669' : '#0284c7',
              color: '#ffffff',
            }}
          >
            {isLast ? '¡ENTENDIDO! ✓' : 'SIGUIENTE ▶'}
          </button>
        </div>
      </aside>
    </div>
  );
};
