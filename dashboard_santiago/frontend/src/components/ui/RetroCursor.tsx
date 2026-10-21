import React from 'react';

export const RetroCursor: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <span
      className="retro-cursor"
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      ▼
    </span>
  );
};
