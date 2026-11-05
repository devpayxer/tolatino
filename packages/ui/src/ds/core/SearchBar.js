"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/SearchBar.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function SearchBar({
  placeholder = 'Buscar negocios, eventos, empleos',
  mic = true,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderRadius: 16,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.08)',
      boxShadow: '0 4px 14px -8px rgba(11,14,18,.18)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18,
    color: "rgba(11,14,18,.4)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '500 14px Manrope,sans-serif',
      color: 'rgba(11,14,18,.42)'
    }
  }, placeholder), mic ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "mic",
    size: 18,
    color: "var(--tl-action)"
  }) : null);
}
Object.assign(__ds_scope, { SearchBar });
