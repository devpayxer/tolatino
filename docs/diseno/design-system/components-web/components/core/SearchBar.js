// Fuente: components/core/SearchBar.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function SearchBar({
  placeholder = 'Buscar negocios, eventos, empleos',
  mic = true,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderRadius: 16,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      boxShadow: '0 4px 14px -8px rgba(11,14,18,.18)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18,
    color: "rgba(11,14,18,.4)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '500 14px Manrope,sans-serif',
      color: 'rgba(11,14,18,.42)'
    }
  }, placeholder), mic ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "mic",
    size: 18,
    color: "#4B37F5"
  }) : null);
}
Object.assign(__ds_scope, { SearchBar });
