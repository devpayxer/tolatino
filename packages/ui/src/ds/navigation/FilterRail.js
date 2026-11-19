"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/navigation/FilterRail.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function FilterRail({
  items = [],
  active,
  onChange,
  bordered = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      borderBottom: bordered ? '1px solid rgba(11,14,18,.07)' : 'none',
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: it,
    variant: it === active ? 'selected' : 'filter',
    onClick: () => onChange && onChange(it)
  }, it)));
}
Object.assign(__ds_scope, { FilterRail });
