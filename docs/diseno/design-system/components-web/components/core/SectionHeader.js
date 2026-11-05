// Fuente: components/core/SectionHeader.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function SectionHeader({
  title,
  dot,
  action,
  onAction,
  size = 17,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: dot,
      alignSelf: 'center'
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + size + 'px/1 Sora,sans-serif',
      letterSpacing: '-.02em',
      color: '#0B0E12'
    }
  }, title)), action ? /*#__PURE__*/React.createElement("span", {
    onClick: onAction,
    style: {
      font: '700 12px Manrope,sans-serif',
      color: '#4B37F5',
      cursor: 'pointer'
    }
  }, action) : null);
}
function Eyebrow({
  children,
  color = 'rgba(11,14,18,.42)',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px ' + "'JetBrains Mono',monospace",
      letterSpacing: '.2em',
      color,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { SectionHeader, Eyebrow });
