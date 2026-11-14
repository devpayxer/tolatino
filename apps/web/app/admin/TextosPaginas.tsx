"use client";
/* 9e · Super Admin › Textos y páginas › Páginas (fase9-apertura.md §4 9e; el repo es la fuente, como la Ayuda). Cifras (publicadas, borradores,
   revisadas por el abogado, aceptaciones), la lista de páginas (AdminList) y, al abrir una, sus versiones con su estado, quién revisó, quién
   publicó y por qué, si pide aceptar otra vez y cuántas aceptaciones tiene (solo cifras, nunca personas); las diferencias entre dos versiones por
   renglón; y las acciones con motivo (ConfirmarMotivo, patrón 2ao): Marcar revisada (despacho y fecha), Publicar (Términos y Privacidad: ¿pide
   aceptar otra vez?) y Retirar. En producción solo se publica lo revisado (aquí y en la base). Compuesto con piezas existentes (REVISION 9e). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { DatosPaginasAdm, LogLegal, Renglon, VersionAdm } from "@/lib/legal";
import { legalPublicar, legalRetirar, legalRevisada, pieFijar } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { par, pestanas, selectorIdioma, type L } from "./TextosComun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const TONO: Record<string, string> = { borrador: "neutral", revisado: "action", publicado: "signal", retirado: "neutral" };
const ACEPTABLES = new Set(["terminos", "privacidad"]);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

type Det = { versiones: VersionAdm[]; log: LogLegal[] };
export function TextosPaginas({ d, adm, pie, k, j, det, dif, editar, aprobar }: {
  d: DatosPaginasAdm; adm: L; pie: boolean; k: string | null; j: string; det: Det | null; dif: { a: string; b: string; lang: "es" | "en"; r: Renglon[] } | null; editar: boolean; aprobar: boolean;
}) {
  const E = par(adm), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const ESTADO: Record<string, string> = { borrador: E("BORRADOR", "DRAFT"), revisado: E("REVISADA", "REVIEWED"), publicado: E("PUBLICADA", "PUBLISHED"), retirado: E("RETIRADA", "RETIRED") };
  const ACCION: Record<string, string> = { indexada: E("Desplegada", "Deployed"), revisada: E("Revisada por el abogado", "Reviewed by the lawyer"), publicada: E("Publicada", "Published"), retirada: E("Retirada", "Retired") };
  const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat(adm === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
  const [conf, setConf] = useState<(Confirmar & { revisar?: string }) | null>(null), [toast, setToast] = useToast();
  const [despacho, setDespacho] = useState(""), [fecha, setFecha] = useState(hoy());
  const rev = useRef({ despacho: "", fecha: "" }); rev.current = { despacho, fecha };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (q: Record<string, string | null>) => { const x = new URLSearchParams(); for (const [a, b] of Object.entries(q)) if (b) x.set(a, b); router.push(x.size ? `/admin/textos/paginas?${x}` : "/admin/textos/paginas", { scroll: false }); };
  const tabs: Bloque = pestanas(adm, "paginas", router);

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · PÁGINAS", "COPY AND PAGES · PAGES"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      {conf.revisar ? <PanelBloques bloques={[
        { type: "field", k: E("DESPACHO QUE LA REVISÓ", "FIRM THAT REVIEWED IT"), val: despacho, onChange: setDespacho, ph: E("Nombre del despacho", "Firm name"), max: 200, count: `${despacho.length}/200` },
        { type: "field", k: E("FECHA DE LA REVISIÓN (AAAA-MM-DD)", "REVIEW DATE (YYYY-MM-DD)"), val: fecha, onChange: setFecha, ph: "2026-11-14", max: 10 },
      ]} /> : null}
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const kp = d.kpi;
  // El aviso de producción va en la lista y en cada página (donde se publica): por nombre, no por su lugar en la cabecera (9b-3: el selector de
  // idioma de 9f lo movió y la página mostraba las cifras en su lugar; guardián bloquePorNombre).
  const nota: Bloque = { type: "note", tone: kp.produccion ? "warn" : "info", icon: "shield", t: kp.produccion
    ? E("Producción: una página legal se publica solo revisada por el abogado (la base lo impide si no).", "Production: a legal page is only published once reviewed by the lawyer (the database blocks it otherwise).")
    : E("Sandbox: se puede publicar un borrador para probar. En producción, solo lo revisado por el abogado.", "Sandbox: a draft can be published to test. In production, only what the lawyer reviewed.") };
  const cab: Bloque[] = [
    { type: "head", eye: "CONTROL", t: E("Textos y páginas", "Copy and pages"), s: E("Las páginas legales de docs/legal/, como están desplegadas. El texto se corrige en el repo; aquí se marca la revisión del abogado, se publica y se retira.", "The legal pages in docs/legal/, as deployed. The text is fixed in the repo; here you mark the lawyer’s review, publish and retire."), h1: desk ? 26 : 22 },
    tabs,
    selectorIdioma(adm, router),
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("PUBLICADAS", "PUBLISHED"), v: String(kp.publicadas), s: kp.publicadas ? E("versiones en vigor o reemplazadas", "versions in force or replaced") : E("ninguna todavía", "none yet"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("BORRADORES", "DRAFTS"), v: String(kp.borradores), s: E("pendientes de revisión legal", "pending legal review") },
      { k: E("REVISADAS", "REVIEWED"), v: String(kp.revisadas), s: E("por el abogado, sin publicar", "by the lawyer, not published") },
      { k: E("ACEPTACIONES", "ACCEPTANCES"), v: String(kp.aceptaciones), s: E("solo cifras, sin personas", "numbers only, no people") },
    ] },
    nota,
  ];

  // ── Una página: sus versiones ──
  if (k && det) {
    const t = det.versiones[0]?.title[adm] ?? k;
    const pub = det.versiones.find((v) => v.status === "publicado");
    const acts = (v: VersionAdm, i: number) => {
      const antes = det.versiones[i + 1];
      const base = pub && pub.id !== v.id ? pub : antes;
      return [
        ...(base ? [{ label: base === pub ? E("Diferencias con la publicada", "Differences with the published one") : E("Diferencias con la anterior", "Differences with the previous one"), variant: "secondary", onClick: () => ir({ k, j, dif: v.id, con: base.id }) }] : []),
        ...(editar && v.status === "borrador" ? [{ label: E("Marcar revisada", "Mark reviewed"), variant: "secondary", onClick: () => setConf({ titulo: E(`Revisada por el abogado · versión ${v.version}`, `Reviewed by the lawyer · version ${v.version}`), cta: E("Marcar revisada", "Mark reviewed"), revisar: v.id,
          sub: E("Escribe el despacho y la fecha de su revisión. Queda en el historial y en la auditoría; no se puede cambiar después.", "Write the firm and the date of its review. It goes in the history and the audit trail; it cannot be changed later."),
          plantillas: [E("Revisión del Paquete 9-2.", "Package 9-2 review."), E("El abogado aprobó este texto.", "The lawyer approved this text.")], hacer: (m) => legalRevisada(v.id, rev.current.despacho, rev.current.fecha, m) }) }] : []),
        ...(aprobar && (v.status === "borrador" || v.status === "revisado") ? [{ label: E("Publicar", "Publish"), variant: "primary", onClick: () => setConf({ titulo: `${E("Publicar", "Publish")} · ${v.title[adm]} · ${E("versión", "version")} ${v.version}`, cta: E("Publicar", "Publish"),
          sub: v.reviewed_by_counsel ? E(`Revisada por ${v.reviewed_by_counsel}. Se publica ahora; queda en el historial con tu motivo.`, `Reviewed by ${v.reviewed_by_counsel}. It is published now; it goes in the history with your reason.`) : E("Sin la revisión del abogado: solo se puede en el sandbox. Queda en el historial con tu motivo.", "Without the lawyer’s review: only possible in the sandbox. It goes in the history with your reason."),
          elegir: ACEPTABLES.has(k) ? { label: E("¿PIDE ACEPTAR OTRA VEZ?", "ASK TO ACCEPT AGAIN?"), items: [{ k: "si", l: E("Sí: quien entre la acepta (la hoja)", "Yes: whoever comes in accepts it (the sheet)") }, { k: "no", l: "No" }] } : undefined,
          plantillas: [E("Versión revisada por el abogado.", "Version reviewed by the lawyer."), E("Cambio pedido por el abogado.", "Change requested by the lawyer."), E("Prueba en el sandbox.", "Test in the sandbox.")], hacer: (m, e) => legalPublicar(v.id, m, e === "si") }) }] : []),
        ...(aprobar && v.status !== "retirado" ? [{ label: E("Retirar", "Retire"), variant: "secondary", onClick: () => setConf({ titulo: E(`Retirar · versión ${v.version}`, `Retire · version ${v.version}`), cta: E("Retirar", "Retire"), peligro: true,
          sub: v.status === "publicado" ? E("Deja de verse; vuelve a verse la publicada anterior (o el aviso de «en revisión»). Nada se borra.", "It stops showing; the previous published one shows again (or the “under review” notice). Nothing is deleted.") : E("Deja de estar disponible para publicar. Nada se borra.", "It is no longer available to publish. Nothing is deleted."),
          plantillas: [E("Tenía un error.", "It had an error."), E("La reemplaza otra versión.", "Another version replaces it."), E("Fin de la prueba en el sandbox.", "End of the sandbox test.")], hacer: (m) => legalRetirar(v.id, m) }) }] : []),
      ];
    };
    const filas = det.versiones.map((v, i) => ({ icon: v.status === "publicado" ? "check" : v.status === "revisado" ? "shield" : v.status === "retirado" ? "ban" : "edit",
      title: `${E("Versión", "Version")} ${v.version} · ${v.title[adm]}`, tag: v.status === "publicado" && pub?.id !== v.id ? E("REEMPLAZADA", "REPLACED") : ESTADO[v.status], tone: TONO[v.status],
      sub: [E(`texto del ${v.text_date}`, `text dated ${v.text_date}`), `sha ${v.sha}`, `${v.aceptaciones} ${v.aceptaciones === 1 ? E("aceptación", "acceptance") : E("aceptaciones", "acceptances")}`,
        v.reviewed_by_counsel ? E(`revisada por ${v.reviewed_by_counsel} el ${v.reviewed_at}${v.revisoQuien ? ` (lo anotó ${v.revisoQuien})` : ""}`, `reviewed by ${v.reviewed_by_counsel} on ${v.reviewed_at}${v.revisoQuien ? ` (noted by ${v.revisoQuien})` : ""}`) : E("sin revisión del abogado", "without the lawyer’s review"),
        v.publicada ? E(`publicada ${cuando(v.publicada)}${v.publicoQuien ? ` por ${v.publicoQuien}` : ""}: ${v.publish_reason ?? ""}`, `published ${cuando(v.publicada)}${v.publicoQuien ? ` by ${v.publicoQuien}` : ""}: ${v.publish_reason ?? ""}`) : null,
        v.force_accept ? E("pide aceptar otra vez", "asks to accept again") : null, v.retired_at ? E(`retirada ${cuando(v.retired_at)}`, `retired ${cuando(v.retired_at)}`) : null].filter(Boolean).join(" · "),
      actions: acts(v, i) }));
    const bl: Bloque[] = [{ type: "head", eye: E("TEXTOS Y PÁGINAS · PÁGINAS", "COPY AND PAGES · PAGES"), t: `${t} · ${j}`, s: det.versiones[0]?.source_path ?? "", onBack: () => ir({}), h1: desk ? 26 : 22 }, tabs, nota];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-legal-admin={k}>
        <PanelBloques bloques={bl} h1={desk ? 26 : 22} />
        <A.AdminList label={`${det.versiones.length} ${det.versiones.length === 1 ? E("VERSIÓN", "VERSION") : E("VERSIONES", "VERSIONS")}`} rows={filas} />
        {dif ? <PanelBloques bloques={[
          { type: "group", k: `${E("DIFERENCIAS · VERSIÓN", "DIFFERENCES · VERSION")} ${det.versiones.find((v) => v.id === dif.a)?.version ?? "?"} → ${det.versiones.find((v) => v.id === dif.b)?.version ?? "?"} · ${dif.lang.toUpperCase()}`,
            link: dif.lang === "es" ? E("Ver en inglés", "View in English") : E("Ver en español", "View in Spanish"), onLink: () => ir({ k, j, dif: dif.b, con: dif.a, l: dif.lang === "es" ? "en" : null }), link2: E("Cerrar", "Close"), onLink2: () => ir({ k, j }) },
          { type: "rows", items: soloCambios(dif.r).map((x, i) => ({ key: `d${i}`, icon: x.t === "+" ? "plus" : x.t === "-" ? "minus" : "info", t: x.l || " ", compact: true, chev: false,
            tFg: x.t === "+" ? "var(--tl-open-text)" : x.t === "-" ? "var(--tl-danger)" : "rgba(11,14,18,.5)" })) },
        ]} /> : null}
        <PanelBloques bloques={[
          { type: "rows", k: E("HISTORIAL", "HISTORY"), items: det.log.length ? det.log.map((l, i) => ({ key: `l${i}`, icon: l.action === "publicada" ? "check" : l.action === "retirada" ? "ban" : l.action === "revisada" ? "shield" : "folder",
            t: `${ACCION[l.action] ?? l.action} · ${E("versión", "version")} ${l.version}`, s: `${cuando(l.at)}${l.quien ? ` · ${l.quien}` : E(" · despliegue", " · deploy")}${l.reason ? ` · ${l.reason}` : ""}`, chev: false, compact: true })) : [{ key: "x", icon: "folder", t: E("Sin movimientos", "No activity"), chev: false }] },
          { type: "note", tone: "info", icon: "info", t: E("Cada despliegue vuelve a leer docs/legal/: un archivo que cambió es una versión nueva en borrador (el texto de una versión nunca cambia). Las aceptaciones se cuentan por versión; aquí nunca se ve quién aceptó.", "Every deploy reads docs/legal/ again: a file that changed becomes a new draft version (the text of a version never changes). Acceptances are counted per version; you never see who accepted here.") },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>);
  }

  // ── La lista ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length} ${E("PÁGINAS", "PAGES")}`} rows={d.filas.map((x) => ({ icon: x.jurisdiction === "us" ? "edit" : "pin",
        title: `${x.title[adm]}${x.jurisdiction === "us" ? "" : ` · ${x.jurisdiction.slice(3).toUpperCase()}`}`,
        sub: [`/${x.key}`, x.jurisdiction, E(`última v${x.ultima} (${(ESTADO[x.estado] ?? x.estado).toLowerCase()})`, `latest v${x.ultima} (${(ESTADO[x.estado] ?? x.estado).toLowerCase()})`),
          x.vigente ? E(`vigente v${x.vigente} desde ${cuando(x.vigenteDesde)}${x.forzar ? " · pide aceptar otra vez" : ""}`, `in force v${x.vigente} since ${cuando(x.vigenteDesde)}${x.forzar ? " · asks to accept again" : ""}`) : E("nada publicado", "nothing published"),
          x.revisada ? E(`revisada por ${x.revisada}`, `reviewed by ${x.revisada}`) : null, `${x.aceptaciones} ${x.aceptaciones === 1 ? E("aceptación", "acceptance") : E("aceptaciones", "acceptances")}`].filter(Boolean).join(" · "),
        tag: ESTADO[x.estado], tone: TONO[x.estado], onClick: () => ir({ k: x.key, j: x.jurisdiction }),
        actions: [{ label: E("Versiones", "Versions"), variant: "secondary", onClick: () => ir({ k: x.key, j: x.jurisdiction }) }, { label: E("Ver", "View"), variant: "secondary", onClick: () => window.open(`/${x.key}`, "_blank", "noopener") }] }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "edit", t: E("Todavía no hay páginas", "There are no pages yet"), s: E("El despliegue indexa docs/legal/ (scripts/legal/indexar.mjs).", "The deploy indexes docs/legal/ (scripts/legal/indexar.mjs).") }]} />}
      <PanelBloques bloques={[
        { type: "rows", k: E("PIE DE LA WEB", "WEB FOOTER"), items: [{ key: "pie", icon: pie ? "check" : "ban", t: pie ? E("El pie sale en el Inicio, la ficha y Buscar", "The footer shows on Home, the listing and Search") : E("El pie sale solo en las páginas legales", "The footer shows only on the legal pages"),
          s: E("Términos, Privacidad, Ayuda y Soporte al final de cada pantalla pública. Encenderlo cambia las capturas aprobadas de la tubería: antes, tu OK con las capturas nuevas.", "Terms, Privacy, Help and Support at the end of each public screen. Turning it on changes the pipeline’s approved screenshots: get your OK on the new ones first."),
          tag: pie ? E("ENCENDIDO", "ON") : E("APAGADO", "OFF"), tone: pie ? "signal" : "neutral", chev: false,
          acts: aprobar ? [{ l: pie ? E("Apagar el pie", "Turn the footer off") : E("Encender el pie", "Turn the footer on"), v: "secondary", onClick: () => setConf({ titulo: pie ? E("Apagar el pie de la web", "Turn the web footer off") : E("Encender el pie de la web", "Turn the web footer on"), cta: pie ? E("Apagar", "Turn off") : E("Encender", "Turn on"),
            sub: E("Lo ven todos los que entran. Queda en el historial con tu motivo.", "Everyone who comes in sees it. It goes in the history with your reason."), plantillas: [E("Capturas nuevas aprobadas.", "New screenshots approved."), E("Volver a lo de antes.", "Back to how it was.")], hacer: (m) => pieFijar(!pie, m) }) }] : undefined }] },
      ]} />
      <Toast t={toast} desk={desk} />
    </div>);
}

/* Solo lo que cambió, con un renglón de contexto antes y después (las páginas son largas; el resto es igual). */
function soloCambios(todos: Renglon[]): Renglon[] {
  const r = todos.filter((x) => x.l.trim() !== ""); // los renglones en blanco no dicen nada
  const ver = new Set<number>();
  r.forEach((x, i) => { if (x.t !== "=") for (let k = Math.max(0, i - 1); k <= Math.min(r.length - 1, i + 1); k++) ver.add(k); });
  const out: Renglon[] = [];
  let ultimo = -2;
  for (const i of [...ver].sort((a, b) => a - b)) { if (ultimo >= 0 && i > ultimo + 1) out.push({ t: "=", l: "…" }); out.push(r[i]!); ultimo = i; }
  return out.length ? out : [{ t: "=", l: "—" }];
}
