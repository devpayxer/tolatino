"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/InfoCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function InfoCard({
  label,
  labelColor,
  padding = '16px 15px',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 17,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      padding,
      color: 'var(--tl-ink)',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "800 10px 'JetBrains Mono',monospace",
      letterSpacing: '.12em',
      color: labelColor || 'rgba(11,14,18,.5)',
      marginBottom: 8
    }
  }, label) : null, children);
}
Object.assign(__ds_scope, { InfoCard });
