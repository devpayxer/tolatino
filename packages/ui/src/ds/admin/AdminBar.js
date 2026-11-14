"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/admin/AdminBar.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Super Admin (patrones aprobados 2aj–2aq). Sacados de To'Latino Super Admin.dc.html tal como se ven. */
const INK = 'var(--tl-ink)',
  ACC = 'var(--tl-action)',
  OK = 'var(--tl-open-text)',
  WARN = 'var(--tl-pro-ink)',
  BAD = 'var(--tl-danger)';
const mono = "'JetBrains Mono',monospace";
const ell = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};
const KEY = {
  font: '700 9.5px ' + mono,
  letterSpacing: '.14em',
  color: 'rgba(11,14,18,.5)'
};
const px = v => typeof v === 'number' ? v + 'px' : v;
const has = v => v !== undefined && v !== null && v !== '' && v !== false;
const bgImg = s => !s || s === 'none' ? {} : {
  backgroundImage: /^url\(/.test(s) ? s : 'url(' + s + ')',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
};
const NOTE = {
  warn: ['var(--tl-ds-fff4d6)', WARN],
  bad: ['var(--tl-ds-fde8e6)', BAD],
  ok: ['var(--tl-ds-e3f4f1)', OK],
  info: ['var(--tl-ds-eeebff)', ACC],
  ink: [INK, 'var(--tl-white)']
};

/* Aviso del admin: warn · bad · ok · info · ink, con acción a la derecha. */
function AdminNote({
  tone = 'info',
  icon,
  children,
  cta,
  onCta
}) {
  const [bg, fg] = NOTE[tone] || NOTE.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '13px 14px',
      borderRadius: 16,
      background: bg,
      color: fg,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || (tone === 'bad' ? 'warning' : tone === 'ok' ? 'check' : 'info'),
    size: 18,
    color: fg
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '600 13px/1.45 Manrope,sans-serif',
      textWrap: 'pretty'
    }
  }, children), has(cta) ? /*#__PURE__*/React.createElement("span", {
    onClick: onCta,
    ...__ds_scope.__btn(onCta, undefined, undefined),
    style: {
      font: '800 12.5px Manrope,sans-serif',
      color: fg,
      cursor: 'pointer',
      flex: 'none'
    }
  }, cta) : null);
}

/* 2ap · Barra del admin: logo + ADMIN, buscador ⌘K, ciudad (Hazleton · Todas), campana con las colas y la cuenta del equipo con su rol. */
function AdminBar({
  desk = true,
  assetBase = 'assets/',
  onHome,
  searchPlaceholder = 'Buscar negocio, usuario, # de operación…',
  shortcut = '⌘K',
  onSearch,
  cities = [],
  count = 0,
  onBell,
  me = {},
  onMe,
  badge = 'ADMIN',
  meLabel = typeof lang !== 'undefined' && lang === 'EN' ? "My account" : "Mi cuenta",
  bellLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Notifications" : "Notificaciones",
  searchLabel = typeof lang !== 'undefined' && lang === 'EN' ? "Search" : "Buscar"
}) {
  const logo = desk ? 30 : 28,
    segH = desk ? 28 : 26,
    btn = desk ? 38 : 36;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--tl-white)',
      borderBottom: '1px solid rgba(11,14,18,.07)',
      padding: desk ? '10px 24px' : '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onHome,
    ...__ds_scope.__btn(onHome, undefined, undefined),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      cursor: onHome ? 'pointer' : 'default',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: assetBase + 'logo-tolatino.svg',
    alt: "To'Latino",
    style: {
      width: logo,
      height: logo,
      display: 'block',
      flex: 'none'
    }
  }), desk ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 18px/1 Sora,sans-serif',
      letterSpacing: '-.04em'
    }
  }, "To'Latino") : null, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 7px',
      borderRadius: 6,
      background: INK,
      color: 'var(--tl-white)',
      font: '800 9px/1 ' + mono,
      letterSpacing: '.14em'
    }
  }, badge)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center'
    }
  }, desk ? /*#__PURE__*/React.createElement("div", {
    onClick: onSearch,
    ...__ds_scope.__btn(onSearch, undefined, undefined),
    style: {
      flex: 1,
      minWidth: 0,
      maxWidth: 520,
      height: 40,
      padding: '0 12px 0 14px',
      borderRadius: 13,
      background: 'var(--tl-paper)',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      cursor: 'pointer',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 17,
    color: "rgba(11,14,18,.45)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '500 13.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.45)',
      ...ell
    }
  }, searchPlaceholder), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.08em',
      color: 'rgba(11,14,18,.4)'
    }
  }, shortcut)) : null), cities.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 3,
      padding: 3,
      borderRadius: 10,
      background: 'rgba(11,14,18,.06)',
      flex: 'none'
    }
  }, cities.map((o, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    onClick: o.onClick,
    ...__ds_scope.__btn(o.onClick, undefined, undefined),
    style: {
      height: segH,
      padding: '0 10px',
      borderRadius: 8,
      background: o.on ? INK : 'transparent',
      color: o.on ? 'var(--tl-white)' : INK,
      display: 'grid',
      placeItems: 'center',
      font: '700 11px Manrope,sans-serif',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, o.label))) : null, !desk ? /*#__PURE__*/React.createElement("span", {
    onClick: onSearch,
    ...__ds_scope.__btn(onSearch, searchLabel, undefined),
    style: {
      width: 36,
      height: 36,
      borderRadius: 11,
      background: 'rgba(11,14,18,.05)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 17
  })) : null, /*#__PURE__*/React.createElement("span", {
    onClick: onBell,
    ...__ds_scope.__btn(onBell, bellLabel, undefined),
    style: {
      position: 'relative',
      width: btn,
      height: btn,
      borderRadius: 11,
      background: 'rgba(11,14,18,.05)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 17
  }), +count > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      boxSizing: 'border-box',
      borderRadius: 99,
      background: ACC,
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 9.5px ' + mono,
      border: '2px solid var(--tl-white)'
    }
  }, count) : null), /*#__PURE__*/React.createElement("span", {
    onClick: onMe,
    ...__ds_scope.__btn(onMe, meLabel, undefined),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: 3,
      paddingRight: desk ? 10 : 3,
      borderRadius: 12,
      border: '1px solid rgba(11,14,18,.1)',
      cursor: onMe ? 'pointer' : 'default',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 9,
      ...bgImg(me.image),
      backgroundColor: INK,
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 11px Sora,sans-serif'
    }
  }, me.image ? null : me.initials), desk ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px/1 Manrope,sans-serif',
      whiteSpace: 'nowrap'
    }
  }, me.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 8.5px/1 ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.5)'
    }
  }, me.role)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 13,
    color: "rgba(11,14,18,.45)"
  })) : null));
}

/* 2ap · Barra lateral: «Tomar siguiente» y grupos de secciones con contador (rojo si hay vencidos) y candado sin permiso. */
function AdminNav({
  takeNextLabel = 'Tomar siguiente',
  onTakeNext,
  groups = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, onTakeNext ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    block: true,
    size: "md",
    icon: "check",
    onClick: onTakeNext
  }, takeNextLabel)) : null, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '6px 10px',
      font: '700 9px ' + mono,
      letterSpacing: '.16em',
      color: 'rgba(11,14,18,.45)'
    }
  }, g.label), (g.items || []).map((n, i) => {
    const fg = n.on ? INK : n.lock ? 'rgba(11,14,18,.45)' : 'rgba(11,14,18,.75)';
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      onClick: n.onClick,
      ...__ds_scope.__btn(n.onClick, undefined, undefined),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 11,
        background: n.on ? 'var(--tl-white)' : 'transparent',
        cursor: 'pointer',
        opacity: n.dim ? .7 : 1
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: n.icon,
      size: 16,
      color: fg
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        font: (n.on ? 800 : 600) + ' 13px Manrope,sans-serif',
        color: fg,
        ...ell
      }
    }, n.label), +n.count > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        boxSizing: 'border-box',
        borderRadius: 99,
        background: n.late ? BAD : ACC,
        color: 'var(--tl-white)',
        display: 'grid',
        placeItems: 'center',
        font: '800 9.5px ' + mono
      }
    }, n.count) : null, n.lock ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "lock",
      size: 13,
      color: "rgba(11,14,18,.4)"
    }) : null);
  }))));
}

/* 2aj · Tabla densa (desktop): encabezado mono, filas con foto, texto y subtexto, estado con Tag, números a la derecha y paginación ← →. */
function Cell({
  c
}) {
  const al = c.align || 'left',
    box = !!c.image || c.initials != null && c.initials !== '';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      justifyContent: al === 'right' ? 'flex-end' : al === 'center' ? 'center' : 'flex-start'
    }
  }, box ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 9,
      ...bgImg(c.image),
      backgroundColor: 'var(--tl-photo-bg)',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      font: '800 11px/1 Sora,sans-serif',
      color: 'rgba(11,14,18,.45)'
    }
  }, c.image ? '' : c.initials) : null, has(c.dot) ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: c.dot,
      flex: 'none'
    }
  }) : null, has(c.tag) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: c.tone || 'neutral'
  }, c.tag) : null, c.text != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      textAlign: al
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: (c.bold ? 700 : 600) + ' 13px Manrope,sans-serif',
      color: c.color || INK,
      ...ell
    }
  }, c.text), has(c.sub) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11.5px/1.3 Manrope,sans-serif',
      color: 'rgba(11,14,18,.55)',
      ...ell
    }
  }, c.sub) : null) : null);
}
function Pager({
  label,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true
}) {
  const b = (on, f, t) => /*#__PURE__*/React.createElement("span", {
    onClick: on ? f : undefined,
    ...__ds_scope.__btn(on ? f : undefined, undefined, undefined),
    style: {
      height: 32,
      padding: '0 12px',
      borderRadius: 10,
      border: '1px solid rgba(11,14,18,.1)',
      background: 'var(--tl-white)',
      display: 'flex',
      alignItems: 'center',
      font: '700 12px Manrope,sans-serif',
      cursor: on ? 'pointer' : 'default',
      opacity: on ? 1 : .35
    }
  }, t);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '0 2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, b(hasPrev, onPrev, '←'), b(hasNext, onNext, '→')));
}
function DenseTable({
  columns,
  head = [],
  rows = [],
  page
}) {
  const cols = columns || 'repeat(' + Math.max(1, head.length) + ',minmax(0,1fr))';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, head.length || rows.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 17,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      overflow: 'hidden'
    }
  }, head.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 12,
      padding: '10px 14px',
      borderBottom: '1px solid rgba(11,14,18,.08)',
      background: 'var(--tl-paper)'
    }
  }, head.map((h, i) => {
    const o = typeof h === 'string' ? {
      label: h
    } : h;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        minWidth: 0,
        font: '700 9px ' + mono,
        letterSpacing: '.12em',
        color: 'rgba(11,14,18,.5)',
        textAlign: o.align || 'left',
        ...ell
      }
    }, o.label);
  })) : null, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.key || i,
    onClick: r.onClick,
    ...__ds_scope.__btn(r.onClick, undefined, undefined),
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 12,
      alignItems: 'center',
      padding: '10px 14px',
      borderBottom: '1px solid rgba(11,14,18,.06)',
      background: r.active ? 'var(--tl-ds-eeebff)' : r.bg || 'var(--tl-white)',
      cursor: r.onClick ? 'pointer' : 'default',
      opacity: r.opacity != null ? r.opacity : 1
    }
  }, (r.cells || []).map((c, j) => /*#__PURE__*/React.createElement(Cell, {
    key: j,
    c: c || {}
  }))))) : null, page ? /*#__PURE__*/React.createElement(Pager, page) : null);
}

/* 2aj en móvil · la tabla se vuelve filas: foto o ícono, título, sub, meta mono, Tag, número a la derecha, interruptor, › y acciones. */
function AdminRow({
  image,
  initials,
  imageSize = 44,
  imageRadius = 13,
  icon,
  iconBg = 'rgba(75,55,245,.1)',
  iconColor = ACC,
  title,
  titleColor = INK,
  sub,
  meta,
  metaColor = 'rgba(11,14,18,.5)',
  tag,
  tone = 'neutral',
  right,
  right2,
  toggle,
  onToggle,
  chevron,
  actions,
  onClick,
  bg = 'var(--tl-white)',
  border = '1px solid rgba(11,14,18,.08)',
  padding = '12px 14px',
  radius = 16,
  opacity = 1
}) {
  const box = !!image || initials != null,
    S = px(imageSize);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      padding,
      borderRadius: px(radius),
      background: bg,
      border,
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      opacity
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined, toggle != null),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: onClick ? 'pointer' : 'default'
    }
  }, box ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: S,
      height: S,
      borderRadius: px(imageRadius),
      ...bgImg(image),
      backgroundColor: 'var(--tl-photo-bg)',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      font: '800 14px/1 Sora,sans-serif',
      color: 'rgba(11,14,18,.45)'
    }
  }, image ? '' : initials) : icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: iconBg,
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: iconColor
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '700 14px/1.3 Manrope,sans-serif',
      color: titleColor
    }
  }, /*#__PURE__*/React.createElement("span", {
    ...(toggle != null ? __ds_scope.__btn(onClick) : {})
  }, title)), has(sub) ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 3,
      font: '500 12.5px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, sub) : null, has(meta) ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: metaColor
    }
  }, meta) : null), has(tag) ? /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: tone
  }, tag) : null, has(right) ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      textAlign: 'right',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 15px/1 Sora,sans-serif'
    }
  }, right), has(right2) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.45)'
    }
  }, right2) : null) : null, toggle != null ? /*#__PURE__*/React.createElement("span", {
    onClick: onToggle,
    ...__ds_scope.__btn(onToggle, title, { role: 'switch', 'aria-checked': !!toggle }),
    style: {
      width: 42,
      height: 24,
      borderRadius: 99,
      background: toggle ? ACC : 'rgba(11,14,18,.2)',
      position: 'relative',
      flex: 'none',
      cursor: 'pointer',
      transition: 'background .2s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: 3,
      width: 18,
      height: 18,
      borderRadius: 99,
      background: 'var(--tl-white)',
      transform: 'translateX(' + (toggle ? 18 : 0) + 'px)',
      transition: 'transform .2s'
    }
  })) : null, chevron ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 15,
    color: "rgba(11,14,18,.35)"
  }) : null), actions && actions.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 7
    }
  }, actions.map((a, i) => /*#__PURE__*/React.createElement(__ds_scope.Button, {
    key: i,
    variant: a.variant || 'ghost',
    size: "sm",
    icon: a.icon,
    disabled: a.disabled,
    onClick: a.onClick
  }, a.label))) : null);
}
function AdminList({
  label,
  link,
  onLink,
  columns = 'minmax(0,1fr)',
  gap = 8,
  rows = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, has(label) ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: KEY
  }, label), has(link) ? /*#__PURE__*/React.createElement("span", {
    onClick: onLink,
    ...__ds_scope.__btn(onLink, undefined, undefined),
    style: {
      font: '700 12px Manrope,sans-serif',
      color: ACC,
      cursor: 'pointer'
    }
  }, link) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: columns,
      gap: px(gap)
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(AdminRow, _extends({
    key: r.key || i
  }, r)))));
}

/* 2ak · Tarjeta de cola con SLA: ícono de la cola, qué es y de quién, ALTA, tiempo esperando con color según el plazo y quién la tiene. */
const SLA = {
  ok: ['rgba(75,55,245,.1)', ACC, 'rgba(11,14,18,.06)', 'rgba(11,14,18,.6)'],
  soon: ['var(--tl-ds-fff4d6)', WARN, 'var(--tl-ds-fff4d6)', WARN],
  late: ['rgba(192,57,43,.1)', BAD, 'rgba(192,57,43,.1)', BAD],
  done: ['rgba(75,55,245,.1)', ACC, 'rgba(0,168,143,.12)', OK]
};
function QueueCard({
  icon = 'bell',
  state = 'ok',
  title,
  sub,
  meta,
  priority,
  who,
  sla,
  assignee,
  wide,
  columns,
  active,
  onClick
}) {
  const [ibg, ifg, sbg, sfg] = SLA[state] || SLA.ok;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      flexShrink: 0,
      padding: '12px 14px',
      borderRadius: 16,
      background: active ? 'var(--tl-ds-eeebff)' : 'var(--tl-white)',
      border: active ? '1px solid rgba(75,55,245,.4)' : '1px solid rgba(11,14,18,.08)',
      display: 'grid',
      gridTemplateColumns: columns || (wide ? '40px minmax(0,1.6fr) minmax(0,1fr) auto' : '40px minmax(0,1fr) auto'),
      gap: 12,
      alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: ibg,
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: ifg
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px/1.3 Manrope,sans-serif',
      ...ell
    }
  }, title), has(priority) ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      padding: '2px 6px',
      borderRadius: 5,
      background: 'rgba(192,57,43,.1)',
      color: BAD,
      font: '800 8.5px ' + mono,
      letterSpacing: '.1em'
    }
  }, priority) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12.5px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)',
      ...ell
    }
  }, sub), has(meta) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.45)',
      ...ell
    }
  }, meta) : null), wide ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, who ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 8,
      ...bgImg(who.image),
      backgroundColor: 'var(--tl-photo-bg)',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      font: '800 10px/1 Sora,sans-serif',
      color: 'rgba(11,14,18,.45)'
    }
  }, who.image ? '' : who.initials), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px Manrope,sans-serif',
      ...ell
    }
  }, who.name)) : null) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 5,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 8px',
      borderRadius: 7,
      background: sbg,
      color: sfg,
      font: '800 9.5px ' + mono,
      letterSpacing: '.06em',
      whiteSpace: 'nowrap'
    }
  }, sla), assignee ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 6,
      ...bgImg(assignee.image),
      backgroundColor: INK
    }
  }), assignee.name) : null));
}

/* 2al · Fila de auditoría: quién (foto), qué hizo, antes → después, el motivo y cuándo. Solo se agrega; nadie la edita. */
function AuditRow({
  who,
  initials,
  image,
  action,
  before,
  after,
  why,
  when,
  section,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      display: 'grid',
      gridTemplateColumns: '30px minmax(0,1fr) auto',
      gap: 12,
      padding: '12px 14px',
      borderBottom: '1px solid rgba(11,14,18,.06)',
      alignItems: 'start',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 9,
      ...bgImg(image),
      backgroundColor: INK,
      color: 'var(--tl-white)',
      display: 'grid',
      placeItems: 'center',
      font: '800 11px/1 Sora,sans-serif'
    }
  }, image ? '' : initials), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1.4 Manrope,sans-serif'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800
    }
  }, who), " ", action), has(before) || has(after) ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      font: '600 10px ' + mono,
      letterSpacing: '.04em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 7px',
      borderRadius: 6,
      background: 'rgba(11,14,18,.06)',
      color: 'rgba(11,14,18,.6)'
    }
  }, has(before) ? before : '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.4)'
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 7px',
      borderRadius: 6,
      background: 'rgba(75,55,245,.1)',
      color: ACC
    }
  }, has(after) ? after : '—')) : null, has(why) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, why) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 3,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 9.5px ' + mono,
      letterSpacing: '.06em',
      color: 'rgba(11,14,18,.5)',
      whiteSpace: 'nowrap'
    }
  }, when), has(section) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 8.5px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.4)'
    }
  }, section) : null));
}
function AuditLog({
  rows = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      borderRadius: 17,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      overflow: 'hidden'
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(AuditRow, _extends({
    key: r.key || i
  }, r))));
}

/* 2am · Matriz de permisos: sección × acción (ver · editar · aprobar · eliminar · exportar); casilla Action con ✓, se toca para cambiar. */
function PermMatrix({
  columns,
  head = [],
  rows = []
}) {
  const cols = columns || 'minmax(0,1.6fr) ' + head.map(() => 'minmax(0,1fr)').join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      borderRadius: 17,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 6,
      padding: '10px 14px',
      background: 'var(--tl-paper)',
      borderBottom: '1px solid rgba(11,14,18,.08)'
    }
  }, /*#__PURE__*/React.createElement("span", null), head.map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: '700 8.5px ' + mono,
      letterSpacing: '.1em',
      color: 'rgba(11,14,18,.5)',
      textAlign: 'center',
      ...ell
    }
  }, h))), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 6,
      padding: '8px 14px',
      borderBottom: '1px solid rgba(11,14,18,.06)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 12.5px Manrope,sans-serif',
      ...ell
    }
  }, r.label), (r.cells || []).map((c, j) => {
    const on = c && typeof c === 'object' ? !!c.on : !!c,
      f = c && typeof c === 'object' ? c.onClick : null;
    return /*#__PURE__*/React.createElement("span", {
      key: j,
      onClick: f || undefined,
      ...__ds_scope.__btn(f || undefined, r.label, { role: 'checkbox', 'aria-checked': !!on }),
      style: {
        height: 26,
        borderRadius: 8,
        background: on ? 'rgba(75,55,245,.12)' : 'rgba(11,14,18,.04)',
        display: 'grid',
        placeItems: 'center',
        cursor: f ? 'pointer' : 'default'
      }
    }, on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 13,
      color: ACC,
      strokeWidth: 2.6
    }) : null);
  }))));
}

/* 2an · KPI con tendencia: etiqueta mono, número y «+12 % vs período anterior»; la principal en tinta (dark). */
function KpiCard({
  label,
  value,
  sub,
  subColor,
  dark,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      minWidth: 0,
      padding: '13px 14px',
      borderRadius: 16,
      background: dark ? INK : 'var(--tl-white)',
      color: dark ? 'var(--tl-white)' : INK,
      border: dark ? 'none' : '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 8.5px ' + mono,
      letterSpacing: '.12em',
      opacity: .62,
      ...ell
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 22px/1 Sora,sans-serif',
      letterSpacing: '-.03em',
      ...ell
    }
  }, value), has(sub) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px/1.3 Manrope,sans-serif',
      color: subColor || (dark ? 'rgba(255,255,255,.7)' : 'rgba(11,14,18,.55)')
    }
  }, sub) : null);
}
function KpiRow({
  items = [],
  columns
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'grid',
      gridTemplateColumns: columns || 'repeat(' + Math.max(1, Math.min(items.length, 4)) + ',minmax(0,1fr))',
      gap: 8
    }
  }, items.map((x, i) => /*#__PURE__*/React.createElement(KpiCard, _extends({
    key: i
  }, x))));
}
/* 2an · Gráfica de barras por semana (la actual en Action) y barras horizontales por categoría. */
function BarChart({
  label,
  value,
  bars = [],
  gap = 6,
  height = 84,
  note
}) {
  const mx = Math.max(1, ...bars.map(b => +b.value || 0));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: 15,
      borderRadius: 18,
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
    style: KEY
  }, label), has(value) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 18px Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, value) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: px(gap),
      height
    }
  }, bars.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 5,
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '100%',
      height: b.height != null ? px(b.height) : Math.max(4, Math.round((+b.value || 0) / mx * (height - (has(b.label) ? 16 : 0)))),
      borderRadius: '5px 5px 2px 2px',
      background: b.color || INK
    }
  }), has(b.label) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 8.5px ' + mono,
      color: 'rgba(11,14,18,.45)'
    }
  }, b.label) : null))), has(note) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1.4 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)'
    }
  }, note) : null);
}
function HBars({
  label,
  help,
  items = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: 15,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: KEY
  }, label), has(help) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px Manrope,sans-serif',
      color: 'rgba(11,14,18,.5)'
    }
  }, help) : null), items.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,132px) minmax(0,1fr) 56px',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12.5px Manrope,sans-serif',
      ...ell
    }
  }, x.label), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 8,
      borderRadius: 9,
      background: 'rgba(11,14,18,.07)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: 8,
      width: typeof x.width === 'number' ? x.width + '%' : x.width,
      borderRadius: 9,
      background: x.color || INK
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11px ' + mono,
      textAlign: 'right'
    }
  }, x.value))));
}

/* 2ao · Confirmación con motivo: qué pasa, plantillas en chips, motivo obligatorio y botón rojo (danger) si es irreversible. El motivo lo ve la persona afectada. */
const Field = ({
  label,
  help,
  children
}) => /*#__PURE__*/React.createElement("label", {
  style: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...KEY
  }
}, /*#__PURE__*/React.createElement("span", null, label)), children, has(help) ? /*#__PURE__*/React.createElement("span", {
  style: {
    font: '500 12px/1.4 Manrope,sans-serif',
    color: 'rgba(11,14,18,.55)'
  }
}, help) : null);
const ChipGroup = ({
  label,
  items = [],
  empty
}) => !items.length && has(empty) ? /*#__PURE__*/React.createElement(AdminNote, {
  tone: "warn"
}, empty) : /*#__PURE__*/React.createElement("div", {
  style: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, has(label) ? /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    ...KEY
  }
}, /*#__PURE__*/React.createElement("span", null, label)) : null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    margin: '0 -2px',
    padding: 2
  }
}, items.map((x, i) => /*#__PURE__*/React.createElement("span", {
  key: i,
  style: {
    flex: 'none'
  }
}, /*#__PURE__*/React.createElement(__ds_scope.Chip, {
  variant: x.on ? 'selected' : 'filter',
  onClick: x.onClick
}, x.label)))));
function ReasonConfirm({
  eyebrow = 'CONFIRMAR',
  title,
  sub,
  onBack,
  desk = true,
  warning,
  amount,
  choices = [],
  templates = [],
  templatesLabel = 'PLANTILLAS',
  reasonLabel = 'MOTIVO',
  reason = '',
  onReason,
  placeholder = 'Escríbelo como se lo dirías a la persona.',
  autoFocus,
  cta = 'Confirmar',
  danger,
  disabled,
  onConfirm,
  backLabel = 'Volver'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      paddingTop: 2
    }
  }, onBack ? /*#__PURE__*/React.createElement("span", {
    onClick: onBack,
    ...__ds_scope.__btn(onBack, backLabel, undefined),
    style: {
      width: 36,
      height: 36,
      borderRadius: 12,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 17,
    strokeWidth: 2
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, has(eyebrow) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 9.5px ' + mono,
      letterSpacing: '.14em',
      color: 'rgba(11,14,18,.45)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: '800 ' + (desk ? 26 : 22) + 'px/1.12 Sora,sans-serif',
      letterSpacing: '-.035em',
      textWrap: 'balance'
    }
  }, title), has(sub) ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13.5px/1.5 Manrope,sans-serif',
      color: 'rgba(11,14,18,.6)',
      textWrap: 'pretty'
    }
  }, sub) : null)), has(warning) ? /*#__PURE__*/React.createElement(AdminNote, {
    tone: "bad"
  }, warning) : null, amount ? /*#__PURE__*/React.createElement(Field, {
    label: amount.label,
    help: amount.help
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      height: 48,
      padding: '0 15px',
      borderRadius: 14,
      border: '1.5px solid rgba(11,14,18,.14)',
      background: 'var(--tl-white)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: amount.value,
    onChange: amount.onChange,
    placeholder: amount.placeholder,
    inputMode: "decimal",
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: '700 15px Manrope,sans-serif',
      color: INK
    }
  }))) : null, choices.map((g, i) => /*#__PURE__*/React.createElement(ChipGroup, {
    key: i,
    label: g.label,
    items: g.items,
    empty: g.empty
  })), templates.length ? /*#__PURE__*/React.createElement(ChipGroup, {
    label: templatesLabel,
    items: templates
  }) : null, /*#__PURE__*/React.createElement(Field, {
    label: reasonLabel
  }, /*#__PURE__*/React.createElement("textarea", {
    value: reason,
    onChange: onReason,
    placeholder: placeholder,
    rows: 3,
    autoFocus: autoFocus,
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px 15px',
      borderRadius: 14,
      border: '1.5px solid rgba(11,14,18,.14)',
      outline: 'none',
      resize: 'none',
      background: 'var(--tl-white)',
      font: '500 14.5px/1.55 Manrope,sans-serif',
      color: INK
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: danger ? 'danger' : 'action',
    size: "md",
    icon: "check",
    disabled: disabled,
    onClick: onConfirm
  }, cta), onBack ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "md",
    onClick: onBack
  }, backLabel) : null));
}

/* 2aq · Progreso de acción en lote (solo desktop): avance N / total y, al terminar, cuántos salieron y cuáles fallaron y por qué. */
function BatchProgress({
  label = 'ACCIÓN EN LOTE',
  done = 0,
  total = 0,
  end,
  failed = 0,
  summary,
  runningLabel = 'En curso…',
  doneLabel = 'Terminado',
  onClose,
  closeLabel = 'Cerrar'
}) {
  const pct = total ? Math.round(done / total * 100) : 100;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(HBars, {
    label: label,
    help: done + ' / ' + total,
    items: [{
      label: end ? doneLabel : runningLabel,
      width: pct + '%',
      value: pct + '%',
      color: failed ? WARN : ACC
    }]
  }), end && has(summary) ? /*#__PURE__*/React.createElement(AdminNote, {
    tone: failed ? 'warn' : 'ok',
    icon: failed ? 'warning' : 'check',
    cta: onClose ? closeLabel : undefined,
    onCta: onClose
  }, summary) : null);
}
Object.assign(__ds_scope, { AdminNote, AdminBar, AdminNav, Pager, DenseTable, AdminRow, AdminList, QueueCard, AuditRow, AuditLog, PermMatrix, KpiCard, KpiRow, BarChart, HBars, ReasonConfirm, BatchProgress });
