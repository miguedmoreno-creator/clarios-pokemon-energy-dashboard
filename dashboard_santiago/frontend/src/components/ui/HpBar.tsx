import React from 'react';

interface HpBarProps {
  value: number;
  max: number;
  invert?: boolean; // Si true, valores menores a max son mejores (ej. SEC)
  label?: string;
}

export const HpBar: React.FC<HpBarProps> = ({
  value,
  max,
  invert = false,
  label = 'HP:',
}) => {
  let pct = 100;
  let color = '#00E676'; // Verde

  if (invert) {
    // Si invert=true: la meta es `max`. Si value <= max, salud es 100%.
    // Si value > max, la salud disminuye proporcionalmente.
    if (value <= max) {
      pct = 100;
      color = '#00E676'; // Verde perfecto
    } else {
      // ratio: ej. 18.4 / 19.11 = 0.963 -> 96.3%
      const ratio = max / Math.max(value, 0.001);
      pct = Math.max(10, Math.min(100, Math.round(ratio * 100)));
      if (pct >= 90) {
        color = '#FFEA00'; // Amarillo (alerta leve de consumo)
      } else {
        color = '#FF1744'; // Rojo (sobreconsumo crítico)
      }
    }
  } else {
    // Modo directo normal: value / max
    const ratio = Math.max(0, Math.min(1, value / Math.max(max, 0.001)));
    pct = Math.round(ratio * 100);
    if (pct > 50) {
      color = '#00E676';
    } else if (pct > 20) {
      color = '#FFEA00';
    } else {
      color = '#FF1744';
    }
  }

  return (
    <div className="hp-bar-container">
      <span className="hp-bar-label">{label}</span>
      <div className="hp-bar-track">
        <div
          className="hp-bar-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 6px ${color}`,
          }}
        />
      </div>
      <span className="hp-bar-value" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};
