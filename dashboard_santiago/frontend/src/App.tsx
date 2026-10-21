import React, { useState, useEffect } from 'react';
import { PlantCode, ViewId, PLANTS, DataMode, Alert, ChatMessage, plantByCode } from './lib/domain';
import { checkBackend, fetchAlerts } from './lib/api';
import { nextTelemetry, seeded } from './lib/demo';
import { ResumenView } from './components/ResumenView';
import { ScadaLiveView } from './components/ScadaLiveView';
import { OptimizationView } from './components/OptimizationView';
import { CopilotoView } from './components/CopilotoView';
import { XAIDiagnosticsView } from './components/XAIDiagnosticsView';
import { useTutorial } from './components/tutorial/useTutorial';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';

export const App: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<PlantCode>('FA');
  const [activeView, setActiveView] = useState<ViewId>('resumen');
  const [dataMode, setDataMode] = useState<DataMode>('CHECKING');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [boardMode, setBoardMode] = useState<boolean>(false);
  const [retroMode, setRetroMode] = useState<boolean>(true);

  // Hook del Tutorial Interactivo Spotlight
  const {
    isActive: isTutorialActive,
    currentStep: tutorialStep,
    stepIndex: tutorialStepIndex,
    totalSteps: tutorialTotalSteps,
    startSectionTutorial,
    nextStep: handleTutorialNext,
    prevStep: handleTutorialPrev,
    skipTutorial: handleTutorialSkip,
  } = useTutorial({
    activeView,
    onNavigate: setActiveView,
  });
  const [timeStr, setTimeStr] = useState<string>('');

  // Memoria del Copiloto IA persistente entre pestañas (pero se reinicia al recargar F5)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: `Hola, soy el Copiloto de Inteligencia Energética de Clarios. Tengo acceso a las lecturas SCADA, modelos de predicción y manuales técnicos (ISO 50001, NFPA 86, SOPs de Formación y Molino Barton). ¿Qué deseas auditar en ${plantByCode('FA').name}?`,
      agent: 'supervisor',
      tools: ['supervisor_routing'],
      citation: '[Fuente: Corpus RAG Clarios Yumbo — Manuales Oficiales]',
    },
  ]);

  // Telemetría en tiempo real por planta
  const [telemetryKw, setTelemetryKw] = useState<Record<PlantCode, number>>({
    FA: 1420,
    ENSAMBLE: 380,
    OREC: 690,
    RC: 420,
  });

  // 1. Verificación inicial de conectividad backend
  useEffect(() => {
    let mounted = true;
    checkBackend().then((mode) => {
      if (mounted) setDataMode(mode);
    });
    fetchAlerts().then(({ data }) => {
      if (mounted) setAlerts(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Reloj industrial de Planta Yumbo (COT / UTC-5)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' COT'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Simulador de streaming continuo de telemetría (1 Hz)
  useEffect(() => {
    const rnd = seeded(Date.now());
    const interval = setInterval(() => {
      setTelemetryKw((prev) => ({
        FA: nextTelemetry('FA', prev.FA, rnd),
        ENSAMBLE: nextTelemetry('ENSAMBLE', prev.ENSAMBLE, rnd),
        OREC: nextTelemetry('OREC', prev.OREC, rnd),
        RC: nextTelemetry('RC', prev.RC, rnd),
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // 4. Atajo de teclado 'F' para alternar Modo Junta Directiva
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setBoardMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAlertAck = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  // Función puente para mandar prompts a la IA desde otras vistas (ej. Optimización)
  const handleAskCopilotFromOtherView = (prompt: string) => {
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: prompt },
    ]);
    setActiveView('copiloto');
  };

  const navItems: Array<{ id: ViewId; label: string; icon: string }> = [
    { id: 'resumen', label: 'Resumen', icon: '📊' },
    { id: 'scada', label: 'SCADA', icon: '⚡' },
    { id: 'optimizacion', label: 'Optimización', icon: '📈' },
    { id: 'copiloto', label: 'Copiloto IA', icon: '🤖' },
    { id: 'xai', label: 'XAI (SHAP)', icon: '🔍' },
  ];

  return (
    <div className={`app ${boardMode ? 'board-mode' : ''} ${retroMode ? 'retro' : ''}`}>
      {/* Encabezado Superior de Sala de Control */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo">⚡</div>
          <div>
            <h1>CLARIOS</h1>
            <small>Energy Control Tower · Yumbo</small>
          </div>
        </div>

        {/* Selector interactivo de plantas */}
        <div className="plant-pills">
          {PLANTS.map((p) => (
            <button
              key={p.code}
              className={`pill ${selectedPlant === p.code ? 'active' : ''}`}
              style={{ '--c': p.color } as any}
              onClick={() => setSelectedPlant(p.code)}
            >
              <span className="dot" />
              {p.name}
            </button>
          ))}
        </div>

        {/* Lado derecho del encabezado: Estado de Conectividad y Reloj */}
        <div className="header-right">
          <span
            className="badge"
            style={{
              '--c': dataMode === 'LIVE' ? '#34d399' : '#fbbf24',
              cursor: 'pointer',
            } as any}
            title={dataMode === 'LIVE' ? 'Conectado a FastAPI Backend' : 'Modo Demo Activo (Sin Backend)'}
            onClick={() => checkBackend().then(setDataMode)}
          >
            <span className="pulse" />
            {dataMode === 'LIVE' ? 'EN LÍNEA (SCADA OT)' : 'MODO DEMO (FALLBACK)'}
          </span>

          <span className="clock num">{timeStr}</span>

          <button
            className="btn btn-ghost"
            style={{
              fontSize: 'var(--fs-xs)',
              padding: '6px 10px',
              color: retroMode ? '#facc15' : 'inherit',
              borderColor: retroMode ? '#ca8a04' : undefined,
            }}
            title="Alternar entre Diseo Retro 16-Bit (GBA) y Diseo Moderno"
            onClick={() => setRetroMode(!retroMode)}
          >
            {retroMode ? '🎮 Modo GBA' : '⚡ Moderno'}
          </button>

          <button
            className="btn btn-ghost"
            style={{ fontSize: 'var(--fs-xs)', padding: '6px 10px' }}
            title="Presiona 'F' en tu teclado para activar o desactivar"
            onClick={() => setBoardMode(!boardMode)}
          >
            {boardMode ? 'Salir Junta (F)' : 'Modo Junta (F)'}
          </button>

          {/* Botón para reproducir tutorial de la sección actual */}
          <button
            className="btn btn-ghost"
            style={{
              fontSize: 'var(--fs-xs)',
              padding: '6px 12px',
              color: '#38bdf8',
              borderColor: '#0284c7',
              background: 'rgba(2, 132, 199, 0.12)',
              fontFamily: retroMode ? 'var(--font-retro-title)' : 'inherit',
            }}
            title="Reproducir tutorial interactivo para esta sección"
            onClick={() => startSectionTutorial(activeView)}
          >
            🎮 GUÍA
          </button>
        </div>
      </header>

      {/* Barra de Navegación Lateral */}
      <nav className="sidebar">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="sidebar-spacer" />

        <div style={{ textAlign: 'center', padding: '0 4px', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
          v2.0 Clean Arch
        </div>
      </nav>

      {/* Contenedor Principal de la Vista Activa */}
      <main className="main">
        {activeView === 'resumen' && (
          <ResumenView
            selectedPlant={selectedPlant}
            onSelectPlant={setSelectedPlant}
            telemetryKw={telemetryKw}
          />
        )}
        {activeView === 'scada' && (
          <ScadaLiveView
            selectedPlant={selectedPlant}
            alerts={alerts}
            onAlertAck={handleAlertAck}
            currentKw={telemetryKw[selectedPlant]}
            onAskCopilot={handleAskCopilotFromOtherView}
          />
        )}
        {activeView === 'optimizacion' && (
          <OptimizationView
            selectedPlant={selectedPlant}
            onAskCopilot={handleAskCopilotFromOtherView}
          />
        )}
        {activeView === 'copiloto' && (
          <CopilotoView
            selectedPlant={selectedPlant}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}
        {activeView === 'xai' && (
          <XAIDiagnosticsView selectedPlant={selectedPlant} />
        )}
      </main>
      {/* Overlay del Tutorial Interactivo Spotlight */}
      <TutorialOverlay
        isActive={isTutorialActive}
        currentStep={tutorialStep}
        stepIndex={tutorialStepIndex}
        totalSteps={tutorialTotalSteps}
        onNext={handleTutorialNext}
        onPrev={handleTutorialPrev}
        onSkip={handleTutorialSkip}
      />
    </div>
  );
};

export default App;
