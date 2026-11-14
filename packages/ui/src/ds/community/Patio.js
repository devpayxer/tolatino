"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/community/Patio.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* El Patio (patrones aprobados 2ai mesa de dominó y 2ar tablero de parchís). Sacados de To'Latino Comunidad.dc.html tal como se ven. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const ell = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};
const av = (a, c) => ({
  background: a || 'var(--tl-desk)',
  backgroundColor: c || 'var(--tl-desk)'
});

/* Ficha de dominó: dos mitades con puntos en grilla 3×3. pips = [[9 colores], [9 colores]]. hand = ficha de tu mano (r7, se puede tocar y levantar). */
function DominoTile({
  dir = 'column',
  width,
  height,
  pad,
  dot,
  pips = [],
  shadow,
  hand,
  ring,
  opacity = 1,
  lift,
  onClick,
  tileLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Tile" : "Ficha"
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, tileLabel, undefined),
    style: {
      display: 'flex',
      flexDirection: dir,
      width,
      height,
      gap: 1,
      background: 'var(--tl-ds-b9b4aa)',
      borderRadius: hand ? 7 : 5,
      overflow: 'hidden',
      boxShadow: ring || shadow,
      opacity,
      transform: hand ? 'translateY(' + (lift || '0') + ')' : undefined,
      transition: hand ? 'transform .15s' : undefined,
      cursor: hand ? 'pointer' : 'default',
      flex: 'none'
    }
  }, pips.map((half, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gridTemplateRows: 'repeat(3,minmax(0,1fr))',
      padding: pad,
      background: 'var(--tl-ds-fbfaf7)'
    }
  }, (half || []).map((c, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: {
      borderRadius: 99,
      background: c,
      margin: dot
    }
  })))));
}

/* Puesto en la mesa: pill (compañero de enfrente) o side (izquierda / derecha). bg marca a quién le toca. */
function GameSeat({
  layout = 'pill',
  name,
  sub,
  avatar,
  avatarColor,
  bg
}) {
  if (layout === 'side') return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 5,
      padding: '8px 2px',
      borderRadius: 14,
      background: bg
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 99,
      ...av(avatar, avatarColor)
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10.5px Manrope,sans-serif',
      textAlign: 'center'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 8px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(255,255,255,.6)',
      textAlign: 'center'
    }
  }, sub));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px 6px 6px',
      borderRadius: 99,
      background: bg
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 99,
      ...av(avatar, avatarColor),
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 12px Manrope,sans-serif'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 8.5px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(255,255,255,.6)'
    }
  }, sub)));
}

/* Frases rápidas sobre la mesa oscura. */
function QuickReactions({
  items = [],
  justify = 'flex-start'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "hs",
    style: {
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      justifyContent: justify,
      scrollbarWidth: 'none'
    }
  }, items.map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: x.onClick,
    ...__ds_scope.__btn(x.onClick, undefined, undefined),
    style: {
      flex: 'none',
      padding: '7px 12px',
      borderRadius: 99,
      border: '1px solid rgba(255,255,255,.16)',
      font: '700 11.5px Manrope,sans-serif',
      color: 'rgba(255,255,255,.85)',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, x.label)));
}

/* Fin de la mano o de la partida: tarjeta blanca sobre la mesa oscurecida. */
function GameEnd({
  screenLabel,
  kicker,
  kickerColor = 'var(--tl-open-text)',
  title,
  sub,
  cta,
  onCta,
  cta2,
  onCta2
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(11,14,18,.82)',
      display: 'grid',
      placeItems: 'center',
      padding: 20,
      animation: 'tlFade .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 22,
      background: 'var(--tl-white)',
      color: 'var(--tl-ink)',
      padding: 20,
      textAlign: 'center',
      animation: 'tlPop .25s ease-out',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.16em',
      color: kickerColor
    }
  }, kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '800 22px/1.15 Sora,sans-serif',
      letterSpacing: '-.03em',
      textWrap: 'pretty'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      font: '500 13px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.62)',
      textWrap: 'pretty'
    }
  }, sub) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, has(cta) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    block: true,
    onClick: onCta
  }, cta)) : null, has(cta2) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    block: true,
    onClick: onCta2
  }, cta2)) : null)));
}
const Status = ({
  dot,
  color = 'var(--tl-white)',
  text,
  right,
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 4px'
  }
}, children, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: dot,
    flex: 'none'
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    minWidth: 0,
    font: '700 13px/1.35 Manrope,sans-serif',
    color,
    textWrap: 'pretty'
  }
}, text), has(right) ? /*#__PURE__*/React.createElement("span", {
  style: {
    font: '700 9.5px ' + mono,
    letterSpacing: '.1em',
    color: 'rgba(255,255,255,.6)'
  }
}, right) : null);
const Table = ({
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    borderRadius: 24,
    background: 'var(--tl-dark-2)',
    color: 'var(--tl-white)',
    padding: '14px 12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden'
  }
}, children);

/* 2ai · Mesa de dominó: marcador, compañeros alrededor, la mesa con las fichas jugadas, «Te toca», tu mano con las que pegan resaltadas (ring) y frases rápidas. */
function DominoTable({
  score = {},
  top,
  left,
  right,
  columns = '64px minmax(0,1fr) 64px',
  boardHeight = '210px',
  board = [],
  emptyText,
  status = {},
  ends,
  hand = [],
  handGap = '4px',
  handHeight = '92px',
  bubble,
  sides,
  pass,
  reactions = [],
  reactJustify,
  end,
  none
}) {
  return /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      gap: 14,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(255,255,255,.55)'
    }
  }, score.usLabel, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 16px Sora,sans-serif',
      color: 'var(--tl-signal)',
      letterSpacing: 0
    }
  }, score.us)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(255,255,255,.55)'
    }
  }, score.themLabel, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 16px Sora,sans-serif',
      color: 'var(--tl-white)',
      letterSpacing: 0
    }
  }, score.them))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(255,255,255,.55)'
    }
  }, score.meta)), top ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(GameSeat, _extends({}, top, {
    layout: "pill"
  }))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: columns,
      gap: 8,
      alignItems: 'center'
    }
  }, left ? /*#__PURE__*/React.createElement(GameSeat, _extends({}, left, {
    layout: "side"
  })) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: boardHeight,
      borderRadius: 16,
      background: 'var(--tl-dark-3)',
      padding: '12px 8px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      gap: 4
    }
  }, board.map((t, i) => /*#__PURE__*/React.createElement(DominoTile, _extends({
    key: i
  }, t))), !board.length && has(emptyText) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(255,255,255,.5)',
      textAlign: 'center'
    }
  }, emptyText) : null), right ? /*#__PURE__*/React.createElement(GameSeat, _extends({}, right, {
    layout: "side"
  })) : /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement(Status, {
    dot: status.dot,
    color: status.color,
    text: status.text,
    right: ends
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      gap: handGap,
      padding: '10px 0 2px',
      minHeight: handHeight
    }
  }, hand.map((t, i) => /*#__PURE__*/React.createElement(DominoTile, _extends({
    key: i
  }, t, {
    hand: true
  }))), has(bubble) ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: -18,
      transform: 'translateX(-50%)',
      padding: '6px 12px',
      borderRadius: 99,
      background: 'var(--tl-white)',
      color: 'var(--tl-ink)',
      font: '700 12px Manrope,sans-serif',
      whiteSpace: 'nowrap',
      animation: 'tlPop .2s ease-out'
    }
  }, bubble) : null), sides ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "action",
    size: "md",
    block: true,
    onClick: sides.onLeft
  }, sides.left)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "action",
    size: "md",
    block: true,
    onClick: sides.onRight
  }, sides.right))) : null, pass ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "action",
    block: true,
    onClick: pass.onClick
  }, pass.label)) : null, /*#__PURE__*/React.createElement(QuickReactions, {
    items: reactions,
    justify: reactJustify
  }), end ? /*#__PURE__*/React.createElement(GameEnd, end) : null, none ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--tl-dark-2)',
      display: 'grid',
      placeItems: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 20px/1.2 Sora,sans-serif'
    }
  }, none.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "action",
    onClick: none.onCta
  }, none.cta)))) : null);
}

/* Dado con puntos: pips = 9 colores (grilla 3×3). */
function DieFace({
  pips = []
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 11,
      background: 'var(--tl-white)',
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gridTemplateRows: 'repeat(3,minmax(0,1fr))',
      gap: 2,
      padding: 7,
      boxSizing: 'border-box',
      flex: 'none'
    }
  }, pips.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      borderRadius: 99,
      background: c
    }
  })));
}

/* Tablero de parchís 19×19: casas (yards), casillas (cells), meta (center), lugares libres (slots) y fichas (pieces). Posiciones en %. Una ficha que se puede mover trae onClick y anillo (shadow). */
function ParchisBoard({
  screenLabel,
  width = '100%',
  yards = [],
  cells = [],
  center,
  slots = [],
  pieces = [],
  pieceLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Piece" : "Pieza"
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      width,
      maxWidth: '100%',
      aspectRatio: '1',
      position: 'relative',
      borderRadius: 12,
      background: 'var(--tl-paper)',
      overflow: 'hidden'
    }
  }, yards.map((y, i) => /*#__PURE__*/React.createElement("div", {
    key: 'y' + i,
    style: {
      position: 'absolute',
      left: y.l,
      top: y.t,
      width: y.w,
      height: y.w,
      background: y.bg,
      boxSizing: 'border-box',
      padding: '6%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: '20%',
      background: 'rgba(255,255,255,.9)'
    }
  }))), cells.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: 'c' + i,
    style: {
      position: 'absolute',
      left: c.l,
      top: c.t,
      width: c.w,
      height: c.w,
      background: c.bg,
      boxShadow: 'inset 0 0 0 .5px rgba(11,14,18,.22)'
    }
  })), center ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: center.l,
      top: center.l,
      width: center.w,
      height: center.w,
      background: center.bg
    }
  }) : null, slots.map((o, i) => /*#__PURE__*/React.createElement("span", {
    key: 's' + i,
    style: {
      position: 'absolute',
      left: o.l,
      top: o.t,
      width: o.s,
      height: o.s,
      transform: 'translate(-50%,-50%)',
      borderRadius: 99,
      border: '1.5px dashed rgba(11,14,18,.25)',
      boxSizing: 'border-box'
    }
  })), pieces.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: p.key || 'p' + i,
    onClick: p.onClick,
    ...__ds_scope.__btn(p.onClick, pieceLabel, undefined),
    style: {
      position: 'absolute',
      left: p.l,
      top: p.t,
      width: p.s,
      height: p.s,
      transform: 'translate(-50%,-50%)',
      borderRadius: 99,
      background: p.c,
      border: '2px solid var(--tl-white)',
      boxSizing: 'border-box',
      boxShadow: p.shadow,
      zIndex: p.z,
      cursor: p.onClick ? 'pointer' : 'default',
      transition: 'left .35s ease,top .35s ease'
    }
  })));
}

/* 2ar · Mesa de parchís: jugadores con su color, el tablero, el dado y a quién le toca, «Tirar el dado», jugadas posibles (COME / META) y frases rápidas. */
function ParchisTable({
  columns = 'repeat(2,minmax(0,1fr))',
  players = [],
  board = {},
  die,
  status = {},
  bubble,
  roll,
  moves = [],
  reactions = [],
  end
}) {
  return /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: columns,
      gap: 6
    }
  }, players.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 9px',
      borderRadius: 13,
      background: p.bg,
      boxShadow: 'inset 0 0 0 1.5px ' + (p.border || 'transparent')
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 28,
      height: 28,
      borderRadius: 99,
      ...av(p.avatar, p.avatarColor),
      display: 'grid',
      placeItems: 'center',
      font: '800 11px Sora,sans-serif',
      color: 'var(--tl-ink)',
      flex: 'none'
    }
  }, p.initials, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      width: 13,
      height: 13,
      borderRadius: 99,
      background: p.color,
      border: '2px solid var(--tl-dark-2)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '700 12.5px Manrope,sans-serif',
      ...ell
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      font: '600 8.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(255,255,255,.6)'
    }
  }, p.sub))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(ParchisBoard, board)), /*#__PURE__*/React.createElement(Status, {
    dot: status.dot,
    color: status.color,
    text: status.text
  }, die ? /*#__PURE__*/React.createElement(DieFace, {
    pips: die
  }) : null, has(bubble) ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 4,
      top: -30,
      padding: '6px 12px',
      borderRadius: 99,
      background: 'var(--tl-white)',
      color: 'var(--tl-ink)',
      font: '700 12px Manrope,sans-serif',
      animation: 'tlPop .2s ease-out'
    }
  }, bubble) : null), roll ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "action",
    block: true,
    onClick: roll.onClick
  }, roll.label)) : null, moves.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: o.onClick,
    ...__ds_scope.__btn(o.onClick, undefined, undefined),
    style: {
      minHeight: 46,
      padding: '10px 12px',
      borderRadius: 13,
      background: 'rgba(255,255,255,.08)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 99,
      background: o.color,
      border: '2px solid var(--tl-white)',
      boxSizing: 'border-box',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '700 13px/1.35 Manrope,sans-serif'
    }
  }, o.label), has(o.tag) ? /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 7px',
      borderRadius: 6,
      background: 'var(--tl-signal)',
      color: 'var(--tl-ink)',
      font: '800 9px ' + mono,
      letterSpacing: '.08em'
    }
  }, o.tag) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 15,
    color: "rgba(255,255,255,.55)"
  }))), /*#__PURE__*/React.createElement(QuickReactions, {
    items: reactions
  }), end ? /*#__PURE__*/React.createElement(GameEnd, end) : null);
}
Object.assign(__ds_scope, { DominoTile, GameSeat, QuickReactions, GameEnd, DominoTable, DieFace, ParchisBoard, ParchisTable });
