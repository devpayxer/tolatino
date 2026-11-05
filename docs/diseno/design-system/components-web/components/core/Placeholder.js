// Fuente: components/core/Placeholder.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const P = {
  light: ['#E7E5E0', '#EDEBE6'],
  dark: ['#1C222B', '#14181F'],
  mint: ['#DCE8E4', '#E8F0ED']
};
function Placeholder({
  tone = 'light',
  width = '100%',
  height = 86,
  radius = 0,
  image,
  children,
  style
}) {
  const [a, b] = P[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: radius,
      flex: 'none',
      position: 'relative',
      overflow: 'hidden',
      background: image ? 'center/cover url(' + image + ')' : 'repeating-linear-gradient(135deg,' + a + ' 0 10px,' + b + ' 10px 20px)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Placeholder });
