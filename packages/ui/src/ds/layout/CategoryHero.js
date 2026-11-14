"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/layout/CategoryHero.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* Patrón aprobado 2h (Búsqueda 10a) · Portada de categoría: foto con protección oscura, volver, título, estadísticas (mono), buscador de la categoría,
   y subcategorías por secciones (11b): fila "Por país" (foto redonda + bandera) y "Qué se te antoja" (un carrusel por capítulos, nombre del capítulo fijo). Flechas ← → en desktop, swipe en móvil. size: 'desktop' (300px, título 52) | 'mobile' (236px, título 32). */
function Row({
  d,
  title,
  gap = 10,
  children
}) {
  const ref = React.useRef(null);
  const [edge, setEdge] = React.useState({
    s: true,
    e: false
  });
  const onScroll = e => {
    const el = e.currentTarget;
    const s = el.scrollLeft < 4,
      en = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (s !== edge.s || en !== edge.e) setEdge({
      s,
      e: en
    });
  };
  const go = n => () => {
    const el = ref.current;
    if (el) el.scrollBy({
      left: n * el.clientWidth * .8,
      behavior: 'smooth'
    });
  };
  const arrow = (side, icon, n) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      [side]: -12,
      top: '50%',
      transform: 'translateY(-50%)',
      borderRadius: 12,
      boxShadow: 'var(--shadow-float)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: icon,
    size: 36,
    onClick: go(n)
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: d ? 14 : 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: d ? 0 : '0 20px',
      font: `800 ${d ? 17 : 15}px Sora,sans-serif`,
      letterSpacing: '-.03em',
      color: 'var(--tl-ink)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    onScroll: onScroll,
    style: {
      display: 'flex',
      gap: d ? gap : gap ? 4 : 0,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      scrollSnapType: 'x proximity',
      padding: d ? '3px 0' : '3px 20px',
      scrollPadding: d ? 0 : '0 20px'
    }
  }, children), d && !edge.s ? arrow('left', 'chevronLeft', -1) : null, d && !edge.e ? arrow('right', 'chevronRight', 1) : null));
}
function CategoryHero({
  size = 'desktop',
  image,
  title,
  stats,
  backLabel = 'Negocios',
  placeholder,
  searchLabel = 'Buscar',
  onBack,
  onSearch,
  countries = [],
  chapters = [],
  countryTitle = 'Por país',
  chaptersTitle = 'Qué se te antoja'
}) {
  const d = size === 'desktop';
  const mono = "'JetBrains Mono',monospace";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: d ? 300 : 236,
      background: image ? `center/cover url(${image})` : 'var(--tl-photo-bg-2)',
      backgroundColor: 'var(--tl-photo-bg-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg,rgba(11,14,18,.3) 0%,rgba(11,14,18,.78) 100%)'
    }
  }), !d ? /*#__PURE__*/React.createElement("div", {
    onClick: onBack,
    ...__ds_scope.__btn(onBack, backLabel, undefined),
    style: {
      position: 'absolute',
      top: 14,
      left: 16,
      width: 38,
      height: 38,
      borderRadius: 13,
      background: 'rgba(255,255,255,.94)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 18,
    strokeWidth: 2
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: d ? 30 : 20,
      right: d ? 30 : 20,
      bottom: d ? 30 : 18,
      display: 'flex',
      flexDirection: 'column',
      gap: d ? 14 : 10,
      color: 'var(--tl-white)'
    }
  }, d ? /*#__PURE__*/React.createElement("div", {
    onClick: onBack,
    ...__ds_scope.__btn(onBack, backLabel, undefined),
    style: {
      alignSelf: 'flex-start',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: '700 13px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 16,
    color: "var(--tl-white)",
    strokeWidth: 2
  }), backLabel) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `800 ${d ? 52 : 32}px/1 Sora,sans-serif`,
      letterSpacing: d ? '-.05em' : '-.045em'
    }
  }, title), stats ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: `700 ${d ? 12 : 10.5}px ${mono}`,
      letterSpacing: '.08em'
    }
  }, stats) : null, /*#__PURE__*/React.createElement("div", {
    onClick: onSearch,
    ...__ds_scope.__btn(onSearch, undefined, undefined, d),
    style: {
      marginTop: d ? 6 : 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      maxWidth: d ? 640 : 'none',
      padding: d ? '6px 6px 6px 16px' : '11px 14px',
      borderRadius: d ? 16 : 14,
      background: 'var(--tl-white)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: d ? 18 : 17,
    color: "rgba(11,14,18,.45)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: `500 ${d ? 14.5 : 14}px Manrope,sans-serif`,
      color: 'rgba(11,14,18,.5)'
    }
  }, placeholder), d ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "md",
    onClick: onSearch
  }, searchLabel) : null))), countries.length || chapters.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--tl-white)',
      padding: d ? '22px 30px 20px' : '16px 0',
      borderBottom: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: d ? 22 : 18
    }
  }, countries.length ? /*#__PURE__*/React.createElement(Row, {
    d: d,
    title: countryTitle
  }, countries.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: t.onClick,
    ...__ds_scope.__btn(t.onClick, undefined, undefined),
    style: {
      flex: 'none',
      width: d ? 104 : 90,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: d ? 9 : 8,
      cursor: 'pointer',
      scrollSnapAlign: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: d ? 84 : 66,
      height: d ? 84 : 66
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      background: t.image ? `center/cover url(${t.image})` : 'var(--tl-photo-bg)',
      backgroundColor: 'var(--tl-photo-bg)',
      outline: t.active ? '2px solid var(--tl-ink)' : 'none',
      outlineOffset: 2
    }
  }), t.flag ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -2,
      bottom: 3,
      width: d ? 26 : 22,
      height: d ? 17 : 15,
      borderRadius: 4,
      background: `center/cover url(${t.flag})`,
      boxShadow: '0 0 0 2px var(--tl-white)'
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: `${t.active ? 800 : 700} ${d ? 12.5 : 11}px/1.2 Manrope,sans-serif`,
      color: 'var(--tl-ink)',
      textAlign: 'center'
    }
  }, t.label)))) : null, chapters.length ? /*#__PURE__*/React.createElement(Row, {
    d: d,
    title: chaptersTitle,
    gap: 0
  }, chapters.map((g, gi) => {
    const last = gi === chapters.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: gi,
      style: {
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: d ? 10 : 9,
        paddingRight: last ? 0 : 18,
        marginRight: last ? 0 : 18,
        borderRight: last ? 'none' : '1px solid rgba(11,14,18,.08)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'sticky',
        left: 0,
        alignSelf: 'flex-start',
        font: `800 ${d ? 10.5 : 10}px ${mono}`,
        letterSpacing: '.1em',
        color: 'rgba(11,14,18,.5)',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase'
      }
    }, g.label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: d ? 14 : 10
      }
    }, g.tiles.map((t, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: t.onClick,
      ...__ds_scope.__btn(t.onClick, undefined, undefined),
      style: {
        flex: 'none',
        width: d ? 112 : 84,
        display: 'flex',
        flexDirection: 'column',
        gap: d ? 8 : 7,
        cursor: 'pointer',
        scrollSnapAlign: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: d ? 80 : 62,
        borderRadius: d ? 14 : 13,
        background: t.image ? `center/cover url(${t.image})` : 'var(--tl-photo-bg)',
        backgroundColor: 'var(--tl-photo-bg)',
        outline: t.active ? '2px solid var(--tl-ink)' : 'none',
        outlineOffset: 2
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        font: `${t.active ? 800 : 700} ${d ? 12.5 : 11.5}px/1.2 Manrope,sans-serif`,
        color: 'var(--tl-ink)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, t.label)))));
  })) : null) : null);
}
Object.assign(__ds_scope, { CategoryHero });
