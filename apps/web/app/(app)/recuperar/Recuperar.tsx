"use client";
/* ONB-NEG-RECUPERAR (To'Latino Recuperar negocio.dc.html, plantilla L24-129): ¿es tuyo? → qué eres → cómo lo
   comprobamos (código por SMS al teléfono del negocio — decisión R1 — o un documento) → estado del reclamo. Nunca se
   piden documentos de identidad. Una persona de To'Latino aprueba. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Recuperar as R } from "@/lib/reclamos";
import { reducir } from "@/lib/subir-foto";
import { enviarReclamo, pedirCodigo } from "./acciones";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, IconButton, BusinessRow, Chip, Button, Tag, OrderTracker } = UI as unknown as Record<"Icon" | "IconButton" | "BusinessRow" | "Chip" | "Button" | "Tag" | "OrderTracker", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
const K = { font: `800 10.5px ${MONO}`, letterSpacing: ".12em" } as const;
const DOCS: [string, string, string][] = [["licencia", "Licencia del negocio", "Business license"], ["servicio", "Factura de luz o agua", "Utility bill"], ["ein", "Carta del IRS (EIN)", "IRS letter (EIN)"], ["otro", "Otro", "Other"]];
const DOC_L: Record<string, [string, string]> = { licencia: ["Licencia del negocio", "Business license"], servicio: ["Factura de luz o agua", "Utility bill"], ein: ["Carta del IRS con el EIN", "IRS letter with the EIN"], otro: ["Otro documento", "Other document"] };
const ROL_L: Record<string, [string, string]> = { dueno: ["Dueño", "Owner"], socio: ["Socio", "Partner"], encargado: ["Encargado", "Manager"] };

export function Recuperar({ r, cands, ciudad, lang, conSesion, origen, id }: {
  r: R | null; cands: { id: string; name: string; address: string | null; cover: string | null }[]; ciudad: string; lang: "es" | "en"; conSesion: boolean; origen: string; id: string;
}) {
  const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const [desk, setDesk] = useState(false);
  useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setDesk(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const KEY = `tl-recuperar-${id}`;
  type Form = { rol: string; metodo: "codigo" | "documento"; docKind: string; nota: string };
  const [f, setF] = useState<Form>(() => {
    const base = { rol: "dueno", metodo: r?.tieneDueno || !r?.tel ? "documento" : "codigo", docKind: "licencia", nota: "" } as { rol: string; metodo: "codigo" | "documento"; docKind: string; nota: string };
    try { const g = sessionStorage.getItem(KEY); if (g) return { ...base, ...JSON.parse(g), ...(r?.tieneDueno ? { metodo: "documento" } : {}) }; } catch { /* sin almacenamiento */ }
    return base;
  });
  const [paso, setPaso] = useState<"form" | "codigo" | "estado">(r?.reclamo && r.reclamo.status !== "rejected" ? "estado" : r?.reclamo ? "estado" : "form");
  const [doc, setDoc] = useState<{ id: string; ver: string } | null>(null), [codigo, setCodigo] = useState(""), [prueba, setPrueba] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null), [pend, start] = useTransition(), fileRef = useRef<HTMLInputElement>(null);
  const up = (p: Partial<Form>) => setF((z: Form) => { const n = { ...z, ...p }; try { sessionStorage.setItem(KEY, JSON.stringify(n)); } catch { /* */ } return n; });
  const M = (x: { es: string; en: string }) => (es ? x.es : x.en);
  const volver = () => { if (paso === "codigo") { setPaso("form"); setCodigo(""); setErr(null); return; } router.push(origen === "publica" ? "/publica?paso=B1" : r ? `/n/${r.id}` : "/"); };

  const subirDoc = async (file: File) => {
    setErr(null);
    const fd = new FormData(); fd.append("foto", await reducir(file), "documento.jpg");
    const res = (await fetch("/api/reclamo/documento", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as { ok: boolean; id?: string; mensaje?: { es: string; en: string } } | null;
    if (!res?.ok || !res.id) { setErr(res?.mensaje ? M(res.mensaje) : E2("No se pudo subir la foto. Prueba otra vez.", "Couldn’t upload the photo. Try again.")); return; }
    setDoc({ id: res.id, ver: URL.createObjectURL(file) });
  };
  const cta = () => {
    setErr(null);
    if (!conSesion) { router.push(`/entrar?volver=${encodeURIComponent(`/recuperar/${id}${origen === "publica" ? "?volver=publica" : ""}`)}`); return; }
    if (!r) return;
    if (paso === "form" && f.metodo === "documento" && !doc) { setErr(E2("Sube una foto del documento.", "Upload a photo of the document.")); return; }
    start(async () => {
      if (paso === "form" && f.metodo === "codigo") {
        const x = await pedirCodigo(r.id);
        if (!x.ok) { setErr(M(x.mensaje)); return; }
        setPrueba(x.codigoPrueba ?? null); setPaso("codigo"); window.scrollTo({ top: 0 }); return;
      }
      const x = await enviarReclamo(r.id, { rol: f.rol, metodo: paso === "codigo" ? "codigo" : "documento", codigo, doc: doc?.id, docKind: f.docKind, nota: f.nota, origen });
      if (!x.ok) { if (x.entrar) router.push(`/entrar?volver=/recuperar/${id}`); setErr(M(x.mensaje)); return; }
      try { sessionStorage.removeItem(KEY); } catch { /* */ }
      setPaso("estado"); router.refresh();
    });
  };
  const reintentar = () => { setPaso("form"); up({ metodo: "documento" }); setDoc(null); };

  // Encabezado
  const rc = r?.reclamo;
  const titulo = !r ? E2("¿Cuál es tu negocio?", "Which one is your business?")
    : paso === "codigo" ? E2("Te mandamos un código", "We sent you a code")
    : paso === "estado" && rc ? (rc.status === "approved" ? E2("Ya es tuyo", "It is yours") : rc.status === "rejected" ? E2("No pudimos aprobarlo", "We could not approve it") : E2("Lo estamos revisando", "We are reviewing it"))
    : E2(`¿Es tuyo ${r.nombre}?`, `Is ${r.nombre} yours?`);
  const intro = !r ? (cands.length ? E2("Encontramos estos con un nombre parecido. Toca el tuyo.", "We found these with a similar name. Tap yours.") : E2(`No encontramos ese negocio en ${ciudad}.`, `We could not find that business in ${ciudad}.`))
    : paso === "form" ? E2("Si es tuyo, lo manejas tú desde hoy. Comprobamos que eres del negocio y una persona de To'Latino lo aprueba.", "If it is yours, you manage it from today. We check that you are with the business and a person at To'Latino approves it.") : null;
  const eye = E2("RECUPERAR TU NEGOCIO", "RECOVER YOUR BUSINESS");
  const negocio = r ? <><BusinessRow name={r.nombre} meta={r.meta} verified={r.verificado} image={r.cover ?? undefined} /><span style={{ paddingLeft: 4, marginTop: desk ? -6 : 0, font: "600 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{r.direccion}</span></> : null;
  const horas = rc?.method === "call_code" ? 24 : 48;

  let cuerpo: ReactNode = null;
  if (!r) cuerpo = <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{cands.map((o) => <BusinessRow key={o.id} name={o.name} meta={o.address ?? ""} image={o.cover ?? undefined} onClick={() => router.push(`/recuperar/${o.id}${origen === "publica" ? "?volver=publica" : ""}`)} />)}</div>;
  else if (paso === "form") {
    const hows = [...(r.tieneDueno || !r.tel ? [] : [{ k: "codigo" as const, t: E2("Un código al teléfono del negocio", "A code to the business phone"), s: E2(`Te mandamos un código de 6 números al ${r.tel}. Es lo más rápido.`, `We text a 6-digit code to ${r.tel}. It is the fastest.`) }]),
      { k: "documento" as const, t: E2("Un documento", "A document"), s: E2("Licencia del negocio, factura de luz o agua, o la carta del IRS con el EIN. Lo revisamos en 48 h.", "Business license, utility bill, or the IRS letter with the EIN. We review it within 48 h.") }];
    cuerpo = (
      <>
        {r.tieneDueno ? <div style={{ padding: "14px 16px", borderRadius: 17, background: "rgba(255,176,32,.14)", display: "flex", gap: 10, alignItems: "flex-start" }}><Icon name="info" size={17} color="var(--tl-pro-ink)" /><span style={{ flex: 1, minWidth: 0, font: "600 13px/1.5 Manrope,sans-serif", color: "var(--tl-pro-ink)" }}>{E2("Este negocio ya tiene una cuenta a cargo. Si es tuyo, lo revisamos con un documento y le avisamos a esa cuenta antes de cambiar nada.", "This business already has an account in charge. If it is yours, we review it with a document and notify that account before changing anything.")}</span></div> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={K}>{E2("¿QUÉ ERES DEL NEGOCIO?", "WHAT IS YOUR ROLE?")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{Object.entries(ROL_L).map(([k, l]) => <Chip key={k} variant={f.rol === k ? "selected" : "filter"} onClick={() => up({ rol: k })}>{E2(...l)}</Chip>)}</div>
          {f.rol === "encargado" ? <span style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Si eres encargado, el dueño recibe un aviso.", "If you are the manager, the owner gets a notice.")}</span> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={K}>{E2("¿CÓMO LO COMPROBAMOS?", "HOW DO WE CHECK IT?")}</span>
          <div style={{ borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "0 16px" }}>
            {hows.map((x, i) => (
              <div key={x.k} role="radio" aria-checked={f.metodo === x.k} onClick={() => up({ metodo: x.k })} {...tec(() => up({ metodo: x.k }))} style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 0", borderTop: i ? "1px solid rgba(11,14,18,.08)" : "none", cursor: "pointer" }}>
                <span style={{ width: 20, height: 20, boxSizing: "border-box", borderRadius: 99, border: f.metodo === x.k ? "6px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.35 Manrope,sans-serif" }}>{x.t}</div><div style={{ marginTop: 2, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{x.s}</div></div>
              </div>))}
          </div>
        </div>
        {f.metodo === "documento" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={K}>{E2("¿QUÉ DOCUMENTO?", "WHICH DOCUMENT?")}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{DOCS.map(([k, a, b]) => <Chip key={k} variant={f.docKind === k ? "selected" : "filter"} onClick={() => up({ docKind: k })}>{E2(a, b)}</Chip>)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {doc ? <span style={{ width: 64, height: 64, borderRadius: 12, backgroundImage: `url("${doc.ver}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)", flex: "none" }} /> : null}
              <span role="button" onClick={() => fileRef.current?.click()} {...tec(() => fileRef.current?.click())} style={{ display: "flex", alignItems: "center", gap: 8, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="image" size={16} color="var(--tl-action)" />{doc ? E2("Cambiar foto", "Change photo") : E2("Subir foto del documento", "Upload a photo of the document")}</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) void subirDoc(x); e.target.value = ""; }} />
            </div>
            <span style={{ font: "500 12px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Tapa los números de cuenta. Solo necesitamos ver el nombre del negocio y la dirección.", "Cover account numbers. We only need to see the business name and address.")}</span>
          </div>) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={K}>{E2("ALGO QUE DEBAMOS SABER · OPCIONAL", "ANYTHING WE SHOULD KNOW · OPTIONAL")}</span>
          <textarea value={f.nota} onChange={(e) => up({ nota: e.target.value.slice(0, 300) })} rows={3} placeholder={E2("Ej. Lo abrí en 2019; alguien lo puso en la app sin preguntarme.", "e.g. I opened it in 2019; someone listed it without asking me.")} style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "500 14px/1.5 Manrope,sans-serif", color: "var(--tl-ink)", resize: "none", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><Icon name="shield" size={16} color="rgba(11,14,18,.55)" /><span style={{ flex: 1, minWidth: 0, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2("Nunca te pedimos documentos de identidad ni tu estatus migratorio.", "We never ask for ID documents or your immigration status.")}</span></div>
      </>);
  } else if (paso === "codigo") {
    cuerpo = (
      <div style={{ padding: 18, borderRadius: 20, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(0,229,196,.16)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="phone" size={20} color="var(--tl-open-text)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 16px/1.3 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2(`Revisa los mensajes del ${r!.tel}`, `Check the texts at ${r!.tel}`)}</div><div style={{ marginTop: 3, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2("Te llegó un código de 6 números. Escríbelo aquí.", "You got a 6-digit code. Type it here.")}</div></div></div>
        <span style={{ font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>{E2("CÓDIGO", "CODE")}</span>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="000000" aria-label={E2("Código", "Code")} style={{ height: 56, boxSizing: "border-box", width: "100%", padding: "0 16px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", font: `800 24px ${MONO}`, letterSpacing: ".4em", textAlign: "center", color: "var(--tl-ink)", outline: "none", background: "var(--tl-white)" }} />
        {prueba ? <div data-modo-pruebas style={{ display: "flex", alignItems: "center", gap: 8 }}><Tag tone="danger">{E2("MODO PRUEBAS", "TEST MODE")}</Tag><span style={{ font: "600 13px Manrope,sans-serif" }}>{E2("Tu código es ", "Your code is ")}<b>{prueba}</b></span></div> : null}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span role="button" onClick={() => start(async () => { setErr(null); const x = await pedirCodigo(r!.id); if (!x.ok) setErr(M(x.mensaje)); else setPrueba(x.codigoPrueba ?? null); })} {...tec(() => start(async () => { setErr(null); const x = await pedirCodigo(r!.id); if (!x.ok) setErr(M(x.mensaje)); else setPrueba(x.codigoPrueba ?? null); }))} style={{ font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Mandarlo otra vez", "Send it again")}</span>
          <span role="button" onClick={() => { setPaso("form"); up({ metodo: "documento" }); setCodigo(""); }} {...tec(() => { setPaso("form"); up({ metodo: "documento" }); setCodigo(""); })} style={{ font: "700 13px Manrope,sans-serif", color: "rgba(11,14,18,.6)", cursor: "pointer" }}>{E2("Ya no tengo ese teléfono", "I no longer have that phone")}</span>
        </div>
      </div>);
  } else if (rc) {
    const st = rc.status, porCodigo = rc.method === "call_code";
    const steps = [
      { label: E2("Lo pediste", "You asked"), time: new Date(rc.created_at).toLocaleTimeString(es ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" }), state: "done" },
      { label: porCodigo ? E2("Código correcto", "Code correct") : E2("Documento recibido", "Document received"), time: porCodigo ? E2("POR MENSAJE", "BY TEXT") : E2(...(DOC_L[rc.doc_kind ?? "otro"] ?? DOC_L.otro!)).toUpperCase(), state: "done" },
      { label: E2("Lo revisa To'Latino", "To'Latino reviews it"), time: st === "pending" ? E2(`EN ${horas} H`, `WITHIN ${horas} H`) : "", state: st === "pending" ? "current" : "done" },
      { label: st === "rejected" ? E2("No aprobado", "Not approved") : E2("Ya es tuyo", "It is yours"), time: "", state: st === "pending" ? "next" : "current" },
    ];
    const nota = st === "approved" ? { bg: "rgba(0,229,196,.16)", fg: "var(--tl-open-text)", ic: "check", t: E2(`Ahora manejas la página de ${r!.nombre}: fotos, horario, respuestas y tu panel. Entras con este mismo teléfono.`, `You now manage ${r!.nombre}'s page: photos, hours, replies and your dashboard. You sign in with this same phone.`) }
      : st === "rejected" ? { bg: "rgba(192,57,43,.08)", fg: "var(--tl-danger)", ic: "warning", t: E2(`${rc.reason ?? "No se pudo confirmar"}. Si es tuyo, prueba con un documento con el nombre y la dirección del negocio.`, `${rc.reason ?? "We could not confirm it"}. If it is yours, try with a document showing the business name and address.`) }
      : { bg: "rgba(255,176,32,.14)", fg: "var(--tl-pro-ink)", ic: "clock", t: E2(`Una persona de To'Latino lo revisa en ${horas} h. La página de ${r!.nombre} sigue igual mientras tanto.`, `A person at To'Latino reviews it within ${horas} h. ${r!.nombre}'s page stays the same meanwhile.`) };
    const acts = st === "approved" ? [{ l: E2("Ver tu página", "See your page"), v: "primary", ic: "store", on: () => router.push(`/n/${r!.id}`) }, { l: E2("Abrir tu panel", "Open your dashboard"), v: "secondary", ic: "grid", on: () => router.push(`/panel/${r!.id}`) }]
      : st === "rejected" ? [{ l: E2("Probar con un documento", "Try with a document"), v: "primary", ic: "folder", on: reintentar }] : [];
    const kv: [string, string][] = [[E2("CÓMO", "HOW"), porCodigo ? E2(`Código al ${r!.tel ?? "teléfono del negocio"}`, `Code to ${r!.tel ?? "the business phone"}`) : E2(...(DOC_L[rc.doc_kind ?? "otro"] ?? DOC_L.otro!))], [E2("ERES", "ROLE"), E2(...(ROL_L[rc.role] ?? ROL_L.dueno!))], ...(rc.note ? [[E2("NOTA", "NOTE"), rc.note] as [string, string]] : [])];
    cuerpo = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><Tag tone={st === "approved" ? "signal" : st === "rejected" ? "danger" : "action"}>{st === "approved" ? E2("APROBADO", "APPROVED") : st === "rejected" ? E2("NO APROBADO", "NOT APPROVED") : E2("EN REVISIÓN", "IN REVIEW")}</Tag><span style={{ font: `700 10.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>{E2("RECLAMO", "CLAIM")} #{rc.id}</span></div>
        <OrderTracker steps={steps} horizontal={desk} />
        <div style={{ padding: "14px 16px", borderRadius: 17, background: nota.bg, display: "flex", gap: 10, alignItems: "flex-start" }}><Icon name={nota.ic} size={17} color={nota.fg} strokeWidth={2} /><span style={{ flex: 1, minWidth: 0, font: "600 13.5px/1.5 Manrope,sans-serif", color: nota.fg }}>{nota.t}</span></div>
        {acts.length ? <div style={{ display: "grid", gridTemplateColumns: desk ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: 8 }}>{acts.map((a) => <div key={a.l} style={{ display: "flex" }}><Button variant={a.v} block icon={a.ic} onClick={a.on}>{a.l}</Button></div>)}</div> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={K}>{E2("LO QUE MANDASTE", "WHAT YOU SENT")}</span>
          <div style={{ borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "4px 16px" }}>{kv.map(([k, v], i) => <div key={k} style={{ display: "flex", gap: 14, padding: "11px 0", borderTop: i ? "1px solid rgba(11,14,18,.08)" : "none" }}><span style={{ flex: "none", width: 100, font: `700 9.5px/1.6 ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>{k}</span><span style={{ flex: 1, minWidth: 0, font: "600 13.5px/1.45 Manrope,sans-serif" }}>{v}</span></div>)}</div>
        </div>
      </>);
  }
  const conCta = !!r && (paso === "form" || paso === "codigo");
  const ctaL = !conSesion ? E2("Entrar y continuar", "Sign in and continue") : paso === "codigo" ? E2("Verificar", "Verify") : f.metodo === "codigo" ? E2("Mandarme el código", "Text me the code") : E2("Enviar", "Send");
  const ctaOff = pend || (paso === "codigo" && codigo.length !== 6);
  const what = [["store", E2("Manejas su página, sus fotos y las respuestas a reseñas.", "You manage its page, photos and review replies.")], ["star", E2("Las reseñas y los seguidores se quedan.", "Reviews and followers stay.")], ["clock", E2("Mientras To'Latino revisa, la página sigue igual.", "While To'Latino reviews, the page stays the same.")]];
  return (
    <div data-screen-label={`ONB-NEG-RECUPERAR · ${desk ? "desktop" : "móvil"}`} style={{ background: "var(--tl-paper)", color: "var(--tl-ink)", font: "500 14px Manrope,sans-serif", minHeight: "100dvh" }}>
      <div style={{ maxWidth: desk ? 1180 : "none", margin: desk ? "0 auto" : 0, padding: desk ? "22px 30px 64px" : "0 20px 28px", display: "grid", gridTemplateColumns: desk ? "minmax(0,1fr) 372px" : "minmax(0,1fr)", gap: desk ? 48 : 0, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {desk ? (
            <div>
              <span role="link" onClick={volver} {...tec(volver)} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="chevronLeft" size={15} strokeWidth={2} />{E2("Volver", "Back")}</span>
              <div style={{ marginTop: 14, font: `700 10.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{eye}</div>
              <h1 style={{ margin: "6px 0 0", font: "800 30px/1.1 Sora,sans-serif", letterSpacing: "-.035em", textWrap: "balance" }}>{titulo}</h1>
            </div>
          ) : (
            <div style={{ paddingTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <IconButton icon="chevronLeft" size={38} onClick={volver} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: `700 10px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{eye}</div><div style={{ marginTop: 3, font: "800 21px/1.15 Sora,sans-serif", letterSpacing: "-.035em" }}>{titulo}</div></div>
            </div>
          )}
          {intro ? <p style={{ margin: 0, maxWidth: 640, font: "500 14px/1.6 Manrope,sans-serif", color: "rgba(11,14,18,.68)" }}>{intro}</p> : null}
          {!desk && r ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{negocio}</div> : null}
          {cuerpo}
        </div>
        {desk ? (
          <div style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 14 }}>
            {negocio}
            <div style={{ padding: "16px 18px", borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ font: `800 10px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{E2("AL RECUPERARLO", "WHEN YOU RECOVER IT")}</span>
              {what.map(([ic, t]) => <div key={ic} style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "600 13px/1.45 Manrope,sans-serif" }}><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /><span style={{ flex: 1, minWidth: 0 }}>{t}</span></div>)}
            </div>
            {conCta ? <>{err ? <span style={{ font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</span> : null}<div style={{ display: "flex" }}><Button block disabled={ctaOff} onClick={cta}>{ctaL}</Button></div></> : null}
          </div>
        ) : null}
      </div>
      {!desk && conCta ? (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 20px 24px", background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 8 }}>
          {err ? <span style={{ font: "600 12px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</span> : null}
          <div style={{ display: "flex" }}><Button block disabled={ctaOff} onClick={cta}>{ctaL}</Button></div>
        </div>
      ) : null}
    </div>
  );
}
