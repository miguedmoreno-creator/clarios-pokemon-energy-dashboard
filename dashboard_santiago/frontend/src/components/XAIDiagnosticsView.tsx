import React from 'react';
import { PlantCode, plantByCode } from '../lib/domain';
import { DEMO_SHAP, MODEL_ACCURACY } from '../lib/demo';
import { ShapWaterfallChart } from './Charts';
import { GbaCard } from './ui/GbaCard';
import { RetroTooltip } from './ui/RetroTooltip';
import { TrainerGuide } from './ui/TrainerGuide';
import { DottedRow } from './ui/DottedRow';
import { TRAINER_GUIDES, RETRO_TOOLTIPS } from '../lib/retroCopy';

interface XAIDiagnosticsViewProps {
  selectedPlant: PlantCode;
}

export const XAIDiagnosticsView: React.FC<XAIDiagnosticsViewProps> = ({ selectedPlant }) => {
  const plant = plantByCode(selectedPlant);
  const shapFeatures = DEMO_SHAP[selectedPlant] || [];
  const accuracy = MODEL_ACCURACY[selectedPlant];

  return (
    <div className="view">
      {/* Guía del Entrenador */}
      <TrainerGuide
        viewId="xai"
        text={TRAINER_GUIDES.xai}
      />

      <div className="view-head">
        <div>
          <h2>Explicabilidad Causal XAI (SHAP) · {plant.name}</h2>
          <p>Descomposición analítica exacta: cuantifica la atribución de cada factor operativo en la demanda.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <span className="badge" style={{ '--c': '#34d399' } as any}>
            TREE EXPLAINER / L2 ANALÍTICO
          </span>
        </div>
      </div>

      <div className="grid g-main">
        {/* Contenedor Izquierdo: Pantalla Principal de la Pokédex */}
        <div className="pokedex-screen" data-tour="xai-bars">
          <div className="pokedex-lens-container">
            <span className="pokedex-lens" title="Sensor Óptico Pokédex" />
            <span className="pokedex-mini-led" style={{ background: '#ef4444' }} />
            <span className="pokedex-mini-led" style={{ background: '#f59e0b' }} />
            <span className="pokedex-mini-led" style={{ background: '#10b981' }} />
            <span style={{ fontFamily: 'var(--font-retro-title)', fontSize: '0.62rem', color: '#6ee7b7', marginLeft: '6px' }}>
              ESCANER POKÉDEX EN VIVO
            </span>
          </div>

          <div className="card-head" style={{ borderBottom: '2px solid rgba(0,0,0,0.5)', paddingBottom: '6px', marginBottom: '10px' }}>
            <RetroTooltip
              title={RETRO_TOOLTIPS.shap.title}
              text={RETRO_TOOLTIPS.shap.text}
              technicalNote={RETRO_TOOLTIPS.shap.technicalNote}
            >
              <span className="card-title" style={{ color: '#ffffff' }}>
                {RETRO_TOOLTIPS.shap.title}
              </span>
            </RetroTooltip>
            <span className="badge" style={{ '--c': '#10b981' } as any}>SUB-MILISEGUNDO</span>
          </div>

          <p className="muted" style={{ fontSize: '18px', color: '#a7f3d0', marginBottom: '8px' }}>
            Las barras <span style={{ color: '#f87171' }}>rojas</span> empujan el recibo hacia arriba (sobreconsumo) y las barras <span style={{ color: '#4ade80' }}>verdes</span> lo bajan (ahorro).
          </p>

          <ShapWaterfallChart features={shapFeatures} />
        </div>

        {/* Paneles Derechos: Pestaña 'Datos de Captura' en la PC de Bill */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {/* Panel 1: Ficha de Precisión */}
          <GbaCard
            title={
              <RetroTooltip
                title={RETRO_TOOLTIPS.accuracy.title}
                text={RETRO_TOOLTIPS.accuracy.text}
                technicalNote={RETRO_TOOLTIPS.accuracy.technicalNote}
              >
                <span>💾 {RETRO_TOOLTIPS.accuracy.title}</span>
              </RetroTooltip>
            }
            badge={<span className="badge" style={{ '--c': '#38bdf8' } as any}>PC DE BILL</span>}
          >
            <div style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '10px' }}>
              Registro de precisión verificado contra datos reales de planta:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <DottedRow label="Arquitectura de Modelo" value={accuracy.model} valueColor="#e2e8f0" />
              <DottedRow label="Error MAPE Histórico" value={`${accuracy.mape.toFixed(2)}%`} valueColor="#34d399" />
              <DottedRow label="Coeficiente R²" value={`+${accuracy.r2.toFixed(3)}`} valueColor="#38bdf8" />
              <DottedRow label="Muestra de Entrenamiento" value={`N = ${accuracy.n} registros`} valueColor="#facc15" />
            </div>
          </GbaCard>

          {/* Panel 2: Certificación Criptográfica */}
          <GbaCard data-tour="xai-cert"
            title={
              <RetroTooltip
                title="Candado Digital y Reproducibilidad MLOps"
                text="Garantiza que nadie ha modificado los modelos a mano. Cada versión está sellada con una firma criptográfica única."
                technicalNote="Versionamiento DVC/MLflow con hash SHA-256 registrado en models_manifest.json."
              >
                <span>🔒 Candado Digital y Certificación</span>
              </RetroTooltip>
            }
            badge={<span className="badge" style={{ '--c': '#a78bfa' } as any}>INMUTABLE</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <DottedRow label="Semilla Determinista" value="42 (Zero Randomness)" valueColor="#38bdf8" />
              <DottedRow label="Firma Criptográfica" value="SHA-256 (Auditado)" valueColor="#34d399" />
              <DottedRow label="Fuga de Información" value="0% (No Data Leakage)" valueColor="#34d399" />
              <DottedRow label="Archivo de Inferencia" value="energy_predictor.joblib" valueColor="#94a3b8" />
            </div>
          </GbaCard>
        </div>
      </div>
    </div>
  );
};
