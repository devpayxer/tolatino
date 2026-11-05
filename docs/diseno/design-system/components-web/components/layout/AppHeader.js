// Fuente: components/layout/AppHeader.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const logo = (dark, base) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 9
  }
}, /*#__PURE__*/React.createElement("img", {
  src: base + (dark ? 'logo-tolatino-white.svg' : 'logo-tolatino.svg'),
  alt: "",
  style: {
    width: dark ? 24 : 26,
    height: dark ? 24 : 26,
    display: 'block'
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    font: '800 ' + (dark ? 20 : 22) + 'px/1 Sora,sans-serif',
    letterSpacing: '-.04em',
    color: dark ? '#fff' : '#0B0E12'
  }
}, "To", /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#7B61FF'
  }
}, "\u2019"), "Latino"));
function AppHeader({
  variant = 'location',
  city = 'Hazleton, PA',
  radius = '5 MI',
  lang = 'ES',
  onLang,
  unread = true,
  assetBase = 'assets/',
  style
}) {
  const bellDot = unread ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 99,
      background: '#FF2D7A',
      border: '1.5px solid #fff'
    }
  }) : null;
  if (variant === 'location') return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 13px',
      borderRadius: 999,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pin",
    size: 18,
    color: "#4B37F5"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13px/1.15 Manrope,sans-serif',
      color: '#0B0E12'
    }
  }, city), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 10px/1.2 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.45)'
    }
  }, radius, " DE RADIO"))), /*#__PURE__*/React.createElement("div", {
    onClick: onLang,
    style: {
      padding: '10px 12px',
      borderRadius: 14,
      background: '#0B0E12',
      color: '#fff',
      font: "700 12px 'JetBrains Mono',monospace",
      letterSpacing: '.08em',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, lang, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "globe",
    size: 16,
    style: {
      opacity: .5
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 14,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'grid',
      placeItems: 'center',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 18
  }), bellDot));
  const dark = variant === 'dark';
  const btn = {
    width: dark ? 34 : 36,
    height: dark ? 34 : 36,
    borderRadius: dark ? 10 : 12,
    display: 'grid',
    placeItems: 'center',
    background: dark ? 'rgba(255,255,255,.1)' : 'transparent',
    border: dark ? 'none' : '1px solid rgba(11,14,18,.1)',
    color: dark ? '#fff' : '#0B0E12'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: dark ? '#0B0E12' : '#fff',
      borderBottom: dark ? 'none' : '1px solid rgba(11,14,18,.07)',
      ...style
    }
  }, logo(dark, assetBase), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onLang,
    style: {
      padding: '7px 10px',
      borderRadius: dark ? 10 : 11,
      border: dark ? 'none' : '1px solid rgba(11,14,18,.12)',
      background: dark ? 'rgba(255,255,255,.1)' : 'transparent',
      color: dark ? '#fff' : '#0B0E12',
      font: "700 11px 'JetBrains Mono',monospace",
      cursor: 'pointer'
    }
  }, lang), dark ? null : /*#__PURE__*/React.createElement("div", {
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chat",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 17
  }))));
}
Object.assign(__ds_scope, { AppHeader });
