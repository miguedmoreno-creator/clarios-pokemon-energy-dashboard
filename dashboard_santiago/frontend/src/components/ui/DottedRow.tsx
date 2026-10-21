import React from 'react';

interface DottedRowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

export const DottedRow: React.FC<DottedRowProps> = ({
  label,
  value,
  valueColor,
}) => {
  return (
    <div className="dotted-row">
      <span className="dotted-row-label">{label}</span>
      <span className="dotted-row-leader" />
      <span className="dotted-row-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
};
