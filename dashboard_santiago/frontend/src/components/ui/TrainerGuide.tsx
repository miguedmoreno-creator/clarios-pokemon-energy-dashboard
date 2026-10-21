import React, { useState } from 'react';

interface TrainerGuideProps {
  viewId: string;
  text: string;
}

export const TrainerGuide: React.FC<TrainerGuideProps> = ({ text }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="trainer-guide">
      <div className="trainer-guide-text">
        <span style={{ fontSize: '1.2rem', filter: 'contrast(1.2)' }}>🎒</span>
        {collapsed ? (
          <span style={{ fontSize: '18px', color: '#94a3b8' }}>Guía del Entrenador (Oculta)</span>
        ) : (
          <span>{text}</span>
        )}
      </div>
      <button
        type="button"
        className="trainer-guide-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Mostrar guía' : 'Ocultar guía'}
      >
        {collapsed ? '[MOSTRAR]' : '[OCULTAR]'}
      </button>
    </div>
  );
};
