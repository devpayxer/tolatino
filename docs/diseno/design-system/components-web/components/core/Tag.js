// Fuente: components/core/Tag.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const T = {
  action: ['rgba(75,55,245,.1)', '#4B37F5'],
  danger: ['rgba(192,57,43,.1)', '#C0392B'],
  signal: ['rgba(0,229,196,.2)', '#00695B'],
  ink: ['#0B0E12', '#fff'],
  neutral: ['rgba(11,14,18,.06)', 'rgba(11,14,18,.6)']
};
function Tag({
  tone = 'action',
  children,
  style
}) {
  const [bg, fg] = T[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      padding: '3px 7px',
      borderRadius: 5,
      background: bg,
      color: fg,
      font: "800 9px 'JetBrains Mono',monospace",
      letterSpacing: '.08em',
      whiteSpace: 'nowrap',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
