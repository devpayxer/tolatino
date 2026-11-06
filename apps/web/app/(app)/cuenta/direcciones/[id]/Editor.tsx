"use client";
/* USR-DIRECCION (diseño Mi cuenta · addrV): qué es, calle y número, apartamento, código postal, para el repartidor,
   usar por defecto; fuera de la zona avisa. Al guardar, el servidor la ubica en el mapa. */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Direccion } from "@/lib/direcciones";
import { borrarDir, guardarDir } from "../../acciones";
import { Marco, useAnchoCuenta, useCuentaUi, type Bloque, type Yo } from "../../Marco";

export function Editor({ es, yo, cur, primera, zona, volver }: { es: boolean; yo: Yo; cur: Direccion | null; primera: boolean; zona: { name: string; zips: string[]; ciudadDe: Record<string, string> } | null; volver: string | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), [ocupado, start] = useTransition(), desk = useAnchoCuenta() >= 1024;
  const [f, setF] = useState({ lab: cur?.label ?? "casa", st: cur?.street ?? "", apt: cur?.apt ?? "", zip: cur?.zip ?? "", ins: cur?.instructions ?? "", def: cur ? cur.isDefault : primera, t: false });
  const [err, setErr] = useState<{ campo?: string; msg: string } | null>(null);
  const set = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));
  const isNew = !cur, atras = volver ?? "/cuenta/direcciones";
  const errS = f.t && f.st.trim().length < 4 ? E2("Escribe la calle y el número.", "Enter street and number.") : err?.campo === "street" ? err.msg : "";
  const errZ = f.t && !/^\d{5}$/.test(f.zip.trim()) ? E2("El código postal tiene 5 números.", "ZIP has 5 digits.") : err?.campo === "zip" ? err.msg : "";
  const fuera = /^\d{5}$/.test(f.zip.trim()) && !!zona && !zona.zips.includes(f.zip.trim());
  const guardar = () => {
    if (f.st.trim().length < 4 || !/^\d{5}$/.test(f.zip.trim())) { set({ t: true }); return; }
    setErr(null);
    start(async () => {
      const r = await guardarDir(cur?.id ?? null, { label: f.lab, street: f.st, apt: f.apt, zip: f.zip, instructions: f.ins, isDefault: f.def })
        .catch(() => ({ ok: false as const, msg: { es: "No se pudo guardar. Revisa tu conexión.", en: "Could not save. Check your connection." } }));
      if (!r.ok) { setErr({ campo: "campo" in r ? r.campo : undefined, msg: es ? r.msg.es : r.msg.en }); return; }
      router.push(`${atras}${atras.includes("?") ? "&" : "?"}dir=${r.id}`);
      router.refresh();
    });
  };
  const borrar = () => ui.setHoja({ title: E2("¿Borrar esta dirección?", "Delete this address?"), yes: E2("Borrar", "Delete"), onYes: () => start(async () => { const r = await borrarDir(cur!.id); if (r.ok) { router.push("/cuenta/direcciones"); router.refresh(); } }) });
  const blocks: (Bloque | false)[] = [
    !!err && !err.campo && { type: "note", tone: "danger", ic: "warning", s: err.msg },
    { type: "form", fields: [
      { k: E2("¿QUÉ ES?", "WHAT IS IT?"), v: f.lab, onV: () => undefined, chips: ([["casa", "Casa", "Home"], ["trabajo", "Trabajo", "Work"], ["otra", "Otra", "Other"]] as const).map(([k, a, b]) => ({ l: es ? a : b, on: f.lab === k, onClick: () => set({ lab: k }) })) },
      { k: E2("CALLE Y NÚMERO", "STREET AND NUMBER"), v: f.st, onV: (v) => { set({ st: v }); setErr(null); }, ph: "58 W Oak St", max: 120, err: errS },
      { k: E2("APARTAMENTO O PISO", "APT OR FLOOR"), v: f.apt, onV: (v) => set({ apt: v }), ph: "Apt 2", opt: E2("OPCIONAL", "OPTIONAL"), max: 20 },
      { k: E2("CÓDIGO POSTAL", "ZIP CODE"), v: f.zip, onV: (v) => { set({ zip: v.replace(/\D/g, "") }); setErr(null); }, ph: zona?.zips[0] ?? "18201", max: 5, im: "numeric", err: errZ, h: zona ? `${zona.ciudadDe[f.zip.trim()] ?? zona.name}, PA` : undefined },
      { k: E2("PARA EL REPARTIDOR", "FOR THE DRIVER"), v: f.ins, onV: (v) => set({ ins: v }), ph: E2("Timbre, puerta, a quién dejarlo…", "Buzzer, door, who to leave it with…"), ta: true, opt: E2("OPCIONAL", "OPTIONAL"), max: 160 },
    ] },
    fuera && { type: "note", tone: "warn", ic: "warning", t: E2("Fuera de la zona de entrega", "Outside the delivery area"), s: E2(`La puedes guardar, pero los negocios de ${zona!.name} no entregan ahí. Puedes recoger.`, `You can save it, but ${zona!.name} businesses do not deliver there. You can pick up.`) },
    { type: "rows", rows: [{ ic: "check", t: E2("Usar por defecto", "Use as default"), s: E2("LA ELEGIMOS PRIMERO AL PEDIR", "WE PICK IT FIRST WHEN YOU ORDER"), tog: f.def, onTog: () => set({ def: !f.def }) }] },
    // Escritorio: Guardar y Borrar aquí; teléfono: Guardar en la barra de abajo y «Borrar dirección» aquí.
    desk ? { type: "acts", btns: [[E2("Guardar dirección", "Save address"), "primary", "check", guardar, ocupado], ...(!isNew ? [[E2("Borrar", "Delete"), "secondary", "trash", borrar] as [string, string, string, () => void]] : [])], cols: "repeat(2,minmax(0,220px))" }
      : !isNew && { type: "acts", btns: [[E2("Borrar dirección", "Delete address"), "secondary", "trash", borrar]], cols: "minmax(0,1fr)" },
  ];
  return (
    <Marco es={es} code="USR-DIRECCIONES" back={atras} t={isNew ? E2("Nueva dirección", "New address") : E2("Editar dirección", "Edit address")} s={zona ? `${zona.name.toUpperCase()}, PA` : "PA"}
      blocks={blocks} yo={yo} ui={ui} bar={[[E2("Guardar dirección", "Save address"), "primary", guardar, ocupado]]} />
  );
}
