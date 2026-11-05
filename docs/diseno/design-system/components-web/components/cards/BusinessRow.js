// Fuente: components/cards/BusinessRow.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function BusinessRow({
  name,
  meta,
  verified,
  slot,
  image,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      borderRadius: 18,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.07)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    width: 54,
    height: 54,
    radius: 14,
    image: image
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px Manrope,sans-serif',
      color: '#0B0E12'
    }
  }, name), verified ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 16,
    color: "#00A88F"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 11px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.45)',
      marginTop: 4
    }
  }, meta)), slot ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '9px 13px',
      borderRadius: 11,
      background: 'rgba(0,229,196,.16)',
      font: '700 11.5px Manrope,sans-serif',
      color: '#00695B'
    }
  }, slot) : null);
}
Object.assign(__ds_scope, { BusinessRow });
