"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/rides/RideSearch.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function RideSearch({
  label = 'ENTRE CIUDADES',
  from,
  to,
  date,
  seats,
  cta,
  onSearch,
  style
}) {
  const f = {
    flex: 1,
    padding: '11px 13px',
    borderRadius: 12,
    background: 'rgba(255,255,255,.07)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'rgba(255,255,255,.75)',
    font: '600 12.5px Manrope,sans-serif'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 22,
      background: 'var(--tl-dark-2)',
      border: '1px solid rgba(255,255,255,.09)',
      padding: 18,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 9.5px 'JetBrains Mono',monospace",
      letterSpacing: '.2em',
      color: 'var(--tl-mod-transport)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 99,
      border: '2.5px solid var(--tl-mod-transport)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '700 15px Manrope,sans-serif',
      color: 'var(--tl-white)'
    }
  }, from)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'rgba(255,255,255,.09)',
      marginLeft: 21
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 2,
      background: 'var(--tl-signal)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: '700 15px Manrope,sans-serif',
      color: 'var(--tl-white)'
    }
  }, to))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: f
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 16
  }), date), /*#__PURE__*/React.createElement("div", {
    style: f
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 16
  }), seats)), /*#__PURE__*/React.createElement("div", {
    onClick: onSearch,
    ...__ds_scope.__btn(onSearch, undefined, undefined),
    style: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      background: 'var(--tl-mod-transport)',
      color: 'var(--tl-white)',
      font: '700 14px Manrope,sans-serif',
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, cta));
}
Object.assign(__ds_scope, { RideSearch });
