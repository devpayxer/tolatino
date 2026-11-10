"use client";
/* To'Latino Puerta · CHK-ONB (apps-delivery-checkin.md §2.2, sin «portero sin cuenta»: §6 #11) y aceptar la invitación (hueco #2, el patrón
   del Repartidor). Arriba oscuro (la app de la puerta); abajo la hoja con los bloques del sistema. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { diaCorto, hora } from "@/lib/evt-comun";
import { hora12, PUERTAS_SUGERIDAS } from "@/lib/puerta-comun";
import type { PuertaAsignada, SesionAbierta } from "@/lib/puerta";
import { puertaAbrir, puertaAceptar, puertaSalirEquipo } from "./acciones";
import { Cabeza, Hoja } from "./Marco";

type Bi = { es: string; en: string };
export function Inicio({ es, nombre, tel, puertas, abiertas, equipos }: { es: boolean; nombre: string; tel: string; puertas: PuertaAsignada[]; abiertas: SesionAbierta[]; equipos: { id: string; negocio: string }[] }) {
  const E2 = (a: string, b: string) => (es ? a : b), bi = (x: Bi) => (es ? x.es : x.en || x.es);
  const router = useRouter(), [pend, start] = useTransition();
  const [cod, setCod] = useState(""), [sel, setSel] = useState<PuertaAsignada | null>(null), [pn, setPn] = useState(""), [err, setErr] = useState(""), [toast, setToast] = useState("");
  const run = (f: () => Promise<{ ok: boolean; msg?: Bi; sesion?: unknown; negocio?: unknown }>, ok: (r: { sesion?: unknown; negocio?: unknown }) => void) => start(async () => {
    setErr("");
    const r = await f().catch(() => null);
    if (!r) { setErr(E2("No se pudo. Revisa tu señal.", "Could not. Check your signal.")); return; }
    if (!r.ok) { setErr(r.msg ? bi(r.msg) : E2("No se pudo.", "Could not.")); return; }
    ok(r);
  });
  const B: Bloque[] = [];
  if (err) B.push({ type: "note", tone: "danger", icon: "warning", t: err });
  if (toast) B.push({ type: "note", tone: "ok", icon: "check", t: toast });
  if (sel) {
    // Elegir el nombre de la puerta y abrir.
    B.push({ type: "head", eye: `${sel.negocio.toUpperCase()} · ${diaCorto(sel.dia, es).toUpperCase()}`, t: bi(sel.titulo), s: E2(`Empieza a las ${hora(sel.h0)} · puertas ${hora12(sel.puertas)}`, `Starts at ${hora(sel.h0)} · doors ${hora12(sel.puertas)}`), onBack: () => setSel(null) });
    B.push({ type: "chips", k: E2("¿EN QUÉ PUERTA ESTÁS?", "WHICH DOOR ARE YOU AT?"), items: PUERTAS_SUGERIDAS.map((p) => ({ l: bi(p), v: pn === bi(p) ? "selected" : "filter", onClick: () => setPn(bi(p)) })) });
    B.push({ type: "field", k: E2("O ESCRIBE EL NOMBRE · HASTA 30", "OR TYPE THE NAME · UP TO 30"), val: pn, max: 30, onChange: (v: string) => setPn(v.slice(0, 30)) });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E2("Solo escaneas: en la puerta no se venden boletos. Ves el nombre y la inicial de cada persona, nunca su teléfono ni lo que pagó.", "You only scan: no tickets are sold at the door. You see each person’s first name and initial, never their phone or what they paid.") });
    B.push({ type: "acts", items: [{ l: pend ? E2("Abriendo…", "Opening…") : E2("Abrir la puerta", "Open the door"), v: "primary", icon: "key", off: pend || !pn.trim(),
      onClick: () => run(() => puertaAbrir(sel.fecha, pn, sel.staff), (r) => router.push(`/puerta/s/${String(r.sesion)}`)) }] });
  } else {
    if (abiertas.length) B.push({ type: "rows", k: E2("SIGUES EN LA PUERTA", "STILL AT THE DOOR"), items: abiertas.map((s): Fila => ({ key: s.sesion, icon: "key", t: bi(s.titulo), s: `${s.negocio} · ${E2("Puerta", "Door")} ${s.puerta}`, tag: E2("ABIERTA", "OPEN"), tone: "signal", chev: true, onClick: () => router.push(`/puerta/s/${s.sesion}`) })) });
    const hoy = puertas.filter((p) => p.hoy || p.abrible), luego = puertas.filter((p) => !p.hoy && !p.abrible);
    const fila = (p: PuertaAsignada): Fila => ({ key: p.fecha, icon: "ticket", t: bi(p.titulo), s: `${p.negocio} · ${diaCorto(p.dia, es)} · ${hora(p.h0)} · ${E2("puertas", "doors")} ${hora12(p.puertas)}${p.miembro ? E2(" · como equipo del negocio", " · as business team") : ""}`,
      tag: p.abrible ? E2("ABRIR", "OPEN") : p.hoy ? E2("HOY · MÁS TARDE", "TODAY · LATER") : E2("PRÓXIMO", "UPCOMING"), tone: p.abrible ? "action" : "neutral", chev: p.abrible, dim: !p.abrible,
      onClick: p.abrible ? () => { setSel(p); setPn(PUERTAS_SUGERIDAS[0] ? bi(PUERTAS_SUGERIDAS[0]) : ""); setErr(""); } : undefined });
    if (hoy.length) B.push({ type: "rows", k: E2("HOY", "TODAY"), items: hoy.map(fila) });
    if (hoy.length && !hoy.some((p) => p.abrible)) B.push({ type: "note", tone: "info", icon: "clock", t: E2("El modo puerta se activa el día del evento, 2 horas antes de abrir las puertas.", "Door mode turns on the day of the event, 2 hours before doors open.") });
    if (luego.length) B.push({ type: "rows", k: E2("PRÓXIMOS · 7 DÍAS", "UPCOMING · 7 DAYS"), items: luego.map(fila) });
    if (!puertas.length && !abiertas.length) B.push({ type: "empty", icon: "key", t: equipos.length ? E2("No tienes puertas esta semana", "No doors this week") : E2("Todavía no tienes puertas", "You have no doors yet"),
      s: equipos.length ? E2("Cuando el negocio tenga un evento, sale aquí. El modo puerta se activa el día del evento.", "When the business has an event, it shows here. Door mode turns on the day of the event.") : E2("Para escanear en una puerta, el negocio te invita con un código. Escríbelo abajo.", "To scan at a door, the business invites you with a code. Type it below.") });
    B.push({ type: "group", k: equipos.length ? E2("¿TE INVITÓ OTRO NEGOCIO?", "INVITED BY ANOTHER BUSINESS?") : E2("ENTRA CON EL CÓDIGO DEL NEGOCIO", "JOIN WITH THE BUSINESS CODE") });
    B.push({ type: "field", k: E2("CÓDIGO · 6 LETRAS Y NÚMEROS", "CODE · 6 LETTERS AND NUMBERS"), val: cod, onChange: (v: string) => setCod(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)) });
    B.push({ type: "acts", items: [{ l: pend ? E2("Entrando…", "Joining…") : E2("Entrar al equipo de la puerta", "Join the door team"), v: "primary", icon: "check", off: pend || cod.length !== 6,
      onClick: () => run(() => puertaAceptar(cod), (r) => { setCod(""); setToast(E2(`Listo: ya eres portero de ${String(r.negocio ?? "")}.`, `Done: you are door staff for ${String(r.negocio ?? "")}.`)); router.refresh(); }) }] });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E2(`Entraste con ${tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}. El código solo sirve con el teléfono que te invitó el negocio.`, `Signed in as ${tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}. The code only works with the phone the business invited.`) });
    if (equipos.length) B.push({ type: "rows", k: E2("TUS EQUIPOS DE PUERTA", "YOUR DOOR TEAMS"), items: equipos.map((e): Fila => ({ key: e.id, icon: "store", t: e.negocio, chev: false, compact: true,
      acts: [{ l: E2("Salir", "Leave"), v: "secondary", onClick: () => { if (window.confirm(E2(`¿Salir de la puerta de ${e.negocio}?`, `Leave ${e.negocio}’s door team?`))) run(() => puertaSalirEquipo(e.id), () => router.refresh()); } }] })) });
  }
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Cabeza eye="TO’LATINO PUERTA" t={E2(`Hola, ${nombre}`, `Hi, ${nombre}`)} s={E2("Escanea los boletos en la puerta. Solo escaneas: en la puerta no se venden boletos.", "Scan tickets at the door. You only scan: no tickets are sold at the door.")} />
      <Hoja><PanelBloques bloques={B} h1={22} /></Hoja>
    </div>);
}
