import React from 'react';
import { PlantCode, PLANTS } from '../lib/domain';
import { GbaCard } from './ui/GbaCard';
import { RetroTooltip } from './ui/RetroTooltip';

interface PlantTopologyProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedPlant: PlantCode;
  onSelectPlant: (plant: PlantCode) => void;
  telemetryKw?: Record<PlantCode, number>;
}

export const PlantTopology: React.FC<PlantTopologyProps> = ({
  selectedPlant,
  onSelectPlant,
  telemetryKw,
  ...rest
}) => {
  // Coordenadas fijas para el layout de Mapa de Región Kanto (SVG viewBox 0 0 700 280)
  const nodes = [
    {
      code: 'FA' as PlantCode,
      name: 'Gimnasio Formación (FA)',
      sprite: '/src/assets/retro/gym-node-fa.png',
      x: 180,
      y: 70,
      desc: 'Rectificadores IGBT',
    },
    {
      code: 'ENSAMBLE' as PlantCode,
      name: 'Gimnasio Ensamble',
      sprite: '/src/assets/retro/gym-node-ensamble.png',
      x: 520,
      y: 70,
      desc: 'Líneas de Armado 1-4',
    },
    {
      code: 'OREC' as PlantCode,
      name: 'Gimnasio Óxido (OREC)',
      sprite: '/src/assets/retro/gym-node-orec.png',
      x: 180,
      y: 210,
      desc: 'Molino Barton & Reactor',
    },
    {
      code: 'RC' as PlantCode,
      name: 'Gimnasio Reciclaje (RC)',
      sprite: '/src/assets/retro/gym-node-rc.png',
      x: 520,
      y: 210,
      desc: 'Hornos Rotatorios Térmicos',
    },
  ];

  const subestacion = {
    x: 350,
    y: 140,
    name: 'Subestación Central Yumbo (13.2 kV)',
    sprite: '/src/assets/retro/map-substation-center.png',
  };

  return (
    <GbaCard
      {...rest}
      title={
        <RetroTooltip
          title="Mapa de los Talleres (Región Yumbo)"
          text="Muestra cómo viaja la electricidad desde el transformador principal hasta cada uno de los cuatro talleres de la fábrica. Haz clic en cualquiera para ver cuánta luz gasta ahora mismo."
        >
          <span>🗺️ Mapa de Región · Topología Eléctrica</span>
        </RetroTooltip>
      }
      badge={<span className="badge" style={{ '--c': '#38bdf8' } as any}>4 NODOS EN LÍNEA</span>}
    >
      <div style={{ marginBottom: '8px', fontSize: '18px', color: '#94a3b8' }}>
        Haz clic en cualquier gimnasio de planta para auditar su telemetría en tiempo real:
      </div>

      <svg className="topo pixel-art" viewBox="0 0 700 280" style={{ imageRendering: 'pixelated' }}>
        <defs>
          <filter id="pixelShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#000" />
          </filter>
        </defs>

        {/* Senderos de píxeles estilo Kanto entre la Subestación y los Gimnasios */}
        {nodes.map((n) => {
          const isSelected = selectedPlant === n.code;
          return (
            <g key={`path-${n.code}`}>
              {/* Sendero punteado de píxeles */}
              <line
                x1={subestacion.x}
                y1={subestacion.y}
                x2={n.x}
                y2={n.y}
                stroke="#334155"
                strokeWidth="6"
                strokeDasharray="6 6"
              />
              <line
                x1={subestacion.x}
                y1={subestacion.y}
                x2={n.x}
                y2={n.y}
                stroke={isSelected ? '#38bdf8' : '#64748b'}
                strokeWidth={isSelected ? '4' : '2'}
                strokeDasharray="4 4"
                className="flow"
              />
            </g>
          );
        })}

        {/* Nodo Central: Subestación Eléctrica Principal (Sprite) */}
        <g transform={`translate(${subestacion.x}, ${subestacion.y})`}>
          <rect
            x="-30"
            y="-30"
            width="60"
            height="60"
            fill="#0f172a"
            stroke="#000"
            strokeWidth="3"
            filter="url(#pixelShadow)"
          />
          <image
            href={subestacion.sprite}
            x="-26"
            y="-26"
            width="52"
            height="52"
            style={{ imageRendering: 'pixelated' }}
          />
          <rect
            x="-85"
            y="-46"
            width="170"
            height="18"
            fill="#000"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dy="-33"
            fill="#38bdf8"
            fontSize="10"
            fontFamily="var(--font-retro-title)"
          >
            SUBESTACIÓN YUMBO
          </text>
        </g>

        {/* Nodos de Gimnasios de Planta (Sprites) */}
        {nodes.map((n) => {
          const isSelected = selectedPlant === n.code;
          const plantConfig = PLANTS.find((p) => p.code === n.code);
          const color = plantConfig?.color || '#22d3ee';
          const kw = telemetryKw?.[n.code];

          return (
            <g
              key={n.code}
              className="node"
              transform={`translate(${n.x}, ${n.y})`}
              onClick={() => onSelectPlant(n.code)}
              style={{ cursor: 'pointer' }}
            >
              {/* Marco estilo caja de mapa RPG */}
              <rect
                x="-32"
                y="-32"
                width="64"
                height="64"
                fill={isSelected ? '#1e293b' : '#0f172a'}
                stroke="#000"
                strokeWidth="3"
                filter="url(#pixelShadow)"
              />
              {isSelected && (
                <rect
                  x="-35"
                  y="-35"
                  width="70"
                  height="70"
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
              )}

              {/* Sprite del Gimnasio */}
              <image
                href={n.sprite}
                x="-28"
                y="-28"
                width="56"
                height="56"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Placa de Nombre de Gimnasio */}
              <g transform="translate(0, 42)">
                <rect
                  x="-75"
                  y="-10"
                  width="150"
                  height="20"
                  fill="#000"
                  stroke={isSelected ? color : '#475569'}
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill={isSelected ? '#ffffff' : '#cbd5e1'}
                  fontSize="9"
                  fontFamily="var(--font-retro-title)"
                >
                  {n.code}
                </text>
              </g>

              {/* Badge de kW actual medido por SCADA */}
              {kw !== undefined && (
                <g transform="translate(0, -42)">
                  <rect
                    x="-45"
                    y="-10"
                    width="90"
                    height="18"
                    fill="#000"
                    stroke={color}
                    strokeWidth="2"
                  />
                  <text
                    textAnchor="middle"
                    dy="3"
                    fill={color}
                    fontSize="10"
                    fontFamily="var(--font-retro-title)"
                  >
                    {Math.round(kw).toLocaleString('es-CO')} kW
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </GbaCard>
  );
};
