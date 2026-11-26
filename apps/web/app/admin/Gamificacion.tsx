"use client";
/* 5f–5g · ADM-GAM · Gamification (Super Admin.dc.html secGam): Rangos (los 10 con lo que piden y desbloquean, cuántos vecinos hay en cada uno,
   «Cambiar nombre» ES/EN con vista previa), Puntos (tope del día 50 · 100 · 150 · 200 y cada regla con su valor y su interruptor; las 4
   reglas fijas) y Tabla del Barrio (ciudad, mes en curso o anterior, excluir con motivo, «Cerrar el mes» con sus 4 pasos, solo Admin).
   Cada cambio pide motivo y queda en la auditoría; la Comunidad lo lee al instante. Solo bloques del sistema; el servidor decide.
   5g: Monedas (EN CIRCULACIÓN · EMITIDAS ESTE MES · CANJEADAS · VALOR «Sin valor en dinero»; reglas de ganancia con valor e interruptor;
   últimos movimientos; el ajuste ± va en Usuarios 360°) y Cupones (por ciudad y estado: aprobar con costo 80–1,000, rechazar, cambiar
   costo, pausar con motivo y aviso al negocio, activar; los últimos canjes). El Patio, después de la apertura (G); «Rango del negocio» no
   se construye (§6 #23). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Gam } from "@/lib/admin-gam";
import { COND_DIAS, COND_EDITABLE, CUANDO_PATIO, REGLAS_PUNTOS, UNIDAD, nombreMes, reqDeCond } from "@/lib/puntos-comun";
import type { ResAdm } from "./acciones-colas";
import { gamCerrarMes, gamCuponActivar, gamCuponAprobar, gamCuponCosto, gamCuponPausar, gamCondicion, gamCuponRechazar, gamExcluir, gamMonedaRegla, gamRegla, gamRenombrar, gamTope } from "./acciones-gam";
import { COSTO_MAX, COSTO_MIN, SIN_VALOR } from "@/lib/monedas-comun";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";

type Tab = "rk" | "pts" | "coin" | "cup" | "tabla";
const fecha = (d: string, en = false) => new Date(d).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/New_York" });

export function Gamificacion({ d, tab, edita, admin }: { d: Gam; tab: Tab; edita: boolean; admin: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), desk = useAncho() >= 1024, cols = desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined;
  const { E2 } = useE2(), en = E2("", "x") === "x", tx = (x: { es: string; en?: string | null }) => (en ? x.en || x.es : x.es), fe = (s: string) => fecha(s, en);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [nombre, setNombre] = useState<{ n: number; es: string; en: string } | null>(null);
  const [regla, setRegla] = useState<{ key: string; v: string; on: boolean; mon?: boolean } | null>(null);
  const nRef = useRef(nombre); nRef.current = nombre;
  const rRef = useRef(regla); rRef.current = regla;
  // 9n-7 · Lo que pide un rango (puntos mínimos, el número de su condición y, en Comandante, los días de historial limpio).
  const [cond, setCond] = useState<{ n: number; tipo: string; p: string; k: string; d: string; p0: number | null; req0: string } | null>(null);
  const cRef = useRef(cond); cRef.current = cond;
  const ir = (p: Record<string, string | null>) => { const q = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v); } router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); setNombre(null); setRegla(null); setCond(null); router.refresh(); };
  const sinPermiso = () => setToast(E2("Tu rol no edita Gamification.", "Your role can’t edit Gamification."));
  const cerrarConf = () => { setConf(null); setNombre(null); setRegla(null); setCond(null); };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "GAMIFICATION", t: conf.titulo, onBack: cerrarConf, h1: desk ? 26 : 22 }]} />
      {nombre && <PanelBloques bloques={[
        { type: "field", k: E2("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: nombre.es, max: 30, count: `${nombre.es.length}/30`, onChange: (v: string) => setNombre((x) => (x ? { ...x, es: v.slice(0, 30) } : x)) },
        { type: "field", k: E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: nombre.en, max: 30, count: `${nombre.en.length}/30`, onChange: (v: string) => setNombre((x) => (x ? { ...x, en: v.slice(0, 30) } : x)) },
        { type: "group", k: E2("VISTA PREVIA · ASÍ SE VE EN LA COMUNIDAD", "PREVIEW · HOW IT LOOKS IN COMMUNITY") },
        { type: "rows", items: [{ key: "es", icon: "shield", t: `${nombre.n} · ${nombre.es || "—"}`, s: E2("Pastilla del rango, perfil, comentarios (desde Sargento) y la Tabla", "Rank pill, profile, comments (from Sargento) and the Board"), m: `${nombre.n} · ${(nombre.es || "—").toUpperCase()}` },
          { key: "en", icon: "shield", t: `${nombre.n} · ${nombre.en || nombre.es || "—"}`, s: "In English", m: `${nombre.n} · ${(nombre.en || nombre.es || "—").toUpperCase()}` }] },
      ]} />}
      {regla && <PanelBloques bloques={[
        { type: "field", k: regla.mon ? E2("MONEDAS · 0–1,000", "COINS · 0–1,000") : E2("PUNTOS · 0–100", "POINTS · 0–100"), val: regla.v, im: "numeric", max: 4, onChange: (v: string) => setRegla((x) => (x ? { ...x, v: v.replace(/[^\d]/g, "").slice(0, x.mon ? 4 : 3) } : x)) },
        { type: "rows", items: [{ key: "on", icon: "star", t: regla.on ? E2("Encendida", "On") : E2("Apagada", "Off"), s: E2("Apagada no da puntos desde ahora; lo ya ganado no cambia.", "Off gives no points from now on; what was already earned doesn’t change."), tgOn: regla.on, onTg: () => setRegla((x) => (x ? { ...x, on: !x.on } : x)) }] },
      ]} />}
      {cond && (() => {
        const nuevo = reqDeCond({ tipo: cond.tipo, n: Number(cond.k) || 0, dias: Number(cond.d) || 0 }), pts = Number(cond.p) || 0;
        return <PanelBloques bloques={[
          { type: "field", k: E2("PUNTOS MÍNIMOS", "MINIMUM POINTS"), val: cond.p, im: "numeric", max: 6, onChange: (v: string) => setCond((x) => (x ? { ...x, p: v.replace(/[^\d]/g, "").slice(0, 6) } : x)) },
          { type: "field", k: `${E2("CUÁNTOS", "HOW MANY")} · ${(UNIDAD[cond.tipo] ? tx(UNIDAD[cond.tipo]!) : "").toUpperCase()}`, val: cond.k, im: "numeric", max: 4, onChange: (v: string) => setCond((x) => (x ? { ...x, k: v.replace(/[^\d]/g, "").slice(0, 4) } : x)) },
          ...(cond.tipo === "limpio_votos" ? [{ type: "field", k: `${E2("DÍAS SIN SANCIONES", "DAYS WITHOUT SANCTIONS")} · ${COND_DIAS[0]}–${COND_DIAS[1]}`, val: cond.d, im: "numeric", max: 3, onChange: (v: string) => setCond((x) => (x ? { ...x, d: v.replace(/[^\d]/g, "").slice(0, 3) } : x)) } as Bloque] : []),
          { type: "group", k: E2("VISTA PREVIA · ASÍ LO VE EL VECINO", "PREVIEW · HOW NEIGHBORS SEE IT") },
          { type: "rows", items: [
            { key: "antes", icon: "shield", dim: true, t: `${E2("Antes", "Before")}: ${cond.req0}${cond.p0 != null ? ` · ${cond.p0.toLocaleString("en-US")} ${E2("puntos", "points")}` : ""}`, s: E2("Para subir", "To rank up") },
            { key: "ahora", icon: "shield", t: `${E2("Ahora", "Now")}: ${nuevo?.es ?? "—"}${pts ? ` · ${pts.toLocaleString("en-US")} ${E2("puntos", "points")}` : ""}`, s: `EN: ${nuevo?.en ?? "—"}` }] },
          { type: "note", tone: "info", icon: "info", t: E2("Cuenta desde ahora. El rango solo sube: quien ya lo tiene lo conserva aunque pidas más.", "It counts from now on. Rank only goes up: anyone who already has it keeps it even if you ask for more.") },
        ]} />;
      })()}
      <ConfirmarMotivo c={{ ...conf, titulo: E2("¿Por qué?", "Why?") }} desk={desk} onBack={cerrarConf} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  const B: Bloque[] = [
    { type: "head", eye: E2("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: "Gamification", s: E2("Rangos, puntos, monedas, cupones y la Tabla del Barrio. Lo que cambies aquí lo ve la Comunidad al instante. Aquí nada se compra: los puntos salen de los votos de los vecinos y las monedas no tienen valor en dinero.", "Ranks, points, coins, coupons and the Neighborhood Board. What you change here shows in Community instantly. Nothing is bought here: points come from neighbors’ votes and coins have no cash value."), h1: desk ? 26 : 22 },
    { type: "tabs", items: ([["rk", E2("Rangos", "Ranks"), "10"], ["pts", E2("Puntos", "Points")], ["coin", E2("Monedas", "Coins")], ["cup", E2("Cupones", "Coupons"), d.cupones?.conteo.pending ? String(d.cupones.conteo.pending) : undefined], ["tabla", E2("Tabla del Barrio", "Neighborhood Board")]] as [Tab, string, string?][]).map(([k, l, n]) => ({ l, n, on: tab === k, onClick: () => ir({ tab: k === "rk" ? null : k, e: null, cur: null }) })) },
  ];
  if (tab === "rk") {
    B.push({ type: "note", tone: "info", icon: "shield", t: E2("El rango solo sube: los puntos que se restan no lo bajan. Coronel lo da el equipo (Usuarios › 360° › Comunidad); General del Barrio son 3 plazas por ciudad: los 3 primeros del mes que ya son Comandante, al cerrar la Tabla.", "Rank only goes up: points taken away don’t lower it. Coronel is granted by the team (Users › 360° › Community); General del Barrio has 3 spots per city: the month’s top 3 who are already Comandante, when the Board closes.") });
    B.push({ type: "rows", cols, items: d.rangos.map((r) => ({ key: String(r.n), icon: "shield", ibg: r.n >= 9 ? "var(--tl-ink)" : "rgba(75,55,245,.1)", ifg: r.n >= 9 ? "var(--tl-white)" : "var(--tl-action)",
      t: `${r.n} · ${r.name.es}`, s: `${E2("Para subir", "To rank up")}: ${tx(r.req)}${r.min != null ? ` · ${r.min.toLocaleString("en-US")} ${E2("puntos", "points")}` : ""} · EN: ${r.name.en}`, m: `${E2("DESBLOQUEA", "UNLOCKS")}: ${tx(r.unl)}${r.patio ? ` · ${tx(CUANDO_PATIO)}` : ""}`.toUpperCase(),
      tag: r.editado ? E2("EDITADO", "EDITED") : undefined, tone: "action", r: String(r.vecinos),
      acts: edita ? [{ l: E2("Cambiar nombre", "Rename"), v: "secondary", icon: "edit", onClick: () => { setNombre({ n: r.n, es: r.name.es, en: r.name.en }); setConf({ titulo: E2(`Nombre del rango ${r.n}`, `Name of rank ${r.n}`), sub: E2("Español e inglés. La Comunidad lo muestra al instante. Queda en la auditoría.", "Spanish and English. Community shows it instantly. It stays in the audit log."), cta: E2("Guardar", "Save"),
        plantillas: [E2("Lo pidió el fundador", "The founder asked for it"), E2("Más claro para los vecinos", "Clearer for neighbors")], nota: "interna", hacer: (m) => { const x = nRef.current; return x ? gamRenombrar(x.n, x.es, x.en, m) : Promise.resolve({ ok: false, mensaje: E2("Escribe el nombre.", "Enter the name.") } as ResAdm); } }); } },
        ...((COND_EDITABLE as readonly string[]).includes(r.cond?.tipo ?? "") ? [{ l: E2("Cambiar lo que pide", "Change requirements"), v: "secondary", icon: "edit", onClick: () => { setCond({ n: r.n, tipo: r.cond.tipo!, p: String(r.min ?? ""), k: String(r.cond.n ?? ""), d: String(r.cond.dias ?? 180), p0: r.min, req0: r.req.es });
          setConf({ titulo: E2(`Lo que pide ${r.name.es}`, `What ${tx(r.name)} requires`), sub: E2("Los puntos mínimos y su condición. Queda en la auditoría.", "The minimum points and its condition. It stays in the audit log."), cta: E2("Guardar", "Save"), plantillas: [E2("Lo pidió el fundador", "The founder asked for it"), E2("Subir de rango era muy fácil", "Ranking up was too easy"), E2("Subir de rango era muy difícil", "Ranking up was too hard")],
            nota: "interna", hacer: (m) => { const x = cRef.current; return x ? gamCondicion(x.n, x.p, x.k, x.d, m) : Promise.resolve({ ok: false, mensaje: E2("Escribe los valores.", "Enter the values.") } as ResAdm); } }); } }] : [])] : undefined })) });
  }
  if (tab === "pts") {
    B.push({ type: "chips", k: E2("TOPE DIARIO POR PERSONA", "DAILY CAP PER PERSON"), items: [50, 100, 150, 200].map((v) => ({ l: E2(`${v} al día`, `${v} a day`), v: d.tope === v ? "selected" : "filter",
      onClick: !edita ? sinPermiso : d.tope === v ? undefined : () => setConf({ titulo: "", sub: E2(`Tope del día: ${d.tope} → ${v}. Lo que pasa del tope no se guarda.`, `Daily cap: ${d.tope} → ${v}. Anything over the cap isn’t saved.`), cta: E2("Guardar", "Save"), plantillas: [E2("Mucha actividad legítima", "Lots of legitimate activity"), E2("Más estricto contra granjas de votos", "Stricter against vote farms")], nota: "interna", hacer: (m) => gamTope(v, m) }) })) });
    B.push({ type: "rows", items: d.reglas.map((x) => ({ key: x.key, icon: "star", t: tx(x.label), s: x.on ? E2("Encendida", "On") : E2("Apagada: no da puntos", "Off: gives no points"), r: x.on ? `+${x.v}` : "—", dim: !x.on, tag: x.editado ? E2("EDITADO", "EDITED") : undefined, tone: "action",
      acts: edita ? [{ l: E2("Cambiar", "Change"), v: "secondary", icon: "edit", onClick: () => { setRegla({ key: x.key, v: String(x.v), on: x.on }); setConf({ titulo: tx(x.label), sub: E2("Cuenta desde ahora; lo ya ganado no cambia.", "It counts from now on; what was already earned doesn’t change."), cta: E2("Guardar", "Save"),
        plantillas: [E2("Ajuste por abuso", "Adjustment for abuse"), E2("Más peso a lo que ayuda", "More weight to what helps")], nota: "interna", hacer: (m) => { const y = rRef.current; return y ? gamRegla(y.key, y.v, y.on, m) : Promise.resolve({ ok: false, mensaje: E2("Escribe el valor.", "Enter the value.") } as ResAdm); } }); } }] : undefined })) });
    B.push({ type: "group", k: E2("REGLAS", "RULES") }, { type: "rows", items: REGLAS_PUNTOS(d.tope).map((r) => ({ key: r.es, icon: "info", t: tx(r) })) });
    B.push({ type: "note", tone: "info", t: E2("Quitar un voto, ocultar por las reglas o borrar resta lo que dio (asiento inverso). Entre cuentas que usaron el mismo dispositivo no hay puntos. La cuenta oficial no gana puntos.", "Removing a vote, hiding for the rules or deleting takes back what it gave (reverse entry). Accounts that used the same device earn no points from each other. The official account earns no points.") });
  }
  if (tab === "coin" && d.monedas) {
    const M = d.monedas, n = (x: number) => x.toLocaleString("en-US");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("EN CIRCULACIÓN", "IN CIRCULATION"), v: n(M.circulacion), s: E2("monedas en saldos", "coins in balances"), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E2("EMITIDAS ESTE MES", "ISSUED THIS MONTH"), v: n(M.emitidas), s: E2("bienvenida, premios y ajustes", "welcome, prizes and adjustments") },
      { k: E2("CANJEADAS", "REDEEMED"), v: n(M.canjeadas.monedas), s: E2(`${n(M.canjeadas.codigos)} códigos este mes · ${n(M.devueltas)} devueltas`, `${n(M.canjeadas.codigos)} codes this month · ${n(M.devueltas)} returned`) }, { k: E2("VALOR", "VALUE"), v: SIN_VALOR.es, s: E2("no se compran ni se cambian", "can’t be bought or exchanged"), ...(en ? { v: SIN_VALOR.en } : {}) }] });
    B.push({ type: "note", tone: "info", icon: "ticket", t: E2("Las monedas se ganan, nunca se compran. Aquí no se juega dinero. No se venden, no se pasan a otra persona, no se cambian por dinero y no vencen. Las «monedas diarias» llegan con El Patio (después de la apertura).", "Coins are earned, never bought. No money is played here. They aren’t sold, transferred to someone else, exchanged for money, and they don’t expire. “Daily coins” come with El Patio (after launch).") });
    B.push({ type: "group", k: E2("CÓMO SE GANAN", "HOW THEY’RE EARNED") }, { type: "rows", items: M.reglas.map((x) => ({ key: x.key, icon: "ticket", t: tx(x.label), s: x.on ? E2("Encendida", "On") : E2("Apagada: no da monedas", "Off: gives no coins"), r: x.on ? `+${x.v}` : "—", dim: !x.on, tag: x.editado ? E2("EDITADO", "EDITED") : undefined, tone: "action",
      acts: edita ? [{ l: E2("Cambiar", "Change"), v: "secondary", icon: "edit", onClick: () => { setRegla({ key: x.key, v: String(x.v), on: x.on, mon: true }); setConf({ titulo: tx(x.label), sub: E2("Cuenta desde ahora; lo ya acreditado no cambia.", "It counts from now on; what was already credited doesn’t change."), cta: E2("Guardar", "Save"),
        plantillas: [E2("Lo pidió el fundador", "The founder asked for it"), E2("Ajuste del premio del mes", "Monthly prize adjustment")], nota: "interna", hacer: (m) => { const y = rRef.current; return y ? gamMonedaRegla(y.key, y.v, y.on, m) : Promise.resolve({ ok: false, mensaje: E2("Escribe el valor.", "Enter the value.") } as ResAdm); } }); } }] : undefined })) });
    B.push({ type: "rows", items: [{ key: "cupon", icon: "ticket", t: E2("Cupón de un negocio", "Business coupon"), s: E2("Lo que fija To'Latino al aprobarlo (80–1,000)", "What To'Latino sets when approving it (80–1,000)"), r: E2("según el cupón", "per coupon") }] });
    B.push({ type: "group", k: E2("ÚLTIMOS MOVIMIENTOS", "LATEST ACTIVITY"), link: E2("Ajustar el saldo de un vecino", "Adjust a neighbor’s balance"), onLink: () => router.push("/admin/usuarios") });
    const MOT: Record<string, string> = { welcome: E2("Bienvenida", "Welcome"), premio_mes: E2("Premio de la Tabla del Barrio", "Neighborhood Board prize"), canje: E2("Canjeó un cupón", "Redeemed a coupon"), devolucion: E2("Código vencido: monedas devueltas", "Expired code: coins returned"), ajuste: E2("Ajuste del equipo", "Team adjustment") };
    B.push(M.log.length ? { type: "rows", items: M.log.map((x) => ({ key: x.id, icon: "ticket", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? "var(--tl-danger)" : undefined,
      t: `${x.persona} · ${MOT[x.motivo] ?? E2("Monedas", "Coins")}${x.motivo === "ajuste" && x.razon ? `: ${x.razon}` : ""}`, s: `${x.quien ? `${E2("Equipo", "Team")} · ${x.quien} · ` : ""}${fe(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}`,
      onClick: () => router.push(`/admin/usuarios/${x.uid}?tab=comunidad`) })) } : { type: "empty", icon: "ticket", t: E2("Sin movimientos", "No activity"), s: E2("Todavía nadie tiene monedas en tus ciudades.", "Nobody has coins in your cities yet.") });
    B.push({ type: "note", tone: "info", t: E2("El ajuste ± de un vecino (con motivo y tope por rol) está en Usuarios › 360° › Comunidad › Monedas. Nunca deja el saldo en negativo. Nadie se ajusta a sí mismo.", "A neighbor’s ± adjustment (with a reason and a cap per role) is in Users › 360° › Community › Coins. It never leaves the balance negative. Nobody adjusts their own.") });
  }
  if (tab === "cup" && d.cupones) {
    const C = d.cupones, ciudadN = d.ciudades.find((c) => c.id === d.ciudad)?.name ?? d.ciudad;
    const ESTL: Record<string, [string, string]> = { pending: [E2("Por aprobar", "To approve"), E2("POR APROBAR", "TO APPROVE")], live: [E2("En la Comunidad", "In Community"), E2("EN LA COMUNIDAD", "IN COMMUNITY")], paused: [E2("Pausados", "Paused"), E2("PAUSADO", "PAUSED")], ended: [E2("Terminados", "Ended"), E2("TERMINADO", "ENDED")] };
    if (d.ciudades.length > 1) B.push({ type: "chips", k: E2("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: c.name, v: c.id === d.ciudad ? "selected" : "filter", onClick: () => ir({ c: c.id, cur: null }) })) });
    B.push({ type: "chips", k: `${E2("CUPONES", "COUPONS")} · ${ciudadN.toUpperCase()}`, items: (["pending", "live", "paused", "ended"] as const).map((k) => ({ l: `${ESTL[k]![0]} · ${C.conteo[k]}`, v: C.estado === k ? "selected" : "filter", onClick: () => ir({ e: k === "pending" ? null : k, cur: null }) })) });
    B.push({ type: "note", tone: "info", icon: "ticket", t: E2(`El negocio (Pro) lo ofrece; To'Latino lo aprueba y fija el costo (${COSTO_MIN}–${COSTO_MAX.toLocaleString("en-US")} monedas). Pausar lo quita de la Comunidad al instante; los códigos ya canjeados siguen valiendo. «Liquidar» al cierre del mes es un reporte de canjes: To'Latino no le paga ni le cobra nada al negocio.`, `The business (Pro) offers it; To'Latino approves it and sets the cost (${COSTO_MIN}–${COSTO_MAX.toLocaleString("en-US")} coins). Pausing removes it from Community instantly; codes already redeemed stay valid. “Settle” at month end is a redemption report: To'Latino doesn’t pay or charge the business anything.`) });
    const conCosto = (titulo: string, sub: string, cta: string, hacer: (m: string, v: string) => Promise<ResAdm>, ini = "") => setConf({ titulo, sub, cta, valor: { k: `${E2("COSTO EN MONEDAS", "COST IN COINS")} · ${COSTO_MIN}–${COSTO_MAX.toLocaleString("en-US")}`, ini, max: 4 }, plantillas: [E2("Revisado: oferta clara", "Reviewed: clear offer"), E2("Costo según lo que vale la oferta", "Cost based on what the offer is worth")], nota: "interna", hacer: (m, _e, v) => hacer(m, v) });
    B.push(C.filas.length ? { type: "rows", cols, items: C.filas.map((x) => {
      const acts: { l: string; v: string; icon: string; onClick: () => void }[] = [], t = tx(x.titulo);
      if (edita && x.estado === "pending") acts.push({ l: E2("Aprobar", "Approve"), v: "primary", icon: "check", onClick: () => conCosto(E2(`Aprobar «${t}»`, `Approve “${t}”`), E2(`${x.negocio} · ${x.cupo} al mes · vence ${x.dias} días después de canjearlo. El negocio recibe el aviso con el costo.`, `${x.negocio} · ${x.cupo} a month · expires ${x.dias} days after redeeming. The business gets a notice with the cost.`), E2("Aprobar", "Approve"), (m, v) => gamCuponAprobar(x.id, v, m)) },
        { l: E2("Rechazar", "Reject"), v: "secondary", icon: "ban", onClick: () => setConf({ titulo: E2(`Rechazar «${t}»`, `Reject “${t}”`), sub: E2("No sale. El negocio recibe el aviso con el motivo.", "It doesn’t go out. The business gets a notice with the reason."), peligro: true, cta: E2("Rechazar", "Reject"), plantillas: [E2("La oferta no es clara", "The offer isn’t clear"), E2("Parece una venta, no un regalo o descuento", "Looks like a sale, not a gift or discount"), E2("Datos de contacto en el texto", "Contact details in the text")], nota: "persona", hacer: (m) => gamCuponRechazar(x.id, m) }) });
      if (edita && (x.estado === "live" || x.estado === "paused")) acts.push({ l: E2("Cambiar costo", "Change cost"), v: "secondary", icon: "edit", onClick: () => conCosto(E2(`Costo de «${t}»`, `Cost of “${t}”`), E2(`Ahora: ${x.costo} monedas. Cuenta para los canjes de aquí en adelante.`, `Now: ${x.costo} coins. It applies to redemptions from now on.`), E2("Guardar", "Save"), (m, v) => gamCuponCosto(x.id, v, m), String(x.costo ?? "")) });
      if (edita && (x.estado === "live" || (x.estado === "paused" && x.pausaPor === "business"))) acts.push({ l: E2("Pausar", "Pause"), v: "secondary", icon: "ban", onClick: () => setConf({ titulo: E2(`Pausar «${t}»`, `Pause “${t}”`), sub: E2("Sale de la Comunidad al instante. Los códigos ya canjeados siguen valiendo. El negocio recibe el aviso con el motivo.", "It leaves Community instantly. Codes already redeemed stay valid. The business gets a notice with the reason."), peligro: true, cta: E2("Pausar", "Pause"),
        plantillas: [E2("Quejas de vecinos: no lo respetan en el local", "Neighbor complaints: not honored at the store"), E2("La oferta cambió", "The offer changed"), E2("Revisión de fraude", "Fraud review")], nota: "persona", hacer: (m) => gamCuponPausar(x.id, m) }) });
      if (edita && x.estado === "paused" && x.pausaPor === "admin") acts.push({ l: E2("Activar", "Activate"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E2(`Activar «${t}»`, `Activate “${t}”`), sub: E2("Vuelve a la Comunidad. El negocio recibe el aviso.", "It goes back to Community. The business gets a notice."), cta: E2("Activar", "Activate"), plantillas: [E2("Revisado con el negocio", "Reviewed with the business")], nota: "interna", hacer: (m) => gamCuponActivar(x.id, m) }) });
      return { key: x.id, icon: "ticket", t: `${t} · ${x.negocio}`, s: `${x.condiciones.es ? `${tx(x.condiciones)} · ` : ""}${E2(`${x.cupo} al mes · ${x.dias} días`, `${x.cupo} a month · ${x.dias} days`)}${x.motivo ? ` · ${x.pausaPor === "business" ? E2("Pausado por el negocio", "Paused by the business") : E2("Motivo", "Reason")}: ${x.motivo}` : x.estado === "paused" && x.pausaPor === "business" ? E2(" · Pausado por el negocio", " · Paused by the business") : ""}`,
        m: x.estado === "pending" ? E2(`ENVIADO EL ${fe(x.creado).toUpperCase()}`, `SENT ${fe(x.creado).toUpperCase()}`) : E2(`${x.mes} DE ${x.cupo} ESTE MES · ${x.usados} USADOS · ${x.vivos} CÓDIGOS VIVOS`, `${x.mes} OF ${x.cupo} THIS MONTH · ${x.usados} USED · ${x.vivos} ACTIVE CODES`),
        r: x.costo != null ? String(x.costo) : "—", tag: ESTL[x.estado]![1], tone: x.estado === "live" ? "signal" : x.estado === "pending" ? "action" : x.estado === "paused" ? "danger" : "neutral", dim: x.estado === "ended", acts: acts.length ? acts : undefined };
    }) } : { type: "empty", icon: "ticket", t: E2("Nada aquí", "Nothing here"), s: C.estado === "pending" ? E2("Ningún cupón espera aprobación en esta ciudad.", "No coupon is waiting for approval in this city.") : E2("No hay cupones en este estado.", "No coupons in this status.") });
    if (C.mas) B.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", onClick: () => ir({ cur: C.mas }) }] });
    const CE: Record<string, [string, string]> = { issued: [E2("EMITIDO", "ISSUED"), "action"], used: [E2("USADO", "USED"), "signal"], expired: [E2("VENCIÓ · DEVUELTO", "EXPIRED · RETURNED"), "neutral"] };
    B.push({ type: "group", k: `${E2("ÚLTIMOS CANJES", "LATEST REDEMPTIONS")} · ${ciudadN.toUpperCase()}` });
    B.push(C.canjes.length ? { type: "rows", items: C.canjes.map((x) => ({ key: x.id, icon: "ticket", t: `${x.codigo} · ${tx(x.titulo)}`, s: `${x.negocio} · ${x.persona} · ${fe(x.at)}${x.usado ? E2(` · usado el ${fe(x.usado)}`, ` · used ${fe(x.usado)}`) : ""}`, r: String(x.costo), tag: CE[x.estado]![0], tone: CE[x.estado]![1], compact: true })) }
      : { type: "empty", icon: "ticket", t: E2("Sin canjes", "No redemptions"), s: E2("Todavía nadie canjea cupones en esta ciudad.", "Nobody has redeemed coupons in this city yet.") });
  }
  if (tab === "tabla") {
    const t = d.tabla, m = t.mes === "anterior" ? t.anterior : t.actual, mesN = nombreMes(m, !en), ciudadN = d.ciudades.find((c) => c.id === d.ciudad)?.name ?? d.ciudad;
    const Mes = `${mesN.charAt(0).toUpperCase()}${mesN.slice(1)}`;
    const abierta = !t.cerrada, puedeCerrar = t.mes === "anterior" && abierta;
    if (d.ciudades.length > 1) B.push({ type: "chips", k: E2("CIUDAD", "CITY"), items: d.ciudades.map((c) => ({ l: c.name, v: c.id === d.ciudad ? "selected" : "filter", onClick: () => ir({ c: c.id }) })) });
    B.push({ type: "chips", k: `${E2("MES", "MONTH")} · ${ciudadN.toUpperCase()}`, items: (["actual", "anterior"] as const).map((k) => ({ l: nombreMes(k === "actual" ? t.actual : t.anterior, !en), v: t.mes === k ? "selected" : "filter", onClick: () => ir({ m: k === "actual" ? null : "anterior" }) })) });
    if (t.cerrada) B.push({ type: "note", tone: "ok", icon: "check", t: E2(`Mes cerrado el ${fe(t.cerrada.at)}${t.cerrada.por ? ` por ${t.cerrada.por}` : " por el barrido del día 3"}. Premios entregados (insignia del mes y las monedas del premio, con el libro de monedas). Canjes de cupones del mes en la ciudad: ${t.cerrada.canjes} (reporte; no se le paga ni se le cobra nada al negocio).`,
      `Month closed on ${fe(t.cerrada.at)}${t.cerrada.por ? ` by ${t.cerrada.por}` : " by the day-3 sweep"}. Prizes awarded (the month’s badge and the prize coins, with the coin ledger). Coupon redemptions this month in the city: ${t.cerrada.canjes} (report; the business isn’t paid or charged anything).`) });
    else if (t.mes === "actual") B.push({ type: "note", tone: "info", icon: "calendar", t: E2(`${Mes} se congela el último día a medianoche de ${ciudadN}; luego hay 72 h para excluir y el día 3 se cierra solo si nadie lo cierra.`, `${Mes} freezes on the last day at midnight ${ciudadN} time; then there are 72 h to exclude, and on day 3 it closes on its own if nobody closes it.`) });
    else B.push({ type: "note", tone: "warn", icon: "calendar", t: E2(`${Mes} está congelado: excluye a quien hizo trampa y ciérralo. Si nadie lo cierra, el barrido lo cierra el día 3.`, `${Mes} is frozen: exclude anyone who cheated and close it. If nobody closes it, the sweep closes it on day 3.`),
      cta: admin ? E2("Cerrar el mes", "Close the month") : undefined, onCta: admin ? () => setConf({ titulo: E2(`Cerrar ${mesN} · ${ciudadN}`, `Close ${mesN} · ${ciudadN}`), sub: E2("1 · la tabla queda fija · 2 · los excluidos no reciben premio · 3 · se avisa a los 3 primeros (y quienes ya son Comandante toman las plazas de General del Barrio) · 4 · el reporte de canjes de cupones del mes. No se puede deshacer.", "1 · the board is locked · 2 · excluded people get no prize · 3 · the top 3 are notified (and those already Comandante take the General del Barrio spots) · 4 · the month’s coupon redemption report. It can’t be undone."),
        peligro: true, cta: E2("Cerrar el mes", "Close the month"), plantillas: [E2("Revisión de fraude terminada", "Fraud review finished"), E2("Cierre del mes", "Month close")], nota: "interna", hacer: (mm) => gamCerrarMes(d.ciudad, m, mm) }) : undefined });
    let pos = 0;
    B.push(t.filas.length ? { type: "rows", items: t.filas.map((x) => {
      const p = x.excluido ? null : t.cerrada ? x.pos : ++pos;
      return { key: x.id, icon: "users", t: `${x.excluido ? "— " : `${p} · `}${x.nombre}`, s: `${E2(`${x.recs} por recomendar · ${x.resp} por responder`, `${x.recs} for recommending · ${x.resp} for answering`)}${x.excluido && x.motivo ? ` · ${E2("Excluido", "Excluded")}: ${x.motivo}` : ""}`, r: String(x.puntos), dim: x.excluido,
        tag: x.excluido ? E2("EXCLUIDO", "EXCLUDED") : x.general ? "GENERAL DEL BARRIO" : p && p <= 3 ? E2("PREMIO", "PRIZE") : undefined, tone: x.excluido ? "danger" : "signal",
        acts: edita && abierta ? [{ l: x.excluido ? E2("Volver a incluir", "Include again") : E2("Excluir", "Exclude"), v: "secondary", icon: x.excluido ? "check" : "ban", onClick: () => setConf({ titulo: "", sub: x.excluido ? E2(`¿Por qué vuelve ${x.nombre} a la tabla de ${mesN}?`, `Why is ${x.nombre} going back on the ${mesN} board?`) : E2(`Excluir a ${x.nombre} de la tabla de ${mesN}: no sale y no recibe premio. Sus puntos y su rango siguen igual. Recibe el aviso con el motivo.`, `Exclude ${x.nombre} from the ${mesN} board: they won’t show and get no prize. Their points and rank stay the same. They get a notice with the reason.`),
          peligro: !x.excluido, cta: x.excluido ? E2("Volver a incluir", "Include again") : E2("Excluir", "Exclude"), plantillas: x.excluido ? [E2("Revisamos y no hubo trampa", "We reviewed it and there was no cheating")] : [E2("Votos desde cuentas del mismo dispositivo", "Votes from accounts on the same device"), E2("Anillo de votos", "Vote ring"), E2("Puntos por contenido que rompe las reglas", "Points for content that breaks the rules")],
          nota: "persona", hacer: (mm) => gamExcluir(d.ciudad, m, x.id, !x.excluido, mm) }) }] : undefined };
    }) } : { type: "empty", icon: "users", t: E2("Nadie en la tabla", "Nobody on the board"), s: E2("Todavía nadie suma puntos este mes en esta ciudad.", "Nobody has earned points this month in this city yet.") });
    B.push({ type: "note", tone: "info", t: E2("Excluidos no salen en la Comunidad. La cuenta oficial no gana puntos ni sale aquí. Premio: los 3 primeros reciben la insignia «Top del mes» y las monedas de la regla «premio del mes» (Monedas), sin valor en dinero.", "Excluded people don’t show in Community. The official account earns no points and doesn’t show here. Prize: the top 3 get the “Top of the month” badge and the coins from the “monthly prize” rule (Coins), with no cash value.") });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
