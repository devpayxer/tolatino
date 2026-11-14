"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/listing/BusinessPreview.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* 2ae · Vista previa Free | Pro (Publica tu negocio · G1 y la columna en vivo; Panel · Tu plan): tu página como la ve el cliente, con lo que se ve en Free y en Pro.
   mode = mini (tu negocio en una línea, 2ad) · card (tarjeta en resultados) · page (página del negocio, con pestañas en Pro). view = pro | free.
   pv = datos de la vista previa (los arma la pantalla). Sacado de To'Latino Publica vista previa.dc.html tal como se ve. Usa la animación pvFade (la pantalla la define). */
const mono = "'JetBrains Mono',monospace";
const ell = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};
const H2 = {
  font: '800 18px/1.1 Sora,sans-serif',
  letterSpacing: '-.03em'
};
const SUB = {
  font: '600 9.5px/1.25 ' + mono,
  letterSpacing: '.06em',
  color: 'rgba(11,14,18,.5)'
};
const BIG = {
  font: '800 15px/1 Sora,sans-serif',
  letterSpacing: '-.02em'
};
const CELL = {
  minWidth: 0,
  padding: '12px 6px 11px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 5,
  textAlign: 'center'
};
const COVER = {
  font: '700 9.5px ' + mono,
  letterSpacing: '.14em',
  color: 'rgba(11,14,18,.4)'
};
const bgc = (img, c) => ({
  background: img ? img + ' center/cover' : c,
  backgroundColor: c
});

/* El cambio Free | Pro: dos opciones, la elegida en tinta. */
function PlanSwitch({
  items = [],
  width = 220
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 4,
      borderRadius: 14,
      background: 'rgba(11,14,18,.06)',
      display: 'grid',
      gridTemplateColumns: 'repeat(' + Math.max(1, items.length) + ',minmax(0,1fr))',
      gap: 4,
      width,
      flex: 'none',
      boxSizing: 'border-box'
    }
  }, items.map((o, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: o.onClick,
    ...__ds_scope.__btn(o.onClick, undefined, undefined),
    style: {
      height: 38,
      borderRadius: 11,
      background: o.on ? 'var(--tl-ink)' : 'transparent',
      color: o.on ? 'var(--tl-white)' : 'rgba(11,14,18,.6)',
      display: 'grid',
      placeItems: 'center',
      font: '800 13px Manrope,sans-serif',
      cursor: 'pointer',
      transition: 'background .2s'
    }
  }, o.label)));
}
function BusinessPreview({
  pv,
  mode = 'card',
  view = 'pro',
  lang = 'es',
  onOpen
}) {
  const [tab0, setTab] = React.useState('res');
  const P = pv || {},
    L = P.lbl || {},
    pro = view !== 'free',
    es = lang !== 'en';
  if (mode === 'mini') return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Vista previa \xB7 tarjeta compacta",
    onClick: onOpen,
    ...__ds_scope.__btn(onOpen, undefined, undefined),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '9px 11px',
      borderRadius: 16,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      cursor: 'pointer',
      fontFamily: 'Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      flex: 'none',
      ...bgc(P.logoBg, P.logoC),
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 14px/1 Sora,sans-serif'
    }
  }, P.logoTxt), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 14px/1.15 Sora,sans-serif',
      letterSpacing: '-.02em',
      ...ell
    }
  }, P.nameOr), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.05em',
      color: 'rgba(11,14,18,.5)',
      ...ell
    }
  }, P.meta)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      font: '700 11.5px Manrope,sans-serif',
      color: P.stColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: P.stDot
    }
  }), P.stLabel), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 15,
    color: "rgba(11,14,18,.4)"
  }));
  if (mode !== 'page') return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Vista previa \xB7 tarjeta en resultados",
    style: {
      fontFamily: 'Manrope,sans-serif',
      color: 'var(--tl-ink)',
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, pro ? L.blockPro : L.blockFree), P.sealPend ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "neutral"
  }, L.sealPend) : null), pro ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 22,
      overflow: 'hidden',
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      boxShadow: '0 12px 26px -22px rgba(11,14,18,.45)',
      animation: 'pvFade .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 150,
      ...bgc(P.cover, 'var(--tl-photo-bg)'),
      display: 'grid',
      placeItems: 'center'
    }
  }, P.noCover ? /*#__PURE__*/React.createElement("span", {
    style: COVER
  }, L.coverHere) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 15px 15px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 17px Sora,sans-serif',
      letterSpacing: '-.03em'
    }
  }, P.nameOr), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: '600 10.5px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.5)'
    }
  }, P.meta), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '700 12.5px Manrope,sans-serif'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap',
      flex: 'none'
    }
  }, P.r), /*#__PURE__*/React.createElement("span", {
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
      color: P.stColor
    }
  }, P.status)), P.hasChips ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, (P.chips || []).map((c, i) => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: i,
    variant: c.v
  }, c.l))) : null, /*#__PURE__*/React.createElement("div", {
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
    icon: P.ctaIc
  }, P.cta)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "heart",
    size: 40
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      padding: 12,
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      animation: 'pvFade .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 14,
      flex: 'none',
      ...bgc(P.cover, 'var(--tl-photo-bg)')
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 14.5px Manrope,sans-serif'
    }
  }, P.nameOr), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 10.5px ' + mono,
      color: 'rgba(11,14,18,.5)'
    }
  }, P.metaFree), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      font: '700 12px Manrope,sans-serif',
      whiteSpace: 'nowrap'
    }
  }, P.r)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "md",
    icon: "phone"
  }, L.call)));
  const tabs = pro ? P.tabs || [] : [],
    tab = tabs.find(t => t.id === tab0) ? tab0 : 'res',
    cur = tabs.find(t => t.id === tab) || {};
  const staffAll = P.staff || [],
    photosAll = P.photos || [],
    itemsAll = P.items || [],
    fp = P.freePhotos || 6;
  const photos = (pro ? photosAll : photosAll.slice(0, fp)).slice(0, 6),
    staff = pro ? staffAll : staffAll.slice(0, 1),
    items = pro ? itemsAll : itemsAll.slice(0, 5);
  const hours = (P.hours || []).map(h => ({
      ...h,
      h: pro ? h.hp : h.hf
    })),
    oc = P.oc || {},
    tc = P.tc || {};
  const Row = (x, i) => /*#__PURE__*/React.createElement(__ds_scope.ServiceRow, {
    key: i,
    name: x.name,
    meta: x.meta,
    price: x.price
  });
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Vista previa \xB7 p\xE1gina del negocio",
    style: {
      background: 'var(--tl-white)',
      fontFamily: 'Manrope,sans-serif',
      color: 'var(--tl-ink)',
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 190,
      ...bgc(P.cover, 'var(--tl-photo-bg-2)'),
      display: 'grid',
      placeItems: 'center'
    }
  }, P.noCover ? /*#__PURE__*/React.createElement("span", {
    style: COVER
  }, L.coverHere) : null, pro && photosAll.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 14,
      bottom: 38,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '7px 11px',
      borderRadius: 10,
      background: 'rgba(11,14,18,.72)',
      color: 'var(--tl-white)',
      font: '700 10px ' + mono,
      letterSpacing: '.1em'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "image",
    size: 13,
    color: "var(--tl-white)"
  }), photosAll.length + (es ? ' FOTOS' : ' PHOTOS')) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--tl-white)',
      marginTop: -26,
      borderRadius: '26px 26px 0 0',
      padding: '20px 18px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 62,
      height: 62,
      borderRadius: 18,
      flex: 'none',
      ...bgc(P.logoBg, P.logoC),
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 19px/1 Sora,sans-serif',
      border: '1px solid rgba(11,14,18,.08)',
      boxSizing: 'border-box'
    }
  }, P.logoTxt), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 22px/1.1 Sora,sans-serif',
      letterSpacing: '-.04em',
      textWrap: 'balance'
    }
  }, P.nameOr), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 12.5px/1.3 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, P.subsLine))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      border: '1px solid rgba(11,14,18,.08)',
      borderRadius: 17
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: CELL
  }, /*#__PURE__*/React.createElement("div", {
    style: BIG
  }, P.s1), /*#__PURE__*/React.createElement("div", {
    style: SUB
  }, P.s1Sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...CELL,
      borderLeft: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      ...BIG,
      color: P.stColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: P.stDot,
      flex: 'none'
    }
  }), P.stLabel), /*#__PURE__*/React.createElement("div", {
    style: SUB
  }, P.stNote)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...CELL,
      borderLeft: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: BIG
  }, P.dist), /*#__PURE__*/React.createElement("div", {
    style: SUB
  }, P.city))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: 'flex',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    icon: pro ? P.ctaIc : 'phone'
  }, pro ? P.cta : L.call)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "heart"
  }), pro ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "phone"
  }) : null, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "share"
  })), P.hasLine ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: '12px 14px',
      borderRadius: 14,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 17,
    color: "var(--tl-signal)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px/1.45 Manrope,sans-serif'
    }
  }, P.line)) : null), pro ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderBottom: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tabs, {
    items: tabs,
    active: tab,
    onChange: setTab
  })) : null, tab === 'res' ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22,
      marginTop: 18
    }
  }, P.hasOwner ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.OwnerCard, {
    name: oc.name,
    role: oc.role,
    nick: oc.nick,
    about: oc.about,
    team: pro ? staffAll.map(p => p.name) : [],
    teamLabel: oc.teamLabel,
    trust: P.trust || []
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TodayCard, {
    eyebrow: tc.eyebrow,
    title: tc.title,
    dot: tc.dot,
    sub: tc.sub,
    cols: tc.cols || []
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, P.itemsT), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, items.map(Row)), !pro && itemsAll.length > 5 ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      font: '600 10px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)'
    }
  }, L.freeCap) : null), photos.length ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, L.photos), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 6
    }
  }, photos.map((bg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      aspectRatio: '1',
      borderRadius: 12,
      ...bgc(bg, 'var(--tl-photo-bg)')
    }
  })))) : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, L.hours), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      border: '1px solid rgba(11,14,18,.08)',
      borderRadius: 17,
      padding: '4px 14px'
    }
  }, hours.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      padding: '9px 0',
      borderBottom: '1px solid rgba(11,14,18,.06)',
      font: (h.fw || 600) + ' 12.5px Manrope,sans-serif',
      color: h.fg
    }
  }, /*#__PURE__*/React.createElement("span", null, h.d), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, h.h)))), pro && (P.sched || []).length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, P.sched.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderRadius: 13,
      background: 'rgba(255,176,32,.12)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: "ink"
  }, L.holi), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '600 12px/1.35 Manrope,sans-serif'
    }
  }, x.l), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11.5px Manrope,sans-serif',
      color: 'var(--tl-pro-ink)'
    }
  }, x.v)))) : null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, L.map), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      position: 'relative',
      height: 130,
      borderRadius: 17,
      background: 'var(--tl-mint-soft)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'repeating-linear-gradient(0deg,rgba(11,14,18,.055) 0 1px,transparent 1px 52px),repeating-linear-gradient(90deg,rgba(11,14,18,.055) 0 1px,transparent 1px 52px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -24,
      right: -24,
      top: 50,
      height: 12,
      background: 'var(--tl-paper-2)',
      transform: 'rotate(-6deg)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -30,
      bottom: -30,
      left: 96,
      width: 10,
      background: 'var(--tl-paper-2)',
      transform: 'rotate(13deg)'
    }
  }), P.isZone ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: P.zoneD,
      height: P.zoneD,
      transform: 'translate(-50%,-50%)',
      borderRadius: 999,
      background: 'rgba(75,55,245,.1)',
      border: '1.5px solid rgba(75,55,245,.45)'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-60%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 12,
      background: 'var(--tl-action)',
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 12px/1 Sora,sans-serif',
      boxShadow: '0 8px 18px -8px rgba(75,55,245,.7)'
    }
  }, P.logoIni), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 2.5,
      height: 9,
      background: 'var(--tl-action)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      font: '700 13.5px Manrope,sans-serif'
    }
  }, P.addr), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 10px ' + mono,
      letterSpacing: '.04em',
      color: 'rgba(11,14,18,.45)'
    }
  }, P.addrMeta), P.hasAmen ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: '2px 14px'
    }
  }, (P.amen || []).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '7px 0'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: a.icon,
    size: 16,
    color: "var(--tl-action)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.72)'
    }
  }, a.l)))) : null), !pro && P.hasAbout ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, L.about), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 9,
      font: '500 13.5px/1.62 Manrope,sans-serif',
      color: 'rgba(11,14,18,.75)'
    }
  }, P.about)) : null, !pro && staff.length ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: H2
  }, L.team), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, staff.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 13,
      ...bgc(p.bg, 'var(--tl-photo-bg)'),
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '700 13.5px Manrope,sans-serif'
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)'
    }
  }, p.role)))))) : null) : null, pro && cur.kind === 'items' ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...H2,
      marginBottom: 4
    }
  }, cur.label), items.map(Row)) : null, pro && cur.kind === 'staff' ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 18px 0',
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: 10
    }
  }, staff.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: '1px solid rgba(11,14,18,.08)',
      borderRadius: 17,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '1',
      ...bgc(p.bg, 'var(--tl-photo-bg)'),
      display: 'grid',
      placeItems: 'center',
      font: '800 22px/1 Sora,sans-serif',
      color: 'rgba(11,14,18,.35)'
    }
  }, p.ini), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 11px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 13.5px Manrope,sans-serif'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)'
    }
  }, p.role))))) : null);
}
Object.assign(__ds_scope, { PlanSwitch, BusinessPreview });
