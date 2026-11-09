"use client";
/* APP-COM-FEED · pestaña Conversación (versión simple, MEM 91): avatar + «¿Qué pasa en tu cuadra?» + «+»; una fila de chips
   (Todo · Siguiendo · Preguntas · Recomendaciones · Encuestas · Publicaciones) y el botón de filtro → hoja «Qué ves primero»
   (distancia 5 · 10 · 30 mi y orden Más votados · Recientes); la fijada de la ciudad arriba; 20 por página con cursor («Ver más»).
   Menú de cada publicación: lo tuyo se edita (sus minutos de Configuración) o se borra con Deshacer (10 s); lo de otros se guarda o se comparte, y (5c) desde
   ahí se ve el perfil de quien publicó, se le silencia o se le bloquea (con Deshacer). Tocar el nombre abre su perfil. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type ComponentType } from "react";
import { DESHACER_S } from "@/lib/comunidad-filtro";
import type { Filtros, Pub } from "@/lib/comunidad-comun";
import { comBorrar, comDeshacer, comDestacar, comEncuesta, comGuardar, comPagina, comReportar, comVotar } from "./acciones";
import { YA_NO_LO_VES, abrirReporte } from "./Reportar";
import { Avatar, LINE, MONO, Marco, useComUi, type ComUi, type YoCom } from "./Marco";
import { Tarjeta } from "./Tarjeta";
import { HoyCarrusel } from "../HoyCarrusel";
import type { Historia } from "@/lib/hoy-comun";
import { useVecinoAcciones } from "./vecinoAcciones";
import { useTraducir } from "../Traducir";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
type R = { ok: boolean; msg?: Bi; entrar?: true };

/* Acciones de una publicación (las usan el muro y la publicación): votar, encuesta, guardar, compartir, menú, borrar con Deshacer. */
/* «hasta las 7:42 PM»: la hora del teléfono de quien mira. */
const horaCorta = (iso: string, es: boolean) => new Date(iso).toLocaleTimeString(es ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" });
export function useAccionesPub(es: boolean, ui: ComUi, poner: (id: string, f: (p: Pub) => Pub | null) => void, alBorrar?: (p: Pub) => void, alDeshacer?: (p: Pub) => void, alQuitarAutor?: (autor: string) => void, alReportar?: (p: Pub) => void) {
  const router = useRouter();
  const vec = useVecinoAcciones(es, ui);
  const E2 = (a: string, b: string) => (es ? a : b);
  const [busy, setBusy] = useState(false);
  const fallo = (r: R) => { if (r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`); return; } if (r.msg) ui.setAviso({ t: es ? r.msg.es : r.msg.en }); };
  const red = { ok: false, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } };
  const correr = async <T extends R>(fn: () => Promise<T>) => { if (busy) return null; setBusy(true); try { return await fn().catch(() => red as T); } finally { setBusy(false); } };
  const votar = async (p: Pub, v: 1 | -1) => {
    if (p.mia) return ui.setAviso({ t: E2("Lo tuyo lo votan los demás.", "Others vote on your posts.") });
    const r = await correr(() => comVotar(p.id, v)); if (!r) return;
    if (r.ok && "score" in r) poner(p.id, (x) => ({ ...x, score: r.score, miVoto: r.miVoto })); else fallo(r);
  };
  const encuesta = async (p: Pub, i: number) => {
    const r = await correr(() => comEncuesta(p.id, i)); if (!r) return;
    if (r.ok && "encuesta" in r) poner(p.id, (x) => ({ ...x, encuesta: r.encuesta })); else fallo(r);
  };
  const guardar = async (p: Pub) => {
    const r = await correr(() => comGuardar(p.id)); if (!r) return;
    if (r.ok && "guardada" in r) { poner(p.id, (x) => ({ ...x, guardada: r.guardada })); ui.setAviso({ t: r.guardada ? E2("Guardada en Mi cuenta.", "Saved to My account.") : E2("La quitaste de guardados.", "Removed from saved.") }); } else fallo(r);
  };
  const compartir = async (p: Pub) => {
    const url = `${location.origin}/comunidad/p/${p.id}`;
    try { await navigator.clipboard.writeText(url); ui.setAviso({ t: E2("Enlace copiado. Solo lo abren vecinos con cuenta.", "Link copied. Only neighbors with an account can open it.") }); }
    catch { ui.setAviso({ t: url }); }
  };
  const borrar = async (p: Pub) => {
    const r = await correr(() => comBorrar(p.id)); if (!r) return;
    if (!r.ok) return fallo(r);
    poner(p.id, () => null); alBorrar?.(p);
    ui.setAviso({ t: E2("Publicación borrada.", "Post deleted."), a: E2("Deshacer", "Undo"), ms: DESHACER_S * 1000, onA: async () => {
      const d = await comDeshacer(p.id).catch(() => red);
      if (d.ok) { alDeshacer?.(p); ui.setAviso({ t: E2("Volvió a su lugar.", "It is back.") }); } else fallo(d);
    } });
  };
  const menu = (p: Pub) => {
    const editable = !!p.editarHasta && new Date(p.editarHasta).getTime() > Date.now();
    ui.setHoja({ title: p.mia ? E2("Tu publicación", "Your post") : E2("Publicación", "Post"), rows: p.mia ? [
      { t: E2("Editar", "Edit"), s: editable ? E2(`Puedes editarla hasta las ${horaCorta(p.editarHasta!, true)}.`, `You can edit it until ${horaCorta(p.editarHasta!, false)}.`) : E2("Ya pasó el tiempo para editarla: puedes borrarla y publicar otra.", "The time to edit it has passed: you can delete it and post again."), ic: "edit", off: !editable, on: () => { ui.setHoja(null); router.push(`/comunidad/nuevo?editar=${p.id}`); } },
      // 5f · Sargento Mayor: destacar 1 recomendación al mes (7 días en Negocios › Recomendados por vecinos; nunca cambia el muro).
      ...(p.kind === "recomendacion" ? [{ t: E2("Destacar en Negocios", "Feature in Businesses"), s: E2("Desde Sargento Mayor, una al mes: sale 7 días en «Recomendados por vecinos». El muro no cambia.", "From Sergeant Major, one a month: it shows 7 days in «Recommended by neighbors». The feed does not change."), ic: "star",
        on: async () => { ui.setHoja(null); const r = await correr(() => comDestacar(p.id)); if (!r) return; if (r.ok) ui.setAviso({ t: E2("Destacada 7 días en Negocios.", "Featured for 7 days in Businesses.") }); else fallo(r); } }] : []),
      { t: E2("Borrar", "Delete"), s: E2("Tendrás 10 segundos para deshacerlo.", "You will have 10 seconds to undo it."), ic: "trash", peligro: true, on: () => ui.setHoja({ title: E2("¿Borrar esta publicación?", "Delete this post?"), sub: E2("Deja de verse en la Comunidad. Puedes deshacerlo en los siguientes 10 segundos.", "It stops showing in the Community. You can undo it in the next 10 seconds."), yes: E2("Borrar", "Delete"), peligro: true, onYes: () => void borrar(p) }) },
    ] : [
      { t: p.guardada ? E2("Quitar de guardados", "Remove from saved") : E2("Guardar", "Save"), ic: "heart", on: () => { ui.setHoja(null); void guardar(p); } },
      { t: E2("Compartir", "Share"), s: E2("Copia el enlace. Solo lo abren vecinos con cuenta.", "Copies the link. Only neighbors with an account can open it."), ic: "share", on: () => { ui.setHoja(null); void compartir(p); } },
      ...(p.autor.id && !p.autor.oficial ? vec.filas(p.autor.id, p.autor.nombre, () => alQuitarAutor?.(p.autor.id!)) : []),
      ...(p.autor.oficial ? [] : [{ t: E2("Reportar", "Report"), s: E2("Ya no la verás. Lo revisamos en 48 h.", "You won't see it anymore. We review it within 48 h."), ic: "warning", peligro: true, sep: true,
        on: () => abrirReporte(ui, es, { enviar: (m, n) => comReportar("post", p.id, m, n), despues: YA_NO_LO_VES, alEnviado: alReportar ? undefined : () => poner(p.id, () => null), alHecho: alReportar ? () => alReportar(p) : undefined }) }]),
    ] });
  };
  return { votar, encuesta, guardar, compartir, menu };
}

export function Muro({ es, yo, ciudad, abierta, filtros, inicial, hoy = [] }: { es: boolean; yo: YoCom; ciudad: string; abierta: boolean; filtros: Filtros; inicial: { pubs: Pub[]; mas: string | null }; hoy?: Historia[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname();
  const ui = useComUi(yo), tr = useTraducir(es);
  const [pubs, setPubs] = useState(inicial.pubs), [mas, setMas] = useState(inicial.mas), [cargando, setCargando] = useState(false);
  useEffect(() => { setPubs(inicial.pubs); setMas(inicial.mas); }, [inicial]);
  const poner = (id: string, f: (p: Pub) => Pub | null) => setPubs((L) => L.flatMap((p) => { if (p.id !== id) return [p]; const n = f(p); return n ? [n] : []; }));
  // Lo borrado vuelve a su lugar con «Deshacer».
  const quitados = useRef(new Map<string, number>());
  const acc = useAccionesPub(es, ui, poner, (p) => { quitados.current.set(p.id, pubs.findIndex((x) => x.id === p.id)); },
    (p) => setPubs((L) => { const i = quitados.current.get(p.id) ?? 0; return L.some((x) => x.id === p.id) ? L : [...L.slice(0, i), p, ...L.slice(i)]; }),
    (autor) => setPubs((L) => L.filter((x) => x.autor.id !== autor)));
  const ir = (f: Partial<Filtros>) => {
    const n = { ...filtros, ...f }, q = new URLSearchParams();
    if (n.tab === "sig") q.set("t", "sig"); if (n.kind) q.set("k", n.kind); if (n.dist) q.set("d", String(n.dist)); if (n.orden === "new") q.set("o", "new");
    router.push(`${ruta}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  const verMas = async () => {
    if (!mas || cargando) return;
    setCargando(true);
    const r = await comPagina(filtros, mas).catch(() => null);
    setCargando(false);
    if (r && r.ok && "pubs" in r) { setPubs((L) => [...L, ...r.pubs.filter((p) => !L.some((x) => x.id === p.id))]); setMas(r.mas); }
    else ui.setAviso({ t: E2("No se pudo cargar. Revisa tu conexión.", "Could not load. Check your connection.") });
  };
  const chips: [string, string, Partial<Filtros>, boolean][] = [
    ["todo", E2("Todo", "All"), { tab: "todo", kind: null }, filtros.tab === "todo" && !filtros.kind], ["sig", E2("Siguiendo", "Following"), { tab: "sig", kind: null }, filtros.tab === "sig"],
    ["pregunta", E2("Preguntas", "Questions"), { tab: "todo", kind: "pregunta" }, filtros.kind === "pregunta"], ["recomendacion", E2("Recomendaciones", "Recommendations"), { tab: "todo", kind: "recomendacion" }, filtros.kind === "recomendacion"],
    ["encuesta", E2("Encuestas", "Polls"), { tab: "todo", kind: "encuesta" }, filtros.kind === "encuesta"], ["publicacion", E2("Publicaciones", "Posts"), { tab: "todo", kind: "publicacion" }, filtros.kind === "publicacion"],
  ];
  const filtOn = !!filtros.dist || filtros.orden === "new";
  const hojaFiltros = () => ui.setHoja({ title: E2("Qué ves primero", "What you see first"), sub: E2(`Ves lo de ${ciudad}. Elige qué tan cerca y en qué orden.`, `You see ${ciudad}. Pick how close and in what order.`), listo: E2("Listo", "Done"),
    rows: [...([0, 5, 10, 30] as const).map((n) => ({ t: n ? E2(`A ${n} millas de mí`, `Within ${n} miles of me`) : E2(`Toda ${ciudad}`, `All of ${ciudad}`), ring: filtros.dist === n, on: () => { ui.setHoja(null); ir({ dist: n }); } })),
      ...([["top", E2("Más votados primero", "Top voted first")], ["new", E2("Lo más reciente primero", "Newest first")]] as const).map(([k, t], i) => ({ t, ring: filtros.orden === k, sep: i === 0, on: () => { ui.setHoja(null); ir({ orden: k }); } }))] });
  const vacio = filtros.tab === "sig"
    ? { t: E2("Todavía no sigues a nadie", "You are not following anyone yet"), s: E2("Cuando sigas a vecinos, aquí verás lo que publican, aunque estén en otra ciudad.", "When you follow neighbors, their posts show here, even from another city."), cta: false }
    : filtOn || filtros.kind ? { t: E2("Nada con ese filtro", "Nothing with that filter"), s: E2("Prueba con otra distancia o con «Todo».", "Try another distance or «All»."), cta: false }
    : { t: E2("Aún no hay nada aquí", "Nothing here yet"), s: E2("Sé el primero: pregunta o recomienda a alguien. Los puntos llegan cuando otros votan.", "Be the first: ask or recommend someone. Points come when others vote."), cta: true };
  const conHoy = hoy.length > 0 && filtros.tab === "todo" && !filtros.kind;
  const hoyFila = !conHoy ? null : (
    <div data-screen-label="Comunidad · Hoy en el barrio" style={{ padding: "18px 0", borderBottom: LINE, background: "var(--tl-paper)" }}>
      <HoyCarrusel es={es} historias={hoy} titulo={E2("Hoy en el barrio", "Today nearby")} dot="var(--tl-open)" verTodo="/comunidad/hoy"
        sub={E2("LO QUE TRAEN HOY LOS NEGOCIOS · SE BORRA A LAS 24 H", "WHAT BUSINESSES HAVE TODAY · GONE IN 24 H")} ancho={190} alto={250} />
    </div>
  );
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-FEED" titulo={E2("Comunidad", "Community")} sub={`${ciudad.toUpperCase()}${yo.invitado ? E2(` · INVITADO · DE ${yo.invitado.toUpperCase()}`, ` · VISITOR · FROM ${yo.invitado.toUpperCase()}`) : ""}`}>
      <div data-screen-label="APP-COM-FEED · conversación" style={{ background: "var(--tl-white)", borderRadius: 0, maxWidth: 720, overflow: "hidden" }} className="lg:rounded-[20px] lg:border lg:border-ink/[.08]">
        <div data-screen-label="Comunidad · publicar" style={{ padding: "16px 20px", borderBottom: LINE }}>
          <div role="link" aria-label={E2("Publicar", "Post")} onClick={() => router.push("/comunidad/nuevo")} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
            <Avatar foto={yo.foto} ini={yo.ini} />
            <div style={{ flex: 1, minWidth: 0, height: 44, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, background: "var(--tl-paper)", border: "1px solid rgba(11,14,18,.08)", display: "flex", alignItems: "center", font: "500 14px Manrope,sans-serif", color: "rgba(11,14,18,.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{E2(`¿Qué pasa en tu cuadra, ${yo.primer}?`, `What's happening on your block, ${yo.primer}?`)}</div>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: "var(--tl-ink)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="plus" size={18} strokeWidth={2.4} color="var(--tl-white)" /></span>
          </div>
        </div>
        <div className="hs" style={{ padding: "12px 20px", display: "flex", gap: 7, overflowX: "auto", borderBottom: LINE }}>
          <span role="button" aria-label={E2("Filtros", "Filters")} onClick={hojaFiltros} style={{ flex: "none", width: 34, height: 34, boxSizing: "border-box", borderRadius: 999, border: `1px solid ${filtOn ? "var(--tl-action)" : "rgba(11,14,18,.12)"}`, background: filtOn ? "rgba(75,55,245,.08)" : "var(--tl-white)", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icon name="filter" size={15} color={filtOn ? "var(--tl-action)" : "var(--tl-ink)"} />
          </span>
          {chips.map(([k, l, f, on]) => <Chip key={k} variant={on ? "selected" : "filter"} onClick={() => ir(f)}>{l}</Chip>)}
        </div>
        {filtOn && (
          <div style={{ padding: "10px 20px", borderBottom: LINE, font: `600 9.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>
            {`${filtros.dist ? E2(`A ${filtros.dist} MI DE TI`, `WITHIN ${filtros.dist} MI`) : ciudad.toUpperCase()} · ${filtros.orden === "new" ? E2("RECIENTES", "NEWEST") : E2("MÁS VOTADOS", "TOP VOTED")}`}
          </div>
        )}
        {pubs.map((p, i) => (<Fragment key={p.id}>
          {/* 5e · Hoy en el barrio dentro del muro, después de la segunda publicación (prototipo feedV rows.splice(2, 0, hoy)). */}
          {i === 2 && hoyFila}
          <Tarjeta p={p} es={es} tr={tr} onOpen={() => router.push(`/comunidad/p/${p.id}`)} onMenu={() => acc.menu(p)} onAuthor={p.autor.id && !p.autor.oficial ? () => router.push(`/comunidad/v/${p.autor.id}`) : undefined} onVote={(v) => void acc.votar(p, v)} onPoll={(i) => void acc.encuesta(p, i)}
            onSave={() => void acc.guardar(p)} onShare={() => void acc.compartir(p)} onBiz={(id) => router.push(`/n/${id}`)} />
        </Fragment>))}
        {pubs.length > 0 && pubs.length <= 2 && hoyFila}
        {!pubs.length && (
          <div data-screen-label="Comunidad · vacío" style={{ padding: "26px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ font: "800 18px/1.25 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{vacio.t}</div>
            <div style={{ font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{vacio.s}</div>
            {vacio.cta && abierta && <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="plus" onClick={() => router.push("/comunidad/nuevo")}>{E2("Publicar", "Post")}</Button></div>}
          </div>
        )}
        {mas && (
          <div style={{ padding: "16px 20px 20px", display: "flex", justifyContent: "center" }}>
            <Button variant="secondary" size="md" disabled={cargando} onClick={verMas}>{cargando ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button>
          </div>
        )}
      </div>
    </Marco>
  );
}
