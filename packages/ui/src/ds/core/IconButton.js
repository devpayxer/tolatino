"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/IconButton.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const LBL = { heart: 'Guardar', share: 'Compartir', chat: 'Mensaje', phone: 'Llamar', close: 'Cerrar', search: 'Buscar', filter: 'Filtros', map: 'Mapa', pin: 'Cómo llegar', bell: 'Avisos' };
function IconButton({
  icon,
  size = 50,
  active,
  onClick,
  label,
  style
}) {
  const r = size >= 50 ? 15 : size >= 42 ? 13 : 12;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    role: "button",
    tabIndex: 0,
    "aria-label": label || LBL[icon] || icon,
    "aria-pressed": active === undefined ? undefined : !!active,
    onKeyDown: !onClick ? undefined : e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
    style: {
      width: size,
      height: size,
      borderRadius: r,
      background: active ? 'var(--tl-ink)' : 'var(--tl-white)',
      border: '1px solid ' + (active ? 'var(--tl-ink)' : 'rgba(11,14,18,.09)'),
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      flex: 'none',
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size >= 50 ? 19 : 17,
    strokeWidth: 1.9,
    color: active ? 'var(--tl-white)' : 'var(--tl-ink)',
    fill: active && icon === 'heart' ? 'var(--tl-white)' : 'none'
  }));
}
Object.assign(__ds_scope, { IconButton });
