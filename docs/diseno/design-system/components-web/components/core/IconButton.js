// Fuente: components/core/IconButton.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function IconButton({
  icon,
  size = 50,
  active,
  onClick,
  style
}) {
  const r = size >= 50 ? 15 : size >= 42 ? 13 : 12;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      width: size,
      height: size,
      borderRadius: r,
      background: active ? '#0B0E12' : '#fff',
      border: '1px solid ' + (active ? '#0B0E12' : 'rgba(11,14,18,.09)'),
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none',
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size >= 50 ? 19 : 17,
    strokeWidth: 1.9,
    color: active ? '#fff' : '#0B0E12',
    fill: active && icon === 'heart' ? '#fff' : 'none'
  }));
}
Object.assign(__ds_scope, { IconButton });
