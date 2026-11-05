"use client";
// @ts-nocheck — portado por scripts/portar-sistema.mjs desde docs/diseno/design-system/components-web/components/core/modules.js
// (To'Latino Design System, bundle del 2 nov 2026). No editar a mano: los cambios se hacen en el componente tipado
// que lo reemplace, o en el script. Colores = tokens (var(--tl-…)).
import * as React from "react";
import { __ds_scope } from "../scope.js";


const MODULES = {
  community: {
    label: 'Comunidad',
    en: 'Community',
    icon: 'users',
    hue: 'var(--tl-action)',
    tint: 'rgba(75,55,245,.12)'
  },
  business: {
    label: 'Negocios',
    en: 'Business',
    icon: 'store',
    hue: 'var(--tl-open)',
    tint: 'rgba(0,168,143,.14)'
  },
  events: {
    label: 'Eventos',
    en: 'Events',
    icon: 'ticket',
    hue: 'var(--tl-mod-events)',
    tint: 'rgba(255,45,122,.12)'
  },
  rides: {
    label: 'Viajes',
    en: 'Rides',
    icon: 'truck',
    hue: 'var(--tl-mod-transport)',
    tint: 'rgba(30,123,255,.12)'
  },
  homes: {
    label: 'Casas',
    en: 'Homes',
    icon: 'building',
    hue: 'var(--tl-mod-realestate)',
    tint: 'rgba(15,169,88,.12)'
  },
  autos: {
    label: 'Autos',
    en: 'Autos',
    icon: 'car',
    hue: 'var(--tl-mod-autos)',
    tint: 'rgba(255,138,31,.14)'
  },
  jobs: {
    label: 'Empleos',
    en: 'Jobs',
    icon: 'brief',
    hue: 'var(--tl-mod-jobs)',
    tint: 'rgba(194,65,12,.12)'
  }
};
Object.assign(__ds_scope, { MODULES });
