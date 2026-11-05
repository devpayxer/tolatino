"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/navigation/BottomNav.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const NAV_HOME = [{
  id: 'home',
  label: 'INICIO',
  icon: 'home'
}, {
  id: 'community',
  label: 'COMUNIDAD',
  icon: 'users'
}, {
  id: 'explore',
  label: 'EXPLORAR',
  icon: 'search'
}, {
  id: 'events',
  label: 'EVENTOS',
  icon: 'ticket'
}, {
  id: 'me',
  label: 'YO',
  icon: 'wallet'
}];
function BottomNav({
  items = NAV_HOME,
  active = 'home',
  accent = 'var(--tl-ink)',
  highlight,
  onChange,
  translucent = true,
  homeIndicator = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: translucent ? 'rgba(255,255,255,.86)' : 'var(--tl-white)',
      backdropFilter: translucent ? 'blur(14px)' : 'none',
      borderTop: '1px solid rgba(11,14,18,.07)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px 8px',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, items.map(it => {
    const c = it.id === active || it.id === highlight ? accent : 'rgba(11,14,18,.34)';
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      onClick: () => onChange && onChange(it.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: '6px 0',
        color: c,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 19
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "700 9.5px 'JetBrains Mono',monospace",
        letterSpacing: '.04em'
      }
    }, it.label));
  })), homeIndicator ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 0 9px',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 126,
      height: 5,
      borderRadius: 9,
      background: 'rgba(11,14,18,.22)'
    }
  })) : null);
}
Object.assign(__ds_scope, { NAV_HOME, BottomNav });
