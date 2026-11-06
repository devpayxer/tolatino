"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/Chip.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const V = {
  filter: {
    background: 'var(--tl-white)',
    border: '1px solid rgba(11,14,18,.12)',
    color: 'var(--tl-ink)',
    font: '600 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  selected: {
    background: 'var(--tl-ink)',
    border: '1px solid var(--tl-ink)',
    color: 'var(--tl-white)',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  verified: {
    background: 'rgba(0,229,196,.14)',
    border: '1px solid rgba(0,168,143,.3)',
    color: 'var(--tl-open-text)',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px'
  },
  pro: {
    background: 'var(--tl-ink)',
    border: '1px solid var(--tl-ink)',
    color: 'var(--tl-pro)',
    font: '700 12.5px Manrope,sans-serif',
    borderRadius: 999,
    padding: '8px 14px',
    letterSpacing: '.04em'
  },
  feature: {
    background: 'rgba(11,14,18,.05)',
    border: 'none',
    color: 'rgba(11,14,18,.7)',
    font: '600 11.5px Manrope,sans-serif',
    borderRadius: 8,
    padding: '6px 11px'
  },
  slot: {
    background: 'rgba(0,229,196,.16)',
    border: 'none',
    color: 'var(--tl-open-text)',
    font: '700 11.5px Manrope,sans-serif',
    borderRadius: 8,
    padding: '6px 11px'
  }
};
function Chip({
  variant = 'filter',
  onClick,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    ...(onClick ? { role: 'button', tabIndex: 0, 'aria-pressed': variant === 'selected' ? true : undefined, onKeyDown: e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClick(e); } } } : {}),
    style: {
      ...V[variant],
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      flex: 'none',
      ...style
    }
  }, variant === 'verified' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: 'var(--tl-open)'
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Chip });
