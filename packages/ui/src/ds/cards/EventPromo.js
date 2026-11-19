"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/cards/EventPromo.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function EventPromo({
  when,
  title,
  priceLabel = 'BOLETOS DESDE',
  price,
  primary = 'Boletos',
  secondary = 'Mesa',
  onPrimary,
  onSecondary,
  image,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 18,
      overflow: 'hidden',
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Placeholder, {
    height: 110,
    tone: "dark",
    image: image,
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      padding: 14,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.18em',
      color: 'var(--tl-mod-events)'
    }
  }, when), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 22px/1.1 Sora,sans-serif',
      letterSpacing: '-.03em',
      marginTop: 5
    }
  }, title))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10.5px 'JetBrains Mono',monospace",
      color: 'rgba(255,255,255,.5)'
    }
  }, priceLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 19px/1 Sora,sans-serif',
      letterSpacing: '-.02em'
    }
  }, price)), /*#__PURE__*/React.createElement("div", {
    onClick: onPrimary,
    ...__ds_scope.__btn(onPrimary, undefined, undefined),
    style: {
      padding: '11px 16px',
      borderRadius: 12,
      background: 'var(--tl-mod-events)',
      color: 'var(--tl-white)',
      font: '700 13px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, primary), secondary ? /*#__PURE__*/React.createElement("div", {
    onClick: onSecondary,
    ...__ds_scope.__btn(onSecondary, undefined, undefined),
    style: {
      padding: '11px 14px',
      borderRadius: 12,
      border: '1.5px solid rgba(255,255,255,.2)',
      font: '700 13px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, secondary) : null));
}
Object.assign(__ds_scope, { EventPromo });
