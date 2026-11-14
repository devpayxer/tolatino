"use client";
/* USR-DIRECCION (diseño Mi cuenta · addrV): qué es, calle y número, apartamento, código postal, para el repartidor,
   usar por defecto; fuera de la zona avisa. Al guardar, el servidor la ubica en el mapa.
   9m · La calle y el código postal son la dirección como DoorDash (DireccionCampo): sugerencias reales mientras se escribe, «Usar mi ubicación» y el
   pin ajustable («la puerta está aquí»); el pin viaja al servidor, que lo acepta solo cerca de la dirección. Todo EE. UU. */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Direccion } from "@/lib/direcciones";
import { DireccionCampo, type ValorDir } from "@/app/_dir/DireccionCampo";
import { borrarDir, guardarDir } from "../../acciones";
import { Marco, useAnchoCuenta, useCuentaUi, type Bloque, type Yo } from "../../Marco";

export function Editor({ es, yo, cur, primera, zona, volver, centro }: { es: boolean; yo: Yo; cur: Direccion | null; primera: boolean; zona: { name: string; zips: string[]; ciudadDe: Record<string, string> } | null; volver: string | null; centro: [number, number] | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), [ocupado, start] = useTransition(), desk = useAnchoCuenta() >= 1024;
  const [f, setF] = useState({ lab: cur?.label ?? "casa", st: cur?.street ?? "", apt: cur?.apt ?? "", zip: cur?.zip ?? "", ins: cur?.instructions ?? "", def: cur ? cur.isDefault : primera, t: false });
  const [err, setErr] = useState<{ campo?: string; msg: string } | null>(null);
  const [dir, setDir] = useState<ValorDir>({ calle: cur?.street ?? "", zip: cur?.zip ?? "", lugar: cur?.lugar ?? null, estado: cur?.estado ?? null,
    origen: cur?.lat != null && cur?.lng != null ? [cur.lat, cur.lng] : null, pin: null, calidad: cur?.ubicada ?? null });
  const conDir = (x: ValorDir) => { setDir(x); setF((y) => ({ ...y, st: x.calle, zip: x.zip })); setErr(null); };
  const set = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));
  const isNew = !cur, atras = volver ?? "/cuenta/direcciones";
  const errS = f.t && f.st.trim().length < 4 ? E2("Escribe la calle y el número.", "Enter street and number.") : err?.campo === "street" ? err.msg : "";
  const errZ = f.t && !/^\d{5}$/.test(f.zip.trim()) ? E2("El código postal tiene 5 números.", "ZIP has 5 digits.") : err?.campo === "zip" ? err.msg : "";
  const fuera = /^\d{5}$/.test(f.zip.trim()) && !!zona && !zona.zips.includes(f.zip.trim());
  const guardar = () => {
    if (f.st.trim().length < 4 || !/^\d{5}$/.test(f.zip.trim())) { set({ t: true }); return; }
    setErr(null);
    start(async () => {
      const r = await guardarDir(cur?.id ?? null, { label: f.lab, street: f.st, apt: f.apt, zip: f.zip, instructions: f.ins, isDefault: f.def, pin: dir.pin ? { lat: dir.pin[0], lng: dir.pin[1] } : null })
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
    ] },
    // Calle (con sus sugerencias y «Usar mi ubicación»), apartamento y código postal en ese orden (el de siempre); debajo, el pin ajustable.
    { type: "pieza", el: <DireccionCampo es={es} v={dir} onV={conDir} err={errS} errZip={errZ} centro={centro} desk={desk} marco="Mi cuenta · formulario" ph="58 W Oak St"
      entre={<label style={{ display: "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ font: "700 10px 'JetBrains Mono',monospace", letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>{E2("APARTAMENTO O PISO", "APT OR FLOOR")}</span><span style={{ font: "600 9.5px 'JetBrains Mono',monospace", letterSpacing: ".08em", color: "rgba(11,14,18,.4)" }}>{E2("OPCIONAL", "OPTIONAL")}</span></div>
        <input value={f.apt} onChange={(e) => set({ apt: e.target.value.slice(0, 20) })} placeholder="Apt 2" style={{ marginTop: 8, width: "100%", boxSizing: "border-box", borderRadius: 13, border: `1.5px solid ${f.apt.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}`, outline: "none", color: "var(--tl-ink)", background: "var(--tl-white)", height: 50, padding: "0 14px", font: "600 16px Manrope,sans-serif" }} />
      </label>} /> },
    { type: "form", fields: [
      { k: E2("PARA EL REPARTIDOR", "FOR THE DRIVER"), v: f.ins, onV: (v) => set({ ins: v }), ph: E2("Timbre, puerta, a quién dejarlo…", "Buzzer, door, who to leave it with…"), ta: true, opt: E2("OPCIONAL", "OPTIONAL"), max: 160 },
    ] },
    fuera && { type: "note", tone: "warn", ic: "warning", t: E2("Fuera de la zona de entrega", "Outside the delivery area"), s: E2(`La puedes guardar, pero los negocios de ${zona!.name} no entregan ahí. Puedes recoger.`, `You can save it, but ${zona!.name} businesses do not deliver there. You can pick up.`) },
    { type: "rows", rows: [{ ic: "check", t: E2("Usar por defecto", "Use as default"), s: E2("LA ELEGIMOS PRIMERO AL PEDIR", "WE PICK IT FIRST WHEN YOU ORDER"), tog: f.def, onTog: () => set({ def: !f.def }) }] },
    // Escritorio: Guardar y Borrar aquí; teléfono: Guardar en la barra de abajo y «Borrar dirección» aquí.
    desk ? { type: "acts", btns: [[E2("Guardar dirección", "Save address"), "primary", "check", guardar, ocupado], ...(!isNew ? [[E2("Borrar", "Delete"), "secondary", "trash", borrar] as [string, string, string, () => void]] : [])], cols: "repeat(2,minmax(0,220px))" }
      : !isNew && { type: "acts", btns: [[E2("Borrar dirección", "Delete address"), "secondary", "trash", borrar]], cols: "minmax(0,1fr)" },
  ];
  return (
    <Marco es={es} code="USR-DIRECCIONES" back={atras} t={isNew ? E2("Nueva dirección", "New address") : E2("Editar dirección", "Edit address")} s={dir.lugar && dir.estado ? `${dir.lugar.toUpperCase()}, ${dir.estado}` : zona ? `${zona.name.toUpperCase()}, PA` : "PA"}
      blocks={blocks} yo={yo} ui={ui} bar={[[E2("Guardar dirección", "Save address"), "primary", guardar, ocupado]]} />
  );
}
