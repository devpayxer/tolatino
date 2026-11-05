// Fuente: components/navigation/ModuleSwitcher.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function ModuleSwitcher({
  modules = ['community', 'business', 'events', 'rides', 'homes'],
  active,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      padding: '0 20px 14px',
      background: '#0B0E12',
      ...style
    }
  }, modules.map(k => {
    const m = __ds_scope.MODULES[k],
      on = k === active;
    return /*#__PURE__*/React.createElement("span", {
      key: k,
      onClick: () => onChange && onChange(k),
      style: {
        flex: 'none',
        padding: '9px 14px',
        borderRadius: 12,
        background: on ? m.hue : 'rgba(255,255,255,.08)',
        color: on ? '#fff' : 'rgba(255,255,255,.65)',
        font: '700 12px Manrope,sans-serif',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        cursor: 'pointer'
      }
    }, on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: m.icon,
      size: 16
    }) : null, m.label);
  }));
}
Object.assign(__ds_scope, { ModuleSwitcher });
