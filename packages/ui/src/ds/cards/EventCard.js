"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/EventCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function EventCard({
  title,
  meta,
  tag,
  dark,
  image,
  width = 212,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      flex: 'none',
      width,
      borderRadius: 20,
      overflow: 'hidden',
      background: dark ? 'var(--tl-ink)' : 'var(--tl-white)',
      border: dark ? 'none' : '1px solid rgba(11,14,18,.08)',
      color: dark ? 'var(--tl-white)' : 'var(--tl-ink)',
      cursor: onClick ? 'pointer' : 'default'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    height: 86,
    tone: dark ? 'dark' : 'light',
    image: image
  }, tag ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 9,
      left: 10,
      padding: '5px 9px',
      borderRadius: 7,
      background: 'rgba(255,45,122,.9)',
      color: 'var(--tl-white)',
      font: "700 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.12em'
    }
  }, tag) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 14.5px/1.25 Manrope,sans-serif'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      font: "600 11px 'JetBrains Mono',monospace",
      color: dark ? 'rgba(255,255,255,.5)' : 'rgba(11,14,18,.45)'
    }
  }, meta)));
}
Object.assign(__ds_scope, { EventCard });
