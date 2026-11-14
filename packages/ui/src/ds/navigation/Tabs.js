"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/navigation/Tabs.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


/* variant mono = pestañas de ficha (mono 800 12, subrayado ink). variant title = pestañas de módulo (Comunidad, 29 oct): ícono 17 + Sora 15, activa 800 ink con línea Action 2.5, las otras 700 .5. */
function Tabs({
  items = [],
  active,
  onChange,
  sticky,
  variant = 'mono',
  style
}) {
  const T = variant === 'title';
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
    role: "tablist",
    style: {
      display: 'flex',
      gap: T ? 22 : 2,
      overflowX: 'auto',
      padding: T ? '10px 20px 0' : '0 12px',
      scrollbarWidth: 'none'
    }
  }, items.map(t => {
    const on = t.id === active,
      fg = T ? on ? 'var(--tl-ink)' : 'rgba(11,14,18,.5)' : on ? 'var(--tl-ink)' : 'rgba(11,14,18,.42)';
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(t.id),
      ...__ds_scope.__key(() => onChange && onChange(t.id)),
      style: T ? {
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 0 12px',
        marginBottom: -1,
        font: (on ? 800 : 700) + ' 15px/1 Sora,sans-serif',
        letterSpacing: '-.02em',
        color: fg,
        borderBottom: '2.5px solid ' + (on ? 'var(--tl-action)' : 'transparent'),
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      } : {
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '13px 9px 11px',
        font: "800 12px 'JetBrains Mono',monospace",
        letterSpacing: '.06em',
        color: fg,
        borderBottom: '2.5px solid ' + (on ? 'var(--tl-ink)' : 'transparent'),
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: T ? 17 : 15,
      strokeWidth: 2,
      color: fg
    }) : null, /*#__PURE__*/React.createElement("span", null, t.label));
  })));
}
Object.assign(__ds_scope, { Tabs });
