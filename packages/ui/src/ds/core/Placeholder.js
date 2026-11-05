"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/Placeholder.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const P = {
  light: ['var(--tl-ds-e7e5e0)', 'var(--tl-desk)'],
  dark: ['var(--tl-dark-3)', 'var(--tl-dark-2)'],
  mint: ['var(--tl-ds-dce8e4)', 'var(--tl-ds-e8f0ed)']
};
function Placeholder({
  tone = 'light',
  width = '100%',
  height = 86,
  radius = 0,
  image,
  children,
  style
}) {
  const [a, b] = P[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: radius,
      flex: 'none',
      position: 'relative',
      overflow: 'hidden',
      background: image ? 'center/cover url(' + image + ')' : 'repeating-linear-gradient(135deg,' + a + ' 0 10px,' + b + ' 10px 20px)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Placeholder });
