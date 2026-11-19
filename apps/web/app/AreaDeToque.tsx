"use client";
/* 9t · Objetivos táctiles de 44 px sin cambiar lo que se ve: un toque del dedo que cae en nada tocable, junto a un control, es de ese control
   (packages/ui/src/toque.ts dice cómo y por qué). Se monta una vez en el layout raíz: vale para el sitio y las cuatro apps. No pinta nada. */
import { useEffect } from "react";
import { instalarToque } from "@tolatino/ui/toque";

export function AreaDeToque() {
  useEffect(() => instalarToque(), []);
  return null;
}
