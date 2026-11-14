"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/home/ModuleGrid.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


function ModuleTile({
  module,
  label,
  icon,
  hue,
  tint,
  dark,
  onClick
}) {
  const m = __ds_scope.MODULES[module] || {};
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    ...__ds_scope.__btn(onClick, undefined, undefined),
    style: {
      borderRadius: 18,
      background: dark ? 'var(--tl-ink)' : 'var(--tl-white)',
      border: dark ? 'none' : '1px solid rgba(11,14,18,.07)',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      alignItems: 'flex-start',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 11,
      background: dark ? 'rgba(255,255,255,.12)' : tint || m.tint,
      color: dark ? 'var(--tl-signal)' : hue || m.hue,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || m.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 11.5px/1.2 Manrope,sans-serif',
      color: dark ? 'var(--tl-white)' : 'var(--tl-ink)'
    }
  }, label || m.label));
}
function ModuleGrid({
  modules = ['community', 'business', 'events', 'rides', 'homes', 'autos', 'jobs'],
  allLabel = 'Todos (17)',
  onSelect
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 10
    }
  }, modules.map(k => /*#__PURE__*/React.createElement(ModuleTile, {
    key: k,
    module: k,
    onClick: () => onSelect && onSelect(k)
  })), allLabel ? /*#__PURE__*/React.createElement(ModuleTile, {
    dark: true,
    icon: "grid",
    label: allLabel,
    onClick: () => onSelect && onSelect('all')
  }) : null);
}
Object.assign(__ds_scope, { ModuleTile, ModuleGrid });
