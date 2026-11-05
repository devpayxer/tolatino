// Fuente: components/account/NeighborCard.jsx (To'Latino Design System, versión del bundle sincronizado el 2 nov 2026).
// Compilado (React.createElement en vez de JSX). Referencia web: se reescribe para React Native.

const MONO = "'JetBrains Mono', monospace";
const TAG = {
  action: ['rgba(75,55,245,.1)', '#4B37F5'],
  signal: ['rgba(0,229,196,.16)', '#00695B'],
  neutral: ['rgba(11,14,18,.06)', 'rgba(11,14,18,.6)'],
  ink: ['#0B0E12', '#fff']
};

/** 2s · Tarjeta de vecino (USR-HOME): logo, ciudad·zona, foto con anillo, nombre, N.º o Fundadores y 3 datos. */
function NeighborCard({
  name,
  nick,
  photo,
  initials,
  city = 'HAZLETON, PA',
  badge,
  cells = [],
  onProfile,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 24,
      background: '#0B0E12',
      color: '#fff',
      padding: 20,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-tolatino-white.svg",
    alt: "To'Latino",
    style: {
      height: 20,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: `700 9px ${MONO}`,
      letterSpacing: '.18em',
      color: '#00E5C4'
    }
  }, city)), /*#__PURE__*/React.createElement("div", {
    onClick: onProfile,
    style: {
      marginTop: 18,
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      cursor: onProfile ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 66,
      height: 66,
      borderRadius: 99,
      boxSizing: 'border-box',
      border: '2px solid #00E5C4',
      background: photo ? `url(${photo}) center/cover` : '#14181F',
      display: 'grid',
      placeItems: 'center',
      font: '800 21px Sora, sans-serif',
      flex: 'none'
    }
  }, photo ? null : initials), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 22px/1.15 Sora, sans-serif',
      letterSpacing: '-.03em'
    }
  }, name), nick ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '600 13px Manrope, sans-serif',
      color: 'rgba(255,255,255,.7)'
    }
  }, "\"", nick, "\"") : null, badge ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'inline-flex',
      padding: '5px 9px',
      borderRadius: 8,
      background: 'rgba(0,229,196,.14)',
      font: `700 9px ${MONO}`,
      letterSpacing: '.14em',
      color: '#00E5C4'
    }
  }, badge) : null), onProfile ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 16,
    color: "rgba(255,255,255,.5)"
  }) : null), cells.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: 'grid',
      gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))`,
      gap: 8
    }
  }, cells.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: c.onClick,
    style: {
      padding: '11px 12px',
      borderRadius: 14,
      background: '#14181F',
      cursor: c.onClick ? 'pointer' : 'default',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 8.5px ${MONO}`,
      letterSpacing: '.14em',
      color: 'rgba(255,255,255,.5)'
    }
  }, c.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      font: '800 16px/1.1 Sora, sans-serif',
      color: c.color || '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.value)))) : null);
}

/** 2s · Completa tu cuenta: % + barra + lista. Lo que falta abre su paso del onboarding. Solo se muestra si falta algo. */
function CompleteAccount({
  kicker = 'COMPLETA TU CUENTA',
  title,
  items = [],
  actionLabel = 'Agregar',
  style
}) {
  const done = items.filter(x => x.done).length,
    pct = items.length ? Math.round(done / items.length * 100) + '%' : '0%';
  if (items.length && done === items.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 18,
      background: '#fff',
      border: '1.5px solid #4B37F5',
      padding: 16,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 9.5px ${MONO}`,
      letterSpacing: '.16em',
      color: '#4B37F5'
    }
  }, kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '800 16px/1.25 Sora, sans-serif',
      letterSpacing: '-.02em',
      textWrap: 'pretty'
    }
  }, title)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 24px Sora, sans-serif',
      letterSpacing: '-.03em',
      color: '#4B37F5'
    }
  }, pct)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      height: 6,
      borderRadius: 99,
      background: 'rgba(75,55,245,.14)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: pct,
      background: '#4B37F5',
      borderRadius: 99
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, items.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: !x.done ? x.onClick : undefined,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      padding: '10px 0',
      borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none',
      cursor: !x.done && x.onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 99,
      boxSizing: 'border-box',
      border: x.done ? 'none' : '1.5px solid rgba(11,14,18,.25)',
      background: x.done ? '#00A88F' : '#fff',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, x.done ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 11,
    strokeWidth: 2.8,
    color: "#fff"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: `${x.done ? 600 : 700} 13.5px Manrope, sans-serif`,
      color: x.done ? 'rgba(11,14,18,.5)' : '#0B0E12'
    }
  }, x.label), !x.done && x.onClick ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12px Manrope, sans-serif',
      color: '#4B37F5',
      flex: 'none'
    }
  }, actionLabel) : null))));
}

/** 2s · Tu semana: agenda en orden (pedido de hoy, citas, mesa, apartado, boleto). dot: #4B37F5 en curso · #FFB020 esperando · #00A88F confirmado · #0B0E12 boleto. */
function WeekAgenda({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 18,
      background: '#fff',
      border: '1px solid rgba(11,14,18,.08)',
      padding: '4px 16px',
      ...style
    }
  }, items.map((x, i) => {
    const T = TAG[x.tone || 'neutral'];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: x.onClick,
      style: {
        display: 'grid',
        gridTemplateColumns: '58px 12px minmax(0,1fr) auto',
        columnGap: 10,
        alignItems: 'start',
        padding: '13px 0',
        borderTop: i ? '1px solid rgba(11,14,18,.07)' : 'none',
        cursor: x.onClick ? 'pointer' : 'default'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: `700 8.5px ${MONO}`,
        letterSpacing: '.12em',
        color: x.today ? '#4B37F5' : 'rgba(11,14,18,.5)'
      }
    }, x.day), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        font: '800 13px/1 Sora, sans-serif'
      }
    }, x.time)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        alignSelf: 'stretch'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 99,
        background: x.dot || '#00A88F',
        marginTop: 2,
        flex: 'none'
      }
    }), i < items.length - 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        width: 2,
        background: '#E6E3DC',
        margin: '4px 0 -17px'
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '700 14px/1.3 Manrope, sans-serif',
        textWrap: 'pretty'
      }
    }, x.title), x.meta ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        font: `600 9.5px/1.45 ${MONO}`,
        letterSpacing: '.05em',
        color: 'rgba(11,14,18,.5)'
      }
    }, x.meta) : null), x.tag ? /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '3px 7px',
        borderRadius: 6,
        background: T[0],
        color: T[1],
        font: `700 8.5px ${MONO}`,
        letterSpacing: '.1em',
        whiteSpace: 'nowrap'
      }
    }, x.tag) : /*#__PURE__*/React.createElement("span", null));
  }));
}
Object.assign(__ds_scope, { NeighborCard, CompleteAccount, WeekAgenda });
