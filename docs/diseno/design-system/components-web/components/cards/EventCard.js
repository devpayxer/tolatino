// Fuente: components/cards/EventCard.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function EventCard({
  title,
  meta,
  tag,
  dark,
  image,
  width = 212,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      flex: 'none',
      width,
      borderRadius: 20,
      overflow: 'hidden',
      background: dark ? '#0B0E12' : '#fff',
      border: dark ? 'none' : '1px solid rgba(11,14,18,.08)',
      color: dark ? '#fff' : '#0B0E12',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    height: 86,
    tone: dark ? 'dark' : 'light',
    image: image
  }, tag ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 9,
      left: 10,
      padding: '5px 9px',
      borderRadius: 7,
      background: 'rgba(255,45,122,.9)',
      color: '#fff',
      font: "700 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.12em'
    }
  }, tag) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 14.5px/1.25 Manrope,sans-serif'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: "600 11px 'JetBrains Mono',monospace",
      color: dark ? 'rgba(255,255,255,.5)' : 'rgba(11,14,18,.45)'
    }
  }, meta)));
}
Object.assign(__ds_scope, { EventCard });
