"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/city/RadiusMap.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2ag · Radio con mapa y 2ah · Ciudad próximamente (pantalla Ciudad). Teselas reales (Esri · OpenStreetMap) que arma la pantalla; el círculo es el radio a escala.
   Sacados de To'Latino Ciudad.dc.html tal como se ven. */
const mono = "'JetBrains Mono',monospace";
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const K = {
  font: '800 10px ' + mono,
  letterSpacing: '.14em',
  color: 'rgba(11,14,18,.45)'
};
const Tiles = ({
  scale = 1,
  tiles = [],
  anim
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
    transform: 'scale(' + scale + ')',
    transition: anim ? 'transform .35s ease' : undefined
  }
}, tiles.map((t, i) => /*#__PURE__*/React.createElement("img", {
  key: t.src || i,
  src: t.src,
  alt: "",
  style: {
    position: 'absolute',
    left: t.left,
    top: t.top,
    width: 256,
    height: 256,
    display: 'block'
  }
})));
const Credit = ({
  r = 6,
  b = 4
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    position: 'absolute',
    right: r,
    bottom: b,
    font: '500 9px Manrope,sans-serif',
    color: 'rgba(11,14,18,.6)'
  }
}, "\xA9 Esri \xB7 OpenStreetMap");

/* 2ag · Hasta dónde buscar: el mapa con tu punto, el círculo real y los negocios (tinta = Pro, Action = Free, gris = fuera), 2 · 5 · 10 · 30 mi y qué entra (cuántos negocios, qué pueblos). desk = columna del popup desktop. */
function RadiusMap({
  desk,
  label,
  radius,
  scale = 1,
  tiles = [],
  dots = [],
  circle = 0,
  place,
  radii = [],
  count,
  towns,
  note,
  foot
}) {
  const M = -circle / 2;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: desk ? 12 : 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: K
  }, label), has(radius) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + (desk ? 17 : 18) + 'px Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, radius) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: desk ? 220 : 200,
      borderRadius: desk ? 16 : 18,
      overflow: 'hidden',
      background: 'var(--tl-photo-bg)'
    }
  }, /*#__PURE__*/React.createElement(Tiles, {
    scale: scale,
    tiles: tiles,
    anim: true
  }), dots.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: 'absolute',
      left: 'calc(50% + ' + d.x + 'px)',
      top: 'calc(50% + ' + d.y + 'px)',
      width: 5,
      height: 5,
      margin: '-2.5px 0 0 -2.5px',
      borderRadius: 99,
      background: d.color,
      boxShadow: '0 0 0 1px rgba(255,255,255,.85)',
      transition: 'left .35s ease,top .35s ease'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: circle,
      height: circle,
      marginLeft: M,
      marginTop: M,
      borderRadius: 999,
      border: '2px solid var(--tl-action)',
      background: 'rgba(75,55,245,.1)',
      boxSizing: 'border-box',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 14,
      height: 14,
      margin: '-7px 0 0 -7px',
      borderRadius: 99,
      background: 'var(--tl-action)',
      border: '3px solid var(--tl-white)',
      boxShadow: '0 2px 8px rgba(11,14,18,.3)'
    }
  }), has(place) ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: 10,
      padding: '5px 9px',
      borderRadius: 9,
      background: 'var(--tl-white)',
      font: '700 10px ' + mono,
      letterSpacing: '.06em',
      color: 'var(--tl-ink)'
    }
  }, place) : null, /*#__PURE__*/React.createElement(Credit, null)), radii.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + radii.length + ',minmax(0,1fr))',
      gap: 4,
      padding: 4,
      borderRadius: desk ? 13 : 14,
      background: desk ? 'var(--tl-ds-f1efea)' : 'var(--tl-paper)'
    }
  }, radii.map((r, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: r.onClick,
    style: {
      height: desk ? 34 : 38,
      borderRadius: desk ? 10 : 11,
      display: 'grid',
      placeItems: 'center',
      background: r.on ? 'var(--tl-white)' : 'transparent',
      color: r.on ? 'var(--tl-ink)' : 'rgba(11,14,18,.55)',
      boxShadow: r.on ? '0 1px 3px rgba(11,14,18,.15)' : 'none',
      font: '700 ' + (desk ? 12.5 : 13) + 'px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, r.label))) : null, has(count) || has(towns) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: desk ? 5 : 6
    }
  }, has(count) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, count) : null, has(towns) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 ' + (desk ? 12 : 12.5) + 'px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)',
      textWrap: 'pretty'
    }
  }, towns) : null, has(note) ? /*#__PURE__*/React.createElement("span", {
    style: {
      padding: desk ? '9px 11px' : '10px 12px',
      borderRadius: desk ? 11 : 12,
      background: 'rgba(255,176,32,.14)',
      font: '600 ' + (desk ? 11.5 : 12) + 'px/1.5 Manrope,sans-serif',
      color: 'var(--tl-pro-ink)',
      textWrap: 'pretty'
    }
  }, note) : null, has(foot) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)',
      textWrap: 'pretty'
    }
  }, foot) : null) : null);
}

/* 2ah · Ciudad próximamente: mapa con el radio punteado y PRÓXIMAMENTE, qué tan lista está (barra), lista de espera y distancia, Avísame · Publica tu negocio · Recomienda un negocio,
   los negocios que más piden y, mientras, Hazleton (meanwhileAt = desk bajo el mapa · mob al final). */
function CitySoon({
  maxWidth,
  padding,
  columns,
  gap,
  mapHeight = 240,
  map = {},
  soonTag,
  eyebrow,
  title,
  titleSize = 30,
  body,
  ready = {},
  stats = [],
  join = {},
  publish = {},
  recommend = {},
  asksLabel,
  asks = [],
  meanwhile,
  meanwhileAt = 'mob',
  foot
}) {
  const D = map.circle || 0,
    M = -D / 2;
  const Mean = mob => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: mob ? 16 : '16px 18px',
      borderRadius: 20,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: mob ? 'column' : 'row',
      alignItems: mob ? 'stretch' : 'center',
      gap: mob ? 12 : 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: mob ? undefined : 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, meanwhile.kicker), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 16px Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, meanwhile.title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, meanwhile.sub)), mob ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    size: "md",
    variant: "secondary",
    onClick: meanwhile.onClick
  }, meanwhile.cta)) : /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "md",
    variant: "secondary",
    onClick: meanwhile.onClick
  }, meanwhile.cta));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth,
      margin: '0 auto',
      padding,
      display: 'grid',
      gridTemplateColumns: columns,
      gap,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: mapHeight,
      borderRadius: 22,
      overflow: 'hidden',
      background: 'var(--tl-photo-bg)'
    }
  }, /*#__PURE__*/React.createElement(Tiles, {
    scale: map.scale,
    tiles: map.tiles
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: D,
      height: D,
      marginLeft: M,
      marginTop: M,
      borderRadius: 999,
      border: '2px dashed var(--tl-action)',
      background: 'rgba(75,55,245,.08)',
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 16,
      height: 16,
      margin: '-8px 0 0 -8px',
      borderRadius: 99,
      background: 'var(--tl-action)',
      border: '3px solid var(--tl-white)',
      boxShadow: '0 2px 8px rgba(11,14,18,.3)'
    }
  }), has(soonTag) ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: 12,
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "ink"
  }, soonTag)) : null, /*#__PURE__*/React.createElement(Credit, {
    r: 8,
    b: 6
  })), meanwhile && meanwhileAt === 'desk' ? Mean(false) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 10.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + titleSize + 'px/1.08 Sora,sans-serif',
      letterSpacing: '-.045em',
      textWrap: 'balance'
    }
  }, title), has(body) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 14px/1.6 Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)',
      textWrap: 'pretty'
    }
  }, body) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderRadius: 20,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, ready.title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px Sora,sans-serif',
      color: 'var(--tl-action)'
    }
  }, ready.pct)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 99,
      background: 'rgba(75,55,245,.12)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: ready.pct,
      borderRadius: 99,
      background: 'var(--tl-action)'
    }
  })), stats.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + stats.length + ',minmax(0,1fr))',
      gap: 8
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '10px 12px',
      borderRadius: 13,
      background: 'var(--tl-paper)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 18px Sora,sans-serif'
    }
  }, s.value), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.5)'
    }
  }, s.label)))) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    icon: "bell",
    variant: join.variant,
    onClick: join.onClick
  }, join.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    icon: "store",
    variant: "secondary",
    onClick: publish.onClick
  }, publish.label)), has(recommend.label) ? /*#__PURE__*/React.createElement("span", {
    onClick: recommend.onClick,
    style: {
      textAlign: 'center',
      padding: 6,
      font: '700 13px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, recommend.label) : null), asks.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: K
  }, asksLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, asks.map((a, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    variant: "feature"
  }, a)))) : null, meanwhile && meanwhileAt === 'mob' ? Mean(true) : null, has(foot) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1.55 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)',
      textWrap: 'pretty'
    }
  }, foot) : null));
}
Object.assign(__ds_scope, { RadiusMap, CitySoon });
