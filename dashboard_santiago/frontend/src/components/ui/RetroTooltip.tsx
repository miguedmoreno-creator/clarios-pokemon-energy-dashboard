import React, { useState } from 'react';

interface RetroTooltipProps {
  title: string;
  text: string;
  technicalNote?: string;
  children: React.ReactNode;
}

export const RetroTooltip: React.FC<RetroTooltipProps> = ({
  title,
  text,
  technicalNote,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="retro-tooltip-trigger"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen((prev) => !prev)}
      tabIndex={0}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      <span className="retro-tooltip-badge" title="Haz clic o pasa el cursor para ver la explicación">[?]</span>

      {isOpen && (
        <div className="retro-tooltip-box" role="tooltip">
          <div className="retro-tooltip-title">
            <span>🔍</span>
            <span>{title}</span>
          </div>
          <div className="retro-tooltip-desc">
            {text}
          </div>
          {technicalNote && (
            <div
              style={{
                marginTop: '6px',
                paddingTop: '4px',
                borderTop: '1px dotted rgba(255,255,255,0.2)',
                fontSize: '16px',
                color: '#94a3b8',
              }}
            >
              <b>Detalle Técnico:</b> {technicalNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
