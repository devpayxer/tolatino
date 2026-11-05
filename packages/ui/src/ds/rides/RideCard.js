"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/rides/RideCard.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function RideCard({
  name,
  meta,
  verified,
  icon = 'truck',
  featured,
  price,
  unit,
  depart,
  arrive,
  seats,
  cta = 'Solicitar',
  onCta,
  features = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderRadius: 18,
      background: 'var(--tl-white)',
      border: '1px solid rgba(11,14,18,.07)',
      boxShadow: featured ? '0 3px 12px -8px rgba(11,14,18,.2)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 14,
      background: featured ? 'var(--tl-ds-edf3ff)' : 'var(--tl-ds-f1f0ec)',
      color: featured ? 'var(--tl-mod-transport)' : 'rgba(11,14,18,.5)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14.5px Manrope,sans-serif',
      color: 'var(--tl-ink)'
    }
  }, name), verified ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield",
    size: 16,
    color: "var(--tl-open)"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10.5px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.45)',
      marginTop: 3
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 19px/1 Sora,sans-serif',
      letterSpacing: '-.02em',
      color: 'var(--tl-ink)'
    }
  }, price), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.4)',
      marginTop: 3
    }
  }, unit))), depart ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px dashed rgba(11,14,18,.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      font: "600 11px 'JetBrains Mono',monospace",
      color: 'rgba(11,14,18,.55)'
    }
  }, /*#__PURE__*/React.createElement("span", null, depart), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(11,14,18,.3)'
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", null, arrive), seats ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--tl-open-text)'
    }
  }, seats) : null), /*#__PURE__*/React.createElement("span", {
    onClick: onCta,
    style: {
      padding: '8px 14px',
      borderRadius: 11,
      background: 'var(--tl-ink)',
      color: 'var(--tl-white)',
      font: '700 12px Manrope,sans-serif',
      cursor: 'pointer'
    }
  }, cta)) : null, features.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, features.map(f => /*#__PURE__*/React.createElement("span", {
    key: f,
    style: {
      padding: '5px 9px',
      borderRadius: 7,
      background: 'rgba(11,14,18,.05)',
      font: '600 10.5px Manrope,sans-serif',
      color: 'rgba(11,14,18,.65)'
    }
  }, f))) : null);
}
Object.assign(__ds_scope, { RideCard });
