import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { menuPanel } from "@/lib/menu";
import { ajustesPedidos, pedidoNegocio, pedidosHoy, pedidosLista, type FiltroPed } from "@/lib/pedidos";
import type { PedPanel } from "../../Pedidos";
import { accesoPanel, datosPanel } from "@/lib/panel";
import { Panel, type Ruta } from "../../Panel";

/* /panel/{negocio} = Tu página · /panel/{negocio}/hoy = Hoy · /panel/{negocio}/pagina/{apartado} = un apartado de
   Tu página · ?det= abre el detalle (columna en escritorio, pantalla en el teléfono). El servidor decide quién entra. */
const SUBS = new Set(["hor", "fotos", "about", "equipo", "ver", "lic"]);
const DET = /^(stf:(new|[0-9a-f-]{36})|(item|mcat|mgrp):(new|\d{1,18})|ped:\d{1,12})$/;
const FILTROS = new Set(["all", "pend", "cur", "done", "no"]);

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; r?: string[] }>; searchParams: Promise<{ det?: string; f?: string; q?: string; antes?: string }> }) {
  const [{ id, r = [] }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/panel/${id}${r.length ? `/${r.join("/")}` : ""}`)}`);
  let ruta: Ruta;
  if (r.length === 0) ruta = { sec: "pag", sub: null, det: null };
  else if (r.length === 1 && r[0] === "hoy") ruta = { sec: "hoy", sub: null, det: null };
  else if (r.length === 1 && r[0] === "clientes") ruta = { sec: "cli", sub: null, det: null };
  else if (r.length === 2 && r[0] === "pagina" && SUBS.has(r[1]!)) ruta = { sec: "pag", sub: r[1]!, det: null };
  else if (r.length === 1 && r[0] === "vendes") ruta = { sec: "mod", sub: null, det: null };
  else if (r.length === 2 && r[0] === "vendes" && (r[1] === "menu" || r[1] === "pedidos")) ruta = { sec: "mod", sub: r[1], det: null };
  else notFound();
  if (typeof sp.det === "string" && DET.test(sp.det)) ruta.det = sp.det;
  const acc = await accesoPanel(id, ruta.sec === "hoy" || ruta.sec === "cli" ? "ord" : ruta.sec === "mod" ? "cat" : "page");
  if (!acc) {
    const es = lang === "es";
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-2 px-5">
        <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">{es ? "SIN ACCESO" : "NO ACCESS"}</span>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.04em]">{es ? "Sin acceso a esta área" : "No access to this area"}</h1>
        <p className="text-[13.5px] text-text-2">{es ? "Pídele acceso al dueño del negocio." : "Ask the business owner for access."}</p>
      </main>
    );
  }
  const d = await datosPanel(acc, lang);
  if (!d) notFound();
  // Lo que vendes · Menú (Comida): el menú del negocio, calculado en el servidor.
  const menu = ruta.sec === "mod" && d.cat === "NEG-FOOD" ? await menuPanel(d.id) : undefined;
  // Pedidos (Comida): lo que pide cada sección, y el detalle solo con acceso a «Hoy y pedidos».
  const food = d.cat === "NEG-FOOD", ord = acc.partes.includes("all") || acc.partes.includes("ord");
  if (ruta.det?.startsWith("ped:") && !(food && ord)) ruta.det = null;
  const f = (FILTROS.has(sp.f ?? "") ? sp.f : "all") as FiltroPed, q = typeof sp.q === "string" ? sp.q.slice(0, 40) : "";
  const ped: PedPanel | undefined = food ? {
    hoy: ruta.sec === "hoy" || (ruta.sec === "mod" && ruta.sub === "pedidos") ? await pedidosHoy(d.id) : undefined,
    lista: ruta.sec === "cli" ? await pedidosLista(d.id, f, q, typeof sp.antes === "string" ? sp.antes : null) : undefined, f, q,
    det: ruta.det?.startsWith("ped:") ? await pedidoNegocio(d.id, ruta.det.slice(4)) : undefined,
    aj: ruta.sec === "mod" ? await ajustesPedidos(d.id) : undefined,
  } : undefined;
  return <Panel d={d} lang={lang} ruta={ruta} modoPruebas={process.env.TOLATINO_ENTORNO !== "produccion"} menu={menu} ped={ped} />;
}
