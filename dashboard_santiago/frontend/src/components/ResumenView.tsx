import React, { useState } from 'react';
import { PlantCode, plantByCode } from '../lib/domain';
import { computeKpis, PlantKpis } from '../lib/demo';
import { fmtCOP, fmtNum, fmtCompact } from '../lib/format';
import { PlantTopology } from './PlantTopology';
import { LoadCurveChart } from './Charts';
import { GbaCard } from './ui/GbaCard';
import { HpBar } from './ui/HpBar';
import { RetroTooltip } from './ui/RetroTooltip';
import { TrainerGuide } from './ui/TrainerGuide';
import { PixelIcon } from './ui/PixelIcon';
import { TRAINER_GUIDES, RETRO_TOOLTIPS } from '../lib/retroCopy';

interface ResumenViewProps {
  selectedPlant: PlantCode;
  onSelectPlant: (p: PlantCode) => void;
  telemetryKw: Record<PlantCode, number>;
}

export const ResumenView: React.FC<ResumenViewProps> = ({
  selectedPlant,
  onSelectPlant,
  telemetryKw,
}) => {
  const [whatIfPercent, setWhatIfPercent] = useState<number>(0);
  const [analyzingCurve, setAnalyzingCurve] = useState<boolean>(false);
  const [curveAnalysis, setCurveAnalysis] = useState<{
    summary: string;
    keyInsights: string[];
    recommendation: string;
    source: string;
  } | null>(null);

  const handleAnalyzeCurveInSitu = async () => {
    setAnalyzingCurve(true);
    await new Promise((r) => setTimeout(r, 650));

    const isWhatIf = whatIfPercent !== 0;
    const whatIfFactor = 1 + (whatIfPercent / 100) * 0.72;
    const projectedKwh = kpis.kwh12m * whatIfFactor;
    const deltaCop = kpis.cost12m * (whatIfFactor - 1);

    setCurveAnalysis({
      summary: `Diagnóstico del Agente de Energía para ${plant.name}: La curva escalonada muestra un consumo base continuo de ${fmtNum(kpis.kwh12m, 0)} kWh/año (${fmtCOP(kpis.cost12m)} COP), con fuerte concentración en turnos diurnos y estabilización en horario nocturno.`,
      keyInsights: [
        `Régimen Horario: La potencia se incrementa durante los turnos T2 y T3 debido a los procesos intensivos de rectificación y ensamble continuo.`,
        isWhatIf
          ? `Simulación What-If Activa (${whatIfPercent > 0 ? '+' : ''}${whatIfPercent}%): Desplaza el volumen anual a ${fmtNum(projectedKwh, 0)} kWh (${deltaCop >= 0 ? '+' : ''}${fmtCOP(deltaCop)} COP con elasticidad energética beta=0.72).`
          : `Línea Base ISO 50001: Consumo específico actual de ${kpis.sec.toFixed(2)} kWh/equiv frente a una meta de ${kpis.secTarget.toFixed(2)} kWh/equiv. Mover el control What-If proyecta la respuesta en caliente.`,
        `Oportunidad de Eficiencia: El perfil escalonado permite trasladar potencia hacia horas de tarifa valle (Turno 1: 22:00 a 06:00, $520 COP/kWh) y activar el despacho modular de rectificadores.`,
      ],
      recommendation:
        'Recomendación Operativa Inmediata: Activar el organizador HiGHS MILP para desplazar cargas de formación a la noche y evitar operar rectificadores en vacío a cargas parciales inferiores al 40%.',
      source: 'ISO 50001:2018 · Sistema de Gestión de Energía & Modelo Predictive What-If Clarios',
    });
    setAnalyzingCurve(false);
  };
  const plant = plantByCode(selectedPlant);
  const kpis: PlantKpis = computeKpis(selectedPlant);

  // Cálculo What-If interactivo en caliente
  const factor = 1 + whatIfPercent / 100;
  const simulatedKwh = kpis.kwh12m * factor;
  const simulatedCost = kpis.cost12m * factor;
  const deltaCost = simulatedCost - kpis.cost12m;

  return (
    <div className="view">
      {/* Guía del Entrenador */}
      <TrainerGuide
        viewId="resumen"
        text={TRAINER_GUIDES.resumen}
      />

      <div className="view-head">
        <div>
          <h2>Sala de Control · {plant.name}</h2>
          <p>{plant.description} — Métricas consolidadas últimos 12 meses</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <span className="badge" style={{ '--c': plant.color } as any}>
            <span className="pulse" /> Telemetría Activa
          </span>
        </div>
      </div>

      {/* Fila Principal de KPIs Ejecutivos (Tarjetas de Estadísticas del Equipo) */}
      <div className="grid g-4" data-tour="kpi-grid">
        {/* KPI 1: Energía Total Usada (1 Año) */}
        <GbaCard
          icon={<PixelIcon name="battery" size={28} />}
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.kwh12m.title}
              text={RETRO_TOOLTIPS.kwh12m.text}
              technicalNote={RETRO_TOOLTIPS.kwh12m.technicalNote}
            >
              <span>{RETRO_TOOLTIPS.kwh12m.title}</span>
            </RetroTooltip>
          }
          badge={<span className="dim">kWh</span>}
        >
          <div className="kpi-value">{fmtCompact(kpis.kwh12m)}</div>
          <div className="kpi-foot">
            <span className="num muted">{fmtNum(kpis.kwh12m)} kWh totales</span>
          </div>
        </GbaCard>

        {/* KPI 2: Eficiencia por Batería (Salud HP) */}
        <GbaCard
          icon={<PixelIcon name="bolt" size={28} />}
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.sec.title}
              text={RETRO_TOOLTIPS.sec.text}
              technicalNote={RETRO_TOOLTIPS.sec.technicalNote}
            >
              <span>{RETRO_TOOLTIPS.sec.title}</span>
            </RetroTooltip>
          }
          badge={
            <span className="badge" style={{ '--c': kpis.sec <= kpis.secTarget ? '#34d399' : '#f59e0b' } as any}>
              Meta: {fmtNum(kpis.secTarget, 1)}
            </span>
          }
        >
          <div className="kpi-value">
            {fmtNum(kpis.sec, 2)}
            <span className="kpi-unit">kWh/eq</span>
          </div>
          {/* Barra de Salud RPG comparando actual vs meta */}
          <HpBar value={kpis.sec} max={kpis.secTarget} invert={true} />
          <div className="kpi-foot" style={{ marginTop: '8px' }}>
            <span>vs año previo: {fmtNum(kpis.secPrev, 2)} kWh/eq</span>
          </div>
        </GbaCard>

        {/* KPI 3: Costo Energético Estimado */}
        <GbaCard
          icon={<PixelIcon name="coin" size={28} />}
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.costo.title}
              text={RETRO_TOOLTIPS.costo.text}
              technicalNote={RETRO_TOOLTIPS.costo.technicalNote}
            >
              <span>{RETRO_TOOLTIPS.costo.title}</span>
            </RetroTooltip>
          }
          badge={<span className="dim">Tarifa CREG</span>}
        >
          <div className="kpi-value">{fmtCOP(kpis.cost12m)}</div>
          <div className="kpi-foot">
            <span className="num muted">~${fmtNum(kpis.tariffCopKwh, 0)} COP/kWh promedio</span>
          </div>
        </GbaCard>

        {/* KPI 4: Ahorro Anual Identificado */}
        <GbaCard
          icon={<PixelIcon name="leaf" size={28} />}
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.ahorro.title}
              text={RETRO_TOOLTIPS.ahorro.text}
              technicalNote={RETRO_TOOLTIPS.ahorro.technicalNote}
            >
              <span>{RETRO_TOOLTIPS.ahorro.title}</span>
            </RetroTooltip>
          }
          badge={<span className="badge" style={{ '--c': '#34d399' } as any}>9.5% ISO 50001</span>}
        >
          <div className="kpi-value">{fmtCOP(kpis.savingsCop)}</div>
          <div className="kpi-foot">
            <span>🌱 Evita {fmtNum(kpis.co2AvoidableTons, 1)} t CO₂ eq/año</span>
          </div>
        </GbaCard>
      </div>

      {/* Sección Gráfica: Curva de Carga conectada al What-If + Topología */}
      <div className="grid g-main">
        {/* Curva de Carga Histórica reactiva al Slider What-If */}
        <GbaCard data-tour="monthly-chart"
          title={
            <RetroTooltip
              title="Curva de Carga Escalonada 16-Bits"
              text="Muestra el consumo de energía a lo largo del año dibujado en bloques de terreno de 16-bits para identificar valles y picos de demanda."
              technicalNote="Gráfica escalonada con series de consumo eléctrico, gas y escenario simulado."
            >
              <span>Curva de Carga y Simulación What-If (Yumbo)</span>
            </RetroTooltip>
          }
          badge={
            <span className="dim">
              {whatIfPercent !== 0 ? (
                <b style={{ color: whatIfPercent > 0 ? '#f43f5e' : '#34d399' }}>
                  Simulación Activa ({whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`})
                </b>
              ) : (
                'Mueve la Pokéball para proyectar'
              )}
            </span>
          }
        >
          <LoadCurveChart
            data={kpis.series}
            plantColor={plant.color}
            whatIfPercent={whatIfPercent}
          />

          {/* Botón de Análisis In-Situ de la Curva con IA */}
          <button
            className="btn-gba"
            onClick={handleAnalyzeCurveInSitu}
            disabled={analyzingCurve}
            style={{
              width: '100%',
              marginTop: '12px',
              background: '#1e1b4b',
              color: '#c7d2fe',
              fontSize: '0.62rem',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {analyzingCurve ? (
              <span>🤖 El Agente de Energía está analizando la curva...</span>
            ) : (
              <span>🤖 Analizar esta Curva con el Agente de Energía (En Pantalla)</span>
            )}
          </button>

          {/* Cuadro de Razonamiento In-Situ del Agente */}
          {curveAnalysis && (
            <div
              style={{
                marginTop: '12px',
                background: '#0d1527',
                border: '2px solid #38bdf8',
                boxShadow: 'inset 0 0 0 1px #000, 3px 3px 0 #000',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                animation: 'fadeUp 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="badge"
                    style={{ '--c': '#38bdf8', fontSize: '0.58rem', padding: '3px 8px' } as any}
                  >
                    🤖 RAZONAMIENTO DEL SUPERVISOR IA
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Análisis In-Situ</span>
                </div>
                <button
                  onClick={() => setCurveAnalysis(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.58rem',
                    fontFamily: 'var(--font-retro-title)',
                    cursor: 'pointer',
                  }}
                  title="Ocultar análisis"
                >
                  ✕ CERRAR
                </button>
              </div>

              <p
                style={{
                  fontFamily: 'var(--font-retro-body)',
                  fontSize: '20px',
                  color: '#f8fafc',
                  lineHeight: 1.35,
                  margin: 0,
                }}
              >
                {curveAnalysis.summary}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
                {curveAnalysis.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      fontFamily: 'var(--font-retro-body)',
                      fontSize: '19px',
                      color: '#cbd5e1',
                    }}
                  >
                    <span style={{ color: '#38bdf8' }}>▶</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(2, 132, 199, 0.15)',
                  borderLeft: '3px solid #38bdf8',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-retro-body)',
                  fontSize: '19px',
                  color: '#7dd3fc',
                }}
              >
                💡 {curveAnalysis.recommendation}
              </div>

              <div style={{ fontSize: '0.55rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                [{curveAnalysis.source}]
              </div>
            </div>
          )}
        </GbaCard>

        {/* Topología y Simulador What-If */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <PlantTopology data-tour="plant-topology"
            selectedPlant={selectedPlant}
            onSelectPlant={onSelectPlant}
            telemetryKw={telemetryKw}
          />

          {/* Card de Simulación Interactiva What-If con Pokéball Thumb */}
          <GbaCard data-tour="whatif-card"
            title={
              <RetroTooltip
                title="Simulador de Escenarios (What-If)"
                text="Arrastra la Pokéball para calcular al instante qué pasaría si aumentamos o reducimos el ritmo de producción."
                technicalNote="Modelo lineal de sensibilidad energética con impacto directo en kWh y presupuesto."
              >
                <span>🎛️ Simulador de Escenarios (What-If)</span>
              </RetroTooltip>
            }
            badge={
              <span className="badge" style={{ '--c': whatIfPercent !== 0 ? '#34d399' : '#a78bfa' } as any}>
                {whatIfPercent !== 0 ? 'SIMULANDO' : 'MODO BASE'}
              </span>
            }
          >
            <p className="muted" style={{ fontSize: '18px', marginBottom: '8px' }}>
              Ajusta la cuota de producción proyectada con el control de Pokéball:
            </p>
            <div className="slider-row">
              <span className="muted" style={{ fontSize: '19px' }}>Variación de Carga/Producción:</span>
              <b className="num" style={{ color: whatIfPercent > 0 ? '#f43f5e' : whatIfPercent < 0 ? '#34d399' : '#22d3ee', fontSize: '1.2rem' }}>
                {whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`}
              </b>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="5"
              value={whatIfPercent}
              onChange={(e) => setWhatIfPercent(Number(e.target.value))}
              style={{ '--p': `${((whatIfPercent + 25) / 50) * 100}%` } as any}
            />
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', background: 'rgba(0,0,0,0.4)', border: '2px solid #000', padding: '10px' }}>
              <div>
                <span className="muted" style={{ display: 'block' }}>Demanda Proyectada:</span>
                <b className="num" style={{ fontSize: '20px' }}>{fmtCompact(simulatedKwh)} kWh</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="muted" style={{ display: 'block' }}>Delta Presupuestal:</span>
                <b className="num" style={{ fontSize: '20px', color: deltaCost > 0 ? '#f43f5e' : deltaCost < 0 ? '#34d399' : 'inherit' }}>
                  {deltaCost >= 0 ? `+${fmtCOP(deltaCost)}` : fmtCOP(deltaCost)}
                </b>
              </div>
            </div>
            {whatIfPercent !== 0 && (
              <button
                className="btn-gba"
                style={{ width: '100%', marginTop: '10px', fontSize: '0.65rem' }}
                onClick={() => setWhatIfPercent(0)}
              >
                Restablecer a Escenario Real (0%)
              </button>
            )}
          </GbaCard>
        </div>
      </div>
    </div>
  );
};
