"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/layout/SiteHeader.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const mono = "'JetBrains Mono',monospace";
const Logo = ({
  size,
  font,
  base
}) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
  src: base + 'logo-tolatino.svg',
  alt: "To'Latino",
  style: {
    width: size,
    height: size,
    display: 'block',
    flex: 'none'
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    font: '800 ' + font + 'px/1 Sora,sans-serif',
    letterSpacing: '-.04em',
    color: 'var(--tl-ink)'
  }
}, "To", /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--tl-brand)'
  }
}, "\u2019"), "Latino"));
const stop = f => e => {
  if (e && e.stopPropagation) e.stopPropagation();
  f && f();
};
function Bell({
  unread,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      position: 'relative',
      width: 40,
      height: 40,
      borderRadius: 13,
      border: '1px solid rgba(11,14,18,.1)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 18
  }), unread ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 99,
      background: 'var(--tl-mod-events)',
      border: '1.5px solid var(--tl-white)'
    }
  }) : null);
}
function Avatar({
  initials,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      width: 40,
      height: 40,
      borderRadius: 99,
      background: 'rgba(75,55,245,.12)',
      color: 'var(--tl-action)',
      display: 'grid',
      placeItems: 'center',
      font: '800 12px ' + mono,
      flex: 'none',
      cursor: 'pointer'
    }
  }, initials);
}
function Lang({
  lang,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      padding: '8px 10px',
      borderRadius: 11,
      border: '1px solid rgba(11,14,18,.12)',
      font: '700 11px ' + mono,
      cursor: 'pointer',
      flex: 'none'
    }
  }, lang);
}
function SiteHeader({
  variant = 'mobile',
  city = 'Hazleton, PA',
  cityShort = 'Hazleton',
  radius = '5 mi',
  lang = 'ES',
  member,
  initials,
  unread,
  searchPlaceholder,
  loginLabel = 'Entrar',
  publishLabel = 'Publicar mi negocio',
  showPublish = true,
  tabs = [],
  activeTab,
  onTab,
  onHome,
  onSearch,
  onCity,
  onLang,
  onBell,
  onLogin,
  onAvatar,
  onPublish,
  assetBase = 'assets/',
  sticky,
  compact,
  style
}) {
  const auth = member ? /*#__PURE__*/React.createElement(Avatar, {
    initials: initials,
    onClick: onAvatar
  }) : null;
  if (variant === 'mobile') return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--tl-white)',
      borderBottom: '1px solid rgba(11,14,18,.07)',
      padding: compact ? '6px 16px 10px' : '6px 20px 14px',
      ...(sticky ? {
        position: 'sticky',
        top: 0,
        zIndex: 20
      } : {}),
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onHome,
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 28,
    font: 23,
    base: assetBase
  })), /*#__PURE__*/React.createElement(Lang, {
    lang: lang,
    onClick: onLang
  }), /*#__PURE__*/React.createElement(Bell, {
    unread: unread,
    onClick: onBell
  }), auth || /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onLogin
  }, loginLabel)), compact ? null : /*#__PURE__*/React.createElement("div", {
    onClick: onSearch,
    style: {
      marginTop: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 14px',
      borderRadius: 16,
      background: 'var(--tl-paper)',
      border: '1px solid rgba(11,14,18,.08)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18,
    color: "rgba(11,14,18,.4)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '500 14px Manrope,sans-serif',
      color: 'rgba(11,14,18,.42)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, searchPlaceholder || 'Buscar en ' + cityShort), /*#__PURE__*/React.createElement("span", {
    onClick: stop(onCity),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 9px',
      borderRadius: 9,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      font: '700 10.5px ' + mono,
      color: 'var(--tl-action)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pin",
    size: 13,
    color: "var(--tl-action)"
  }), radius.toUpperCase())));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--tl-white)',
      borderBottom: '1px solid rgba(11,14,18,.08)',
      ...(sticky ? {
        position: 'sticky',
        top: 0,
        zIndex: 20
      } : {}),
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 76,
      padding: '0 30px',
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onHome,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 30,
    font: 23,
    base: assetBase
  })), /*#__PURE__*/React.createElement("div", {
    onClick: onSearch,
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 14px 12px 16px',
      borderRadius: 16,
      background: 'var(--tl-paper)',
      border: '1px solid rgba(11,14,18,.08)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18,
    color: "rgba(11,14,18,.4)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      font: '500 14px Manrope,sans-serif',
      color: 'rgba(11,14,18,.42)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, searchPlaceholder || 'Buscar negocios, eventos y más en ' + cityShort), /*#__PURE__*/React.createElement("span", {
    onClick: stop(onCity),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 11px',
      borderRadius: 10,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      font: '700 12.5px Manrope,sans-serif',
      flex: 'none',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pin",
    size: 15,
    color: "var(--tl-action)"
  }), city, " \xB7 ", radius, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 13,
    strokeWidth: 2
  }))), /*#__PURE__*/React.createElement(Lang, {
    lang: lang,
    onClick: onLang
  }), /*#__PURE__*/React.createElement(Bell, {
    unread: unread,
    onClick: onBell
  }), auth || /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "md",
    onClick: onLogin
  }, loginLabel), showPublish ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "md",
    onClick: onPublish
  }, publishLabel) : null), tabs.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 30px',
      display: 'flex',
      gap: 28,
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, tabs.map(t => {
    const on = t.id === activeTab;
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      onClick: () => onTab && onTab(t.id),
      style: {
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 0 13px',
        font: '800 12.5px ' + mono,
        letterSpacing: '.08em',
        color: on ? 'var(--tl-ink)' : 'rgba(11,14,18,.42)',
        borderBottom: '2.5px solid ' + (on ? 'var(--tl-ink)' : 'transparent'),
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 16,
      strokeWidth: 1.9
    }) : null, t.label);
  })) : null);
}
Object.assign(__ds_scope, { SiteHeader });
