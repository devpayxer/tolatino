"use client";
/* 5c · Silenciar y bloquear desde cualquier lugar de la Comunidad (perfil, menú de una publicación o de un comentario, mensajes),
   siempre con «Deshacer». Bloquear pide confirmación (es mutuo: dejan de seguirse y la conversación se cierra, sin avisarle);
   silenciar no (solo esconde lo que publica, y no se entera). El servidor decide; aquí solo se pide y se muestra. */
import { useRouter } from "next/navigation";
import { vecBloquear, vecDeshacer, vecSilenciar } from "./acciones";
import type { ComUi, FilaHoja } from "./Marco";

type Bi = { es: string; en: string };
type R = { ok: boolean; msg?: Bi; entrar?: boolean };
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function useVecinoAcciones(es: boolean, ui: ComUi) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const red: R = { ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } };
  const fallo = (r: R) => { if (r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`); return; } if (r.msg) ui.setAviso({ t: es ? r.msg.es : r.msg.en }); };
  const deshacer = (id: string, kind: "block" | "mute", alDeshacer?: () => void) => async () => {
    const d = await vecDeshacer(id, kind).catch(() => red);
    if (!d.ok) return fallo(d);
    ui.setAviso({ t: E2("Listo, como estaba.", "Done, back as it was.") });
    if (alDeshacer) alDeshacer(); else router.refresh();
  };
  const silenciar = async (id: string, nombre: string, alHacer?: () => void, alDeshacer?: () => void) => {
    const r = await vecSilenciar(id).catch(() => red);
    if (!r.ok) return fallo(r);
    alHacer?.();
    ui.setAviso({ t: E2(`Silenciaste a ${primero(nombre)}. No se entera.`, `You muted ${primero(nombre)}. They won't know.`), a: E2("Deshacer", "Undo"), ms: 8000, onA: deshacer(id, "mute", alDeshacer) });
  };
  const bloquear = (id: string, nombre: string, alHacer?: () => void, alDeshacer?: () => void) => ui.setHoja({
    title: E2(`¿Bloquear a ${primero(nombre)}?`, `Block ${primero(nombre)}?`),
    sub: E2("No verás lo que publica ni te podrá escribir, y no verá nada tuyo. Dejan de seguirse y su conversación se cierra. No le avisamos.",
      "You won't see their posts and they can't message you or see anything of yours. You stop following each other and your conversation closes. We don't tell them."),
    yes: E2("Bloquear", "Block"), peligro: true,
    onYes: async () => {
      const r = await vecBloquear(id).catch(() => red);
      if (!r.ok) return fallo(r);
      alHacer?.();
      ui.setAviso({ t: E2(`Bloqueaste a ${primero(nombre)}.`, `You blocked ${primero(nombre)}.`), a: E2("Deshacer", "Undo"), ms: 8000, onA: deshacer(id, "block", alDeshacer) });
    },
  });
  /* Filas para el menú de algo de otra persona: ver su perfil, silenciar, bloquear. */
  const filas = (id: string, nombre: string, alHacer?: () => void, alDeshacer?: () => void): FilaHoja[] => [
    { t: E2(`Ver el perfil de ${primero(nombre)}`, `See ${primero(nombre)}'s profile`), ic: "users", sep: true, on: () => { ui.setHoja(null); router.push(`/comunidad/v/${id}`); } },
    { t: E2(`Silenciar a ${primero(nombre)}`, `Mute ${primero(nombre)}`), s: E2("No verás lo que publica. No se entera.", "You won't see their posts. They won't know."), ic: "bell", on: () => { ui.setHoja(null); void silenciar(id, nombre, alHacer, alDeshacer); } },
    { t: E2(`Bloquear a ${primero(nombre)}`, `Block ${primero(nombre)}`), s: E2("No te ve ni te puede escribir.", "They can't see you or message you."), ic: "ban", peligro: true, on: () => bloquear(id, nombre, alHacer, alDeshacer) },
  ];
  return { silenciar, bloquear, filas, deshacer };
}
