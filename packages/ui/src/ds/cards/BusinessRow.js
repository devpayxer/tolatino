"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/BusinessRow.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function BusinessRow({
  name,
  meta,
  verified,
  slot,
  image,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.07)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    width: 54,
    height: 54,
    radius: 14,
    image: image
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, name), verified ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 16,
    color: "var(--tl-open)"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 11px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.45)',
      marginTop: 4
    }
  }, meta)), slot ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '9px 13px',
      borderRadius: 11,
      background: 'rgba(0,229,196,.16)',
      font: '700 11.5px Manrope,sans-serif',
      color: 'var(--tl-open-text)'
    }
  }, slot) : null);
}
Object.assign(__ds_scope, { BusinessRow });
