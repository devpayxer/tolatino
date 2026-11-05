// Fuente: components/cards/StoryCard.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

/* Patrón aprobado 2g · "Hoy en el barrio": una tarjeta por negocio con hasta 3 avisos (24 h).
   Tap derecha = siguiente · izquierda = anterior · al final llama onEnd (abre el negocio). arrows = flechas internas (desktop). */
function StoryCard({
  name,
  logo,
  distance,
  posts = [],
  arrows = false,
  width = 230,
  height = 300,
  onEnd
}) {
  const [i, setI] = React.useState(0);
  const n = posts.length,
    k = Math.min(i, Math.max(0, n - 1)),
    p = posts[k] || {};
  const back = e => {
    e.stopPropagation();
    if (k > 0) setI(k - 1);
  };
  const fwd = e => {
    e.stopPropagation();
    if (k < n - 1) setI(k + 1);else if (onEnd) onEnd();
  };
  const bg = u => u ? `center/cover url(${u})` : '#E4E1DA';
  const mono = (w, s, ls) => `${w} ${s}px 'JetBrains Mono',monospace`;
  const arrow = (dir, on) => on ? /*#__PURE__*/React.createElement("div", {
    onClick: dir < 0 ? back : fwd,
    style: {
      position: 'absolute',
      [dir < 0 ? 'left' : 'right']: 8,
      top: height / 2 - 18,
      width: 30,
      height: 30,
      borderRadius: 999,
      background: 'rgba(255,255,255,.92)',
      color: '#0B0E12',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: dir < 0 ? 'chevronLeft' : 'chevronRight',
    size: 15,
    strokeWidth: 2
  })) : null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      width,
      height,
      borderRadius: 22,
      overflow: 'hidden',
      position: 'relative',
      background: bg(p.image),
      backgroundColor: '#E4E1DA',
      scrollSnapAlign: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg,rgba(11,14,18,.45) 0%,rgba(11,14,18,0) 26%,rgba(11,14,18,0) 38%,rgba(11,14,18,.84) 100%)'
    }
  }), n > 1 ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      display: 'flex',
      gap: 4
    }
  }, posts.map((_, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      flex: 1,
      height: 3,
      borderRadius: 999,
      background: j <= k ? '#fff' : 'rgba(255,255,255,.35)'
    }
  }))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 22,
      left: 12,
      right: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 999,
      flex: 'none',
      border: '1.5px solid #fff',
      background: bg(logo),
      backgroundColor: '#E4E1DA',
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '700 12px Manrope,sans-serif',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: mono(700, 9.5),
      letterSpacing: '.06em'
    }
  }, p.ago)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: mono(700, 10),
      letterSpacing: '.08em'
    }
  }, p.type, n > 1 ? ` · ${k + 1}/${n}` : ''), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 16px/1.25 Sora,sans-serif',
      letterSpacing: '-.02em',
      textWrap: 'pretty'
    }
  }, p.text), distance ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: mono(600, 10),
      letterSpacing: '.04em'
    }
  }, distance) : null), /*#__PURE__*/React.createElement("div", {
    onClick: back,
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '35%',
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("div", {
    onClick: fwd,
    style: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '65%',
      cursor: 'pointer'
    }
  }), arrows && n > 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, arrow(-1, k > 0), arrow(1, k < n - 1)) : null);
}
Object.assign(__ds_scope, { StoryCard });
