"use client";
/* 6h · To'Latino Puerta sin señal (la app abierta en frío sin conexión): las puertas guardadas en ESTE teléfono (descifradas con la llave de
   cada sesión), y en la elegida: Escanear (la misma cámara y las mismas reglas, decididas con el paquete firmado) y Buscar (nombre, últimos
   4 o el código) con «Dejar entrar» y motivo. Todo va a la cola con la hora del teléfono; con señal, «Volver a la puerta». Compuesta con
   Cabeza / Hoja de la puerta y PanelBloques (hueco #1 del plan). Sin montos, teléfonos ni correos. */
import { BottomNav, PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useEffect, useState } from "react";
import { MOTIVOS_MANUAL, QUE_HACER, RESULTADO } from "@/lib/puerta-comun";
import { Escanear } from "../Escanear";
import { Cabeza, Hoja } from "../Marco";
import { avisoSinSenal, EstadoPuerta, horaLista } from "./Estado";
import * as L from "./local";
import { usePuertaLocal } from "./usePuertaLocal";
import { enIsla, irAlServidor } from "@/lib/nativo/puente";

type Guardada = { s: string; titulo: string; puerta: string; negocio: string; n: number; lista: string; tz: string; reentrada: boolean; libre: boolean };
const uuid = () => crypto.randomUUID();

export function SinSenal() {
  const [es, setEs] = useState(true), [G, setG] = useState<Guardada[] | null>(null), [sel, setSel] = useState<string | null>(null), [cerro, setCerro] = useState(false);
  useEffect(() => {
    void (async () => {
      const lang = await L.meta<boolean>("es").catch(() => null);
      const e = lang ?? !/^en/i.test(navigator.language ?? "es");
      setEs(e);
      const out: Guardada[] = [];
      for (const x of await L.sesionesGuardadas().catch(() => [])) {
        const p = await L.leerEstado(x.s).catch(() => null);
        if (p) out.push({ s: x.s, titulo: e ? p.ev.titulo.es : p.ev.titulo.en || p.ev.titulo.es, puerta: p.ev.puerta, negocio: p.ev.negocio, n: p.b.length + p.r.length, lista: p.emitido, tz: p.ev.tz, reentrada: p.reglas.reentrada, libre: p.reglas.entry === "free" });
      }
      setG(out);
      const q = new URLSearchParams(location.search).get("s");
      setSel(out.find((x) => x.s === q)?.s ?? (out.length === 1 ? out[0]!.s : null));
    })();
  }, []);
  const E2 = (a: string, b: string) => (es ? a : b);
  const g = G?.find((x) => x.s === sel) ?? null;
  if (g) return <PuertaGuardada g={g} es={es} onOtra={G && G.length > 1 ? () => setSel(null) : undefined} onCerrada={() => { setG((x) => (x ?? []).filter((y) => y.s !== g.s)); setSel(null); setCerro(true); }} />;
  return (
    <div data-pantalla="CHK-SIN-SENAL" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Cabeza eye={E2("TO’LATINO PUERTA · SIN CONEXIÓN", "TO’LATINO DOOR · OFFLINE")} t={G === null ? E2("Abriendo…", "Opening…") : G.length ? E2("Tus puertas en este teléfono", "Your doors on this phone") : E2("No hay puertas guardadas", "No saved doors")}
        s={E2("Sin señal se escanea con la lista que bajó este teléfono al abrir la puerta. Lo que escanees se sube al volver la señal.", "Without signal you scan with the list this phone downloaded when the door opened. What you scan uploads when the signal is back.")} />
      <Hoja>
        {cerro ? <PanelBloques bloques={[{ type: "note", tone: "warn", icon: "key", t: E2("Esta puerta se cerró o se revocó: nada de ella quedó en este teléfono.", "This door was closed or revoked: nothing of it is left on this phone.") }]} /> : null}
        <PanelBloques bloques={G === null ? [] : G.length ? [{ type: "rows", items: G.map((x): Fila => ({ key: x.s, icon: "key", t: x.titulo, s: `${E2("Puerta", "Door")} ${x.puerta} · ${x.negocio} · ${E2(`lista de las ${horaLista(x.lista, x.tz)}`, `list from ${horaLista(x.lista, x.tz)}`)}`, chev: true, onClick: () => setSel(x.s) })) }]
          : [{ type: "empty", icon: "wifi", t: E2("Sin señal y sin puertas guardadas", "No signal and no saved doors"), s: E2("Abre tu puerta con señal: este teléfono baja la lista para seguir sin conexión.", "Open your door with signal: this phone downloads the list to keep going offline.") },
            { type: "acts", items: [{ l: E2("Probar con señal", "Try with signal"), v: "primary", icon: "key", onClick: () => { void irAlServidor("/puerta"); } }] }]} />
      </Hoja>
    </div>);
}

function PuertaGuardada({ g, es, onOtra, onCerrada }: { g: Guardada; es: boolean; onOtra?: () => void; onCerrada: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const sc = usePuertaLocal(g.s, es, { puerta: g.puerta, onCerrada });
  const [t, setT] = useState<"escanear" | "buscar">(g.libre ? "buscar" : "escanear"), [q, setQ] = useState(""), [res, setRes] = useState<Awaited<ReturnType<typeof sc.buscar>> | null>(null);
  const [man, setMan] = useState<{ id: string; nombre: string; quedan: number; motivo: string } | null>(null), [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null), [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const x = setInterval(() => setAhora(Date.now()), 20000); return () => clearInterval(x); }, []);
  useEffect(() => { const x = setTimeout(async () => setRes(q.trim().length >= 2 ? await sc.buscar(q) : null), 250); return () => clearTimeout(x); }, [q, sc.buscar]); // eslint-disable-line react-hooks/exhaustive-deps
  const entrar = async (tipo: "boleto" | "rsvp", id: string, n: number, motivo?: string) => {
    const r = await sc.escanear(tipo === "rsvp" ? { tipo: "rsvp", rsvp: id, id: uuid(), at: Date.now(), n } : { tipo: "boleto", boleto: id, motivo, id: uuid(), at: Date.now(), n, previo: false });
    setMan(null);
    if (!r.ok) { setMsg({ t: es ? r.msg.es : r.msg.en, ok: false }); return; }
    const v = "v" in r ? r.v : null, R = v ? RESULTADO[v.res] : null;
    setMsg(v && R && R.tono === "bad" ? { t: `${es ? R.t.es : R.t.en}${QUE_HACER[v.res] ? ` · ${es ? QUE_HACER[v.res]!.es : QUE_HACER[v.res]!.en}` : ""}`, ok: false } : { t: E2("Listo: queda en la cola para subir.", "Done: it is queued to upload."), ok: true });
    setRes(q.trim().length >= 2 ? await sc.buscar(q) : null);
  };
  const B: Bloque[] = [...avisoSinSenal(sc, es, ahora)];
  if (sc.enLinea && sc.listo && sc.porSubir === 0 && sc.sincronizado) B.push({ type: "note", tone: "ok", icon: "check", t: E2("Volvió la señal y todo está subido.", "The signal is back and everything is uploaded."), cta: E2("Volver a la puerta", "Back to the door"), onCta: () => { void irAlServidor(`/puerta/s/${g.s}`); } });
  // 8a · En la app, esta pantalla vive en el teléfono (isla): con señal, la puerta en línea sube la cola guardada (la misma del llavero).
  else if (enIsla() && sc.enLinea) B.push({ type: "note", tone: "ok", icon: "wifi", t: E2("Hay señal. En la puerta en línea se sube lo que escaneaste sin conexión.", "There is signal. The online door uploads what you scanned offline."), cta: E2("Volver a la puerta", "Back to the door"), onCta: () => { void irAlServidor(`/puerta/s/${g.s}`); } });
  if (msg) B.push({ type: "note", tone: msg.ok ? "ok" : "danger", icon: msg.ok ? "check" : "warning", t: msg.t });
  if (man) {
    B.push({ type: "head", eye: E2("ENTRADA A MANO · SIN CONEXIÓN", "ENTRY BY HAND · OFFLINE"), t: man.nombre, onBack: () => setMan(null) });
    B.push({ type: "chips", k: E2("¿POR QUÉ ENTRA SIN ESCANEAR?", "WHY ARE THEY GETTING IN WITHOUT A SCAN?"), items: MOTIVOS_MANUAL.map((o) => ({ l: es ? o.l.es : o.l.en, v: man.motivo === (es ? o.l.es : o.l.en) ? "selected" : "filter", onClick: () => setMan({ ...man, motivo: es ? o.l.es : o.l.en }) })) });
    B.push({ type: "acts", items: [{ l: E2("Entró", "Got in"), v: "primary", icon: "check", off: !man.motivo, onClick: () => void entrar("boleto", man.id, 1, man.motivo) }, { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => setMan(null) }] });
  } else if (t === "buscar") {
    B.push({ type: "search", val: q, ph: E2("Nombre, código o sus últimos 4", "Name, code or its last 4"), onChange: (v: string) => setQ(v), onClear: () => setQ("") });
    if (!res) B.push({ type: "note", tone: "info", icon: "search", t: E2("Sin señal busca en la lista de este teléfono: por nombre, por el código o sus últimos 4 números.", "Offline it searches this phone’s list: by name, by the code or its last 4 digits.") });
    else {
      const filas: Fila[] = [
        ...res.b.map((b): Fila => { const quedan = b[2] - b[10], vale = b[3] === "valid" || b[3] === "used";
          return { key: `b${b[0]}`, icon: b[9] & 1 ? "drink" : "ticket", t: b[4], s: [b[9] & 2 ? E2("Cortesía", "Comp") : sc.tipoDe(b[8]), b[5] ? `··${b[5]}` : null, b[2] > 1 ? E2(`entraron ${b[10]} de ${b[2]}`, `${b[10]} of ${b[2]} in`) : null].filter(Boolean).join(" · "), compact: true, chev: false, dim: !vale,
            tag: !vale ? E2("NO ENTRA", "NO ENTRY") : quedan <= 0 ? E2("ADENTRO", "INSIDE") : E2("FALTA", "MISSING"), tone: !vale ? "danger" : quedan <= 0 ? "signal" : "neutral",
            acts: vale && quedan > 0 ? [{ l: E2("Dejar entrar", "Let in"), v: "primary", icon: "check", onClick: () => setMan({ id: b[0], nombre: b[4], quedan, motivo: "" }) }] : undefined }; }),
        ...res.r.map((r): Fila => { const quedan = r[1] - r[4];
          return { key: `r${r[0]}`, icon: "users", t: r[3], s: E2(`RSVP · llegaron ${r[4]} de ${r[1]}`, `RSVP · ${r[4]} of ${r[1]} arrived`), compact: true, chev: false, tag: quedan <= 0 ? E2("LLEGÓ", "ARRIVED") : E2("FALTA", "MISSING"), tone: quedan <= 0 ? "signal" : "neutral",
            acts: quedan > 0 && r[2] !== "cancelled" ? [{ l: E2("Llegó 1", "1 arrived"), v: "primary", icon: "check", onClick: () => void entrar("rsvp", r[0], 1) }] : undefined }; }),
      ];
      B.push(filas.length ? { type: "rows", k: E2(`EN ESTE TELÉFONO · ${filas.length}`, `ON THIS PHONE · ${filas.length}`), items: filas } : { type: "empty", icon: "search", t: E2("No hay nadie con eso en esta lista", "Nobody matches on this list"), s: E2("Revisa cómo se escribe o busca por los últimos 4 números.", "Check the spelling or search by the last 4 digits.") });
    }
  }
  if (onOtra) B.push({ type: "acts", items: [{ l: E2("Otra puerta de este teléfono", "Another door on this phone"), v: "secondary", icon: "key", onClick: onOtra }] });
  return (
    <div data-pantalla="CHK-SIN-SENAL" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Cabeza eye={`${E2("PUERTA", "DOOR")} ${g.puerta.toUpperCase()} · ${g.negocio.toUpperCase()}`} t={g.titulo} s={E2("Sin conexión: decide este teléfono con su lista firmada.", "Offline: this phone decides with its signed list.")}>
        <EstadoPuerta x={sc} es={es} />
        {t === "escanear" && !man ? <Escanear sesion={g.s} es={es} reentrada={g.reentrada} libre={g.libre} local={sc} onBuscar={() => setT("buscar")} onCerrada={onCerrada} /> : null}
      </Cabeza>
      {B.length ? <Hoja pb={110}><PanelBloques bloques={B} h1={22} /></Hoja> : <span style={{ flex: 1, minHeight: 90 }} />}
      <div style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 40 }}>
        <BottomNav items={[...(g.libre ? [] : [{ id: "escanear", label: E2("ESCANEAR", "SCAN"), icon: "grid" }]), { id: "buscar", label: E2("BUSCAR", "SEARCH"), icon: "search" }]} active={man ? "buscar" : t}
          onChange={(id: string) => { setMan(null); setMsg(null); setT(id === "buscar" ? "buscar" : "escanear"); }} homeIndicator={false} translucent={false} />
      </div>
    </div>);
}
