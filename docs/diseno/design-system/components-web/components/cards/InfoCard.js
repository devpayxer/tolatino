// Fuente: components/cards/InfoCard.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function InfoCard({
  label,
  labelColor,
  padding = '16px 15px',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 17,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      padding,
      color: '#0B0E12',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "800 10px 'JetBrains Mono',monospace",
      letterSpacing: '.12em',
      color: labelColor || 'rgba(11,14,18,.5)',
      marginBottom: 8
    }
  }, label) : null, children);
}
Object.assign(__ds_scope, { InfoCard });
