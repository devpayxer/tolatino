"use client";
/* USR-SEGUROS · Mis seguros. Diseño: la hoja «Tu seguro» de la ficha de Salud (neg-salud-listing.js segVals: TU SEGURO,
   PLAN, NÚMERO DE MIEMBRO · OPCIONAL, ¿PARA QUIÉN ES?) con la lista de Mi cuenta (como Direcciones: el principal arriba,
   «Usar este», quitar). Hueco #6 del plan: la pantalla de Mi cuenta no venía en el diseño; compuesta con sus piezas. */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OpcionesSeguro, Seguro } from "@/lib/mis-seguros";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { seguroGuardar, seguroQuitar, seguroUsar } from "./acciones";

const TIPOS = [["medicaid", "Medicaid", "Medicaid"], ["medicare", "Medicare", "Medicare"], ["chip", "CHIP (niños)", "CHIP (kids)"], ["priv", "Seguro del trabajo o privado", "Employer or private"], ["none", "No tengo seguro", "No insurance"]] as const;
const PARA = [["yo", "Para mí", "For me"], ["hijo", "Para mi hijo o hija", "For my child"], ["otro", "Para otra persona", "For someone else"]] as const;

export function Seguros({ es, yo, seguros, op }: { es: boolean; yo: Yo; seguros: Seguro[]; op: OpcionesSeguro }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), [ocupado, start] = useTransition();
  const [form, setForm] = useState(seguros.length === 0);
  const [f, setF] = useState({ kind: "", plan: "", num: "", para: "yo" });
  const [err, setErr] = useState<string | null>(null);
  const set = (o: Partial<typeof f>) => { setF((x) => ({ ...x, ...o })); setErr(null); };
  const planes = f.kind === "priv" ? op.priv.map((p) => ({ key: p.key, l: es ? p.name.es : p.name.en })) : (op.pub.find((p) => p.key === f.kind)?.plans ?? []).map((p) => ({ key: p.key, l: es ? p.name.es : p.name.en }));
  const pide = f.kind && f.kind !== "none";
  const listo = !!f.kind && (f.kind === "none" || !planes.length || !!f.plan);
  const guardar = () => {
    if (!listo) { setErr(f.kind ? E2("Elige tu plan.", "Pick your plan.") : E2("Elige tu seguro.", "Pick your insurance.")); return; }
    start(async () => {
      const r = await seguroGuardar({ kind: f.kind, plan: f.plan || null, num: f.num || null, para: f.para }).catch(() => ({ ok: false as const, msg: { es: "No se pudo guardar. Revisa tu conexión.", en: "Could not save. Check your connection." } }));
      if (!r.ok) { setErr(es ? r.msg.es : r.msg.en); return; }
      setForm(false); setF({ kind: "", plan: "", num: "", para: "yo" }); ui.toast(E2("Seguro guardado.", "Insurance saved.")); router.refresh();
    });
  };
  const paraL = (p: string) => { const x = PARA.find((z) => z[0] === p); return x ? (es ? x[1] : x[2]) : ""; };
  const blocks: (Bloque | false)[] = form ? [
    !!err && { type: "note", tone: "danger", ic: "warning", s: err },
    { type: "form", fields: [
      { k: E2("TU SEGURO", "YOUR INSURANCE"), v: f.kind, onV: () => undefined, chips: TIPOS.map(([k, a, b]) => ({ l: es ? a : b, on: f.kind === k, onClick: () => set({ kind: f.kind === k ? "" : k, plan: "" }) })),
        h: f.kind === "none" ? E2("Cada consultorio dice su precio sin seguro. Algunos cobran según tus ingresos o no piden papeles.", "Each clinic shows its uninsured price. Some charge by income or ask for no papers.") : undefined },
      ...(pide && planes.length ? [{ k: f.kind === "priv" ? E2("COMPAÑÍA", "COMPANY") : E2("PLAN", "PLAN"), v: f.plan, onV: () => undefined, chips: planes.map((p) => ({ l: p.l, on: f.plan === p.key, onClick: () => set({ plan: f.plan === p.key ? "" : p.key }) })) }] : []),
      ...(pide ? [{ k: E2("NÚMERO DE MIEMBRO", "MEMBER ID"), opt: E2("OPCIONAL", "OPTIONAL"), v: f.num, onV: (v: string) => set({ num: v.replace(/[^0-9A-Za-z]/g, "").slice(0, 20) }), ph: E2("Está en tu tarjeta", "It is on your card"), max: 20,
        h: E2("Guardamos solo los últimos 4. Los ve el consultorio que confirma tu cita, para revisar tu seguro antes.", "We keep only the last 4. The clinic that confirms your visit sees them, to check your coverage first.") }] : []),
      { k: E2("¿PARA QUIÉN ES?", "WHO IS IT FOR?"), v: f.para, onV: () => undefined, chips: PARA.map(([k, a, b]) => ({ l: es ? a : b, on: f.para === k, onClick: () => set({ para: k }) })) },
    ] },
    { type: "note", tone: "info", ic: "lock", s: E2("To’Latino no ve tu historial médico. Tu seguro solo se usa para decirte si lo aceptan y cuánto pagas.", "To’Latino never sees your medical records. Your insurance is only used to tell you if it is accepted and what you pay.") },
    { type: "acts", btns: [[E2("Guardar seguro", "Save insurance"), "primary", "check", guardar, ocupado], ...(seguros.length ? [[E2("Volver", "Back"), "secondary", "chevronLeft", () => { setForm(false); setErr(null); }] as [string, string, string, () => void]] : [])], cols: "repeat(2,minmax(0,220px))" },
  ] : [
    seguros.length ? { type: "rows", rows: seguros.map((x) => ({
      key: x.id, ic: "insurance", al: "flex-start" as const, t: es ? x.nombre.es : x.nombre.en, tag: x.principal ? [E2("PRINCIPAL", "MAIN"), "action"] as [string, string] : null,
      s: [x.last4 ? `••• ${x.last4}` : "", paraL(x.para)].filter(Boolean).join(" · ").toUpperCase(),
      acts: [...(x.principal ? [] : [[E2("Usar este", "Use this one"), "secondary", () => start(async () => { const r = await seguroUsar(x.id); if (r.ok) { ui.toast(E2("Ahora es tu seguro principal.", "Now your main insurance.")); router.refresh(); } })] as [string, string, () => void]]),
        [E2("Quitar", "Remove"), "secondary", () => ui.setHoja({ title: E2("¿Quitar este seguro?", "Remove this insurance?"), sub: E2("Las citas que ya pediste no cambian.", "Visits you already requested do not change."), yes: E2("Quitar", "Remove"), peligro: true,
          onYes: () => start(async () => { const r = await seguroQuitar(x.id); if (r.ok) { ui.toast(E2("Seguro quitado.", "Insurance removed.")); router.refresh(); } }) })] as [string, string, () => void]],
    })) } : { type: "empty", ic: "insurance", t: E2("Sin seguros", "No insurance saved"), s: E2("Guárdalo y en cada consultorio te decimos si lo aceptan y cuánto pagas.", "Save it and at every clinic we tell you if they take it and what you pay.") },
    { type: "note", tone: "info", ic: "lock", s: E2("To’Latino no ve tu historial médico. Tu seguro solo se usa para decirte si lo aceptan y cuánto pagas.", "To’Latino never sees your medical records. Your insurance is only used to tell you if it is accepted and what you pay.") },
    { type: "acts", btns: [[E2("Agregar otro seguro", "Add another insurance"), "primary", "plus", () => setForm(true)]], cols: "minmax(0,260px)" },
  ];
  return (
    <Marco es={es} code="USR-SEGUROS" back="/cuenta" t={E2("Mis seguros", "My insurance")} s={E2("TE DECIMOS EN CADA CONSULTORIO SI LO ACEPTAN Y CUÁNTO PAGAS", "WE TELL YOU AT EVERY CLINIC IF THEY TAKE IT AND WHAT YOU PAY")}
      act={form ? undefined : { ic: "plus", l: E2("Agregar", "Add"), on: () => setForm(true) }} blocks={blocks} yo={yo} ui={ui} />
  );
}
