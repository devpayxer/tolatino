"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/Tag.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const T = {
  action: ['rgba(75,55,245,.1)', 'var(--tl-action)'],
  danger: ['rgba(192,57,43,.1)', 'var(--tl-danger)'],
  signal: ['rgba(0,229,196,.2)', 'var(--tl-open-text)'],
  ink: ['var(--tl-ink)', 'var(--tl-white)'],
  neutral: ['rgba(11,14,18,.06)', 'rgba(11,14,18,.6)']
};
function Tag({
  tone = 'action',
  children,
  style
}) {
  const [bg, fg] = T[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      padding: '3px 7px',
      borderRadius: 5,
      background: bg,
      color: fg,
      font: "800 9px 'JetBrains Mono',monospace",
      letterSpacing: '.08em',
      whiteSpace: 'nowrap',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
