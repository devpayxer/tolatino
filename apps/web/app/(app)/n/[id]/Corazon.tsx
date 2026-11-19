"use client";
/* 9t · Guardar un plato o un producto (decisiones del fundador del 19 nov): el cuadro del corazón de la barra de la vacante (50 px) en la barra de abajo
   de la hoja, a la izquierda del contador o del botón principal. Una sola pieza para la hoja del plato (MenuCliente), la del producto del mercado
   (Mercado) y la del artículo de la tienda (Tienda). Sin sesión lleva a /entrar y vuelve a la hoja de ESE plato o producto (`volver`); con sesión el
   servidor decide (platoGuardar → lib/platos-guardados.ts). Lo guardado al abrir la ficha lo trae el servidor en una consulta (`ids`). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { platoGuardar } from "./acciones-platos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon } = UI as unknown as Record<"Icon", ComponentType<any>>;
const mapa = (ids: string[] | undefined) => Object.fromEntries((ids ?? []).map((id) => [id, true]));

export function useGuardados(ids: string[] | undefined, sesion: boolean, volver: (id: string) => string, es: boolean) {
  const router = useRouter();
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const [g, setG] = useState<Record<string, boolean>>(() => mapa(ids));
  useEffect(() => { setG(mapa(ids)); }, [ids]);
  /* Devuelve el aviso para la pantalla (o null si fue a entrar). */
  const cambiar = async (id: string): Promise<string | null> => {
    if (!sesion) { router.push(`/entrar?volver=${encodeURIComponent(volver(id))}`); return null; }
    const antes = !!g[id];
    setG((x) => ({ ...x, [id]: !antes }));
    const r = await platoGuardar(id).catch(() => null);
    if (r?.ok) { setG((x) => ({ ...x, [id]: r.guardado })); return r.guardado ? E2("Guardado en Mi cuenta › Guardados", "Saved in My account › Saved") : E2("Quitado de Guardados", "Removed from Saved"); }
    setG((x) => ({ ...x, [id]: antes }));
    if (r && "entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(volver(id))}`); return null; }
    return r ? E2(r.msg.es, r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.");
  };
  return { guardado: (id: string) => !!g[id], cambiar };
}

/* El cuadro: etiqueta fija («Guardar plato» / «Guardar producto») y el estado en aria-pressed; rojo y lleno cuando está guardado. */
export function CorazonGuardar({ guardado, onClick, etiqueta }: { guardado: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <button type="button" data-guardar-plato aria-label={etiqueta} aria-pressed={guardado} onClick={onClick} className="box-border grid size-[50px] flex-none place-items-center rounded-[15px] border-[1.5px] border-ink/[.14] bg-white">
      <Icon name="heart" size={18} color={guardado ? "var(--tl-danger)" : "var(--tl-ink)"} fill={guardado ? "var(--tl-danger)" : "none"} />
    </button>
  );
}
