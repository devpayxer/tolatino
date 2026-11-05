"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/SectionHeader.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function SectionHeader({
  title,
  dot,
  action,
  onAction,
  size = 17,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: dot,
      alignSelf: 'center'
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + size + 'px/1 Sora,sans-serif',
      letterSpacing: '-.02em',
      color: 'var(--tl-ink)'
    }
  }, title)), action ? /*#__PURE__*/React.createElement("span", {
    onClick: onAction,
    style: {
      font: '700 12px Manrope,sans-serif',
      color: 'var(--tl-action)',
      cursor: 'pointer'
    }
  }, action) : null);
}
function Eyebrow({
  children,
  color = 'rgba(11,14,18,.42)',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px ' + "'JetBrains Mono',monospace",
      letterSpacing: '.2em',
      color,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { SectionHeader, Eyebrow });
