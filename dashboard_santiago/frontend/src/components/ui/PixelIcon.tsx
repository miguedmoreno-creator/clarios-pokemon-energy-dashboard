import React from 'react';

interface PixelIconProps {
  name: 'battery' | 'bolt' | 'coin' | 'leaf' | 'substation' | 'prof' | 'gym-fa' | 'gym-ensamble' | 'gym-orec' | 'gym-rc';
  size?: number;
  className?: string;
  alt?: string;
}

export const PixelIcon: React.FC<PixelIconProps> = ({
  name,
  size = 28,
  className = '',
  alt = 'icono retro',
}) => {
  if (name === 'battery') {
    // Fallback SVG pixelado inline para la batería (16x16 estilo GBA)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={`pixel-art ${className}`}
        style={{ imageRendering: 'pixelated' }}
        aria-label={alt}
      >
        {/* Terminal positivo */}
        <rect x="6" y="1" width="4" height="2" fill="#94a3b8" />
        {/* Borde exterior negro */}
        <rect x="2" y="3" width="12" height="12" fill="#000" />
        {/* Cuerpo interno */}
        <rect x="3" y="4" width="10" height="10" fill="#1e293b" />
        {/* Barras de energía verde pixelada */}
        <rect x="4" y="9" width="8" height="4" fill="#00E676" />
        <rect x="4" y="6" width="8" height="2" fill="#34d399" />
        {/* Resplandor */}
        <rect x="4" y="4" width="2" height="4" fill="#6ee7b7" />
      </svg>
    );
  }

  const assetMap: Record<string, string> = {
    bolt: '/src/assets/retro/icon-bolt-sec.png',
    coin: '/src/assets/retro/icon-coin-cost.png',
    leaf: '/src/assets/retro/badge-eco-leaf.png',
    substation: '/src/assets/retro/map-substation-center.png',
    prof: '/src/assets/retro/avatar-prof-ia.png',
    'gym-fa': '/src/assets/retro/gym-node-fa.png',
    'gym-ensamble': '/src/assets/retro/gym-node-ensamble.png',
    'gym-orec': '/src/assets/retro/gym-node-orec.png',
    'gym-rc': '/src/assets/retro/gym-node-rc.png',
  };

  const src = assetMap[name];
  if (!src) return null;

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={`pixelated ${className}`}
      style={{ imageRendering: 'pixelated', display: 'inline-block' }}
    />
  );
};
