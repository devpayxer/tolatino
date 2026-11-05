// Fuente: components/navigation/FilterRail.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

function FilterRail({
  items = [],
  active,
  onChange,
  bordered = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      borderBottom: bordered ? '1px solid rgba(11,14,18,.07)' : 'none',
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: it,
    variant: it === active ? 'selected' : 'filter',
    onClick: () => onChange && onChange(it)
  }, it)));
}
Object.assign(__ds_scope, { FilterRail });
