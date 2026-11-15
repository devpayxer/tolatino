"use client";
/* 9n-16 · Lo que se renta: agregar y editar un artículo (LAUNCH «Editor de artículos de Tienda/Renta en el panel»). El diseño no trae esta
   pantalla del panel (hueco #5 del plan 4f): se compone con sus bloques, como el editor de vehículos (Autos.tsx): fotos, nombre, descripción,
   precio por día, depósito y unidades; en Transporte, las millas incluidas por día y la milla de más. Las unidades nunca bajan de las que la
   gente tiene apartadas o fuera (lo dice el servidor). «Quitar» deja el artículo fuera (nada se borra) y solo sin rentas vivas. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { ArtPanel } from "@/lib/rentas";
import { subirFoto } from "@/lib/subir-foto";
import { articuloRentaGuardar, articuloRentaQuitar, articuloRentaVisible } from "./acciones-rentas";
import type { Ctx, Sec } from "./Panel";

type FA = { n: string; nEn: string; d: string; dEn: string; p: string; dep: string; u: number; fotos: string[]; mpd: string; mi: string };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const num = (v: string, n: number) => v.replace(/[^0-9]/g, "").slice(0, n);

/* Las filas de «Lo que rentas» (Hogar y Transporte): cada una abre su editor; «Agregar» abre uno nuevo. */
export function filasRenta(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.arts ?? [];
  if (!c.d.mods.includes("renta")) return [];
  const items: Fila[] = L.map((r) => ({ key: r.id, icon: r.veh ? "car" : "wrench", t: es ? r.n.es : r.n.en || r.n.es,
    s: E2(`${money(r.p)} por día · depósito ${money(r.dep)} · ${r.libres + r.vivas} ${r.libres + r.vivas === 1 ? "unidad" : "unidades"}`, `${money(r.p)} a day · deposit ${money(r.dep)} · ${r.libres + r.vivas} ${r.libres + r.vivas === 1 ? "unit" : "units"}`),
    tag: !r.on ? E2("APAGADO", "OFF") : r.vivas ? `${r.vivas} ${E2("FUERA", "OUT")}` : null, tone: !r.on ? "neutral" : "signal", chev: true, onClick: () => c.det(`art:${r.id}`) }));
  return [{ type: "rows", k: E2(`LO QUE RENTAS · ${L.length}`, `WHAT YOU RENT · ${L.length}`), items: [...items,
    { key: "new", icon: "plus", t: E2("Agregar algo para rentar", "Add something to rent"), s: E2("Nombre, precio por día, depósito, unidades y foto.", "Name, daily price, deposit, units and photo."), chev: true, onClick: () => c.det("art:new") }] }];
}

export function articuloRentaEditor(c: Ctx, id: string): Sec {
  const { E2, es } = c, isNew = id === "new", x0: ArtPanel | undefined = isNew ? undefined : (c.arts ?? []).find((z) => z.id === id);
  const veh = x0 ? x0.veh : c.d.cat === "NEG-TRANS";
  if (!isNew && !x0) return { blocks: [{ type: "head", eye: E2("LO QUE RENTAS", "WHAT YOU RENT"), t: E2("Ya no está", "It is gone"), onBack: c.closeDet }, { type: "empty", icon: "wrench", t: E2("Ese artículo ya no está en tu lista.", "That item is no longer on your list."), s: E2("Vuelve a Lo que rentas.", "Go back to What you rent.") }], ed: null };
  const base: FA = x0 ? { n: x0.n.es, nEn: x0.n.en === x0.n.es ? "" : x0.n.en, d: x0.d.es, dEn: x0.d.en === x0.d.es ? "" : x0.d.en, p: String(x0.p / 100), dep: String(x0.dep / 100), u: x0.libres + x0.vivas,
    fotos: x0.fotos, mpd: x0.mpd != null ? String(x0.mpd) : "", mi: x0.mi != null ? String(x0.mi / 100) : "" }
    : { n: "", nEn: "", d: "", dEn: "", p: "", dep: "", u: 1, fotos: [], mpd: veh ? "150" : "", mi: veh ? "0.35" : "" };
  const F = c.form<FA>(`det:art:${id}`, base), d = F.d, set = F.set;
  const pC = Math.round(Number(d.p || 0) * 100), depC = Math.round(Number(d.dep || 0) * 100), miC = Math.round(Number(d.mi || 0) * 100), vivas = x0?.vivas ?? 0;
  const miss: string[] = [];
  if (d.n.trim().length < 2) miss.push(E2("el nombre", "the name"));
  if (!(pC >= 100 && pC <= 100000 && pC % 100 === 0)) miss.push(E2("el precio por día ($1 a $1,000)", "the daily price ($1 to $1,000)"));
  if (!(depC >= 0 && depC <= 500000 && depC % 500 === 0)) miss.push(E2("el depósito (de 5 en 5 dólares)", "the deposit (in $5 steps)"));
  if (veh && (!/^\d{1,4}$/.test(d.mpd) || !(miC >= 0 && miC <= 500))) miss.push(E2("las millas por día y la milla de más", "miles per day and the extra mile"));
  const out: (Bloque | null)[] = [{ type: "head", eye: isNew ? E2("LO QUE RENTAS · NUEVO", "WHAT YOU RENT · NEW") : `${E2("LO QUE RENTAS", "WHAT YOU RENT")} · ${x0!.on ? E2("EN TU PÁGINA", "ON YOUR PAGE") : E2("APAGADO", "OFF")}`,
    t: isNew ? E2("Agregar algo para rentar", "Add something to rent") : es ? x0!.n.es : x0!.n.en || x0!.n.es,
    s: E2("Sale en tu Tienda con su precio por día y su depósito. Se aparta 48 horas sin cobrar; se cobra al recogerla.", "Shows in your Shop with its daily price and deposit. Held 48 hours with no charge; charged at pickup."), onBack: c.closeDet }];
  if (x0) out.push({ type: "rows", items: [{ icon: "store", t: E2("Sale en tu Tienda", "Shows in your Shop"), s: x0.on ? E2("La gente la puede apartar.", "People can hold it.") : E2("Apagado: no se puede apartar. Lo ya apartado o rentado sigue.", "Off: it can’t be held. Existing holds and rentals continue."),
    tgOn: x0.on, onTg: () => c.run(() => articuloRentaVisible(c.d.id, x0.id, !x0.on), x0.on ? E2("Apagado: no sale en tu Tienda. Lo ya apartado sigue.", "Off: not in your Shop. Existing holds continue.") : E2("Ya sale en tu Tienda.", "Now shows in your Shop.")) }] });
  out.push({ type: "photos", k: E2("FOTOS · LA PRIMERA SALE EN TU TIENDA", "PHOTOS · THE FIRST ONE SHOWS IN YOUR SHOP"), count: `${d.fotos.length}/4`, cols: 4,
    items: d.fotos.map((u) => ({ key: u, bg: `url("${u}")`, onClick: () => set({ fotos: d.fotos.filter((z) => z !== u) }) })),
    addL: E2("Subir foto", "Upload photo"), onAdd: d.fotos.length >= 4 ? undefined : () => c.pickFiles(true, async (fs) => {
      const L = [...d.fotos];
      for (const f of fs.slice(0, 4 - L.length)) { const r = await subirFoto(f); if (r.ok && r.url) L.push(r.url); else { c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "The photo could not be uploaded.")); break; } }
      set({ fotos: L });
    }) });
  out.push({ type: "note", tone: "info", icon: "image", t: E2("Toca una foto para quitarla. Que se vea lo que se renta, sin personas.", "Tap a photo to remove it. Show what you rent, no people.") },
    { type: "field", k: E2("NOMBRE", "NAME"), val: d.n, max: 60, count: `${d.n.length}/60`, ph: veh ? E2("Camioneta de carga", "Cargo van") : E2("Lavadora a presión", "Pressure washer"), onChange: (v: string) => set({ n: v.slice(0, 60) }) },
    { type: "field", k: E2("NOMBRE EN INGLÉS · OPCIONAL", "NAME IN ENGLISH · OPTIONAL"), val: d.nEn, max: 60, ph: veh ? "Cargo van" : "Pressure washer", onChange: (v: string) => set({ nEn: v.slice(0, 60) }) },
    { type: "field", k: E2("QUÉ INCLUYE · OPCIONAL", "WHAT’S INCLUDED · OPTIONAL"), val: d.d, max: 280, area: true, count: `${d.d.length}/280`, ph: E2("Con manguera de 25 pies y dos boquillas.", "With a 25 ft hose and two nozzles."), onChange: (v: string) => set({ d: v.slice(0, 280) }) },
    { type: "field", k: E2("QUÉ INCLUYE EN INGLÉS · OPCIONAL", "WHAT’S INCLUDED IN ENGLISH · OPTIONAL"), val: d.dEn, max: 280, area: true, onChange: (v: string) => set({ dEn: v.slice(0, 280) }) },
    { type: "group", k: E2("PRECIO", "PRICE") },
    { type: "field", k: E2("POR DÍA", "PER DAY"), val: d.p, pre: "$", im: "numeric", ph: "45", help: E2("En dólares enteros. La semana cuesta 5 días.", "In whole dollars. A week costs 5 days."), onChange: (v: string) => set({ p: num(v, 4) }) },
    { type: "field", k: E2("DEPÓSITO · SE LIBERA AL DEVOLVER", "DEPOSIT · RELEASED ON RETURN"), val: d.dep, pre: "$", im: "numeric", ph: "100", help: E2("De 5 en 5. Se retiene en la tarjeta al recoger; los días tarde o un daño salen de aquí.", "In $5 steps. Held on the card at pickup; late days or damage come out of it."), onChange: (v: string) => set({ dep: num(v, 4) }) });
  if (veh) out.push({ type: "group", k: E2("MILLAS", "MILES") },
    { type: "field", k: E2("INCLUIDAS POR DÍA", "INCLUDED PER DAY"), val: d.mpd, im: "numeric", suf: E2("millas", "miles"), ph: "150", onChange: (v: string) => set({ mpd: num(v, 4) }) },
    { type: "field", k: E2("LA MILLA DE MÁS", "EACH EXTRA MILE"), val: d.mi, pre: "$", im: "decimal", ph: "0.35", help: E2("0 si no cobras las millas de más.", "0 if you don’t charge extra miles."), onChange: (v: string) => set({ mi: v.replace(/[^0-9.]/g, "").slice(0, 5) }) });
  out.push({ type: "group", k: E2("UNIDADES", "UNITS") },
    { type: "step", t: E2("Cuántas tienes", "How many you have"), s: vivas ? E2(`${vivas} apartadas o fuera ahora: no puedes bajar de ${vivas}.`, `${vivas} on hold or out now: you can’t go below ${vivas}.`) : E2("Cada apartado aparta una; vuelve al devolverla.", "Each hold takes one; it comes back on return."),
      v: String(d.u), onM: () => set({ u: Math.max(Math.max(1, vivas), d.u - 1) }), onP: () => set({ u: Math.min(99, d.u + 1) }) });
  if (miss.length) out.push({ type: "note", tone: "warn", icon: "info", t: `${E2("Falta", "Missing")}: ${miss.join(", ")}.` });
  if (x0) out.push({ type: "acts", items: [{ l: E2("Quitar de la lista", "Remove from the list"), v: "secondary", icon: "trash", off: c.pending,
    onClick: () => c.run(() => articuloRentaQuitar(c.d.id, x0.id), E2("Quitado: ya no sale en tu Tienda.", "Removed: no longer in your Shop."), () => c.closeDet()) }] });
  return { blocks: out, ed: { F, l: isNew ? E2("Agregar", "Add") : E2("Guardar", "Save"), valid: !miss.length, always: isNew,
    apply: (z: FA) => articuloRentaGuardar(c.d.id, id, { n: z.n, nEn: z.nEn, d: z.d, dEn: z.dEn, p: Math.round(Number(z.p || 0) * 100), dep: Math.round(Number(z.dep || 0) * 100), unidades: z.u, fotos: z.fotos,
      mpd: veh ? Number(z.mpd || 0) : null, mi: veh ? Math.round(Number(z.mi || 0) * 100) : null }),
    toast: isNew ? E2("Listo: ya sale en tu Tienda.", "Done: it now shows in your Shop.") : E2("Guardado.", "Saved."), onDone: isNew ? c.closeDet : undefined } };
}
