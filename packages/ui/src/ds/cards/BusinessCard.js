"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/BusinessCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const mono = "'JetBrains Mono',monospace";
const Check = () => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  style: {
    flex: 'none'
  }
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "10",
  fill: "var(--tl-action)"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7.6 12.4l3 3 5.9-6.4",
  stroke: "var(--tl-white)",
  strokeWidth: "2.6",
  fill: "none",
  strokeLinecap: "round"
}));
const Stars = ({
  r,
  n,
  note,
  size = 12.5
}) => n != null && n < 5 ? /*#__PURE__*/React.createElement("span", {
  style: {
    whiteSpace: 'nowrap',
    flex: 'none',
    font: '700 ' + size + 'px Manrope,sans-serif'
  }
}, r, note ? /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 500,
    color: 'rgba(11,14,18,.6)'
  }
}, " ", note) : null) : /*#__PURE__*/React.createElement("span", {
  style: {
    whiteSpace: 'nowrap',
    flex: 'none',
    font: '700 ' + size + 'px Manrope,sans-serif'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--tl-pro)'
  }
}, "\u2605"), " ", r, " ", /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 500,
    color: 'rgba(11,14,18,.6)'
  }
}, "(", n, ")"));
const bg = p => p ? {
  backgroundImage: 'url(' + p + ')',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
} : {};
function BusinessCard({
  plan = 'pro',
  name,
  verified,
  meta,
  rating,
  reviews,
  reviewsNote,
  status,
  open = true,
  photos = [],
  chips = [],
  offer,
  offerTag = 'HOY',
  cta = 'Ordenar',
  ctaIcon = 'bag',
  contactLabel = 'Llamar',
  contactIcon = 'phone',
  saved,
  onOpen,
  onCta,
  onSave,
  onContact,
  media,
  ring,
  onRing,
  ringLabel = 'Hoy en el barrio',
  oneLine
}) {
  const stop = f => e => {
    if (e && e.stopPropagation) e.stopPropagation();
    f && f(e);
  };
  if (plan === 'free') return /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    ...__ds_scope.__btn(onOpen, undefined, undefined, true),
    style: {
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      padding: 12,
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      cursor: onOpen ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 14,
      flex: 'none',
      background: 'var(--tl-photo-bg)',
      ...bg(photos[0])
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 14.5px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    ...__ds_scope.__btn(onOpen)
  }, name)), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 10.5px ' + mono,
      color: 'rgba(11,14,18,.6)'
    }
  }, meta) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(Stars, {
    r: rating,
    n: reviews,
    note: reviewsNote,
    size: 12
  }))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "md",
    icon: contactIcon,
    onClick: stop(onContact)
  }, contactLabel));
  return /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    ...__ds_scope.__btn(onOpen, undefined, undefined, true),
    style: {
      borderRadius: 22,
      overflow: 'hidden',
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      boxShadow: '0 12px 26px -22px rgba(11,14,18,.45)',
      cursor: onOpen ? 'pointer' : 'default',
      color: 'var(--tl-ink)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: oneLine ? 150 : 170,
      background: 'var(--tl-photo-bg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      ...bg(photos[0])
    }
  }, media || null), ring ? /*#__PURE__*/React.createElement("button", {
    type: 'button',
    'aria-label': ringLabel,
    'data-anillo': '',
    onClick: stop(onRing),
    style: {
      position: 'absolute',
      left: 14,
      bottom: -24,
      width: 54,
      height: 54,
      boxSizing: 'border-box',
      borderRadius: 99,
      padding: 3,
      border: 0,
      margin: 0,
      background: 'var(--tl-action)',
      cursor: 'pointer',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      borderRadius: 99,
      border: '3px solid var(--tl-white)',
      backgroundColor: 'var(--tl-photo-bg)',
      ...bg(ring)
    }
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: ring ? '32px 15px 15px' : '14px 15px 15px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 17px Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    ...__ds_scope.__btn(onOpen)
  }, name)), verified ? /*#__PURE__*/React.createElement(Check, null) : null), meta && !oneLine ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '600 10.5px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.6)'
    }
  }, meta) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Stars, {
    r: rating,
    n: reviews,
    note: reviewsNote
  }), oneLine && meta ? /*#__PURE__*/React.createElement("span", {
    'data-una-linea': '',
    style: {
      flex: '0 1 auto',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      font: '600 12.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, meta) : null, status ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: 99,
      background: 'rgba(11,14,18,.25)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      flex: oneLine ? 'none' : undefined,
      whiteSpace: oneLine ? 'nowrap' : undefined,
      font: '700 12.5px Manrope,sans-serif',
      color: open ? 'var(--tl-open-text)' : 'var(--tl-danger)'
    }
  }, status)) : null), chips.length && !oneLine ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, chips.map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    variant: c.variant || (i === 0 ? 'slot' : 'feature'),
    style: {
      whiteSpace: 'normal',
      maxWidth: '100%',
      flex: '0 1 auto',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: 1.3,
      overflowWrap: 'anywhere'
    }
  }, c.label)))) : null, offer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 12px',
      borderRadius: 13,
      background: 'rgba(75,55,245,.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "action"
  }, offerTag), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '600 12.5px/1.35 Manrope,sans-serif'
    }
  }, offer)) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    size: "md",
    icon: ctaIcon,
    onClick: stop(onCta)
  }, cta)), oneLine ? null : /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "heart",
    size: 40,
    active: saved,
    onClick: stop(onSave)
  }))));
}
Object.assign(__ds_scope, { BusinessCard });
