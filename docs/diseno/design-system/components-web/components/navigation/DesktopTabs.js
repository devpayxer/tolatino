// Fuente: components/navigation/DesktopTabs.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function DesktopTabs({
  items = [],
  active,
  onChange,
  aside,
  asideWidth = 372,
  gap = 48,
  sticky,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      ...(sticky ? {
        position: 'sticky',
        top: 0,
        zIndex: 20
      } : {}),
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) ' + asideWidth + 'px',
      gap,
      borderBottom: '1px solid rgba(11,14,18,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, items.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      onClick: () => onChange && onChange(t.id),
      style: {
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '20px 0 17px',
        font: "800 13px 'JetBrains Mono',monospace",
        letterSpacing: '.08em',
        color: on ? '#0B0E12' : 'rgba(11,14,18,.42)',
        borderBottom: '2.5px solid ' + (on ? '#0B0E12' : 'transparent'),
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 16,
      strokeWidth: 1.9
    }) : null, /*#__PURE__*/React.createElement("span", null, t.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      font: "600 11px 'JetBrains Mono',monospace",
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.5)'
    }
  }, aside ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: aside.dot || '#00A88F'
    }
  }), aside.label) : null)));
}
Object.assign(__ds_scope, { DesktopTabs });
