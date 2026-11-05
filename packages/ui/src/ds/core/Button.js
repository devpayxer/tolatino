"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/Button.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const V = {
  primary: {
    background: 'var(--tl-ink)',
    color: 'var(--tl-white)',
    border: 'none'
  },
  action: {
    background: 'var(--tl-action)',
    color: 'var(--tl-white)',
    border: 'none',
    boxShadow: '0 8px 20px -8px rgba(75,55,245,.7)'
  },
  secondary: {
    background: 'var(--tl-white)',
    color: 'var(--tl-ink)',
    border: '1.5px solid rgba(11,14,18,.14)'
  },
  soft: {
    background: 'rgba(75,55,245,.09)',
    color: 'var(--tl-action)',
    border: 'none'
  },
  danger: {
    background: 'var(--tl-danger)',
    color: 'var(--tl-white)',
    border: 'none'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--tl-ink)',
    border: 'none'
  },
  disabled: {
    background: 'rgba(11,14,18,.05)',
    color: 'rgba(11,14,18,.35)',
    border: 'none'
  }
};
const S = {
  lg: {
    height: 50,
    padding: '0 22px',
    borderRadius: 15,
    font: '700 14.5px Manrope,sans-serif'
  },
  md: {
    height: 40,
    padding: '0 16px',
    borderRadius: 13,
    font: '700 12.5px Manrope,sans-serif'
  },
  sm: {
    height: 34,
    padding: '0 14px',
    borderRadius: 11,
    font: '700 11.5px Manrope,sans-serif'
  }
};
const BUTTON_VARIANTS = ['primary', 'action', 'secondary', 'soft', 'danger', 'ghost'];
function Button({
  variant = 'primary',
  size = 'lg',
  icon,
  block,
  disabled,
  onClick,
  children,
  style
}) {
  const v = V[disabled ? 'disabled' : variant];
  return /*#__PURE__*/React.createElement("div", {
    onClick: disabled ? undefined : onClick,
    style: {
      ...S[size],
      ...v,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      cursor: disabled ? 'default' : 'pointer',
      boxSizing: 'border-box',
      flex: block ? 1 : 'none',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    strokeWidth: 1.9
  }) : null, children);
}
Object.assign(__ds_scope, { BUTTON_VARIANTS, Button });
