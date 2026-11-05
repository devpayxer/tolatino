// Fuente: components/search/SearchResultRow.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const mono = "'JetBrains Mono',monospace";
const bgImg = s => !s ? {} : {
  backgroundImage: /^url\(/.test(s) ? s : 'url(' + s + ')',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
};
const Hl = ({
  parts,
  strong = '#0B0E12'
}) => {
  const [a = '', b = '', c = ''] = parts || [];
  return /*#__PURE__*/React.createElement(React.Fragment, null, a, b ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: strong
    }
  }, b) : null, c);
};
const ell = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

/* 2u · Fila de resultado: la coincidencia en negrita y la razón ("Tiene Mofongo de chicharrón · $12"). size="row" en resultados, "sug" en sugerencias. */
function SearchResultRow({
  size = 'row',
  parts,
  image,
  icon,
  pro,
  meta,
  status,
  statusColor = '#00695B',
  why,
  right,
  rightColor = '#0B0E12',
  active,
  onClick,
  onHover
}) {
  const sug = size === 'sug',
    S = sug ? 44 : 58;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: onHover,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: sug ? '8px 10px' : 12,
      borderRadius: sug ? 13 : 18,
      background: sug ? active ? 'rgba(75,55,245,.07)' : 'transparent' : '#fff',
      border: sug ? 'none' : '1px solid rgba(11,14,18,.07)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, image ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: S,
      height: S,
      borderRadius: sug ? 12 : 14,
      flex: 'none',
      backgroundColor: '#E4E1DA',
      ...bgImg(image)
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: S,
      height: S,
      borderRadius: sug ? 12 : 14,
      flex: 'none',
      background: '#F7F6F3',
      display: 'grid',
      placeItems: 'center'
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sug ? 20 : 22
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 14.5px/1.3 Manrope,sans-serif',
      color: '#0B0E12',
      ...ell
    }
  }, /*#__PURE__*/React.createElement(Hl, {
    parts: parts
  })), pro ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "ink"
  }, "PRO") : null), meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 10.5px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.5)',
      ...ell
    }
  }, meta) : null, status ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12px Manrope,sans-serif',
      color: statusColor,
      ...ell
    }
  }, status) : null, why ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)',
      ...ell
    }
  }, /*#__PURE__*/React.createElement(Hl, {
    parts: why
  })) : null), right ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      font: '800 13.5px Sora,sans-serif',
      letterSpacing: '-.02em',
      color: rightColor
    }
  }, right) : null);
}

/* 2v · "Entendimos": las palabras que se buscan y los filtros que salieron de la frase; cada filtro se quita con ×. */
function UnderstoodBar({
  label = 'ENTENDIMOS',
  words = [],
  filters = []
}) {
  if (!words.length && !filters.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)',
      marginRight: 2
    }
  }, label), words.map((w, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: 'w' + i,
    variant: "feature"
  }, "\xAB", w, "\xBB")), filters.map((f, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: 'f' + i,
    variant: "selected",
    onClick: f.onRemove
  }, f.label, f.onRemove ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 11,
    strokeWidth: 2.6,
    color: "#fff"
  }) : null)));
}

/* 2w · Desplegable del buscador desktop: panel bajo el campo, lista + vista previa (children), pie con atajos. */
function SearchPanel({
  width = 780,
  hint = '↑ ↓ PARA MOVERTE · ENTER PARA ABRIR',
  esc = 'ESC PARA CERRAR',
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'max(100%, ' + width + 'px)',
      background: '#fff',
      borderRadius: 22,
      border: '1px solid rgba(11,14,18,.08)',
      boxShadow: '0 30px 70px -24px rgba(11,14,18,.45)',
      overflow: 'hidden'
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      padding: '10px 20px',
      borderTop: '1px solid rgba(11,14,18,.07)',
      font: '700 9.5px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.42)'
    }
  }, /*#__PURE__*/React.createElement("span", null, hint), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", null, esc)));
}

/* 2x · "Aún no hay": la subcategoría existe pero no hay negocios en la ciudad. Avísame + recomiéndalo. layout="row" en desktop. */
function NotYetCard({
  layout = 'stack',
  kicker = 'AÚN NO HAY',
  title,
  body,
  alertLabel = 'Avísame cuando haya',
  alertVariant = 'primary',
  onAlert,
  recLabel = '¿Conoces uno? Recomiéndalo',
  onRec
}) {
  const row = layout === 'row';
  const acts = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: row ? 'md' : 'sm',
    icon: "bell",
    variant: alertVariant,
    onClick: onAlert
  }, alertLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: row ? 'md' : 'sm',
    variant: "secondary",
    onClick: onRec
  }, recLabel));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: row ? '18px 20px' : 16,
      borderRadius: 20,
      background: '#fff',
      border: '1px dashed rgba(11,14,18,.18)',
      display: 'flex',
      flexDirection: row ? 'row' : 'column',
      alignItems: row ? 'center' : 'stretch',
      flexWrap: 'wrap',
      gap: row ? 18 : 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: row ? 1 : 'none',
      minWidth: row ? 240 : 0,
      display: 'flex',
      flexDirection: 'column',
      gap: row ? 6 : 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, kicker), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + (row ? 18 : 17) + 'px/1.25 Sora,sans-serif',
      letterSpacing: '-.03em',
      textWrap: 'pretty'
    }
  }, title), body ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1.55 Manrope,sans-serif',
      color: 'rgba(11,14,18,.62)',
      textWrap: 'pretty'
    }
  }, body) : null), acts);
}
Object.assign(__ds_scope, { SearchResultRow, UnderstoodBar, SearchPanel, NotYetCard });
