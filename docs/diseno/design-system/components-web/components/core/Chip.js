// Fuente: components/core/Chip.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const V = {
  filter: {
    background: '#fff',
    border: '1px solid rgba(11,14,18,.12)',
    color: '#0B0E12',
    font: '600 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  selected: {
    background: '#0B0E12',
    border: '1px solid #0B0E12',
    color: '#fff',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  verified: {
    background: 'rgba(0,229,196,.14)',
    border: '1px solid rgba(0,168,143,.3)',
    color: '#00695B',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  pro: {
    background: '#0B0E12',
    border: '1px solid #0B0E12',
    color: '#FFB020',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px',
    letterSpacing: '.04em'
  },
  feature: {
    background: 'rgba(11,14,18,.05)',
    border: 'none',
    color: 'rgba(11,14,18,.7)',
    font: '600 11.5px Manrope,sans-serif',
    borderRadius: 8,
    padding: '6px 11px'
  },
  slot: {
    background: 'rgba(0,229,196,.16)',
    border: 'none',
    color: '#00695B',
    font: '700 11.5px Manrope,sans-serif',
    borderRadius: 8,
    padding: '6px 11px'
  }
};
function Chip({
  variant = 'filter',
  onClick,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      ...V[variant],
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      flex: 'none',
      ...style
    }
  }, variant === 'verified' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: '#00A88F'
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Chip });
