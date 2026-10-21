import React from 'react';

export interface GbaCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  light?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const GbaCard: React.FC<GbaCardProps> = ({
  title,
  icon,
  badge,
  light = false,
  className = '',
  style,
  children,
  ...rest
}) => {
  return (
    <div
      className={`gba-card ${light ? 'gba-card-light' : ''} ${className}`}
      style={style}
      {...rest}
    >
      {(title || icon || badge) && (
        <div className="gba-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {title && <span className="card-title" style={{ margin: 0 }}>{title}</span>}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
