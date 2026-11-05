// Fuente: components/community/FeedPost.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function FeedPost({
  author,
  action = 'PREGUNTÓ',
  time,
  place,
  avatar,
  body,
  answer,
  stats = [],
  tinted,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px',
      borderBottom: '1px solid rgba(11,14,18,.07)',
      background: tinted ? '#F7F6F3' : '#fff',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'center'
    }
  }, avatar || /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 99,
      background: '#EDEBE6',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px Manrope,sans-serif',
      color: '#0B0E12'
    }
  }, author, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 11px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.4)'
    }
  }, "\xB7 ", action, time ? ' · ' + time : '')), place ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 11px 'JetBrains Mono',monospace",
      color: '#4B37F5',
      marginTop: 2
    }
  }, place) : null)), body ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      font: '500 15px/1.5 Manrope,sans-serif',
      color: '#0B0E12',
      textWrap: 'pretty'
    }
  }, body) : null, answer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: 13,
      borderRadius: 16,
      border: '1.5px solid rgba(0,168,143,.28)',
      background: 'rgba(0,229,196,.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.16em',
      color: '#00695B'
    }
  }, answer.label || 'MEJOR RESPUESTA'), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 11,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    width: 44,
    height: 44,
    radius: 12,
    tone: "mint",
    image: answer.image
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13.5px Manrope,sans-serif',
      color: '#0B0E12'
    }
  }, answer.name), answer.verified ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 15,
    color: "#00A88F"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10.5px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.5)',
      marginTop: 3
    }
  }, answer.meta)), /*#__PURE__*/React.createElement("div", {
    onClick: answer.onOpen,
    style: {
      padding: '8px 12px',
      borderRadius: 10,
      background: '#0B0E12',
      color: '#fff',
      font: '700 11.5px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, answer.cta || 'Ver'))) : null, children, stats.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      color: 'rgba(11,14,18,.5)',
      font: '600 12px Manrope,sans-serif'
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 17
  }), s.value))) : null);
}
Object.assign(__ds_scope, { FeedPost });
