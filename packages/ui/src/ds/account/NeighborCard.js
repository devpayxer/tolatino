"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/account/NeighborCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const MONO = "'JetBrains Mono', monospace";
const TAG = {
  action: ['rgba(75,55,245,.1)', 'var(--tl-action)'],
  signal: ['rgba(0,229,196,.16)', 'var(--tl-open-text)'],
  neutral: ['rgba(11,14,18,.06)', 'rgba(11,14,18,.6)'],
  ink: ['var(--tl-ink)', 'var(--tl-white)']
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
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
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
      color: 'var(--tl-signal)'
    }
  }, city)), /*#__PURE__*/React.createElement("div", {
    onClick: onProfile,
    ...__ds_scope.__btn(onProfile, undefined, undefined),
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
      border: '2px solid var(--tl-signal)',
      background: photo ? `url(${photo}) center/cover` : 'var(--tl-dark-2)',
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
      color: 'var(--tl-signal)'
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
    ...__ds_scope.__btn(c.onClick, undefined, undefined),
    style: {
      padding: '11px 12px',
      borderRadius: 14,
      background: 'var(--tl-dark-2)',
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
      color: c.color || 'var(--tl-white)',
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
      background: 'var(--tl-white)',
      border: '1.5px solid var(--tl-action)',
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
      color: 'var(--tl-action)'
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
      color: 'var(--tl-action)'
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
      background: 'var(--tl-action)',
      borderRadius: 99
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, items.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: !x.done ? x.onClick : undefined,
    ...__ds_scope.__btn(!x.done ? x.onClick : undefined, undefined, undefined),
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
      background: x.done ? 'var(--tl-open)' : 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, x.done ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 11,
    strokeWidth: 2.8,
    color: "var(--tl-white)"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: `${x.done ? 600 : 700} 13.5px Manrope, sans-serif`,
      color: x.done ? 'rgba(11,14,18,.5)' : 'var(--tl-ink)'
    }
  }, x.label), !x.done && x.onClick ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12px Manrope, sans-serif',
      color: 'var(--tl-action)',
      flex: 'none'
    }
  }, actionLabel) : null))));
}

/** 2s · Tu semana: agenda en orden (pedido de hoy, citas, mesa, apartado, boleto). dot: var(--tl-action) en curso · var(--tl-pro) esperando · var(--tl-open) confirmado · var(--tl-ink) boleto. */
function WeekAgenda({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      padding: '4px 16px',
      ...style
    }
  }, items.map((x, i) => {
    const T = TAG[x.tone || 'neutral'];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: x.onClick,
      ...__ds_scope.__btn(x.onClick, undefined, undefined),
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
        color: x.today ? 'var(--tl-action)' : 'rgba(11,14,18,.5)'
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
        background: x.dot || 'var(--tl-open)',
        marginTop: 2,
        flex: 'none'
      }
    }), i < items.length - 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        width: 2,
        background: 'var(--tl-ds-e6e3dc)',
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
