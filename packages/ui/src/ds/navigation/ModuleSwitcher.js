"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/navigation/ModuleSwitcher.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function ModuleSwitcher({
  modules = ['community', 'business', 'events', 'rides', 'homes'],
  active,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      padding: '0 20px 14px',
      background: 'var(--tl-ink)',
      ...style
    }
  }, modules.map(k => {
    const m = __ds_scope.MODULES[k],
      on = k === active;
    return /*#__PURE__*/React.createElement("span", {
      key: k,
      onClick: () => onChange && onChange(k),
      ...__ds_scope.__btn(() => onChange && onChange(k), undefined, { 'aria-current': on ? 'page' : undefined }),
      style: {
        flex: 'none',
        padding: '9px 14px',
        borderRadius: 12,
        background: on ? m.hue : 'rgba(255,255,255,.08)',
        color: on ? 'var(--tl-white)' : 'rgba(255,255,255,.65)',
        font: '700 12px Manrope,sans-serif',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        cursor: 'pointer'
      }
    }, on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: m.icon,
      size: 16
    }) : null, m.label);
  }));
}
Object.assign(__ds_scope, { ModuleSwitcher });
