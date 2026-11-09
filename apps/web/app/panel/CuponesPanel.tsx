"use client";
/* Cupones por monedas en el panel (Panel v2 · Tu página › sub 'cup', editor 'cup:new' / 'cup:edit:{id}'; hueco #2 del plan: compuesto con
   bloques del panel, como Novedades). Arriba, «Validar un código» (el código que el vecino muestra en su teléfono → usado, una vez); luego
   los cupones del negocio con su estado (Por aprobar · En la Comunidad · Pausado · Terminado), cuántos van este mes de su cupo, cuántos se
   usaron y cuántos códigos siguen vivos; pausar, reanudar, terminar y editar (cupo y días; la oferta solo mientras está por aprobar). El
   costo en monedas lo fija To'Latino. Pro, como Novedades. Todo del servidor. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { CuponNegocio, CuponesPanel } from "@/lib/monedas-comun";
import { cupGuardar, cupPaso, cupValidar } from "./acciones-cupones";
import type { Ctx, Editor } from "./Panel";

export type CupData = { lista?: CuponesPanel };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const fechaHora = (iso: string, es: boolean) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(iso)).replace(/\./g, "");

const ESTADO = (c: Ctx, x: CuponNegocio): [string, string, string] => {
  const E2 = c.E2;
  if (x.estado === "pending") return [E2("POR APROBAR", "PENDING"), "action", E2("To’Latino lo revisa y le pone el costo en monedas.", "To’Latino reviews it and sets the cost in coins.")];
  if (x.estado === "live") return [E2("EN LA COMUNIDAD", "LIVE"), "signal", E2(`Cuesta ${x.costo} monedas · vence ${x.dias} días después de canjearlo.`, `Costs ${x.costo} coins · expires ${x.dias} days after redeeming.`)];
  if (x.estado === "paused") return [E2("PAUSADO", "PAUSED"), "danger", x.pausaPor === "admin" ? E2(`Lo pausó To’Latino: ${x.motivo ?? ""}`, `To’Latino paused it: ${x.motivo ?? ""}`) : E2("Lo pausaste: no sale en la Comunidad.", "You paused it: it does not show in the Community.")];
  return [E2("TERMINADO", "ENDED"), "neutral", x.motivo ? E2(`No salió: ${x.motivo}`, `Not published: ${x.motivo}`) : E2("Ya no sale. Los códigos canjeados siguen valiendo hasta que vencen.", "No longer shows. Redeemed codes stay valid until they expire.")];
};

export function cupBloques(c: Ctx): Sec {
  const { E2, d } = c, L = c.cup?.lista, out: (Bloque | null)[] = [];
  if (!d.pro) {
    out.push({ type: "lock", t: E2("Ofrece cupones por monedas", "Offer coupons for coins"), s: E2("Los vecinos de la Comunidad los canjean con las monedas que ganan y te muestran su código en el local.", "Community neighbors redeem them with the coins they earn and show you their code in store."), cta: E2("Ver Pro", "See Pro"), onCta: () => c.go("pay", "plan") });
    return { blocks: out, ed: null };
  }
  // Validar un código (lo primero: es lo que se hace con el vecino enfrente).
  const cod = (c.ui.cupCod as string | undefined) ?? "", res = c.ui.cupRes as { ok: boolean; t: string } | undefined;
  out.push({ type: "group", k: E2("VALIDAR UN CÓDIGO", "VALIDATE A CODE"), first: true },
    { type: "field", k: E2("CÓDIGO DEL VECINO", "NEIGHBOR'S CODE"), val: cod, max: 12, ph: "TL-CQ-7K4M", help: E2("Escribe el código que el vecino te muestra en su teléfono. Cada código se usa una sola vez.", "Type the code the neighbor shows on their phone. Each code works once."),
      onChange: (v) => c.setUi({ cupCod: v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12), cupRes: undefined }) },
    { type: "acts", items: [{ l: c.pending ? E2("Validando…", "Validating…") : E2("Validar", "Validate"), v: "primary", icon: "check", off: cod.replace(/[^A-Z0-9]/g, "").length < 8 || c.pending,
      onClick: () => c.run(() => cupValidar(d.id, cod).then((r) => { if (!r.ok) c.setUi({ cupRes: { ok: false, t: c.es ? r.mensaje.es : r.mensaje.en } }); return r; }), (r: { titulo?: { es: string; en: string }; vecino?: string; codigo?: string }) => {
        const t = E2(`Código válido: «${r.titulo?.es ?? ""}» para ${r.vecino ?? ""}: ya quedó usado.`, `Valid code: «${r.titulo?.en || r.titulo?.es || ""}» for ${r.vecino ?? ""}: it is now used.`);
        c.setUi({ cupRes: { ok: true, t }, cupCod: "" }); return t;
      }) }] });
  if (res) out.push({ type: "note", tone: res.ok ? "ok" : "danger", icon: res.ok ? "check" : "warning", t: res.t });
  out.push({ type: "note", tone: "info", icon: "ticket", t: E2("To’Latino aprueba cada cupón y fija su costo en monedas. Las monedas no tienen valor en dinero: To’Latino no te paga ni te cobra por los canjes; el descuento lo das tú en tu local.",
    "To’Latino approves each coupon and sets its cost in coins. Coins have no cash value: To’Latino neither pays nor charges you for redemptions; you give the discount in your store.") });
  if (!L) return { blocks: out, ed: null };
  out.push({ type: "group", k: E2("TUS CUPONES", "YOUR COUPONS") });
  if (!L.cupones.length) out.push({ type: "empty", icon: "ticket", t: E2("Aún no ofreces cupones", "No coupons yet"), s: E2("Un café, un descuento en el corte: lo que tú decidas dar. To’Latino le pone el costo en monedas.", "A coffee, a discount on a cut: whatever you decide to give. To’Latino sets the cost in coins."),
    cta: E2("Crear el primero", "Create the first one"), onCta: () => c.det("cup:new") });
  for (const x of L.cupones) {
    const [tag, tone, s] = ESTADO(c, x), acts: Fila["acts"] = [];
    if (x.estado !== "ended") acts.push({ l: E2("Editar", "Edit"), icon: "edit", onClick: () => c.det(`cup:edit:${x.id}`) });
    if (x.estado === "live") acts.push({ l: E2("Pausar", "Pause"), icon: "clock", onClick: () => c.run(() => cupPaso(d.id, x.id, "pausar"), E2("Pausado: ya no sale en la Comunidad. Los códigos canjeados siguen valiendo.", "Paused: no longer in the Community. Redeemed codes stay valid.")) });
    if (x.estado === "paused" && x.pausaPor !== "admin") acts.push({ l: E2("Reanudar", "Resume"), icon: "bolt", onClick: () => c.run(() => cupPaso(d.id, x.id, "reanudar"), E2("Otra vez en la Comunidad.", "Back in the Community.")) });
    if (x.estado !== "ended") acts.push(c.ui.cupFin === x.id
      ? { l: E2("Sí, terminar", "Yes, end it"), v: "danger", icon: "ban", onClick: () => { c.setUi({ cupFin: null }); c.run(() => cupPaso(d.id, x.id, "terminar"), E2("Terminado. Los códigos canjeados siguen valiendo hasta que vencen.", "Ended. Redeemed codes stay valid until they expire.")); } }
      : { l: E2("Terminar", "End"), icon: "ban", onClick: () => c.setUi({ cupFin: x.id }) });
    out.push({ type: "rows", items: [{
      key: x.id, icon: "ticket", t: c.es ? x.titulo.es : x.titulo.en || x.titulo.es, s,
      m: x.estado === "pending" ? E2(`${x.cupo} AL MES · ${x.dias} DÍAS PARA USARLO`, `${x.cupo} A MONTH · ${x.dias} DAYS TO USE IT`)
        : E2(`${x.mes} DE ${x.cupo} ESTE MES · ${x.usados} USADOS · ${x.vivos} CÓDIGOS VIVOS`, `${x.mes} OF ${x.cupo} THIS MONTH · ${x.usados} USED · ${x.vivos} LIVE CODES`),
      tag, tone, dim: x.estado === "ended", acts,
    }] });
  }
  if (L.usados.length) out.push({ type: "group", k: E2("ÚLTIMOS CÓDIGOS USADOS", "LAST CODES USED") }, { type: "rows", items: L.usados.map((u) => ({ key: u.codigo, icon: "check", t: u.codigo, s: c.es ? u.titulo.es : u.titulo.en || u.titulo.es, r: fechaHora(u.at, c.es), compact: true })) });
  return { blocks: out, ed: null };
}

type FC = { es: string; en: string; condEs: string; condEn: string; cupo: number; dias: number };
export function cupDetalle(c: Ctx): Sec {
  const { E2, d } = c, id = (c.ruta.det ?? "").slice(4), edita = id.startsWith("edit:") ? id.slice(5) : null;
  const x0 = edita ? c.cup?.lista?.cupones.find((x) => x.id === edita) ?? null : null;
  if (!d.pro || (edita && (!x0 || x0.estado === "ended"))) return { blocks: [{ type: "head", t: E2("Cupón no encontrado", "Coupon not found"), onBack: c.closeDet }, { type: "empty", icon: "ticket", t: E2("Ese cupón ya no se puede editar", "That coupon can no longer be edited"), s: "" }], ed: null };
  const b0: FC = x0 ? { es: x0.titulo.es, en: x0.titulo.en, condEs: x0.condiciones.es, condEn: x0.condiciones.en, cupo: x0.cupo, dias: x0.dias } : { es: "", en: "", condEs: "", condEn: "", cupo: 20, dias: c.cup?.lista?.diasDef ?? 7 };
  const F = c.form<FC>(`det:cup:${id}`, b0), x = F.d, fija = !!x0 && x0.estado !== "pending", out: (Bloque | null)[] = [];
  out.push({ type: "head", eye: E2("CUPÓN POR MONEDAS", "COUPON FOR COINS"), t: edita ? E2("Editar cupón", "Edit coupon") : E2("Nuevo cupón", "New coupon"), s: E2("Sale en la Comunidad cuando To’Latino lo aprueba.", "Shows in the Community once To’Latino approves it."), onBack: c.closeDet });
  if (fija) out.push({ type: "note", tone: "info", icon: "lock", t: E2("La oferta ya está aprobada y puede haber vecinos que ya la canjearon: no cambia. Para otra oferta, termina este cupón y crea otro.", "The offer is approved and neighbors may have redeemed it: it does not change. For another offer, end this coupon and create a new one.") });
  out.push({ type: "group", k: E2("QUÉ DAS", "WHAT YOU GIVE") });
  if (fija) out.push({ type: "kv", cols: 1, items: [{ k: E2("EN ESPAÑOL", "IN SPANISH"), v: x.es }, ...(x.en ? [{ k: E2("EN INGLÉS", "IN ENGLISH"), v: x.en }] : []), ...(x.condEs ? [{ k: E2("CONDICIONES", "TERMS"), v: x.condEs }] : []), ...(x.condEn ? [{ k: E2("CONDICIONES EN INGLÉS", "TERMS IN ENGLISH"), v: x.condEn }] : [])] });
  else out.push(
    { type: "field", k: E2("EN ESPAÑOL", "IN SPANISH"), val: x.es, max: 60, count: `${x.es.length}/60`, ph: E2("Ej. Café con leche gratis", "e.g. Café con leche gratis"), onChange: (v) => F.set({ es: v.slice(0, 60) }) },
    { type: "field", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL"), val: x.en, max: 60, count: `${x.en.length}/60`, ph: E2("Ej. Free café con leche", "e.g. Free café con leche"), onChange: (v) => F.set({ en: v.slice(0, 60) }) },
    { type: "field", k: E2("CONDICIONES · OPCIONAL", "TERMS · OPTIONAL"), val: x.condEs, area: true, rows: 3, max: 200, count: `${x.condEs.length}/200`, ph: E2("Ej. De lunes a viernes. En compras de $10 o más.", "e.g. Monday to Friday. On purchases of $10 or more."), onChange: (v) => F.set({ condEs: v.slice(0, 200) }) },
    { type: "field", k: E2("CONDICIONES EN INGLÉS · OPCIONAL", "TERMS IN ENGLISH · OPTIONAL"), val: x.condEn, area: true, rows: 3, max: 200, count: `${x.condEn.length}/200`, onChange: (v) => F.set({ condEn: v.slice(0, 200) }) });
  out.push({ type: "group", k: E2("CUÁNTOS Y POR CUÁNTO TIEMPO", "HOW MANY AND FOR HOW LONG") },
    { type: "step", t: E2("Cuántos al mes", "How many a month"), s: E2("Cuando se acaban, sale «Agotado este mes» hasta el día 1.", "When they run out, it shows “Gone this month” until the 1st."), v: String(x.cupo), onM: () => F.set({ cupo: Math.max(1, x.cupo - (x.cupo > 50 ? 10 : 1)) }), onP: () => F.set({ cupo: Math.min(500, x.cupo + (x.cupo >= 50 ? 10 : 1)) }) },
    { type: "chips", k: E2("DÍAS PARA USARLO DESPUÉS DE CANJEARLO", "DAYS TO USE IT AFTER REDEEMING"), items: [7, 15, 30, 60, 90].map((n) => ({ l: E2(`${n} días`, `${n} days`), v: x.dias === n ? "selected" : "filter", onClick: () => F.set({ dias: n }) })) },
    { type: "note", tone: "info", icon: "ticket", t: E2("El costo en monedas (de 80 a 1,000) lo fija To’Latino al aprobarlo. Uno por persona. Si un código vence sin usarse, las monedas vuelven al vecino.", "To’Latino sets the cost in coins (80 to 1,000) when approving it. One per person. If a code expires unused, the coins go back to the neighbor.") });
  const valid = x.es.trim().length >= 3 && x.cupo >= 1 && x.cupo <= 500 && x.dias >= 7 && x.dias <= 90;
  return { blocks: out, ed: {
    F, l: edita ? E2("Guardar", "Save") : E2("Enviar a aprobar", "Send for approval"), valid, always: true,
    apply: (v: FC) => cupGuardar(d.id, { id: edita, es: v.es, en: v.en, condEs: v.condEs, condEn: v.condEn, cupo: v.cupo, dias: v.dias }),
    toast: edita ? E2("Guardado.", "Saved.") : E2("Enviado. To’Latino lo revisa y le pone el costo; te avisamos.", "Sent. To’Latino reviews it and sets the cost; we will let you know."),
    onDone: () => c.go("pag", "cup"),
  } };
}
