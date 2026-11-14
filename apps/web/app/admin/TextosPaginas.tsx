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
import { legalPublicar, legalRetirar, legalRevisada } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const ESTADO: Record<string, string> = { borrador: "BORRADOR", revisado: "REVISADA", publicado: "PUBLICADA", retirado: "RETIRADA" };
const TONO: Record<string, string> = { borrador: "neutral", revisado: "action", publicado: "signal", retirado: "neutral" };
const ACCION: Record<string, string> = { indexada: "Desplegada", revisada: "Revisada por el abogado", publicada: "Publicada", retirada: "Retirada" };
const ACEPTABLES = new Set(["terminos", "privacidad"]);
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

type Det = { versiones: VersionAdm[]; log: LogLegal[] };
export function TextosPaginas({ d, k, j, det, dif, editar, aprobar }: {
  d: DatosPaginasAdm; k: string | null; j: string; det: Det | null; dif: { a: string; b: string; lang: "es" | "en"; r: Renglon[] } | null; editar: boolean; aprobar: boolean;
}) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<(Confirmar & { revisar?: string }) | null>(null), [toast, setToast] = useToast();
  const [despacho, setDespacho] = useState(""), [fecha, setFecha] = useState(hoy());
  const rev = useRef({ despacho: "", fecha: "" }); rev.current = { despacho, fecha };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  const ir = (q: Record<string, string | null>) => { const x = new URLSearchParams(); for (const [a, b] of Object.entries(q)) if (b) x.set(a, b); router.push(x.size ? `/admin/textos/paginas?${x}` : "/admin/textos/paginas", { scroll: false }); };
  const tabs: Bloque = { type: "tabs", items: [{ l: "Ayuda", on: false, onClick: () => router.push("/admin/textos") }, { l: "Páginas", on: true, onClick: () => ir({}) }] };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "TEXTOS Y PÁGINAS · PÁGINAS", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      {conf.revisar ? <PanelBloques bloques={[
        { type: "field", k: "DESPACHO QUE LA REVISÓ", val: despacho, onChange: setDespacho, ph: "Nombre del despacho", max: 200, count: `${despacho.length}/200` },
        { type: "field", k: "FECHA DE LA REVISIÓN (AAAA-MM-DD)", val: fecha, onChange: setFecha, ph: "2026-11-14", max: 10 },
      ]} /> : null}
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const kp = d.kpi;
  const cab: Bloque[] = [
    { type: "head", eye: "CONTROL", t: "Textos y páginas", s: "Las páginas legales de docs/legal/, como están desplegadas. El texto se corrige en el repo; aquí se marca la revisión del abogado, se publica y se retira.", h1: desk ? 26 : 22 },
    tabs,
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "PUBLICADAS", v: String(kp.publicadas), s: kp.publicadas ? "versiones en vigor o reemplazadas" : "ninguna todavía", bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "BORRADORES", v: String(kp.borradores), s: "pendientes de revisión legal" },
      { k: "REVISADAS", v: String(kp.revisadas), s: "por el abogado, sin publicar" },
      { k: "ACEPTACIONES", v: String(kp.aceptaciones), s: "solo cifras, sin personas" },
    ] },
    { type: "note", tone: kp.produccion ? "warn" : "info", icon: "shield", t: kp.produccion
      ? "Producción: una página legal se publica solo revisada por el abogado (la base lo impide si no)."
      : "Sandbox: se puede publicar un borrador para probar. En producción, solo lo revisado por el abogado." },
  ];

  // ── Una página: sus versiones ──
  if (k && det) {
    const t = det.versiones[0]?.title.es ?? k;
    const pub = det.versiones.find((v) => v.status === "publicado");
    const acts = (v: VersionAdm, i: number) => {
      const antes = det.versiones[i + 1];
      const base = pub && pub.id !== v.id ? pub : antes;
      return [
        ...(base ? [{ label: base === pub ? "Diferencias con la publicada" : "Diferencias con la anterior", variant: "secondary", onClick: () => ir({ k, j, dif: v.id, con: base.id }) }] : []),
        ...(editar && v.status === "borrador" ? [{ label: "Marcar revisada", variant: "secondary", onClick: () => setConf({ titulo: `Revisada por el abogado · versión ${v.version}`, cta: "Marcar revisada", revisar: v.id,
          sub: "Escribe el despacho y la fecha de su revisión. Queda en el historial y en la auditoría; no se puede cambiar después.",
          plantillas: ["Revisión del Paquete 9-2.", "El abogado aprobó este texto."], hacer: (m) => legalRevisada(v.id, rev.current.despacho, rev.current.fecha, m) }) }] : []),
        ...(aprobar && (v.status === "borrador" || v.status === "revisado") ? [{ label: "Publicar", variant: "primary", onClick: () => setConf({ titulo: `Publicar · ${v.title.es} · versión ${v.version}`, cta: "Publicar",
          sub: v.reviewed_by_counsel ? `Revisada por ${v.reviewed_by_counsel}. Se publica ahora; queda en el historial con tu motivo.` : "Sin la revisión del abogado: solo se puede en el sandbox. Queda en el historial con tu motivo.",
          elegir: ACEPTABLES.has(k) ? { label: "¿PIDE ACEPTAR OTRA VEZ?", items: [{ k: "si", l: "Sí: quien entre la acepta (la hoja)" }, { k: "no", l: "No" }] } : undefined,
          plantillas: ["Versión revisada por el abogado.", "Cambio pedido por el abogado.", "Prueba en el sandbox."], hacer: (m, e) => legalPublicar(v.id, m, e === "si") }) }] : []),
        ...(aprobar && v.status !== "retirado" ? [{ label: "Retirar", variant: "secondary", onClick: () => setConf({ titulo: `Retirar · versión ${v.version}`, cta: "Retirar", peligro: true,
          sub: v.status === "publicado" ? "Deja de verse; vuelve a verse la publicada anterior (o el aviso de «en revisión»). Nada se borra." : "Deja de estar disponible para publicar. Nada se borra.",
          plantillas: ["Tenía un error.", "La reemplaza otra versión.", "Fin de la prueba en el sandbox."], hacer: (m) => legalRetirar(v.id, m) }) }] : []),
      ];
    };
    const filas = det.versiones.map((v, i) => ({ icon: v.status === "publicado" ? "check" : v.status === "revisado" ? "shield" : v.status === "retirado" ? "ban" : "edit",
      title: `Versión ${v.version} · ${v.title.es}`, tag: v.status === "publicado" && pub?.id !== v.id ? "REEMPLAZADA" : ESTADO[v.status], tone: TONO[v.status],
      sub: [`texto del ${v.text_date}`, `sha ${v.sha}`, `${v.aceptaciones} ${v.aceptaciones === 1 ? "aceptación" : "aceptaciones"}`,
        v.reviewed_by_counsel ? `revisada por ${v.reviewed_by_counsel} el ${v.reviewed_at}${v.revisoQuien ? ` (lo anotó ${v.revisoQuien})` : ""}` : "sin revisión del abogado",
        v.publicada ? `publicada ${cuando(v.publicada)}${v.publicoQuien ? ` por ${v.publicoQuien}` : ""}: ${v.publish_reason ?? ""}` : null,
        v.force_accept ? "pide aceptar otra vez" : null, v.retired_at ? `retirada ${cuando(v.retired_at)}` : null].filter(Boolean).join(" · "),
      actions: acts(v, i) }));
    const bl: Bloque[] = [{ type: "head", eye: "TEXTOS Y PÁGINAS · PÁGINAS", t: `${t} · ${j}`, s: det.versiones[0]?.source_path ?? "", onBack: () => ir({}), h1: desk ? 26 : 22 }, tabs, cab[3]!];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-legal-admin={k}>
        <PanelBloques bloques={bl} h1={desk ? 26 : 22} />
        <A.AdminList label={`${det.versiones.length} ${det.versiones.length === 1 ? "VERSIÓN" : "VERSIONES"}`} rows={filas} />
        {dif ? <PanelBloques bloques={[
          { type: "group", k: `DIFERENCIAS · VERSIÓN ${det.versiones.find((v) => v.id === dif.a)?.version ?? "?"} → ${det.versiones.find((v) => v.id === dif.b)?.version ?? "?"} · ${dif.lang.toUpperCase()}`,
            link: dif.lang === "es" ? "Ver en inglés" : "Ver en español", onLink: () => ir({ k, j, dif: dif.b, con: dif.a, l: dif.lang === "es" ? "en" : null }), link2: "Cerrar", onLink2: () => ir({ k, j }) },
          { type: "rows", items: soloCambios(dif.r).map((x, i) => ({ key: `d${i}`, icon: x.t === "+" ? "plus" : x.t === "-" ? "minus" : "info", t: x.l || " ", compact: true, chev: false,
            tFg: x.t === "+" ? "var(--tl-open-text)" : x.t === "-" ? "var(--tl-danger)" : "rgba(11,14,18,.5)" })) },
        ]} /> : null}
        <PanelBloques bloques={[
          { type: "rows", k: "HISTORIAL", items: det.log.length ? det.log.map((l, i) => ({ key: `l${i}`, icon: l.action === "publicada" ? "check" : l.action === "retirada" ? "ban" : l.action === "revisada" ? "shield" : "folder",
            t: `${ACCION[l.action] ?? l.action} · versión ${l.version}`, s: `${cuando(l.at)}${l.quien ? ` · ${l.quien}` : " · despliegue"}${l.reason ? ` · ${l.reason}` : ""}`, chev: false, compact: true })) : [{ key: "x", icon: "folder", t: "Sin movimientos", chev: false }] },
          { type: "note", tone: "info", icon: "info", t: "Cada despliegue vuelve a leer docs/legal/: un archivo que cambió es una versión nueva en borrador (el texto de una versión nunca cambia). Las aceptaciones se cuentan por versión; aquí nunca se ve quién aceptó." },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>);
  }

  // ── La lista ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length} PÁGINAS`} rows={d.filas.map((x) => ({ icon: x.jurisdiction === "us" ? "edit" : "pin",
        title: `${x.title.es}${x.jurisdiction === "us" ? "" : ` · ${x.jurisdiction.slice(3).toUpperCase()}`}`,
        sub: [`/${x.key}`, x.jurisdiction, `última v${x.ultima} (${(ESTADO[x.estado] ?? x.estado).toLowerCase()})`,
          x.vigente ? `vigente v${x.vigente} desde ${cuando(x.vigenteDesde)}${x.forzar ? " · pide aceptar otra vez" : ""}` : "nada publicado",
          x.revisada ? `revisada por ${x.revisada}` : null, `${x.aceptaciones} ${x.aceptaciones === 1 ? "aceptación" : "aceptaciones"}`].filter(Boolean).join(" · "),
        tag: ESTADO[x.estado], tone: TONO[x.estado], onClick: () => ir({ k: x.key, j: x.jurisdiction }),
        actions: [{ label: "Versiones", variant: "secondary", onClick: () => ir({ k: x.key, j: x.jurisdiction }) }, { label: "Ver", variant: "secondary", onClick: () => window.open(`/${x.key}`, "_blank", "noopener") }] }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "edit", t: "Todavía no hay páginas", s: "El despliegue indexa docs/legal/ (scripts/legal/indexar.mjs)." }]} />}
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
  return out.length ? out : [{ t: "=", l: "Sin diferencias en el texto." }];
}
