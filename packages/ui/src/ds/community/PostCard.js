"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/community/PostCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* 2ab · Publicación con votos (Comunidad y Novedades). Sacada de To'Latino Comunidad.dc.html tal como se ve. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
/* D3 · «Ver traducción» bajo el texto. */
const Tr = ({
  t,
  mt = 6
}) => t && has(t.label) ? /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: mt
  }
}, /*#__PURE__*/React.createElement("span", {
  onClick: t.onClick,
  style: {
    font: '700 12px Manrope,sans-serif',
    color: 'var(--tl-action)',
    cursor: 'pointer'
  }
}, t.label)) : null;
const MUTED = 'rgba(11,14,18,.6)';

/* 4c · Votos y comentarios en pastillas con borde; guardar y compartir en círculos. voted = tinte morado (29 oct). */
const LINE = 'rgba(11,14,18,.12)';
function VoteBar({
  score = 0,
  onUp,
  onDown,
  upColor = MUTED,
  downColor = MUTED,
  scoreColor = 'var(--tl-ink)',
  voted,
  comments,
  onComments,
  onSave,
  saveColor = 'var(--tl-ink)',
  saveFill = 'none',
  onShare,
  style
}) {
  const on = voted != null ? !!voted : scoreColor !== 'var(--tl-ink)';
  const circ = {
    width: 36,
    height: 36,
    boxSizing: 'border-box',
    borderRadius: 999,
    border: '1px solid ' + LINE,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    flex: 'none'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      height: 36,
      boxSizing: 'border-box',
      padding: '0 3px',
      borderRadius: 999,
      border: '1px solid ' + (on ? 'rgba(75,55,245,.35)' : LINE),
      background: on ? 'rgba(75,55,245,.06)' : 'var(--tl-white)',
      display: 'flex',
      alignItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onUp,
    style: {
      width: 32,
      height: 34,
      display: 'grid',
      placeItems: 'center',
      cursor: onUp ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 16,
    color: upColor
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      textAlign: 'center',
      font: '800 13px Sora,sans-serif',
      color: scoreColor
    }
  }, score), /*#__PURE__*/React.createElement("span", {
    onClick: onDown,
    style: {
      width: 32,
      height: 34,
      display: 'grid',
      placeItems: 'center',
      cursor: onDown ? 'pointer' : 'default',
      transform: 'rotate(180deg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "like",
    size: 16,
    color: downColor
  }))), comments != null ? /*#__PURE__*/React.createElement("span", {
    onClick: onComments,
    style: {
      height: 36,
      boxSizing: 'border-box',
      padding: '0 14px 0 12px',
      borderRadius: 999,
      border: '1px solid ' + LINE,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '700 13px Manrope,sans-serif',
      whiteSpace: 'nowrap',
      cursor: onComments ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bubble",
    size: 16,
    color: "var(--tl-ink)"
  }), comments) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), onSave ? /*#__PURE__*/React.createElement("span", {
    onClick: onSave,
    style: circ
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "heart",
    size: 16,
    color: saveColor,
    fill: saveFill
  })) : null, onShare ? /*#__PURE__*/React.createElement("span", {
    onClick: onShare,
    style: circ
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "share",
    size: 16,
    color: "var(--tl-ink)"
  })) : null);
}
VoteBar.tlv = 27;

/* Encuesta: barra de % detrás de cada opción, ✓ en la tuya, meta abajo (votos · cierra). */
function PollOptions({
  options = [],
  meta
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, options.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: o.onClick,
    style: {
      position: 'relative',
      overflow: 'hidden',
      padding: '12px 14px',
      borderRadius: 13,
      border: '1.5px solid ' + (o.border || 'rgba(11,14,18,.12)'),
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: o.onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: o.width || 0,
      background: o.fill || 'rgba(75,55,245,.1)',
      transition: 'width .4s'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      font: (o.weight || 600) + ' 13.5px/1.3 Manrope,sans-serif'
    }
  }, o.label), o.mine ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    strokeWidth: 2.2,
    color: "var(--tl-action)"
  })) : null, has(o.pct) ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      font: '700 12px ' + mono,
      color: MUTED
    }
  }, o.pct) : null)), has(meta) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: '700 9.5px ' + mono,
      letterSpacing: '.12em',
      color: 'rgba(11,14,18,.45)'
    }
  }, meta) : null);
}

/* 2ab · Publicación (29 oct). Encabezado 2c: nombre en Sora 700 15; debajo rango (rank = { label, shield: 'gold' 9–10 | 'gray' 4–8 | null }) · barrio · Resuelta · Editada; hora y menú (more) a la derecha.
   Lo propio de cada tipo va en children, 3b: sobre Paper sin borde (negocio, mejor respuesta con quién y qué, encuesta), 911 sobre tinte rojo. Barra 4c. card = Novedades. data-slot="after" va debajo de los votos. */
const dot = /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 'none',
    color: 'rgba(11,14,18,.35)'
  }
}, "\xB7");
function PostCard({
  screenLabel,
  card,
  pin,
  avatar,
  avatarColor = 'var(--tl-desk)',
  initials,
  avatarRadius = '99px',
  avatarBorder = 'none',
  onAuthor,
  name,
  nameFont = '700 15px/1.25',
  verified,
  rank,
  time,
  place,
  placeColor = MUTED,
  sub,
  solved,
  edited,
  tag,
  tags = [],
  onMenu,
  chip,
  body,
  translate,
  bodyFont = '500 15px/1.5',
  bodyGap = 11,
  onOpen,
  children,
  vote = {},
  voteStyle,
  comments,
  onComments,
  onSave,
  saveColor,
  saveFill,
  onShare,
  style
}) {
  const kids = React.Children.toArray(children),
    isAfter = k => k && k.props && k.props['data-slot'] === 'after';
  const allTags = (tag && has(tag.label) ? [tag] : []).concat(tags.filter(x => x && has(x.label)));
  const box = card ? {
    padding: 16,
    borderRadius: 18,
    background: 'var(--tl-white)',
    border: '1px solid rgba(11,14,18,.08)'
  } : {
    padding: '16px 20px 14px',
    borderBottom: '1px solid rgba(11,14,18,.07)',
    background: 'var(--tl-white)'
  };
  const gold = rank && rank.shield === 'gold',
    pl = has(place) ? place : sub,
    parts = [];
  if (rank && has(rank.label)) parts.push(/*#__PURE__*/React.createElement("span", {
    key: "rk",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      flex: 'none',
      fontWeight: 700,
      color: gold ? 'var(--tl-pro-ink)' : 'rgba(11,14,18,.75)'
    }
  }, rank.shield ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 14,
    strokeWidth: 1.9,
    color: gold ? 'var(--tl-pro-ink)' : 'rgba(11,14,18,.5)',
    fill: gold ? 'rgba(255,176,32,.3)' : 'none'
  }) : null, rank.label));
  if (has(pl)) parts.push(/*#__PURE__*/React.createElement("span", {
    key: "pl",
    style: {
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontWeight: 500,
      color: placeColor
    }
  }, pl));
  if (has(solved)) parts.push(/*#__PURE__*/React.createElement("span", {
    key: "sv",
    style: {
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontWeight: 700,
      color: 'var(--tl-open-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13,
    strokeWidth: 2.4,
    color: "var(--tl-open-text)"
  }), solved));
  allTags.forEach((x, i) => parts.push(/*#__PURE__*/React.createElement("span", {
    key: 't' + i,
    style: {
      display: 'flex',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: x.tone || 'neutral'
  }, x.label))));
  if (has(edited)) parts.push(/*#__PURE__*/React.createElement("span", {
    key: "ed",
    style: {
      flex: 'none',
      fontWeight: 500,
      color: MUTED
    }
  }, edited));
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": screenLabel,
    style: {
      ...box,
      ...style
    }
  }, has(pin) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'var(--tl-action)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: 'var(--tl-action)'
    }
  }), pin) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onAuthor,
    style: {
      width: 40,
      height: 40,
      boxSizing: 'border-box',
      borderRadius: avatarRadius,
      border: avatarBorder,
      background: avatar || avatarColor,
      backgroundColor: avatarColor,
      display: 'grid',
      placeItems: 'center',
      font: '800 13px Sora,sans-serif',
      flex: 'none',
      cursor: onAuthor ? 'pointer' : 'default'
    }
  }, initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onAuthor,
    style: {
      minWidth: 0,
      font: nameFont + ' Sora,sans-serif',
      letterSpacing: '-.02em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      cursor: onAuthor ? 'pointer' : 'default'
    }
  }, name), verified ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "verified",
    size: 15,
    color: "var(--tl-action)"
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), has(time) ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      font: '500 12.5px/1.25 Manrope,sans-serif',
      color: MUTED,
      whiteSpace: 'nowrap'
    }
  }, time) : null, onMenu ? /*#__PURE__*/React.createElement("span", {
    onClick: onMenu,
    style: {
      width: 32,
      height: 32,
      margin: '-8px -9px -8px 0',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 18,
    color: "rgba(11,14,18,.42)"
  })) : null), parts.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
      font: '600 12.5px/1.3 Manrope,sans-serif',
      whiteSpace: 'nowrap'
    }
  }, parts.map((x, i) => i ? [/*#__PURE__*/React.createElement(React.Fragment, {
    key: 'd' + i
  }, dot), x] : x)) : null)), has(chip) ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 9px',
      borderRadius: 8,
      background: 'rgba(0,229,196,.14)',
      font: '700 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'var(--tl-open-text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: 'var(--tl-open)'
    }
  }), chip) : null, has(body) ? /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    style: {
      marginTop: bodyGap,
      font: bodyFont + ' Manrope,sans-serif',
      textWrap: 'pretty',
      cursor: onOpen ? 'pointer' : 'default'
    }
  }, body) : null, has(body) ? /*#__PURE__*/React.createElement(Tr, {
    t: translate
  }) : null, kids.filter(k => !isAfter(k)), /*#__PURE__*/React.createElement(VoteBar, _extends({}, vote, {
    style: voteStyle,
    comments: comments,
    onComments: onComments,
    onSave: onSave,
    saveColor: saveColor,
    saveFill: saveFill,
    onShare: onShare
  })), kids.filter(isAfter));
}
PostCard.tlv = 27;
Object.assign(__ds_scope, { VoteBar, PollOptions, PostCard });
