// Fuente: components/panel/SelectionBar.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

/* 2af · Barra de selección del panel (Panel → Menú → Seleccionar). Sacada de To'Latino Panel negocio v2.dc.html tal como se ve. */
const mono = "'JetBrains Mono',monospace";

/* Barra oscura fija: cuántos van (o «Toca los platos…»), Todos / Ninguno, cerrar; acciones (la abierta en blanco, apagadas sin selección) y, si la acción pide elegir, sus opciones (danger = rojo: quitar). */
function SelectionBar({
  title,
  allLabel,
  onAll,
  onClose,
  actions = [],
  subLabel,
  sub = [],
  top = '12px'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top,
      zIndex: 20,
      padding: '12px 14px',
      borderRadius: 17,
      background: '#0B0E12',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 18px 36px -18px rgba(11,14,18,.55)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '800 14.5px Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, title), allLabel ? /*#__PURE__*/React.createElement("span", {
    onClick: onAll,
    style: {
      font: '700 12.5px Manrope,sans-serif',
      color: '#00E5C4',
      cursor: 'pointer'
    }
  }, allLabel) : null, /*#__PURE__*/React.createElement("span", {
    onClick: onClose,
    style: {
      width: 30,
      height: 30,
      borderRadius: 10,
      background: 'rgba(255,255,255,.12)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 14,
    color: "#fff",
    strokeWidth: 2.2
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, actions.map((a, i) => {
    const fg = a.on ? '#0B0E12' : '#fff';
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      onClick: a.onClick,
      style: {
        flex: 'none',
        height: 34,
        padding: '0 12px',
        borderRadius: 11,
        background: a.on ? '#fff' : 'rgba(255,255,255,.1)',
        color: fg,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: '700 12.5px Manrope,sans-serif',
        cursor: 'pointer',
        opacity: a.disabled ? .45 : 1,
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: a.icon || 'check',
      size: 14,
      color: fg
    }), a.label);
  })), sub.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      paddingTop: 10,
      borderTop: '1px solid rgba(255,255,255,.14)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(255,255,255,.7)'
    }
  }, subLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, sub.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: a.onClick,
    style: {
      height: 32,
      padding: '0 12px',
      borderRadius: 10,
      background: a.danger ? '#C0392B' : '#fff',
      color: a.danger ? '#fff' : '#0B0E12',
      display: 'flex',
      alignItems: 'center',
      font: '700 12.5px Manrope,sans-serif',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, a.label)))) : null);
}

/* La casilla de cada fila mientras seleccionas (on = tinta con ✓). */
function SelectBox({
  on,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      width: 22,
      height: 22,
      borderRadius: 7,
      boxSizing: 'border-box',
      border: on ? 'none' : '1.5px solid rgba(11,14,18,.25)',
      background: on ? '#0B0E12' : '#fff',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    color: "#fff",
    strokeWidth: 2.8
  }) : null);
}
Object.assign(__ds_scope, { SelectionBar, SelectBox });
