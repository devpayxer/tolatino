import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { menuPanel } from "@/lib/menu";
import { accesoPanel, datosPanel } from "@/lib/panel";
import { Panel, type Ruta } from "../../Panel";

/* /panel/{negocio} = Tu página · /panel/{negocio}/hoy = Hoy · /panel/{negocio}/pagina/{apartado} = un apartado de
   Tu página · ?det= abre el detalle (columna en escritorio, pantalla en el teléfono). El servidor decide quién entra. */
const SUBS = new Set(["hor", "fotos", "about", "equipo", "ver", "lic"]);
const DET = /^(stf:(new|[0-9a-f-]{36})|(item|mcat|mgrp):(new|\d{1,18}))$/;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; r?: string[] }>; searchParams: Promise<{ det?: string }> }) {
  const [{ id, r = [] }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/panel/${id}${r.length ? `/${r.join("/")}` : ""}`)}`);
  let ruta: Ruta;
  if (r.length === 0) ruta = { sec: "pag", sub: null, det: null };
  else if (r.length === 1 && r[0] === "hoy") ruta = { sec: "hoy", sub: null, det: null };
  else if (r.length === 2 && r[0] === "pagina" && SUBS.has(r[1]!)) ruta = { sec: "pag", sub: r[1]!, det: null };
  else if (r.length === 1 && r[0] === "vendes") ruta = { sec: "mod", sub: null, det: null };
  else if (r.length === 2 && r[0] === "vendes" && r[1] === "menu") ruta = { sec: "mod", sub: "menu", det: null };
  else notFound();
  if (typeof sp.det === "string" && DET.test(sp.det)) ruta.det = sp.det;
  const acc = await accesoPanel(id, ruta.sec === "hoy" ? "ord" : ruta.sec === "mod" ? "cat" : "page");
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
  return <Panel d={d} lang={lang} ruta={ruta} modoPruebas={process.env.TOLATINO_ENTORNO !== "produccion"} menu={menu} />;
}
