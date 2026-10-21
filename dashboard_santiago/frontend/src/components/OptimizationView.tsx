import React, { useState } from 'react';
import { PlantCode, plantByCode } from '../lib/domain';
import { fmtCOP } from '../lib/format';
import {
  MILPResponse,
  MPCResponse,
  RectifierDispatchResponse,
  runLoadShifting,
  runMPC,
  runRectifierDispatch,
} from '../lib/api';
import { MilpScheduleChart, MpcTrajectoryChart } from './Charts';
import { GbaCard } from './ui/GbaCard';
import { RetroTooltip } from './ui/RetroTooltip';
import { TrainerGuide } from './ui/TrainerGuide';
import { DottedRow } from './ui/DottedRow';
import { TRAINER_GUIDES, RETRO_TOOLTIPS } from '../lib/retroCopy';

interface OptimizationViewProps {
  selectedPlant: PlantCode;
  onAskCopilot: (prompt: string) => void;
}

export const OptimizationView: React.FC<OptimizationViewProps> = ({
  selectedPlant,
  onAskCopilot,
}) => {
  const plant = plantByCode(selectedPlant);
  const [loadingMilp, setLoadingMilp] = useState(false);
  const [loadingMpc, setLoadingMpc] = useState(false);
  const [loadingRect, setLoadingRect] = useState(false);
  const [milpRes, setMilpRes] = useState<MILPResponse | null>(null);
  const [mpcRes, setMpcRes] = useState<MPCResponse | null>(null);
  const [rectRes, setRectRes] = useState<RectifierDispatchResponse | null>(null);
  const [initialTemp, setInitialTemp] = useState<number>(51.2);
  const [targetLoadKw, setTargetLoadKw] = useState<number>(850);

  const handleRunMilp = async () => {
    setLoadingMilp(true);
    const { data } = await runLoadShifting(selectedPlant);
    setMilpRes(data);
    setLoadingMilp(false);
  };

  const handleRunMpc = async () => {
    setLoadingMpc(true);
    const { data } = await runMPC(selectedPlant, initialTemp);
    setMpcRes(data);
    setLoadingMpc(false);
  };

  const handleRunRect = async () => {
    setLoadingRect(true);
    const { data } = await runRectifierDispatch(selectedPlant, targetLoadKw);
    setRectRes(data);
    setLoadingRect(false);
  };

  const handleExplainMilp = () => {
    if (!milpRes) return;
    onAskCopilot(
      `Explica el resultado de la optimización HiGHS MILP en ${plant.name}: se obtuvo un ahorro de ${fmtCOP(milpRes.net_savings_cop)} (${milpRes.savings_pct.toFixed(1)}%) desplazando cargas horarias hacia horas Valle. ¿Cómo se debe comunicar operativamente este despacho a los supervisores de turno?`
    );
  };

  const handleExplainMpc = () => {
    if (!mpcRes) return;
    onAskCopilot(
      `El controlador predictivo SLSQP MPC calculó una temperatura pico de ${mpcRes.max_predicted_temp_c.toFixed(2)} °C partiendo de ${initialTemp} °C en las tinas de ${plant.name}. ¿Por qué es vital no exceder los 55.0 °C según la norma NFPA 86 y el SOP-ENG-042?`
    );
  };

  const handleExplainRect = () => {
    if (!rectRes) return;
    onAskCopilot(
      `El optimizador de despacho de rectificadores en ${plant.name} asignó ${rectRes.total_delivered_kw} kW logrando un ahorro de ${rectRes.power_saved_kw} kW (-${rectRes.savings_pct.toFixed(1)}% pérdidas, ~$${fmtCOP(rectRes.estimated_annual_savings_cop)}/año) apagando unidades redundantes. ¿Cómo se alinea esto con la eficiencia de transformadores y tiristores?`
    );
  };

  return (
    <div className="view">
      {/* Guía del Entrenador */}
      <TrainerGuide
        viewId="optimizacion"
        text={TRAINER_GUIDES.optimizacion}
      />

      <div className="view-head">
        <div>
          <h2>Gimnasio de Optimización Energética · {plant.name}</h2>
          <p>
            Tríada de optimización industrial: HiGHS MILP (Horarios), SLSQP MPC (Térmico) y MIQP (Repartidor de Carga)
          </p>
        </div>
      </div>

      {/* Grid: 2 modelos en fila 1, 1 modelo centrado en fila 2 */}
      <div className="opt-grid">
        {/* Panel 1 (Fila 1, Izquierda): Entrenador de Horarios (HiGHS MILP) */}
        <div data-tour="opt-milp">
          <GbaCard
            title={
              <RetroTooltip
                title={RETRO_TOOLTIPS.milp.title}
                text={RETRO_TOOLTIPS.milp.text}
              >
                <span>⏱️ {RETRO_TOOLTIPS.milp.title}</span>
              </RetroTooltip>
            }
            badge={<span className="badge" style={{ '--c': '#38bdf8' } as any}>HORARIOS INTELIGENTES</span>}
          >
            <p className="muted" style={{ fontSize: '18px', marginBottom: '12px' }}>
              Mueve automáticamente el consumo de las horas caras ($780 COP/kWh) hacia las horas baratas ($520 COP/kWh).
            </p>

            <button
              className="btn-gba"
              onClick={handleRunMilp}
              disabled={loadingMilp}
              style={{ width: '100%', marginBottom: '14px', fontSize: '0.68rem', padding: '12px' }}
            >
              {loadingMilp ? 'Entrenando Algoritmo MILP...' : 'Ejecutar HiGHS MILP (Despacho Semanal)'}
            </button>

            {milpRes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DottedRow label="Estado del Solver" value={`${milpRes.status} (${milpRes.solver_name})`} valueColor="#34d399" />
                <DottedRow label="Tiempo de Solución" value={`${milpRes.solve_time_ms.toFixed(1)} ms`} valueColor="#38bdf8" />
                <DottedRow
                  label="Ahorro Neto Proyectado"
                  value={`+${fmtCOP(milpRes.net_savings_cop)} (${milpRes.savings_pct.toFixed(1)}%)`}
                  valueColor="#34d399"
                />
                <DottedRow
                  label="Reducción en Horas Pico"
                  value={`-${milpRes.peak_reduction_pct.toFixed(1)}% demanda`}
                  valueColor="#38bdf8"
                />

                {/* Gráfica de Barras Sólidas 16-Bits */}
                <MilpScheduleChart schedule={milpRes.schedule} />

                <button
                  className="btn-gba"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: '#312e81',
                    color: '#c7d2fe',
                    fontSize: '0.6rem',
                  }}
                  onClick={handleExplainMilp}
                >
                  🤖 Explicar este despacho con el Copiloto IA →
                </button>
              </div>
            )}
          </GbaCard>
        </div>

        {/* Panel 2 (Fila 1, Derecha): Termostato Inteligente (SLSQP MPC) */}
        <div data-tour="opt-mpc">
          <GbaCard
            title={
              <RetroTooltip
                title={RETRO_TOOLTIPS.mpc.title}
                text={RETRO_TOOLTIPS.mpc.text}
              >
                <span>🌡️ {RETRO_TOOLTIPS.mpc.title}</span>
              </RetroTooltip>
            }
            badge={<span className="badge" style={{ '--c': '#f43f5e' } as any}>NFPA 86 &lt; 55°C</span>}
          >
            <p className="muted" style={{ fontSize: '18px', marginBottom: '12px' }}>
              Regula la temperatura de las tinas de formación para gastar el mínimo de energía manteniéndose bajo el límite seguro.
            </p>

            <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.3)', border: '2px solid #000', padding: '10px' }}>
              <div className="slider-row">
                <span className="muted" style={{ fontSize: '18px' }}>Ajustar Temperatura Inicial (Pokéball):</span>
                <b className="num" style={{ fontSize: '1.1rem', color: initialTemp >= 53 ? '#f43f5e' : '#38bdf8' }}>
                  {initialTemp.toFixed(1)} °C
                </b>
              </div>
              <input
                type="range"
                min="40"
                max="54"
                step="0.2"
                value={initialTemp}
                onChange={(e) => setInitialTemp(Number(e.target.value))}
                style={{ '--p': `${((initialTemp - 40) / 14) * 100}%` } as any}
              />
            </div>

            <button
              className="btn-gba"
              onClick={handleRunMpc}
              disabled={loadingMpc}
              style={{ width: '100%', marginBottom: '14px', fontSize: '0.68rem', padding: '12px' }}
            >
              {loadingMpc ? 'Calculando Trayectoria MPC...' : 'Resolver SLSQP MPC (Control Predictivo)'}
            </button>

            {mpcRes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DottedRow label="Convergencia" value={`${mpcRes.status} (${mpcRes.solve_time_ms.toFixed(1)} ms)`} valueColor="#34d399" />
                <DottedRow
                  label="Temperatura Pico"
                  value={`${mpcRes.max_predicted_temp_c.toFixed(2)} °C (Límite 55°C)`}
                  valueColor={mpcRes.is_thermal_limit_respected ? '#34d399' : '#f43f5e'}
                />
                <DottedRow
                  label="Restricción NFPA 86"
                  value={mpcRes.is_thermal_limit_respected ? 'SEGURA ✓' : 'VIOLACIÓN TÉRMICA'}
                  valueColor={mpcRes.is_thermal_limit_respected ? '#34d399' : '#f43f5e'}
                />

                {/* Gráfica de Trayectoria Térmica */}
                <MpcTrajectoryChart trajectory={mpcRes.trajectory} />

                <button
                  className="btn-gba"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: '#312e81',
                    color: '#c7d2fe',
                    fontSize: '0.6rem',
                  }}
                  onClick={handleExplainMpc}
                >
                  🤖 Interpretar seguridad térmica con Copiloto IA →
                </button>
              </div>
            )}
          </GbaCard>
        </div>

        {/* Panel 3 (Fila 2, Centrado en el Medio): El Repartidor Inteligente de Motores (Rectificadores FA) */}
        <div className="opt-card-centered" data-tour="opt-rect">
          <GbaCard
            title={
              <RetroTooltip
                title={RETRO_TOOLTIPS.rectifiers.title}
                text={RETRO_TOOLTIPS.rectifiers.text}
              >
                <span>⚡ {RETRO_TOOLTIPS.rectifiers.title}</span>
              </RetroTooltip>
            }
            badge={<span className="badge" style={{ '--c': '#fbbf24' } as any}>DESPACHO ÓPTIMO FA</span>}
          >
            <p className="muted" style={{ fontSize: '18px', marginBottom: '12px' }}>
              {selectedPlant === 'FA'
                ? 'Calcula cuántas máquinas prender y a qué porcentaje para entregar la potencia sin desperdiciar luz en vacío.'
                : 'Optimizador calibrado para tinas de Formación (FA). Modo interactivo disponible para simulación.'}
            </p>

            <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.3)', border: '2px solid #000', padding: '10px' }}>
              <div className="slider-row">
                <span className="muted" style={{ fontSize: '18px' }}>Demanda de Carga (Pokéball):</span>
                <b className="num" style={{ fontSize: '1.1rem', color: '#fbbf24' }}>
                  {targetLoadKw} kW
                </b>
              </div>
              <input
                type="range"
                min="200"
                max="2400"
                step="50"
                value={targetLoadKw}
                onChange={(e) => setTargetLoadKw(Number(e.target.value))}
                style={{ '--p': `${((targetLoadKw - 200) / 2200) * 100}%` } as any}
              />
            </div>

            <button
              className="btn-gba"
              onClick={handleRunRect}
              disabled={loadingRect}
              style={{ width: '100%', marginBottom: '14px', fontSize: '0.68rem', padding: '12px' }}
            >
              {loadingRect ? 'Calculando Reparto Óptimo...' : 'Resolver Reparto MIQP (Rectificadores)'}
            </button>

            {rectRes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DottedRow label="Estado del Solver" value={`${rectRes.status} (${rectRes.solver_name})`} valueColor="#34d399" />
                <DottedRow label="Tiempo de Solución" value={`${rectRes.solve_time_ms.toFixed(1)} ms`} valueColor="#38bdf8" />
                <DottedRow
                  label="Potencia Ahorrada"
                  value={`+${rectRes.power_saved_kw.toFixed(1)} kW (-${rectRes.savings_pct.toFixed(1)}% pérdidas)`}
                  valueColor="#34d399"
                />
                <DottedRow
                  label="Ahorro Anual Proyectado"
                  value={`+${fmtCOP(rectRes.estimated_annual_savings_cop)} / año`}
                  valueColor="#fbbf24"
                />
                <DottedRow
                  label="Impacto en SEC"
                  value={`-${rectRes.sec_reduction_estimate.toFixed(3)} kWh/bat`}
                  valueColor="#34d399"
                />

                {/* Lista Visual de los 3 Rectificadores */}
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rectRes.allocations.map((unit) => (
                    <div
                      key={unit.unit_id}
                      style={{
                        border: '2px solid #000',
                        padding: '6px 8px',
                        background: unit.is_online ? 'rgba(56, 189, 248, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem' }}>
                          {unit.unit_id.replace('_', ' ')}
                        </span>
                        <span
                          className="badge"
                          style={{
                            '--c': unit.is_online ? '#34d399' : '#94a3b8',
                            fontSize: '0.55rem',
                            padding: '2px 6px',
                          } as any}
                        >
                          {unit.is_online ? 'ACTIVO (ON)' : 'APAGADO (OFF)'}
                        </span>
                      </div>
                      {unit.is_online ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                          <span className="muted">
                            Carga: <b style={{ color: '#e2e8f0' }}>{unit.allocated_kw.toFixed(1)} kW</b> ({unit.loading_pct.toFixed(1)}%)
                          </span>
                          <span className="muted">
                            Eficiencia: <b style={{ color: unit.efficiency_pct >= 90 ? '#34d399' : '#fbbf24' }}>{unit.efficiency_pct.toFixed(1)}%</b>
                          </span>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: '16px' }}>
                          Standby: 0 kW consumidos (se evitan 13.5 kW de pérdida en vacío)
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="btn-gba"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: '#312e81',
                    color: '#c7d2fe',
                    fontSize: '0.6rem',
                  }}
                  onClick={handleExplainRect}
                >
                  🤖 Interpretar impacto de rectificadores con Copiloto IA →
                </button>
              </div>
            )}
          </GbaCard>
        </div>
      </div>
    </div>
  );
};
