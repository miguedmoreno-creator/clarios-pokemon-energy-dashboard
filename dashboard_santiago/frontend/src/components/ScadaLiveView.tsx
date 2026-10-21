import React, { useState } from 'react';
import { PlantCode, plantByCode, Alert } from '../lib/domain';
import { fmtNum } from '../lib/format';
import { acknowledgeAlert } from '../lib/api';
import { GbaCard } from './ui/GbaCard';
import { RetroTooltip } from './ui/RetroTooltip';
import { TrainerGuide } from './ui/TrainerGuide';
import { RetroCursor } from './ui/RetroCursor';
import { DottedRow } from './ui/DottedRow';
import { TRAINER_GUIDES, RETRO_TOOLTIPS } from '../lib/retroCopy';

interface ScadaLiveViewProps {
  selectedPlant: PlantCode;
  alerts: Alert[];
  onAlertAck: (alertId: string) => void;
  currentKw: number;
  onAskCopilot?: (prompt: string) => void;
}

export const ScadaLiveView: React.FC<ScadaLiveViewProps> = ({
  selectedPlant,
  alerts,
  onAlertAck,
  currentKw,
  onAskCopilot,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const plant = plantByCode(selectedPlant);

  const plantAlerts = alerts.filter(
    (a) => (a.plant === selectedPlant || filterSeverity !== 'ALL') &&
           (filterSeverity === 'ALL' || a.severity === filterSeverity)
  );

  const handleAck = async (id: string) => {
    onAlertAck(id);
    await acknowledgeAlert(id);
  };

  // Redacción amigable de alertas para sala de control
  const getFriendlyAlertText = (a: Alert) => {
    if (a.deviationPct && a.deviationPct > 0) {
      return `Se detectó un consumo mayor al esperado (+${a.deviationPct.toFixed(1)}%). El equipo técnico está verificando el estado de los medidores.`;
    }
    return a.detail || 'Evento operacional registrado en los medidores de telemetría.';
  };

  return (
    <div className="view">
      {/* Guía del Entrenador */}
      <TrainerGuide
        viewId="scada"
        text={TRAINER_GUIDES.scada}
      />

      <div className="view-head">
        <div>
          <h2>Centro de Diagnóstico SCADA · {plant.name}</h2>
          <p>Supervisión en vivo con medidores Modbus TCP y tolerancia a fallas de red</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <span className="badge" style={{ '--c': '#34d399' } as any}>
            <span className="pulse" /> BUFFER WAL PROTEGIDO
          </span>
        </div>
      </div>

      {/* Grid de Consolas de Diagnóstico Pokémon Center */}
      <div className="grid g-3">
        {/* Consola 1: Potencia Instantánea */}
        <GbaCard data-tour="scada-telemetry"
          title={
            <RetroTooltip
              title="Potencia Eléctrica en Vivo"
              text="Muestra la cantidad de electricidad que la maquinaria de esta planta está consumiendo exactamente en este segundo."
              technicalNote="Lectura instantánea de potencia activa (kW) vía protocolo Modbus TCP."
            >
              <span>⚡ Potencia Instantánea Activa</span>
            </RetroTooltip>
          }
          badge={<span className="badge" style={{ '--c': plant.color } as any}>MODBUS TCP</span>}
        >
          <div className="kpi-value" style={{ color: plant.color, margin: '8px 0' }}>
            {fmtNum(currentKw, 0)} <span className="kpi-unit">kW</span>
          </div>
          <div className="kpi-foot">
            <span className="muted" style={{ fontSize: '18px' }}>Frecuencia de muestreo: 1 segundo</span>
          </div>
        </GbaCard>

        {/* Consola 2: Escudo Guardián de Datos (Anti-Apagones) */}
        <GbaCard data-tour="scada-wal"
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.scadaWal.title}
              text={RETRO_TOOLTIPS.scadaWal.text}
              technicalNote={RETRO_TOOLTIPS.scadaWal.technicalNote}
            >
              <span>🛡️ {RETRO_TOOLTIPS.scadaWal.title}</span>
            </RetroTooltip>
          }
          badge={<span className="badge" style={{ '--c': '#38bdf8' } as any}>SIN PÉRDIDAS</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <DottedRow label="Anti-Resets Modbus" value="ACTIVO (< 0)" valueColor="#34d399" />
            <DottedRow label="Almacén Local" value="SQLite WAL" valueColor="#38bdf8" />
            <DottedRow label="Respaldo sin red" value="Hasta 7 días" valueColor="#facc15" />
          </div>
        </GbaCard>

        {/* Consola 3: Turnos de Operación con Emojis Nativos */}
        <GbaCard
          title={
            <RetroTooltip
              title={RETRO_TOOLTIPS.shifts.title}
              text={RETRO_TOOLTIPS.shifts.text}
              technicalNote={RETRO_TOOLTIPS.shifts.technicalNote}
            >
              <span>🕒 Turnos de Planta (Horario COT)</span>
            </RetroTooltip>
          }
          badge={<span className="dim">UTC-5</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <div style={{ fontSize: '19px', color: '#94a3b8' }}>
              <span style={{ filter: 'contrast(1.2)', textShadow: '1px 1px 0 #000', marginRight: '6px' }}>☀️</span>
              <span>T1 (Noche): <b>22:00 - 06:00</b></span>
            </div>
            <div style={{ fontSize: '19px', color: '#38bdf8', fontWeight: 'bold' }}>
              <span style={{ filter: 'contrast(1.2)', textShadow: '1px 1px 0 #000', marginRight: '6px' }}>🌇</span>
              <span>T2 (Mañana): <b>06:00 - 14:00 [ACTIVO]</b></span>
            </div>
            <div style={{ fontSize: '19px', color: '#94a3b8' }}>
              <span style={{ filter: 'contrast(1.2)', textShadow: '1px 1px 0 #000', marginRight: '6px' }}>🌙</span>
              <span>T3 (Tarde): <b>14:00 - 22:00</b></span>
            </div>
          </div>
        </GbaCard>
      </div>

      {/* Feed Operacional de Alarmas estilo Caja de Diálogo Clásica GBA */}
      <div className="gba-card" data-tour="scada-alerts" style={{ marginTop: '16px' }}>
        <div className="gba-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>💬</span>
            <span className="card-title">Caja de Diálogo y Alarmas SCADA</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
              const tooltipInfo =
                sev === 'CRITICAL'
                  ? {
                      title: 'Alerta Crítica (Peligro)',
                      text: 'Situación urgente que requiere atención inmediata: máquinas sobrecalentadas (>55°C), consumo desbordado o desconexión de sensor Modbus.',
                    }
                  : sev === 'WARNING'
                  ? {
                      title: 'Alerta de Advertencia (Precaución)',
                      text: 'Aviso de prevención: una máquina o circuito está gastando un poco más de lo normal pero la fábrica sigue operando en rango seguro.',
                    }
                  : sev === 'INFO'
                  ? {
                      title: 'Alerta Informativa (Rutina)',
                      text: 'Notificación normal del sistema: cambio de turno laboral, calibración programada de medidores o eventos regulares de planta.',
                    }
                  : null;

              return (
                <button
                  key={sev}
                  className={`btn-gba ${filterSeverity === sev ? 'active' : ''}`}
                  style={{
                    fontSize: '0.55rem',
                    padding: '4px 8px',
                    background: filterSeverity === sev ? '#2563eb' : '#1e293b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={() => setFilterSeverity(sev)}
                >
                  {sev === 'ALL' ? (
                    'Todas'
                  ) : tooltipInfo ? (
                    <RetroTooltip title={tooltipInfo.title} text={tooltipInfo.text}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {sev} <b style={{ color: '#38bdf8' }}>(?)</b>
                      </span>
                    </RetroTooltip>
                  ) : (
                    sev
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="alert-list" style={{ marginTop: '12px' }}>
          {plantAlerts.map((a) => {
            const color = a.severity === 'CRITICAL' ? '#f43f5e' : a.severity === 'WARNING' ? '#fbbf24' : '#22d3ee';
            return (
              <div
                key={a.id}
                className={`alert ${a.acknowledged ? 'ack' : ''}`}
                style={{
                  '--c': color,
                  border: '3px solid #000',
                  boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15), 3px 3px 0 #000',
                  background: '#0d1522',
                  borderRadius: 0,
                  padding: '12px',
                  marginBottom: '8px',
                } as any}
              >
                <div>
                  <span className="badge" style={{ '--c': color, fontSize: '0.55rem' } as any}>
                    {a.severity}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="alert-title" style={{ fontFamily: 'var(--font-retro-title)', fontSize: '0.68rem', color: '#f1f5f9' }}>
                    {a.title}
                  </div>
                  <div className="alert-meta" style={{ fontFamily: 'var(--font-retro-body)', fontSize: '19px', color: '#94a3b8', marginTop: '4px' }}>
                    Planta {a.plant} · {new Date(a.detectedAt).toLocaleTimeString('es-CO')} COT — {getFriendlyAlertText(a)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!a.acknowledged ? (
                      <button
                        className="btn-gba"
                        style={{
                          fontSize: '0.58rem',
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onClick={() => handleAck(a.id)}
                      >
                        <span>Reconocer</span>
                        <RetroCursor color="#FF1744" />
                      </button>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-retro-body)', fontSize: '18px', color: '#34d399' }}>
                        Atendida ✓
                      </span>
                    )}
                  </div>

                  {onAskCopilot && (
                    <button
                      className="btn-gba"
                      style={{
                        background: '#312e81',
                        color: '#c7d2fe',
                        fontSize: '0.55rem',
                        padding: '4px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() =>
                        onAskCopilot(
                          `Explica la alerta operacional en ${plant.name}: "${a.title}" (${a.detail}). Desviación registrada: ${a.deviationPct.toFixed(1)}%. ¿Qué significa operacionalmente según los protocolos SOP de Clarios y qué procedimiento de mitigación debe ejecutar el operador en planta?`
                        )
                      }
                      title="Consultar al Copiloto IA qué significa y qué protocolo seguir"
                    >
                      🤖 Explicar Alerta con Copiloto IA →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
