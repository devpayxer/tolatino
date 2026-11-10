"use client";
/* 6b · Piezas del módulo Eventos del cliente que comparten la lista, «Esta noche» y la ficha (prototipo «To'Latino Eventos»): la tarjeta
   cartel 3:4 con la fecha en caja, el corazón y la etiqueta (VAS · ESTA NOCHE · HOY · GRATIS · QUEDAN N), el guardar con sesión y las
   etiquetas de color. Colores por tokens del sistema; lo que el prototipo pinta en hex sale de var(--tl-…). */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType, type MouseEvent } from "react";
import type { TagEvt, TarjetaEvt } from "@/lib/evt-publico";
import { evtGuardar } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Icon = UI.Icon as ComponentType<any>;
export const MONO = "'JetBrains Mono',monospace";

/* La etiqueta de la tarjeta (bqVals card): VAS = Signal, HOY / ESTA NOCHE = Eventos, QUEDAN = Pro, GRATIS = blanco. */
export const TAG_COLOR: Record<TagEvt["k"], [string, string]> = {
  vas: ["var(--tl-signal)", "var(--tl-signal-ink)"], hoy: ["var(--tl-mod-events)", "var(--tl-white)"],
  quedan: ["var(--tl-pro)", "var(--tl-pro-ink)"], gratis: ["var(--tl-white)", "var(--tl-ink)"],
};

/* Guardar (corazón) con sesión: sin sesión, a entrar y de vuelta aquí. El estado sale del servidor y se respeta lo que contestó. */
export function useGuardar(inicial: Record<string, boolean>, toast: (t: string) => void, es: boolean) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const [on, setOn] = useState(inicial);
  const toggle = async (id: string, ev?: MouseEvent) => {
    ev?.stopPropagation();
    const r = await evtGuardar(id).catch(() => null);
    if (r && !r.ok && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`${path}${sp.size ? `?${sp}` : ""}`)}`); return; }
    if (!r?.ok) { toast(es ? "No se pudo. Prueba de nuevo." : "Could not do it. Try again."); return; }
    setOn((x) => ({ ...x, [id]: !!r.on }));
    toast(r.on ? (es ? "Guardado. Lo tienes en Mi cuenta › Guardados." : "Saved. Find it in My account › Saved.") : (es ? "Quitado de guardados." : "Removed from saved."));
  };
  return { on, toggle };
}

/* La tarjeta cartel (bq secs · k): 3:4, la fecha en caja, el corazón, la etiqueta; abajo título, lugar y hora, y el precio. */
export function Cartel({ k, saved, onLike, desk, es }: { k: TarjetaEvt; saved: boolean; onLike: (ev: MouseEvent) => void; desk?: boolean; es: boolean }) {
  const router = useRouter(), abrir = () => router.push(k.href);
  return (
    <div data-evento={k.id} className="min-w-0">
      <div role="link" tabIndex={0} aria-label={k.title} onClick={abrir} onKeyDown={(e) => { if (e.key === "Enter") abrir(); }}
        className="relative cursor-pointer overflow-hidden rounded-[17px] bg-photo-bg" style={{ aspectRatio: "3 / 4" }}>
        {k.img ? <img src={k.img} alt="" className="block h-full w-full object-cover" /> : null}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,0) 55%,rgba(11,14,18,.66))" }} />
        <div className="absolute left-2.5 top-2.5 rounded-[11px] bg-white pb-1.5 pt-[5px] text-center" style={{ width: desk ? 42 : 40 }}>
          <span className="block text-danger" style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".12em" }}>{k.bm}</span>
          <span className="block font-display font-extrabold leading-none tracking-[-0.02em] text-ink" style={{ fontSize: desk ? 16 : 15 }}>{k.bd}</span>
        </div>
        <button type="button" aria-label={saved ? (es ? "Quitar de guardados" : "Remove from saved") : (es ? "Guardar" : "Save")} aria-pressed={saved} onClick={onLike}
          className="absolute right-2.5 top-2.5 grid place-items-center rounded-full" style={{ width: desk ? 34 : 32, height: desk ? 34 : 32, background: "rgba(11,14,18,.5)", backdropFilter: "blur(8px)", color: saved ? "var(--tl-mod-events)" : "var(--tl-white)" }}>
          <Icon name="heart" size={desk ? 17 : 16} fill={saved ? "var(--tl-mod-events)" : "none"} />
        </button>
        {k.tag ? <span className="absolute bottom-2.5 left-2.5 rounded-[7px] px-[9px] py-[5px]" style={{ background: TAG_COLOR[k.tag.k][0], color: TAG_COLOR[k.tag.k][1], font: `800 9px ${MONO}`, letterSpacing: ".1em" }}>{k.tag.t}</span> : null}
      </div>
      <div role="link" onClick={abrir} className="mt-[9px] cursor-pointer">
        <div className="line-clamp-2 font-display font-extrabold leading-[1.25] tracking-[-0.02em]" style={{ fontSize: desk ? 15 : 14 }}>{k.title}</div>
        <div className="mt-1 truncate text-ink/50" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em" }}>{`${k.cuando} · ${k.venue}`.toUpperCase()}</div>
        <div className="mt-[7px] flex items-center justify-between gap-2">
          <span className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: desk ? 13.5 : 13 }}>{k.price}</span>
          {k.van > 0 ? <span className="text-ink/50" style={{ font: `700 9.5px ${MONO}` }}>{es ? `${k.van} ${k.van === 1 ? "VA" : "VAN"}` : `${k.van} GOING`}</span> : null}
        </div>
      </div>
    </div>
  );
}

/* Aviso corto abajo (toast) de la pantalla. */
export function useToast() {
  const [t, setT] = useState<string | null>(null);
  const [h, setH] = useState<ReturnType<typeof setTimeout> | null>(null);
  const toast = (x: string) => { if (h) clearTimeout(h); setT(x); setH(setTimeout(() => setT(null), 2600)); };
  const el = t ? (
    <div role="status" className="fixed inset-x-0 bottom-[104px] z-50 flex justify-center px-4 lg:bottom-8">
      <div className="max-w-[440px] rounded-[14px] bg-ink px-4 py-3 text-[13px] font-semibold leading-[1.45] text-white shadow-lg">{t}</div>
    </div>
  ) : null;
  return { toast, el };
}
