"use client";
/* 7b · APP-SOPORTE («To'Latino Soporte.dc.html» tal cual). Teléfono: la lista (Escríbenos · TO'LATINO ESTÁ REVISANDO · TUS CASOS) y, al
   tocar, el caso nuevo o el caso a pantalla completa. Escritorio (≥ 960): la lista a la izquierda (360) y el caso a la derecha. El caso: su
   estado (RECIBIDO · LO ESTÁN VIENDO · TE RESPONDIERON · RESUELTO), la operación ligada, el hilo (las notas internas del equipo nunca llegan
   aquí: las filtra el servidor), «Ya se resolvió», el composer con foto privada y, resuelto, «¿Se resolvió?» Sí / No (hueco #4) y «Abrir
   otro caso» enlazado. Todo lo decide el servidor; aquí solo se muestra. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import type { CasoFila, CasoVecino, MsjVecino, OpSop } from "@/lib/soporte";
import { CON_OPERACION, ESTADO_VECINO, TEMAS, horarioEquipo, type Tema } from "@/lib/soporte-comun";
import { subirFotoPrivada } from "@/lib/subir-foto";
import { casoAbrir, casoCalificar, casoEscribir, casoResuelto } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = UI as unknown as Record<"Button" | "IconButton" | "Icon" | "Tag" | "RequestCard" | "Chip", ComponentType<any>>;
type Bi = { es: string; en: string };
const MONO = "'JetBrains Mono',monospace";
const BORRADOR = "tl-soporte-borrador";

function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}
const corta = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const nuevaClave = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16).padStart(8, "0")}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`);

export function Soporte({ es, conSesion, negocio, temas, casos, ops, revs, horario, caso, casoPedido, pre }: {
  es: boolean; conSesion: boolean; negocio: { id: string; name: string } | null; temas: Tema[]; casos: CasoFila[]; ops: OpSop[];
  revs: { hnum: string; num: string; t: Bi; href: string }[]; horario: { dias: number; desde: number; hasta: number };
  caso: CasoVecino | null; casoPedido: string | null; pre: { tema: Tema | null; op: string | null; otro: string | null } | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const router = useRouter(), path = usePathname();
  const w = useAncho(), desk = w >= 1024, two = w >= 960;
  const v: "home" | "new" | "case" = pre ? "new" : casoPedido ? "case" : "home";
  const base = negocio ? `negocio=${encodeURIComponent(negocio.id)}` : "";
  const ir = (q: string) => router.push(`${path}?${[base, q].filter(Boolean).join("&")}`, { scroll: true });
  const toHome = () => router.push(base ? `${path}?${base}` : path);
  const toNew = (o: { tema?: string | null; op?: string | null; otro?: string | null } = {}) =>
    ir(["nuevo=1", o.tema ? `tema=${o.tema}` : "", o.op ? `op=${encodeURIComponent(o.op)}` : "", o.otro ? `otro=${encodeURIComponent(o.otro)}` : ""].filter(Boolean).join("&"));
  const hor = horarioEquipo(horario, es);

  // Casos: se refrescan solos mientras se mira uno abierto (el equipo contesta desde el Super Admin).
  useEffect(() => {
    if (v !== "case" || !caso || caso.estado === "res" || caso.estado === "unido") return;
    const x = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(x);
  }, [v, caso, router]);

  const ago = (iso: string) => {
    const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? E2("AHORA", "NOW") : m < 60 ? E2(`HACE ${m} MIN`, `${m} MIN AGO`) : m < 1440 ? E2(`HACE ${Math.floor(m / 60)} H`, `${Math.floor(m / 60)} H AGO`)
      : new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(/\./g, "").toUpperCase();
  };
  const corto = (t: Tema) => L(TEMAS[t].corto).toUpperCase();
  const eye = negocio ? `${negocio.name.toUpperCase()} · ${E2("TU NEGOCIO", "YOUR BUSINESS")}` : E2("TO'LATINO · EN ESPAÑOL", "TO'LATINO · IN SPANISH");
  const titulo = negocio ? E2("Ayuda y Soporte", "Help and Support") : E2("Soporte", "Support");
  const atras = () => router.push(negocio ? `/panel/${negocio.id}/mas` : "/cuenta");
  const k10 = "font-[800] text-[10.5px] tracking-[.12em]";

  // ── La lista ──
  const lista = (
    <div className="flex min-w-0 flex-col gap-[18px]" data-screen-label="Soporte · lista">
      {!desk ? (
        <div className="flex items-center gap-3 pt-3.5">
          <C.IconButton icon="chevronLeft" size={38} onClick={atras} label={E2("Volver", "Back")} />
          <div className="min-w-0 flex-1"><div className="text-ink/50" style={{ font: `700 10px ${MONO}`, letterSpacing: ".12em" }}>{eye}</div>
            <div className="mt-[3px] font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{titulo}</div></div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span role="link" tabIndex={0} onClick={atras} onKeyDown={(e) => { if (e.key === "Enter") atras(); }} className="flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-bold text-action">
            <C.Icon name="chevronLeft" size={15} color="var(--tl-action)" strokeWidth={2} />{E2("Volver", "Back")}</span>
          <span className="text-ink/50" style={{ font: `700 10.5px ${MONO}`, letterSpacing: ".12em" }}>{eye}</span>
          <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.035em]">{titulo}</h1>
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-[18px] border border-ink/[.08] bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-[42px] flex-none place-items-center rounded-[13px] bg-action/10"><C.Icon name="chat" size={19} color="var(--tl-action)" /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-display text-[15.5px] font-extrabold leading-[1.3] tracking-[-0.02em]">{E2("Escríbenos", "Write to us")}</span>
            <span className="text-[13px] font-medium leading-normal text-ink/65 [text-wrap:pretty]">
              {negocio ? E2(`Sobre tus cobros, tu cuenta, la app o una idea. Te contesta una persona del equipo: ${hor}.`, `About your payouts, your account, the app or an idea. A person on the team replies: ${hor}.`)
                : E2(`Te contesta una persona del equipo: ${hor}.`, `A person on the team replies: ${hor}.`)}</span>
          </div>
        </div>
        <div className="flex"><C.Button size="md" block icon="edit" onClick={() => toNew()}>{E2("Escríbenos", "Write to us")}</C.Button></div>
      </div>
      {revs.length ? (
        <div className="flex flex-col gap-2.5" data-screen-label="Soporte · en revisión">
          <span className={k10} style={{ fontFamily: MONO }}>{E2("TO'LATINO ESTÁ REVISANDO", "TO'LATINO IS REVIEWING")}</span>
          {revs.map((r) => <C.RequestCard key={r.hnum} label={`${E2("AYUDA", "HELP")} · ${r.hnum}`} tag={E2("EN REVISIÓN", "IN REVIEW")} tone="action" title={L(r.t)}
            sub={E2("El negocio no respondió o no estuvo de acuerdo. To'Latino lo revisa y te avisa.", "The business did not reply or disagreed. To'Latino reviews it and lets you know.")} onClick={() => router.push(r.href)} />)}
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5" data-screen-label="Soporte · casos">
        <span className={k10} style={{ fontFamily: MONO }}>{negocio ? E2("LOS CASOS DE TU NEGOCIO", "YOUR BUSINESS CASES") : E2("TUS CASOS", "YOUR CASES")}</span>
        {casos.map((x) => {
          const e = ESTADO_VECINO[x.estado], u = x.ultimo;
          const quien = u.quien === "equipo" ? `${u.nombre ?? "To'Latino"}: ` : u.quien === "yo" ? E2("Tú: ", "You: ") : "";
          return <div key={x.num} data-caso={x.num}><C.RequestCard label={`${x.num} · ${corto(x.tema)}`} tag={L(e.l)} tone={e.tone} title={corta(x.titulo, 80)}
            sub={`${quien}${corta(u.t || (u.foto ? E2("Foto", "Photo") : ""), 70)} · ${ago(u.at).toLowerCase()}`} onClick={() => ir(`caso=${x.num}`)} /></div>;
        })}
        {!casos.length ? <span className="text-[13px] font-medium leading-normal text-ink/55">{conSesion ? E2("Todavía no tienes casos.", "You have no cases yet.") : E2("Entra para ver tus casos.", "Sign in to see your cases.")}</span> : null}
      </div>
    </div>
  );

  // ── Vacío (escritorio) ──
  const vacio = (
    <div className="mt-24 flex flex-col items-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-ink/[.14] p-7 text-center">
      <C.Icon name="chat" size={26} color="rgba(11,14,18,.42)" />
      <span className="font-display text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">{E2("Elige un caso o escríbenos", "Pick a case or write to us")}</span>
      <span className="max-w-[360px] text-[13px] font-medium leading-normal text-ink/60">{E2("Lo que nos escribas queda aquí, con cada respuesta del equipo.", "What you write stays here, with every reply from the team.")}</span>
    </div>
  );

  const main = v === "new" ? <Nuevo key={`${pre?.tema}-${pre?.op}-${pre?.otro}`} {...{ es, desk, conSesion, negocio, temas, ops, pre: pre!, toHome, onCreado: (n: string) => ir(`caso=${n}`) }} />
    : v === "case" ? (caso ? <Caso key={caso.num + caso.msjs.length + caso.status} {...{ es, desk, caso, negocio, toHome, ago, toNew, hor }} />
      : <div className="flex flex-col gap-3 pt-3.5">{!desk ? <C.IconButton icon="chevronLeft" size={38} onClick={toHome} label={E2("Volver", "Back")} /> : null}
        <div className="rounded-[18px] border border-ink/[.08] bg-white p-5 text-center"><div className="font-display text-[17px] font-extrabold">{E2("Ese caso no existe", "That case does not exist")}</div>
          <div className="mt-1 text-[13px] text-ink/60">{conSesion ? E2("Revisa el número o vuelve a tus casos.", "Check the number or go back to your cases.") : E2("Entra para ver tus casos.", "Sign in to see your cases.")}</div></div></div>)
      : vacio;

  return (
    <div data-pantalla="APP-SOPORTE" data-screen-label={`APP-SOPORTE · ${desk ? "desktop" : "móvil"}`} className="min-h-full bg-paper text-ink">
      <div className="mx-auto grid items-start" style={{ maxWidth: desk ? 1180 : "none", padding: desk ? "22px 30px 64px" : "0 16px 110px", gridTemplateColumns: two ? "360px minmax(0,1fr)" : "minmax(0,1fr)", gap: two ? 40 : 0 }}>
        {two || v === "home" ? lista : null}
        {two || v !== "home" ? <div className="flex min-w-0 flex-col gap-4">{main}</div> : null}
      </div>
    </div>
  );
}

/* ── CASO NUEVO ── */
function Nuevo({ es, desk, conSesion, negocio, temas, ops, pre, toHome, onCreado }: {
  es: boolean; desk: boolean; conSesion: boolean; negocio: { id: string; name: string } | null; temas: Tema[]; ops: OpSop[];
  pre: { tema: Tema | null; op: string | null; otro: string | null }; toHome: () => void; onCreado: (n: string) => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const router = useRouter();
  const [tema, setTema] = useState<Tema | "">(pre.tema ?? ""), [op, setOp] = useState(pre.op ?? ""), [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const [foto, setFoto] = useState<{ id: string; url: string } | null>(null), [subiendo, setSubiendo] = useState(false), [clave] = useState(nuevaClave);
  const [pend, start] = useTransition(), file = useRef<HTMLInputElement>(null);
  // El borrador que dejó «Entrar y enviar» (solo en este teléfono).
  useEffect(() => {
    try { const b = JSON.parse(sessionStorage.getItem(BORRADOR) ?? "null") as { tema?: Tema; op?: string; msg?: string } | null;
      if (b && conSesion) { if (b.tema && temas.includes(b.tema)) setTema(b.tema); if (b.op) setOp(b.op); if (b.msg) setMsg(b.msg); sessionStorage.removeItem(BORRADOR); } } catch { /* sin almacenamiento */ }
  }, [conSesion, temas]);
  const lasOps = tema && CON_OPERACION.includes(tema) ? ops.filter((x) => x.tema.includes(tema)).slice(0, 6) : [];
  const radio = (on: boolean) => <span className="size-5 flex-none rounded-full" style={{ border: on ? "6px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)" }} />;
  const subir = async (f: File) => {
    if (!/^image\//.test(f.type)) return;
    setSubiendo(true); setErr("");
    const r = await subirFotoPrivada(f).catch(() => ({ ok: false as const, mensaje: undefined }));
    setSubiendo(false);
    if (r.ok && r.id && r.url) setFoto({ id: r.id, url: r.url }); else setErr(r.mensaje ? L(r.mensaje) : E2("No se pudo subir la foto.", "The photo could not be uploaded."));
  };
  const enviar = () => {
    if (!tema) { setErr(E2("Elige sobre qué es.", "Pick what it is about.")); return; }
    if (msg.replace(/\s+/g, "").length < 10) { setErr(E2("Cuéntanos un poco más (10 letras o más).", "Tell us a bit more (10 characters or more).")); return; }
    if (!conSesion) {
      try { sessionStorage.setItem(BORRADOR, JSON.stringify({ tema, op, msg })); } catch { /* sin almacenamiento */ }
      const volver = `/soporte?nuevo=1${tema ? `&tema=${tema}` : ""}${negocio ? `&negocio=${negocio.id}` : ""}`;
      router.push(`/entrar?volver=${encodeURIComponent(volver)}`); return;
    }
    start(async () => {
      const r = await casoAbrir({ tema, operacion: op || null, texto: msg, foto: foto?.id ?? null, enlazado: pre.otro, clave }, negocio?.id ?? null);
      if (!r.ok) { setErr(L(r.msg)); return; }
      onCreado(r.numero!);
    });
  };
  return (
    <div className="flex flex-col gap-4" data-screen-label="Soporte · caso nuevo">
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = ""; }} />
      <div className="flex items-center gap-3" style={{ paddingTop: desk ? 0 : 14 }}>
        {!desk ? <C.IconButton icon="chevronLeft" size={38} onClick={toHome} label={E2("Volver", "Back")} /> : null}
        <div className="min-w-0 flex-1"><div className="text-ink/50" style={{ font: `700 10px ${MONO}`, letterSpacing: ".12em" }}>{E2("CASO NUEVO", "NEW CASE")}{pre.otro ? ` · ${E2("ENLAZADO A", "LINKED TO")} ${pre.otro}` : ""}</div>
          <div className="mt-[3px] font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{E2("¿En qué te ayudamos?", "How can we help?")}</div></div>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[10.5px] font-[800] tracking-[.12em]" style={{ fontFamily: MONO }}>{E2("¿SOBRE QUÉ ES?", "WHAT IS IT ABOUT?")}</span>
        <div className="rounded-[17px] border border-ink/[.08] bg-white px-4" role="radiogroup">
          {temas.map((k, i) => <div key={k} role="radio" aria-checked={tema === k} tabIndex={0} data-tema={k} onClick={() => { setTema(k); setOp(""); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") { setTema(k); setOp(""); } }}
            className="flex cursor-pointer items-center gap-3 py-[13px]" style={{ borderTop: i ? "1px solid rgba(11,14,18,.08)" : "none" }}>{radio(tema === k)}<span className="text-[14px] font-bold leading-[1.35]">{L(TEMAS[k].form)}</span></div>)}
        </div>
      </div>
      {lasOps.length ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-[10.5px] font-[800] tracking-[.12em]" style={{ fontFamily: MONO }}>{E2("¿CUÁL?", "WHICH ONE?")}</span>
          <div className="rounded-[17px] border border-ink/[.08] bg-white px-4" role="radiogroup">
            {[...lasOps.map((x) => ({ k: x.num, t: L(x.t), s: x.s })), { k: "", t: E2("Ninguno en especial", "None in particular"), s: "" }].map((x, i) => (
              <div key={x.k || "ninguno"} role="radio" aria-checked={op === x.k} tabIndex={0} data-op={x.k} onClick={() => setOp(x.k)} onKeyDown={(e) => { if (e.key === "Enter") setOp(x.k); }}
                className="flex cursor-pointer items-center gap-3 py-[13px]" style={{ borderTop: i ? "1px solid rgba(11,14,18,.08)" : "none" }}>
                {radio(op === x.k)}<div className="min-w-0 flex-1"><div className="text-[14px] font-bold leading-[1.35]">{x.t}</div>{x.s ? <div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{x.s}</div> : null}</div>
              </div>))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5">
        <span className="text-[10.5px] font-[800] tracking-[.12em]" style={{ fontFamily: MONO }}>{E2("CUÉNTANOS QUÉ PASÓ", "TELL US WHAT HAPPENED")}</span>
        <textarea name="mensaje" value={msg} onChange={(e) => { setMsg(e.target.value.slice(0, 800)); setErr(""); }} rows={5} placeholder={E2("Qué pasó, cuándo y qué necesitas que hagamos…", "What happened, when and what you need us to do…")}
          className="w-full resize-none rounded-[14px] border-[1.5px] border-ink/[.14] bg-white px-3.5 py-3 text-[14px] font-medium leading-normal text-ink outline-none focus:border-ink" />
        <div className="flex items-center gap-3">
          {foto ? <span className="size-14 flex-none rounded-[12px] bg-photo-bg bg-cover bg-center" style={{ backgroundImage: `url("${foto.url}")` }} /> : null}
          <span role="button" tabIndex={0} onClick={() => file.current?.click()} onKeyDown={(e) => { if (e.key === "Enter") file.current?.click(); }} className="flex cursor-pointer items-center gap-2 text-[13px] font-bold text-action">
            <C.Icon name="image" size={16} color="var(--tl-action)" />{subiendo ? E2("Subiendo…", "Uploading…") : foto ? E2("Cambiar foto", "Change photo") : E2("Agregar una foto", "Add a photo")}</span>
          {foto ? <span role="button" tabIndex={0} onClick={() => setFoto(null)} className="cursor-pointer text-[13px] font-bold text-ink/55">{E2("Quitar", "Remove")}</span> : null}
        </div>
        <span className="text-[12px] font-medium leading-normal text-ink/55">{E2("No escribas números de tarjeta ni contraseñas. Nunca te los pedimos.", "Do not write card numbers or passwords. We never ask for them.")}</span>
      </div>
      {err ? <span role="alert" className="text-[12.5px] font-semibold leading-[1.45] text-danger">{err}</span> : null}
      <div className="flex"><C.Button block onClick={enviar} disabled={pend || subiendo}>{pend ? E2("Enviando…", "Sending…") : conSesion ? E2("Enviar", "Send") : E2("Entrar y enviar", "Sign in and send")}</C.Button></div>
    </div>
  );
}

/* ── EL CASO ── */
function Caso({ es, desk, caso, negocio, toHome, ago, toNew, hor }: {
  es: boolean; desk: boolean; caso: CasoVecino; negocio: { id: string; name: string } | null; toHome: () => void; ago: (iso: string) => string;
  toNew: (o: { tema?: string | null; op?: string | null; otro?: string | null }) => void; hor: string;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const router = useRouter();
  const [txt, setTxt] = useState(""), [foto, setFoto] = useState<{ id: string; url: string } | null>(null), [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState(""), [aviso, setAviso] = useState(""), [pend, start] = useTransition(), file = useRef<HTMLInputElement>(null);
  const e = ESTADO_VECINO[caso.estado], abierto = caso.estado !== "res" && caso.estado !== "unido", puede = !!(txt.trim() || foto);
  const help = caso.estado === "nuevo" ? E2(`Una persona del equipo te responde ${caso.cuando.es}.`, `A person from the team replies ${caso.cuando.en}.`)
    : caso.estado === "curso" ? (caso.quienVe ? E2(`${caso.quienVe} está viendo tu caso. Te escribe aquí.`, `${caso.quienVe} is looking at your case and will write here.`) : E2("El equipo está viendo tu caso. Te escribe aquí.", "The team is looking at your case and will write here."))
    : caso.estado === "espera" ? E2("El equipo te respondió. Contesta aquí si hace falta.", "The team replied. Answer here if needed.")
    : caso.estado === "unido" ? E2(`Se unió a ${caso.unidoA}: sigue ahí.`, `It was merged into ${caso.unidoA}: continue there.`)
    : caso.resueltoPor === "user" ? E2("Lo cerraste tú.", "You closed it.") : E2("Lo cerró el equipo.", "The team closed it.");
  const subir = async (f: File) => {
    if (!/^image\//.test(f.type)) return;
    setSubiendo(true); setErr("");
    const r = await subirFotoPrivada(f).catch(() => ({ ok: false as const, mensaje: undefined }));
    setSubiendo(false);
    if (r.ok && r.id && r.url) setFoto({ id: r.id, url: r.url }); else setErr(r.mensaje ? L(r.mensaje) : E2("No se pudo subir la foto.", "The photo could not be uploaded."));
  };
  const enviar = () => {
    if (!puede || pend) return;
    start(async () => {
      const r = await casoEscribir(caso.num, txt, foto?.id ?? null, negocio?.id ?? null);
      if (!r.ok) { setErr(L(r.msg)); return; }
      setTxt(""); setFoto(null); setErr(""); if (r.mensaje) setAviso(L(r.mensaje)); router.refresh();
    });
  };
  const sistema = (m: MsjVecino): string => {
    const vv = m.vars ?? {};
    switch (m.sys_key) {
      case "recibido": return vv.es ? E2(`Recibimos tu caso ${vv.num ?? caso.num}. Una persona del equipo te responde ${vv.es}.`, `We got your case ${vv.num ?? caso.num}. A person from the team replies ${vv.en ?? ""}.`)
        : E2(`Recibimos tu caso ${vv.num ?? caso.num}. Te responde una persona del equipo.`, `We got your case ${vv.num ?? caso.num}. A person from the team replies.`);
      case "resuelto_usuario": return caso.propio ? E2("Marcaste el caso como resuelto.", "You marked the case as resolved.") : E2("Quien lo abrió lo marcó como resuelto.", "The person who opened it marked it as resolved.");
      case "resuelto_equipo": return E2("El equipo marcó el caso como resuelto.", "The team marked the case as resolved.");
      case "reabierto": return E2("El equipo reabrió el caso.", "The team reopened the case.");
      case "reabierto_usuario": return E2("Dijiste que no se resolvió: el caso volvió al equipo.", "You said it was not solved: the case went back to the team.");
      case "unido": return E2(`Este caso se unió a ${vv.num ?? ""}. Sigue ahí.`, `This case was merged into ${vv.num ?? ""}. Continue there.`);
      case "unido_desde": return E2(`El caso ${vv.num ?? ""} se unió a este.`, `Case ${vv.num ?? ""} was merged into this one.`);
      case "devuelto": return E2(`Te devolvimos ${vv.monto ?? ""} a tu tarjeta.`, `We refunded ${vv.monto ?? ""} to your card.`);
      default: return "";
    }
  };
  const calificar = (si: boolean) => start(async () => {
    const r = await casoCalificar(caso.num, si, negocio?.id ?? null);
    if (!r.ok) { setErr(L(r.msg)); return; }
    setAviso(si ? E2("Gracias por decirnos.", "Thanks for telling us.") : r.reabierto ? E2("Lo reabrimos: el equipo lo vuelve a ver.", "We reopened it: the team will look again.") : E2("Gracias. Si necesitas algo más con esto, abre otro caso.", "Thanks. If you need anything else about it, open another case."));
    router.refresh();
  });
  return (
    <div className="flex flex-col gap-4" data-screen-label="Soporte · caso" data-caso-abierto={caso.num} data-estado={caso.estado}>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void subir(f); ev.target.value = ""; }} />
      <div className="flex items-center gap-3" style={{ paddingTop: desk ? 0 : 14 }}>
        {!desk ? <C.IconButton icon="chevronLeft" size={38} onClick={toHome} label={E2("Volver", "Back")} /> : null}
        <div className="min-w-0 flex-1"><div className="text-ink/50" style={{ font: `700 10px ${MONO}`, letterSpacing: ".12em" }}>{caso.num} · {L(TEMAS[caso.tema].corto).toUpperCase()}</div>
          <div className="mt-[3px] font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.03em] [text-wrap:pretty]">{caso.titulo.length > 90 ? `${caso.titulo.slice(0, 88).trimEnd()}…` : caso.titulo}</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 rounded-[15px] border border-ink/[.08] bg-white px-3.5 py-3">
        <C.Tag tone={e.tone}>{L(e.l)}</C.Tag>
        <span className="min-w-[180px] flex-1 text-[12.5px] font-semibold leading-[1.45] text-ink/65 [text-wrap:pretty]">{help}</span>
        {abierto && caso.propio ? <span role="button" tabIndex={0} data-accion="resuelto" onClick={() => start(async () => { const r = await casoResuelto(caso.num, negocio?.id ?? null); if (!r.ok) setErr(L(r.msg)); else router.refresh(); })}
          className="flex-none cursor-pointer text-[12.5px] font-bold text-action">{E2("Ya se resolvió", "It is resolved")}</span> : null}
        {caso.estado === "unido" && caso.unidoA ? <span role="link" tabIndex={0} onClick={() => router.push(`?${negocio ? `negocio=${negocio.id}&` : ""}caso=${caso.unidoA}`)} className="flex-none cursor-pointer text-[12.5px] font-bold text-action">{E2("Ir al caso", "Go to the case")}</span> : null}
      </div>
      {caso.ref ? <div className="self-center rounded-full border border-ink/[.08] bg-white px-3 py-1.5 text-ink/60" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em" }}>{L(caso.ref).toUpperCase()}</div> : null}
      {caso.enlazado ? <div className="self-center text-ink/50" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em" }}>{E2(`ENLAZADO A ${caso.enlazado}`, `LINKED TO ${caso.enlazado}`)}</div> : null}
      <div className="flex flex-col gap-3" data-screen-label="Soporte · hilo">
        {caso.msjs.map((m) => {
          if (m.sender === "system") { const t = sistema(m); return t ? <div key={m.id} data-msg="sistema" className="max-w-[86%] self-center text-center text-ink/50 [text-wrap:pretty]" style={{ font: `600 10px/1.6 ${MONO}`, letterSpacing: ".06em" }}>{t.toUpperCase()}</div> : null; }
          const yo = m.sender === "user" && m.mio;
          const nombre = m.sender === "staff" ? `${(m.equipo ?? "To'Latino").toUpperCase()} · TO'LATINO` : yo ? "" : E2("TU NEGOCIO", "YOUR BUSINESS");
          return (
            <div key={m.id} data-msg={m.sender} className="flex flex-col gap-1" style={{ alignItems: yo ? "flex-end" : "flex-start" }}>
              {nombre ? <span className="text-ink/55" style={{ font: `700 10px ${MONO}`, letterSpacing: ".08em" }}>{nombre}</span> : null}
              <div className="flex max-w-[82%] flex-col gap-2 px-[13px] py-2.5 text-[14px] font-medium leading-[1.45] [text-wrap:pretty]"
                style={{ borderRadius: yo ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: yo ? "var(--tl-ink)" : "var(--tl-white)", color: yo ? "var(--tl-white)" : "var(--tl-ink)", border: yo ? "none" : "1px solid rgba(11,14,18,.08)" }}>
                {m.foto ? <a href={m.foto} target="_blank" rel="noopener noreferrer" className="block h-[140px] w-[180px] max-w-full rounded-[10px] bg-photo-bg bg-cover bg-center" style={{ backgroundImage: `url("${m.foto}")` }} aria-label={E2("Foto", "Photo")} /> : null}
                {m.oculto ? <span className="italic opacity-70">{E2("Mensaje oculto por el equipo.", "Message hidden by the team.")}</span> : m.body ? <span className="whitespace-pre-wrap">{m.body}</span> : null}
              </div>
              <span className="text-ink/[.42]" style={{ font: `600 8.5px ${MONO}`, letterSpacing: ".06em" }}>{ago(m.at)}</span>
            </div>
          );
        })}
      </div>
      {caso.estado === "res" ? (
        <div className="flex flex-col gap-2.5 rounded-[17px] bg-signal/[.16] p-4" data-screen-label="Soporte · resuelto">
          <span className="text-[14px] font-bold leading-[1.45] text-open-text">{E2("Caso resuelto", "Case resolved")}</span>
          {caso.propio && !caso.csat ? (
            <div className="flex flex-col gap-2" data-screen-label="Soporte · ¿se resolvió?">
              <span className="text-[13px] font-semibold text-ink/75">{E2("¿Se resolvió?", "Was it solved?")}</span>
              <div className="flex flex-wrap gap-2">
                <C.Chip variant="filter" onClick={() => calificar(true)}>{E2("Sí", "Yes")}</C.Chip>
                <C.Chip variant="filter" onClick={() => calificar(false)}>{E2("No", "No")}</C.Chip>
              </div>
              {!caso.puedeReabrir ? <span className="text-[12px] font-medium text-ink/55">{E2("Si dices que no, abre otro caso: queda enlazado a este.", "If you say no, open another case: it stays linked to this one.")}</span> : null}
            </div>
          ) : caso.csat ? <span className="text-[12.5px] font-semibold text-ink/65">{caso.csat === "yes" ? E2("Nos dijiste que sí se resolvió. Gracias.", "You told us it was solved. Thanks.") : E2("Nos dijiste que no se resolvió.", "You told us it was not solved.")}</span> : null}
          <span className="text-[12.5px] font-medium leading-normal text-ink/65 [text-wrap:pretty]">{E2("Si necesitas algo más con esto, abre otro caso: queda enlazado a este.", "If you need anything else about this, open another case: it stays linked to this one.")}</span>
          <div className="flex"><C.Button variant="secondary" size="md" block onClick={() => toNew({ tema: caso.tema, op: caso.opNum, otro: caso.num })}>{E2("Abrir otro caso", "Open another case")}</C.Button></div>
        </div>
      ) : null}
      {aviso ? <span role="status" className="text-[12.5px] font-semibold text-open-text">{aviso}</span> : null}
      {err ? <span role="alert" className="text-[12.5px] font-semibold leading-[1.45] text-danger">{err}</span> : null}
      {abierto ? (
        <div className="sticky bottom-0 z-[5] -mx-1 flex flex-col gap-2 bg-paper/95 px-1 pb-[18px] pt-2.5 backdrop-blur-[14px]" data-screen-label="Soporte · escribir">
          {foto ? <div className="flex items-center gap-2.5"><span className="size-12 rounded-[10px] bg-photo-bg bg-cover bg-center" style={{ backgroundImage: `url("${foto.url}")` }} />
            <span role="button" tabIndex={0} onClick={() => setFoto(null)} className="cursor-pointer text-[12.5px] font-bold text-ink/55">{E2("Quitar foto", "Remove photo")}</span></div> : null}
          <div className="flex items-center gap-2">
            <C.IconButton icon="image" size={44} onClick={() => file.current?.click()} label={E2("Agregar una foto", "Add a photo")} />
            <input name="respuesta" value={txt} onChange={(ev) => setTxt(ev.target.value.slice(0, 600))} onKeyDown={(ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); enviar(); } }}
              placeholder={subiendo ? E2("Subiendo la foto…", "Uploading the photo…") : E2("Escribe tu mensaje…", "Write your message…")} aria-label={E2("Escribe tu mensaje", "Write your message")}
              className="h-11 min-w-0 flex-1 rounded-[13px] border border-ink/[.12] bg-white px-3.5 text-[15px] font-medium text-ink outline-none" />
            <span role="button" tabIndex={0} aria-label={E2("Enviar", "Send")} data-accion="enviar" onClick={enviar} onKeyDown={(ev) => { if (ev.key === "Enter") enviar(); }}
              className="grid size-11 flex-none cursor-pointer place-items-center rounded-[13px]" style={{ background: puede ? "var(--tl-ink)" : "rgba(11,14,18,.25)" }}>
              <C.Icon name="right" size={18} strokeWidth={2} color="var(--tl-white)" /></span>
          </div>
          <span className="text-[11.5px] font-medium text-ink/50">{E2(`No escribas números de tarjeta ni contraseñas. El equipo atiende ${hor}.`, `Do not write card numbers or passwords. The team works ${hor}.`)}</span>
        </div>
      ) : null}
    </div>
  );
}
