"use client";
/* To'Latino Puerta · la puerta abierta (hueco #1 del plan: compuesta con los bloques del modo puerta del panel — doorDet — a pantalla completa
   y oscura, y la estructura de apps-delivery-checkin.md §2.3, sin CHK-PUERTA: D1, la puerta no vende). Escanear · Buscar · Lista · Aforo ·
   Más (Mesas · Incidencias · Equipo · Cierre) y, en Noche, la lista de la noche. Las cifras de arriba llegan en vivo (SSE de
   /api/puerta/vivo; si se cae, se pregunta cada 5 s). Ninguna pantalla muestra montos, teléfonos ni correos. 6h: la puerta baja su paquete
   firmado y cifrado al abrir y sigue escaneando y buscando sin señal (sin-conexion/); arriba dice EN LÍNEA / SIN CONEXIÓN · N POR SUBIR ·
   lista de las …; cerrar la puerta sube todo y borra lo guardado. */
import { BottomNav, PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { diaCorto, hora } from "@/lib/evt-comun";
import { hora12, INCIDENCIAS, lineaUltimo, MOTIVOS_MANUAL, QUE_HACER, RESULTADO, textoIncidencia, type FilaPuerta, type Resumen } from "@/lib/puerta-comun";
import type { aforo as Aforo, cierre as Cierre, CtxPuerta, equipo as Equipo, incidencias as Incid, mesas as Mesas, ultimos as Ultimos } from "@/lib/puerta";
import type { FilaListaPuerta } from "@/lib/noche-reservas";
import { puertaBuscar, puertaCerrar, puertaIncidencia, puertaMesa, puertaNoche } from "./acciones";
import { Escanear, mandar, mandarOLocal } from "./Escanear";
import { Cabeza, Hoja, kpiOscuro } from "./Marco";
import { avisoSinSenal, EstadoPuerta } from "./sin-conexion/Estado";
import { soltarSesion, usePuertaLocal } from "./sin-conexion/usePuertaLocal";
import { sinRed } from "@/lib/nativo/senal";
import { uuid } from "@/lib/uuid";
import { esApp, plataforma } from "@/lib/nativo/puente";
import { fijarPantalla, pantallaFijada, soltarPantalla } from "@/lib/nativo/pantalla";

type Bi = { es: string; en: string };
type Tab = "escanear" | "buscar" | "lista" | "aforo" | "mas" | "mesas" | "incid" | "equipo" | "cierre" | "noche";
type Ctx = Omit<CtxPuerta, "userId">;

export function PuertaCerrada({ es, sesion }: { es: boolean; sesion?: string }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  // 6h · Sin acceso a esta puerta: lo que quedó sin subir se intenta subir y nada de ella queda en el teléfono.
  useEffect(() => { if (sesion) void soltarSesion(sesion); }, [sesion]);
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Cabeza eye="TO’LATINO PUERTA" t={E2("Ya no tienes acceso a esta puerta", "You no longer have access to this door")}
        s={E2("La puerta se cerró, ya pasó la hora del evento o el negocio te quitó de sus porteros. Si es un error, habla con el negocio.", "The door was closed, the event time is over, or the business removed you from its door staff. If this is a mistake, talk to the business.")} />
      <Hoja><PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Volver a tus puertas", "Back to your doors"), v: "primary", icon: "key", onClick: () => router.push("/puerta") }] }]} /></Hoja>
    </div>);
}

export function Puerta({ es, t, f, ctx, r0, lista, aforo, mesas, incid, equipo, cierre, noche, ultimos }: {
  es: boolean; t: Tab; f: string; ctx: Ctx; r0: Resumen;
  lista?: { filas: FilaPuerta[]; siguiente: string | null }; aforo?: Awaited<ReturnType<typeof Aforo>>; mesas?: Awaited<ReturnType<typeof Mesas>>; incid?: Awaited<ReturnType<typeof Incid>>;
  equipo?: Awaited<ReturnType<typeof Equipo>>; cierre?: Awaited<ReturnType<typeof Cierre>>; noche?: FilaListaPuerta[]; ultimos?: Awaited<ReturnType<typeof Ultimos>>;
}) {
  const E2 = useCallback((a: string, b: string) => (es ? a : b), [es]), bi = (x: Bi) => (es ? x.es : x.en || x.es);
  const router = useRouter(), [pend, start] = useTransition();
  const [r, setR] = useState(r0), [toast, setToast] = useState(""), [err, setErr] = useState("");
  const [q, setQ] = useState(""), [res, setRes] = useState<FilaPuerta[] | null>(null), [manual, setManual] = useState<{ x: FilaPuerta; motivo: string; n: number } | null>(null);
  const [nq, setNq] = useState(""), [nFilas, setNFilas] = useState<FilaListaPuerta[] | null>(null);
  const [inc, setInc] = useState({ k: "", nota: "", code: "" }), [grupo, setGrupo] = useState<string | null>(null);
  const base = `/puerta/s/${ctx.sesion}`, ir = (x: string) => router.push(base + x);
  useEffect(() => setR(r0), [r0]);
  // 8e · «Fijar la Puerta en esta pantalla» (kiosco sin MDM): en la app de Android, la fijación de pantalla del sistema (la persona confirma aquí y
  // el sistema lo vuelve a confirmar); en iPhone, Acceso guiado (una app no puede fijarse sola); en un navegador, cómo hacerlo con el teléfono.
  const [fij, setFij] = useState<null | "pregunta" | "ayuda">(null), [fijada, setFijada] = useState(false), [donde, setDonde] = useState<"android_app" | "ios" | "otro">("otro");
  useEffect(() => {
    const ios = plataforma() === "ios" || /iPhone|iPad|iPod/.test(navigator.userAgent);
    setDonde(esApp() && plataforma() === "android" ? "android_app" : ios ? "ios" : "otro");
    void pantallaFijada().then(setFijada);
  }, [t]);
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(""), 2600); return () => clearTimeout(x); }, [toast]);
  // En vivo: la cabecera por SSE; las listas se refrescan como mucho cada 4 s. Si el SSE se cae, se pregunta cada 5 s.
  const ultimo = useRef(0);
  useEffect(() => {
    let es1: EventSource | null = null, poll: ReturnType<typeof setInterval> | null = null;
    const refrescar = () => { if (Date.now() - ultimo.current > 4000 && t !== "escanear" && t !== "buscar" && !sinRed()) { ultimo.current = Date.now(); router.refresh(); } };
    const preguntar = () => { if (!sinRed() && enLinea.current) router.refresh(); };
    try {
      es1 = new EventSource(`/api/puerta/vivo?sesion=${ctx.sesion}`);
      es1.addEventListener("resumen", (ev) => { try { setR(JSON.parse((ev as MessageEvent).data) as Resumen); refrescar(); } catch { /* nada */ } });
      es1.addEventListener("cerrada", () => { es1?.close(); router.refresh(); });
      es1.onerror = () => { if (!poll) poll = setInterval(preguntar, 5000); };
      es1.onopen = () => { if (poll) { clearInterval(poll); poll = null; } };
    } catch { poll = setInterval(preguntar, 5000); }
    return () => { es1?.close(); if (poll) clearInterval(poll); };
  }, [ctx.sesion, t, router]);
  const cerrada = useCallback(() => router.refresh(), [router]);
  // 6h · El paquete de la puerta, la cola y la puesta al día (con y sin señal).
  const sc = usePuertaLocal(ctx.sesion, es, { puerta: ctx.puerta, onCerrada: cerrada });
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const x = setInterval(() => setAhora(Date.now()), 20000); return () => clearInterval(x); }, []);
  const enLinea = useRef(true);
  enLinea.current = sc.enLinea;
  const run = (f: () => Promise<{ ok: boolean; msg?: Bi; cerrada?: boolean }>, ok: string, luego?: () => void) => start(async () => {
    setErr("");
    const x = await f().catch(() => null);
    if (!x) { setErr(E2("No se pudo. Revisa tu señal.", "Could not. Check your signal.")); return; }
    if (!x.ok) { if (x.cerrada) { cerrada(); return; } setErr(x.msg ? bi(x.msg) : E2("No se pudo.", "Could not.")); return; }
    if (ok) setToast(ok); luego?.(); router.refresh();
  });
  // Buscar (con espera de 350 ms; el servidor pone el límite por minuto).
  useEffect(() => {
    if (t !== "buscar") return;
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    const x = setTimeout(async () => {
      const z = sc.enLinea || !sc.listo ? await puertaBuscar(ctx.sesion, s).catch(() => null) : null;
      if (!z) { if (sc.listo) { setErr(""); setRes(filasLocales(await sc.buscar(s))); } return; }
      if (!z.ok) { if (z.cerrada) cerrada(); else setErr(bi(z.msg)); return; }
      setErr(""); setRes((z as unknown as { filas: FilaPuerta[] }).filas);
    }, 350);
    return () => clearTimeout(x);
  }, [q, t, ctx.sesion, sc.enLinea, sc.listo]); // eslint-disable-line react-hooks/exhaustive-deps
  /* Sin señal: lo que encontró el paquete del teléfono, con la misma forma que la lista en línea. */
  const filasLocales = (x: Awaited<ReturnType<typeof sc.buscar>>): FilaPuerta[] => [
    ...x.b.map((b): FilaPuerta => ({ kind: "ticket", id: b[0], nombre: b[4], tipo: b[9] & 2 ? E2("Cortesía", "Comp") : sc.tipoDe(b[8]), code: b[5] ? `··${b[5]}` : null, de: b[2], entraron: b[10], adentro: b[11],
      estado: (["valid", "used", "void", "refunded", "replaced", "pending"].includes(b[3]) ? b[3] : "void") as FilaPuerta["estado"], mesa: b[9] & 1 ? sc.tipoDe(b[8]) : null, cortesia: !!(b[9] & 2), otroDia: null })),
    ...x.r.map((r): FilaPuerta => ({ kind: "rsvp", id: r[0], nombre: r[3], tipo: "RSVP", code: null, de: r[1], entraron: r[4], adentro: r[4], estado: (["going", "attended", "expired", "cancelled"].includes(r[2]) ? r[2] : "cancelled") as FilaPuerta["estado"], mesa: null, cortesia: false, otroDia: null })),
  ];
  useEffect(() => {
    if (t !== "noche") return;
    const x = setTimeout(async () => { const z = await puertaNoche(ctx.sesion, nq.trim()).catch(() => null); if (z?.ok) setNFilas((z as unknown as { filas: FilaListaPuerta[] }).filas); }, 300);
    return () => clearTimeout(x);
  }, [nq, t, ctx.sesion]);

  /* Entrada a mano (boleto encontrado por nombre o código, con motivo) o llegada de un RSVP: el servidor decide igual que con el QR. */
  const entrar = (x: FilaPuerta, n: number, motivo?: string) => start(async () => {
    setErr("");
    const z = (await mandarOLocal(x.kind === "rsvp" ? { sesion: ctx.sesion, tipo: "rsvp", rsvp: x.id, id: uuid(), at: Date.now(), n } : { sesion: ctx.sesion, tipo: "boleto", boleto: x.id, motivo, id: uuid(), at: Date.now(), n, previo: false }, sc)) as Awaited<ReturnType<typeof mandar>>;
    if (!z.ok) { if ("cerrada" in z && z.cerrada) { cerrada(); return; } setErr(bi(z.msg)); return; }
    const resx = "v" in z ? z.v.res : (z as unknown as { res: keyof typeof RESULTADO }).res;
    const R = RESULTADO[resx];
    if (R.tono === "bad" || R.tono === "warn") { const h = QUE_HACER[resx]; setErr(`${bi(R.t)}${"v" in z && z.v.ya ? E2(` · entró por ${z.v.ya.puerta} a las ${z.v.ya.hora}`, ` · in through ${z.v.ya.puerta} at ${z.v.ya.hora}`) : ""}${h ? ` · ${bi(h)}` : ""}`); }
    else setToast(x.kind === "rsvp" ? E2(`${n > 1 ? `Llegaron ${n}` : "Llegó"}: ${x.nombre}`, `${n > 1 ? `${n} arrived` : "Arrived"}: ${x.nombre}`) : E2(`Entró: ${x.nombre}${n > 1 ? ` (${n})` : ""}`, `In: ${x.nombre}${n > 1 ? ` (${n})` : ""}`));
    setManual(null);
    if (t === "buscar" && q.trim().length >= 2) {
      const s = sc.enLinea ? await puertaBuscar(ctx.sesion, q.trim()).catch(() => null) : null;
      if (s?.ok) setRes((s as unknown as { filas: FilaPuerta[] }).filas); else if (sc.listo) setRes(filasLocales(await sc.buscar(q.trim())));
    }
    if (sc.enLinea && !sinRed()) router.refresh();
  });
  const ST: Record<string, [string, string, string]> = {
    valid: ["FALTA", "MISSING", "neutral"], used: ["ADENTRO", "INSIDE", "signal"], void: ["ANULADO", "VOIDED", "danger"], refunded: ["DEVUELTO", "REFUNDED", "danger"], replaced: ["QR ANULADO", "QR VOIDED", "danger"],
    pending: ["SE ESTÁ TRANSFIRIENDO", "BEING TRANSFERRED", "danger"], going: ["FALTA", "MISSING", "neutral"], attended: ["LLEGÓ", "ARRIVED", "signal"], expired: ["LLEGA TARDE", "LATE", "pro"], cancelled: ["YA NO VA", "NOT GOING", "danger"],
  };
  const filaDe = (x: FilaPuerta): Fila => {
    const quedan = x.de - x.entraron, vivo = ["valid", "used", "going", "attended", "expired"].includes(x.estado), [a, b, tone] = quedan <= 0 && vivo ? ["ADENTRO", "INSIDE", "signal"] : ST[x.estado] ?? ["", "", "neutral"];
    return { key: `${x.kind}${x.id}`, icon: x.kind === "rsvp" ? "users" : x.mesa ? "drink" : "ticket", t: x.nombre, compact: true, chev: false, dim: !vivo,
      s: [x.tipo, x.code, x.de > 1 ? E2(`entraron ${x.entraron} de ${x.de}`, `${x.entraron} of ${x.de} in`) : null].filter(Boolean).join(" · "), tag: es ? a : b, tone,
      acts: vivo && quedan > 0 ? (x.kind === "rsvp"
        ? [{ l: E2("Llegó 1", "1 arrived"), v: "primary", icon: "check", onClick: () => entrar(x, 1) }, ...(quedan > 1 ? [{ l: E2(`Llegaron ${quedan}`, `${quedan} arrived`), v: "secondary", onClick: () => entrar(x, quedan) }] : [])]
        : [{ l: E2("Dejar entrar", "Let in"), v: "primary", icon: "check", onClick: () => setManual({ x, motivo: "", n: quedan }) }]) : undefined };
  };
  const manualB = (m: NonNullable<typeof manual>): Bloque[] => {
    const quedan = m.x.de - m.x.entraron;
    return [
      { type: "head", eye: E2("ENTRADA A MANO", "ENTRY BY HAND"), t: m.x.nombre, s: [m.x.tipo, m.x.code].filter(Boolean).join(" · "), onBack: () => setManual(null) },
      ...(ctx.edad > 0 && ctx.pideId ? [{ type: "note", tone: "warn", icon: "shield", t: E2(`Pide ID: ${ctx.edad}+. Si no lo muestra, no entra.`, `Check ID: ${ctx.edad}+. If they cannot show it, no entry.`) } as Bloque] : []),
      { type: "chips", k: E2("¿POR QUÉ ENTRA SIN ESCANEAR?", "WHY ARE THEY GETTING IN WITHOUT A SCAN?"), items: MOTIVOS_MANUAL.map((o) => ({ l: bi(o.l), v: m.motivo === bi(o.l) ? "selected" : "filter", onClick: () => setManual({ ...m, motivo: bi(o.l) }) })) },
      ...(quedan > 1 ? [{ type: "step", t: E2("¿Cuántos entran ahora?", "How many get in now?"), s: E2(`Quedan ${quedan} de ${m.x.de}`, `${quedan} of ${m.x.de} left`), v: String(m.n),
        onM: () => setManual({ ...m, n: Math.max(1, m.n - 1) }), onP: () => setManual({ ...m, n: Math.min(quedan, m.n + 1) }) } as Bloque] : []),
      { type: "acts", items: [{ l: m.n > 1 ? E2(`Entraron ${m.n}`, `${m.n} got in`) : E2("Entró", "Got in"), v: "primary", icon: "check", off: pend || !m.motivo, onClick: () => entrar(m.x, m.n, m.motivo) },
        { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => setManual(null) }] },
      { type: "note", tone: "ink", icon: "lock", t: E2("Queda en la auditoría de la puerta: quién lo dejó entrar, por qué y a qué hora.", "It is logged in the door audit: who let them in, why and when.") },
    ];
  };

  const B: Bloque[] = [...avisoSinSenal(sc, es, ahora)];
  if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
  if (toast) B.push({ type: "note", tone: "ok", icon: "check", t: toast });
  if (r.lleno) B.push({ type: "note", tone: "danger", icon: "users", t: E2(`Llegaste al aforo de hoy (${r.aforo}). Deja entrar solo a medida que salgan.`, `You reached today’s capacity (${r.aforo}). Only let people in as others leave.`) });
  else if (r.alerta) B.push({ type: "note", tone: "warn", icon: "users", t: E2(`Adentro ${r.pct} % del aforo (${r.adentro} de ${r.aforo}).`, `${r.pct}% of capacity inside (${r.adentro} of ${r.aforo}).`) });
  if (manual) B.push(...manualB(manual));
  else if (t === "escanear") {
    if (ctx.edad > 0) B.push({ type: "note", tone: "ink", icon: "shield", t: `${ctx.pideId ? E2(`Pide ID: ${ctx.edad}+.`, `Check ID: ${ctx.edad}+.`) : E2(`Evento ${ctx.edad}+.`, `${ctx.edad}+ event.`)} ${ctx.reentrada ? E2("Pueden salir y volver a entrar.", "Re-entry allowed.") : E2("Sin reentrada.", "No re-entry.")}` });
    if (ultimos?.length) B.push({ type: "rows", k: E2("ÚLTIMOS EN LA PUERTA", "LATEST AT THE DOOR"), items: ultimos.map((x): Fila => ({ key: x.id, icon: RESULTADO[x.res].tono === "bad" ? "warning" : "check", t: x.nombre,
      s: lineaUltimo(x, es), m: x.hora, compact: true, chev: false,
      ibg: RESULTADO[x.res].tono === "bad" ? "rgba(192,57,43,.1)" : "rgba(0,229,196,.18)", ifg: RESULTADO[x.res].tono === "bad" ? "var(--tl-danger)" : "var(--tl-open-text)" })) });
  } else if (t === "buscar") {
    B.push({ type: "search", val: q, ph: E2("Nombre, código, orden B- o últimos 4 del teléfono", "Name, code, B- order or last 4 of the phone"), onChange: (v: string) => setQ(v), onClear: () => setQ("") });
    if (res === null) B.push({ type: "note", tone: "info", icon: "search", t: E2("Para quien no trae el QR: búscalo por nombre o por los últimos 4 números del código o del teléfono. Las cortesías salen por el nombre que puso el organizador.", "For anyone without the QR: search by name or by the last 4 digits of the code or phone. Comps show under the name the organizer gave.") });
    else B.push(res.length ? { type: "rows", k: E2(`ENCONTRADOS · ${res.length}`, `FOUND · ${res.length}`), items: res.map(filaDe) } : { type: "empty", icon: "search", t: E2("No hay nadie con eso", "Nobody matches"), s: E2("Revisa cómo se escribe o busca por los últimos 4 números.", "Check the spelling or search by the last 4 digits.") });
  } else if (t === "lista" && lista) {
    const F = [["todos", "Todos", "All"], ["faltan", "Faltan", "Missing"], ["adentro", "Adentro", "Inside"], ...(ctx.mesas ? [["mesa", "Con mesa", "With table"]] : []), ["cortesias", "Cortesías", "Comps"], ...(ctx.entry === "rsvp" ? [["rsvp", "RSVP", "RSVP"]] : [])];
    B.push({ type: "chips", items: [...F.map(([k, a, b]) => ({ l: es ? a! : b!, v: f === k ? "selected" : "filter", onClick: () => ir(`?t=lista&f=${k}`) })), ...(ctx.noche ? [{ l: E2("Lista de la noche", "Tonight’s list"), v: "filter", onClick: () => ir("?t=noche") }] : [])] });
    B.push(lista.filas.length ? { type: "rows", k: E2("LISTA", "LIST"), items: lista.filas.map(filaDe) } : { type: "empty", icon: "users", t: E2("Nadie en esta lista", "Nobody on this list"), s: E2("Cambia el filtro o espera a que lleguen.", "Change the filter or wait for people to arrive.") });
    if (lista.siguiente) B.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", onClick: () => ir(`?t=lista&f=${f}&c=${encodeURIComponent(lista.siguiente!)}`) }] });
  } else if (t === "noche") {
    B.push({ type: "head", eye: E2("NOCHE · LISTA Y MESAS DE ESTA NOCHE", "NIGHT · TONIGHT’S LIST AND TABLES"), t: E2("Lista de la noche", "Tonight’s list"), s: E2("Busca por nombre o por el código de 4 números que te dicen. Marca cuántos entran.", "Search by name or the 4-digit code they tell you. Mark how many get in."), onBack: () => ir("?t=lista") });
    B.push({ type: "search", val: nq, ph: E2("Nombre o código de 4 números", "Name or 4-digit code"), onChange: (v: string) => setNq(v), onClear: () => setNq("") });
    const L = nFilas ?? noche ?? [];
    B.push(L.length ? { type: "rows", items: L.map((x): Fila => {
      const quedan = x.pax - x.entraron;
      return { key: x.numero, icon: x.k === "lista" ? "users" : "drink", t: x.nombre, s: `${bi(x.svc)} · ${x.pax} ${E2("personas", "people")} · ${E2("llega", "arrives")} ${x.llega}`, compact: true, chev: false,
        tag: E2(`ENTRARON ${x.entraron} DE ${x.pax}`, `${x.entraron} OF ${x.pax} IN`), tone: quedan <= 0 ? "signal" : "neutral",
        acts: quedan > 0 ? [{ l: E2("Entró 1", "1 in"), v: "primary", icon: "check", onClick: () => noch(x.numero, 1) }, ...(quedan > 1 ? [{ l: E2(`Entraron ${quedan}`, `${quedan} in`), v: "secondary", onClick: () => noch(x.numero, quedan) }] : [])] : undefined };
    }) } : { type: "empty", icon: "users", t: E2("Nadie en la lista de esta noche", "Nobody on tonight’s list"), s: E2("Las listas y mesas de Noche de esta noche salen aquí.", "Tonight’s Night lists and tables show here.") });
  } else if (t === "aforo" && aforo) {
    const A = aforo, max = Math.max(1, ...A.horas.map((h) => h.n));
    B.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ADENTRO", "INSIDE"), v: String(A.r.adentro), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E2("AFORO", "CAPACITY"), v: A.r.aforo ? String(A.r.aforo) : "—", s: A.r.aforo ? `${A.r.pct} %` : E2("sin límite", "no limit") },
      { k: E2("ENTRARON", "CAME IN"), v: String(A.r.entraron), s: E2(`de ${A.r.esperados}`, `of ${A.r.esperados}`) }] });
    if (A.tipos.length) B.push({ type: "rows", k: E2("POR TIPO", "BY TYPE"), items: A.tipos.map((x, i): Fila => ({ key: `t${i}`, icon: "ticket", t: x.tipo, r: `${x.entraron} / ${x.de}`, compact: true, chev: false })) });
    B.push(A.puertas.length ? { type: "rows", k: E2("POR PUERTA", "BY DOOR"), items: A.puertas.map((x, i): Fila => ({ key: `p${i}`, icon: "key", t: x.puerta, s: E2(`adentro ${x.adentro}${x.cap ? ` de ${x.cap}` : ""} · rechazados ${x.rechazados}`, `inside ${x.adentro}${x.cap ? ` of ${x.cap}` : ""} · rejected ${x.rechazados}`), r: String(x.entraron), compact: true, chev: false,
      tag: x.cap && x.adentro >= x.cap ? E2("LLENA", "FULL") : undefined, tone: "danger" })) } : { type: "note", tone: "info", icon: "key", t: E2("Todavía nadie entró.", "Nobody has come in yet.") });
    if (A.horas.length) B.push({ type: "chart", k: E2("ENTRADAS POR HORA", "ENTRIES BY HOUR"), v: String(A.r.entraron), bars: A.horas.map((h, i) => ({ h: `${Math.max(6, Math.round((h.n * 100) / max))}%`, l: h.h.replace(/:00 /, " "), on: i === A.horas.length - 1 })) });
  } else if (t === "mas") {
    B.push({ type: "rows", items: [
      ...(ctx.mesas ? [{ key: "mesas", icon: "drink", t: E2("Mesas", "Tables"), s: E2("TIENE MESA · ¿CUÁL LE DAS?", "HAS A TABLE · WHICH ONE?"), chev: true, onClick: () => ir("?t=mesas") } as Fila] : []),
      ...(ctx.noche ? [{ key: "noche", icon: "users", t: E2("Lista de la noche", "Tonight’s list"), s: E2("Listas y mesas de Noche", "Night lists and tables"), chev: true, onClick: () => ir("?t=noche") } as Fila] : []),
      { key: "incid", icon: "warning", t: E2("Incidencias", "Incidents"), s: E2("Duplicado, edad, seguridad, pide devolución", "Duplicate, age, security, refund request"), chev: true, onClick: () => ir("?t=incid") },
      { key: "equipo", icon: "users", t: E2("Equipo", "Team"), s: E2("Quién está en cada puerta", "Who is at each door"), chev: true, onClick: () => ir("?t=equipo") },
      { key: "cierre", icon: "check", t: E2("Cierre de la noche", "Close the night"), s: E2("Resumen y cerrar tu puerta", "Summary and close your door"), chev: true, onClick: () => ir("?t=cierre") },
      { key: "cambiar", icon: "key", t: E2("Cambiar de puerta", "Change door"), s: E2("Volver a tus puertas", "Back to your doors"), chev: true, onClick: () => router.push("/puerta") },
      // 8i · Mi cuenta (Borrar mi cuenta incluido) también desde la puerta abierta.
      { key: "cuenta", icon: "shield", t: E2("Mi cuenta y ajustes", "My account and settings"), s: E2("Tu teléfono, idioma, privacidad y borrar tu cuenta.", "Your phone, language, privacy and deleting your account."), chev: true, onClick: () => router.push("/cuenta/ajustes") },
    ] });
    // 8e · Fijar la Puerta en esta pantalla.
    if (fij === "pregunta") {
      B.push({ type: "note", tone: "info", icon: "lock", t: E2("La Puerta se queda en esta pantalla: nadie sale a otra app ni a Inicio. El teléfono te pide confirmarlo. Para soltarla: mantén tocados Atrás y Recientes a la vez (o lo que diga el aviso del sistema).", "The Door stays on this screen: nobody can leave to another app or Home. Your phone asks you to confirm. To unpin: touch and hold Back and Recents together (or what the system notice says).") });
      B.push({ type: "acts", items: [{ l: E2("Fijar la pantalla", "Pin the screen"), v: "primary", icon: "lock", onClick: () => { setFij(null); void fijarPantalla().then((x) => { if (x === "ok") { setFijada(true); setToast(E2("Pantalla fijada. Confirma en el aviso del teléfono si te lo pide.", "Screen pinned. Confirm in the phone notice if it asks.")); } else setErr(E2("Este teléfono no dejó fijar la pantalla. Revisa en Ajustes › Seguridad › Fijar apps.", "This phone did not allow pinning. Check Settings › Security › App pinning.")); }); } },
        { l: E2("Ahora no", "Not now"), v: "secondary", onClick: () => setFij(null) }] });
    } else if (fij === "ayuda") {
      B.push({ type: "rows", k: donde === "ios" ? E2("EN IPHONE · ACCESO GUIADO", "ON IPHONE · GUIDED ACCESS") : E2("EN ANDROID · FIJAR APPS", "ON ANDROID · APP PINNING"), items: (donde === "ios" ? [
        [E2("1 · Enciéndelo una vez", "1 · Turn it on once"), E2("Ajustes › Accesibilidad › Acceso guiado › actívalo y pon un código.", "Settings › Accessibility › Guided Access › turn it on and set a passcode.")],
        [E2("2 · Fija la Puerta", "2 · Pin the Door"), E2("Con la Puerta abierta, presiona tres veces el botón lateral y toca «Iniciar».", "With the Door open, press the side button three times and tap «Start».")],
        [E2("3 · Para soltarla", "3 · To unpin"), E2("Presiona tres veces el botón lateral, escribe el código y toca «Finalizar».", "Press the side button three times, enter the passcode and tap «End».")],
      ] : [
        [E2("1 · Enciéndelo una vez", "1 · Turn it on once"), E2("Ajustes › Seguridad › Fijar apps (o «Fijar pantalla»).", "Settings › Security › App pinning (or «Screen pinning»).")],
        [E2("2 · Fija la Puerta", "2 · Pin the Door"), E2("Abre Recientes, toca el ícono de la Puerta y elige «Fijar».", "Open Recents, tap the Door icon and choose «Pin».")],
        [E2("3 · Para soltarla", "3 · To unpin"), E2("Mantén tocados Atrás y Recientes a la vez.", "Touch and hold Back and Recents together.")],
      ]).map(([a, b], i): Fila => ({ key: `fj${i}`, icon: "check", t: a!, s: b, chev: false, compact: true })) });
      B.push({ type: "note", tone: "ink", icon: "info", t: donde === "ios" ? E2("Un iPhone no deja que una app se fije sola: Acceso guiado es la forma que trae el teléfono.", "An iPhone does not let an app pin itself: Guided Access is the way the phone offers.") : E2("Con la app To’Latino Puerta de Android, la Puerta se fija sola con un toque.", "With the To’Latino Puerta Android app, the Door pins itself with one tap.") });
      B.push({ type: "acts", items: [{ l: E2("Entendido", "Got it"), v: "secondary", onClick: () => setFij(null) }] });
    } else B.push({ type: "rows", items: [fijada
      ? { key: "soltar", icon: "lock", t: E2("Soltar la pantalla", "Unpin the screen"), s: E2("La Puerta está fijada en esta pantalla", "The Door is pinned to this screen"), chev: true, onClick: () => { void soltarPantalla().then(() => { setFijada(false); setToast(E2("Pantalla suelta.", "Screen unpinned.")); }); } }
      : { key: "fijar", icon: "lock", t: E2("Fijar la Puerta en esta pantalla", "Pin the Door to this screen"), s: donde === "android_app" ? E2("Nadie sale a otra app mientras escaneas", "Nobody leaves to another app while you scan") : donde === "ios" ? E2("Con Acceso guiado del iPhone", "With iPhone Guided Access") : E2("Cómo hacerlo con tu teléfono", "How to do it with your phone"),
          chev: true, onClick: () => setFij(donde === "android_app" ? "pregunta" : "ayuda") }] });
  } else if (t === "mesas" && mesas) {
    const g = grupo ? mesas.grupos.find((x) => x.id === grupo) ?? null : null, z = g ? mesas.zonas.find((x) => x.id === g.mesa) ?? null : null;
    B.push({ type: "head", t: E2("Mesas", "Tables"), s: E2("Toca un grupo y dale su número de mesa. Dos grupos nunca tienen la misma.", "Tap a group and give it its table number. Two groups never get the same one."), onBack: () => ir("?t=mas") });
    if (g && z) B.push({ type: "chips", k: E2(`TIENE MESA · ${z.zona.toUpperCase()}${g.numero ? ` · MESA ${g.numero}` : " · ¿CUÁL LE DAS?"}`, `HAS A TABLE · ${z.zona.toUpperCase()}${g.numero ? ` · TABLE ${g.numero}` : " · WHICH ONE?"}`),
      help: `${E2("OCUPADAS", "TAKEN")}: ${z.ocupadas.filter((n) => n !== g.numero).join(", ") || E2("ninguna", "none")}`,
      items: Array.from({ length: z.cantidad }, (_, i) => i + 1).map((n) => ({ l: String(n), v: g.numero === n ? "selected" : "filter",
        onClick: () => { if (z.ocupadas.includes(n) && g.numero !== n) { setErr(E2(`La mesa ${n} ya la tiene otro grupo.`, `Table ${n} is already taken.`)); return; } run(() => puertaMesa(ctx.sesion, g.id, n), E2(`Mesa ${n}: ${g.nombre}`, `Table ${n}: ${g.nombre}`)); } })) });
    B.push(mesas.grupos.length ? { type: "rows", k: E2("GRUPOS CON MESA", "GROUPS WITH A TABLE"), items: mesas.grupos.map((x): Fila => ({ key: x.id, icon: "drink", t: x.nombre, s: `${x.zona} · ${E2(`entraron ${x.entraron} de ${x.de}`, `${x.entraron} of ${x.de} in`)}`,
      tag: x.numero ? E2(`MESA ${x.numero}`, `TABLE ${x.numero}`) : E2("SIN NÚMERO", "NO NUMBER"), tone: x.numero ? "signal" : "neutral", chev: true, compact: true, bd: grupo === x.id ? "1.5px solid var(--tl-ink)" : undefined, onClick: () => setGrupo(x.id) })) }
      : { type: "empty", icon: "drink", t: E2("No hay mesas vendidas en esta fecha", "No tables sold for this date"), s: "" });
  } else if (t === "incid") {
    B.push({ type: "head", t: E2("Incidencias", "Incidents"), s: E2("Le llega al organizador al momento.", "The organizer gets it right away."), onBack: () => ir("?t=mas") });
    B.push({ type: "chips", k: E2("¿QUÉ PASÓ?", "WHAT HAPPENED?"), items: INCIDENCIAS.map((o) => ({ l: bi(o.l), v: inc.k === o.k ? "selected" : "filter", onClick: () => setInc({ ...inc, k: o.k }) })) });
    if (inc.k === "seguridad") B.push({ type: "note", tone: "danger", icon: "emergency", t: E2("Si alguien está en peligro, llama al 911 primero.", "If someone is in danger, call 911 first."), cta: E2("Llamar al 911", "Call 911"), onCta: () => { location.href = "tel:911"; } });
    B.push({ type: "field", k: E2("QUÉ PASÓ · EN UNA LÍNEA", "WHAT HAPPENED · ONE LINE"), val: inc.nota, area: true, rows: 2, max: 300, count: `${inc.nota.length}/300`, onChange: (v: string) => setInc({ ...inc, nota: v.slice(0, 300) }) });
    B.push({ type: "field", k: E2("CÓDIGO DEL BOLETO · OPCIONAL", "TICKET CODE · OPTIONAL"), val: inc.code, ph: "TL-ABC-2345", onChange: (v: string) => setInc({ ...inc, code: v.toUpperCase().slice(0, 11) }) });
    B.push({ type: "acts", items: [{ l: E2("Avisar al organizador", "Tell the organizer"), v: "primary", icon: "bell", off: pend || !inc.k, onClick: () => run(() => puertaIncidencia(ctx.sesion, inc.k, inc.nota, inc.code || null), E2("Listo: el organizador ya lo sabe.", "Done: the organizer knows."), () => setInc({ k: "", nota: "", code: "" })) }] });
    B.push({ type: "note", tone: "ink", icon: "lock", t: E2("No subas fotos de identificaciones: la puerta revisa el ID en persona y no lo guarda.", "Do not upload photos of IDs: the door checks ID in person and does not keep it.") });
    if (incid?.length) B.push({ type: "rows", k: E2("DE ESTA FECHA", "FOR THIS DATE"), items: incid.map((x): Fila => { const T = textoIncidencia(x, es); return { key: x.id, icon: T.icon, t: T.t,
      s: T.s, m: x.hora, tag: x.st === "open" ? E2("ABIERTA", "OPEN") : E2("CERRADA", "CLOSED"), tone: x.st === "open" ? "pro" : "neutral", compact: true, chev: false }; }) });
  } else if (t === "equipo") {
    B.push({ type: "head", t: E2("Equipo", "Team"), s: E2("Quién está en cada puerta y cuántos dejó entrar.", "Who is at each door and how many they let in."), onBack: () => ir("?t=mas") });
    B.push(equipo?.length ? { type: "rows", items: equipo.map((x): Fila => ({ key: x.sesion, icon: "key", t: `${x.nombre}${x.sesion === ctx.sesion ? E2(" (tú)", " (you)") : ""}`, s: `${E2("Puerta", "Door")} ${x.puerta} · ${E2("desde", "since")} ${x.desde}${x.ultimo ? E2(` · último ${x.ultimo}`, ` · last ${x.ultimo}`) : ""}${x.sinConexion ? E2(` · ${x.sinConexion} sin conexión`, ` · ${x.sinConexion} offline`) : ""}${x.repetidos ? E2(` · ${x.repetidos} repetidos`, ` · ${x.repetidos} repeated`) : ""}`,
      r: String(x.entradas), tag: x.activa ? E2("EN LA PUERTA", "AT THE DOOR") : E2("CERRÓ", "CLOSED"), tone: x.activa ? "signal" : "neutral", compact: true, chev: false })) } : { type: "empty", icon: "users", t: E2("Solo tú", "Just you"), s: "" });
  } else if (t === "cierre" && cierre) {
    const C = cierre;
    B.push({ type: "head", t: E2("Cierre de la noche", "Close the night"), s: `${bi(ctx.titulo)} · ${diaCorto(ctx.dia, es)}`, onBack: () => ir("?t=mas") });
    B.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ENTRARON", "CAME IN"), v: String(C.entraron), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E2("BOLETOS", "TICKETS"), v: String(C.boletos) }, { k: E2("NO VINIERON", "NO-SHOWS"), v: String(C.noVinieron) }] });
    B.push({ type: "rows", items: [
      { key: "c", icon: "ticket", t: E2("Cortesías", "Comps"), r: String(C.cortesias), compact: true, chev: false }, { key: "r", icon: "users", t: "RSVP", r: String(C.rsvp), compact: true, chev: false },
      { key: "x", icon: "ban", t: E2("Rechazados", "Rejected"), r: String(C.rechazados), compact: true, chev: false }, { key: "d", icon: "warning", t: E2("Intentaron entrar otra vez", "Tried to get in again"), r: String(C.repetidos), compact: true, chev: false },
      { key: "i", icon: "info", t: E2("Incidencias", "Incidents"), r: String(C.incid), compact: true, chev: false, onClick: () => ir("?t=incid") }, { key: "a", icon: "key", t: E2("Puertas abiertas", "Doors open"), r: String(C.abiertas), compact: true, chev: false }] });
    if (sc.porSubir > 0) B.push({ type: "note", tone: "warn", icon: "wifi", t: E2(`Tienes ${sc.porSubir} escaneos sin subir. Al cerrar se suben primero; sin señal, la puerta no se cierra (se perderían).`, `You have ${sc.porSubir} scans not uploaded. Closing uploads them first; without signal the door does not close (they would be lost).`) });
    B.push({ type: "acts", items: [{ l: E2("Cerrar mi puerta", "Close my door"), v: "primary", icon: "check", off: pend, onClick: () => {
      if (!window.confirm(E2("¿Cerrar tu puerta? Ya no podrás escanear en esta sesión.", "Close your door? You will not be able to scan in this session."))) return;
      run(async () => {
        // 6h · Primero sube lo escaneado sin señal; después se cierra y no queda nada de esta puerta en el teléfono.
        if (!(await sc.cerrar())) return { ok: false, msg: { es: "Sin señal: sube tus escaneos antes de cerrar. Busca señal y vuelve a tocar «Cerrar mi puerta».", en: "No signal: upload your scans before closing. Find signal and tap “Close my door” again." } };
        return puertaCerrar(ctx.sesion);
      }, E2("Cerraste tu puerta.", "You closed your door."), () => router.push("/puerta"));
    } }] });
  }
  async function noch(numero: string, n: number) {
    setErr("");
    const z = await mandar({ sesion: ctx.sesion, tipo: "noche", noche: numero, n, id: uuid(), at: Date.now() });
    if (!z.ok) { if ("cerrada" in z && z.cerrada) { cerrada(); return; } setErr(bi(z.msg)); return; }
    setToast(E2("Listo.", "Done.")); const s = await puertaNoche(ctx.sesion, nq.trim()).catch(() => null); if (s?.ok) setNFilas((s as unknown as { filas: FilaListaPuerta[] }).filas);
  }

  const escanea = t === "escanear" && !manual, libre = ctx.entry === "free";
  const tabs = [...(ctx.entry !== "rsvp" ? [{ id: "escanear", label: libre ? E2("CONTAR", "COUNT") : E2("ESCANEAR", "SCAN"), icon: libre ? "plus" : "grid" }] : []), { id: "buscar", label: E2("BUSCAR", "SEARCH"), icon: "search" },
    { id: "lista", label: E2("LISTA", "LIST"), icon: "users" }, { id: "aforo", label: E2("AFORO", "CAPACITY"), icon: "building" }, { id: "mas", label: E2("MÁS", "MORE"), icon: "more" }];
  const activa = ["mesas", "incid", "equipo", "cierre", "noche"].includes(t) ? (t === "noche" ? "lista" : "mas") : t;
  const kp = [kpiOscuro(E2("ADENTRO", "INSIDE"), String(r.adentro), r.aforo ? E2(`de ${r.aforo}`, `of ${r.aforo}`) : E2("sin límite", "no limit"), r.lleno ? "bad" : r.alerta ? "warn" : undefined),
    kpiOscuro(E2("FALTAN", "TO COME"), String(r.faltan), E2(`de ${r.esperados}`, `of ${r.esperados}`)), kpiOscuro(E2("RECHAZADOS", "REJECTED"), String(r.rechazados), r.repetidos ? E2(`${r.repetidos} ya ${r.repetidos === 1 ? "había" : "habían"} entrado`, `${r.repetidos} already in`) : undefined)];
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Cabeza eye={`${E2("PUERTA", "DOOR")} ${ctx.puerta.toUpperCase()} · ${ctx.negocioNombre.toUpperCase()}`} t={bi(ctx.titulo)}
        s={`${diaCorto(ctx.dia, es)} · ${hora(ctx.h0)} · ${E2("puertas", "doors")} ${hora12(ctx.puertas)}${ctx.cierre ? E2(` · la puerta cierra ${hora12(ctx.cierre)}`, ` · door closes ${hora12(ctx.cierre)}`) : ""}`} kpis={kp}>
        <EstadoPuerta x={sc} es={es} />
        {escanea ? <Escanear sesion={ctx.sesion} es={es} reentrada={ctx.reentrada} libre={libre} onCerrada={cerrada} onBuscar={() => ir("?t=buscar")} onCambio={() => { /* la cabecera llega por SSE */ }} local={sc} /> : null}
      </Cabeza>
      {B.length ? <Hoja pb={110}><PanelBloques bloques={B} h1={22} /></Hoja> : <span style={{ flex: 1, minHeight: 90 }} />}
      <div style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 40 }}>
        <BottomNav items={tabs} active={activa} onChange={(id: string) => { setManual(null); setErr(""); ir(`?t=${id}`); }} homeIndicator={false} translucent={false} />
      </div>
    </div>);
}
