"use client";
/* Mi cuenta › Vecinos (espejo de Comunidad; flujos L134 «Siguiendo / Seguidores / Bloqueados»; hueco #5): chips de las tres
   listas; cada vecino con su foto, nombre, rango y lugar (zona · ciudad: Siguiendo muestra gente de cualquier ciudad) y la acción
   de la lista (Dejar de seguir · Seguir también · Desbloquear / Quitar silencio, y volver a hacerlo: Deshacer). Por cursor. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rango } from "@/lib/comunidad-comun";
import type { Persona, PersonaB } from "@/lib/vecinos";
import { vecBloquear, vecDeshacer, vecSeguir, vecSilenciar } from "../../comunidad/acciones";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

type L = "siguiendo" | "seguidores" | "bloqueados";
type Item = (Persona | PersonaB) & { hecho?: boolean };
type Bi = { es: string; en: string };
const primero = (n: string) => n.split(/\s+/)[0] ?? n;

export function Vecinos({ es, yo, l, d, menor, pagina }: { es: boolean; yo: Yo; l: L; d: { items: Item[]; mas: string | null } | null; menor: boolean; pagina: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [items, setItems] = useState<Item[]>(d?.items ?? []);
  const poner = (id: string, f: (x: Item) => Item) => setItems((L) => L.map((x) => (x.id === id ? f(x) : x)));
  const hacer = async (fn: () => Promise<{ ok: boolean; msg?: Bi }>, ok: string, cambio: () => void) => {
    const r = await fn().catch(() => ({ ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } }));
    if (!r.ok) return ui.toast(r.msg ? (es ? r.msg.es : r.msg.en) : E2("Algo falló.", "Something failed."));
    cambio(); ui.toast(ok);
  };
  const chips: Bloque = { type: "chips", items: ([["siguiendo", E2("Siguiendo", "Following")], ["seguidores", E2("Seguidores", "Followers")], ["bloqueados", E2("Bloqueados y silenciados", "Blocked and muted")]] as [L, string][])
    .map(([k, t]) => ({ l: t, on: l === k, onClick: () => router.push(`/cuenta/vecinos?l=${k}`) })) };
  if (!d) {
    return <Marco es={es} code="USR-VECINOS" t={E2("Vecinos", "Neighbors")} s={E2("EN LA COMUNIDAD", "IN THE COMMUNITY")} yo={yo} ui={ui} blocks={[
      menor ? { type: "note", tone: "info", ic: "shield", t: E2("La Comunidad es para personas de 18 años o más", "The Community is for people 18 or older"), s: E2("Por eso no tienes listas de vecinos.", "That's why you have no neighbor lists.") }
        : { type: "empty", ic: "users", t: E2("Todavía no entras a la Comunidad", "You haven't joined the Community yet"), s: E2("Tres pasos: tu zona, lo que te gusta y las reglas del barrio.", "Three steps: your area, what you like and the neighborhood rules."), cta: E2("Entrar a la Comunidad", "Join the Community"), onCta: () => router.push("/comunidad") },
    ]} />;
  }
  const fila = (x: Item) => {
    const rk = rango(x.rango), sub = [`${x.rango} · ${(es ? rk.es : rk.en).toUpperCase()}`, x.lugar.toUpperCase()].filter(Boolean).join(" · ");
    const n = primero(x.nombre);
    let acts: [string, string, () => void][] = [], tag: [string, string] | null = null;
    if (l === "siguiendo") acts = x.yoSigo
      ? [[E2("Dejar de seguir", "Unfollow"), "secondary", () => void hacer(() => vecSeguir(x.id, false), E2(`Dejaste de seguir a ${n}.`, `You unfollowed ${n}.`), () => poner(x.id, (y) => ({ ...y, yoSigo: false })))]]
      : [[E2("Seguir de nuevo", "Follow again"), "primary", () => void hacer(() => vecSeguir(x.id, true), E2(`Sigues a ${n} otra vez.`, `You follow ${n} again.`), () => poner(x.id, (y) => ({ ...y, yoSigo: true })))]];
    else if (l === "seguidores") { if (x.yoSigo) tag = [E2("LO SIGUES", "YOU FOLLOW"), "neutral"]; else acts = [[E2("Seguir también", "Follow back"), "primary", () => void hacer(() => vecSeguir(x.id, true), E2(`Sigues a ${n}.`, `You follow ${n}.`), () => poner(x.id, (y) => ({ ...y, yoSigo: true })))]]; }
    else {
      const b = x as PersonaB & { hecho?: boolean }, blk = b.kind === "block";
      tag = b.hecho ? [blk ? E2("DESBLOQUEADO", "UNBLOCKED") : E2("SIN SILENCIO", "UNMUTED"), "neutral"] : [blk ? E2("BLOQUEADO", "BLOCKED") : E2("SILENCIADO", "MUTED"), blk ? "danger" : "neutral"];
      acts = b.hecho
        ? [[E2("Deshacer", "Undo"), "secondary", () => void hacer(() => (blk ? vecBloquear(x.id) : vecSilenciar(x.id)), blk ? E2(`Bloqueaste a ${n} otra vez.`, `You blocked ${n} again.`) : E2(`Silenciaste a ${n} otra vez.`, `You muted ${n} again.`), () => poner(x.id, (y) => ({ ...y, hecho: false })))]]
        : [[blk ? E2("Desbloquear", "Unblock") : E2("Quitar silencio", "Unmute"), "secondary", () => void hacer(() => vecDeshacer(x.id, b.kind), blk ? E2(`Desbloqueaste a ${n}.`, `You unblocked ${n}.`) : E2(`Ya ves lo que publica ${n}.`, `You see ${n}'s posts again.`), () => poner(x.id, (y) => ({ ...y, hecho: true })))]];
    }
    return { key: x.id, ph: x.foto, ini: x.nombre.slice(0, 1), t: x.nombre, s: sub, tag, acts, on: l === "bloqueados" ? undefined : () => router.push(`/comunidad/v/${x.id}`), chev: l !== "bloqueados" };
  };
  const nota: Bi = l === "siguiendo" ? { es: "Ves lo que publican en Comunidad › Siguiendo, aunque vivan en otra ciudad. Seguir no da puntos.", en: "You see their posts in Community › Following, even if they live in another city. Following earns no points." }
    : l === "seguidores" ? { es: "Quien te sigue te puede escribir y tú le puedes escribir. Si alguien te molesta, bloquéalo: no se entera.", en: "People who follow you can message you and you can message them. If someone bothers you, block them: they won't know." }
    : { es: "Bloquear es mutuo: no te ve ni te ve nadie de los dos, y dejan de seguirse. Silenciar solo esconde lo que publica. Ninguno de los dos se entera.", en: "Blocking is mutual: neither of you sees the other, and you stop following each other. Muting only hides their posts. Neither one is told." };
  const vacio: Bi = l === "siguiendo" ? { es: "Todavía no sigues a nadie", en: "You don't follow anyone yet" } : l === "seguidores" ? { es: "Todavía nadie te sigue", en: "Nobody follows you yet" } : { es: "No has bloqueado ni silenciado a nadie", en: "You haven't blocked or muted anyone" };
  const B: (Bloque | null)[] = [
    chips,
    { type: "note", tone: "info", ic: l === "bloqueados" ? "lock" : "users", s: es ? nota.es : nota.en },
    items.length ? { type: "rows", rows: items.map(fila) } : { type: "empty", ic: l === "bloqueados" ? "ban" : "users", t: pagina ? E2("No hay más", "No more") : es ? vacio.es : vacio.en, s: E2("Encuentra vecinos en la Comunidad de tu ciudad.", "Find neighbors in your city's Community."), cta: pagina ? E2("Volver al principio", "Back to the top") : E2("Ir a la Comunidad", "Go to the Community"), onCta: () => router.push(pagina ? `/cuenta/vecinos?l=${l}` : "/comunidad") },
    d.mas ? { type: "more", l: E2("Ver más", "See more"), on: () => router.push(`/cuenta/vecinos?l=${l}&c=${encodeURIComponent(d.mas!)}`) } : null,
  ];
  return <Marco es={es} code="USR-VECINOS" t={E2("Vecinos", "Neighbors")} s={E2("SIGUIENDO · SEGUIDORES · BLOQUEADOS", "FOLLOWING · FOLLOWERS · BLOCKED")} yo={yo} ui={ui} blocks={B} />;
}
