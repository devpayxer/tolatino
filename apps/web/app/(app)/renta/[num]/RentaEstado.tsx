"use client";
/* APP-NEG-RENTAR-ESTADO (diseño neg-hogar-plan.js › rentStatus, sobre la vista del estado del pre-estimado): apartada ·
   la tienes · devuelta · cancelada · vencida; los pasos, tu renta (herramienta, días, renta, depósito, devolver, dónde) y
   Cómo llegar · Ya no la necesito · Un día más · Llamar. Si el negocio enseña un daño, la foto y el monto con «Está bien» o
   «No estoy de acuerdo» (compuesto como «algo más» del estimado, 4d). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { RentaVista } from "@/lib/rentas";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../pago/MetodoPago";
import { rentaAccion } from "./acciones";
import { abrirComoLlegar } from "@/lib/como-llegar";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const hL = (h: string) => { const [a, b] = h.split(":").map(Number); const H = (a ?? 0) % 24; return `${H % 12 || 12}${b ? `:${String(b).padStart(2, "0")}` : ""} ${H < 12 ? "AM" : "PM"}`; };
const hora = (t: string | null) => (t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function RentaEstado({ r, es, pago }: { r: RentaVista; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null), [flash, setFlash] = useState<string | null>(null), [hoja, setHoja] = useState(false), [confirmar, setConfirmar] = useState(false);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []);
  const fL = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} de ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const hacer = async (que: "cancelar" | "dia" | "tarjeta" | "dano_ok" | "dano_no", ok: string, pm?: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const x = await rentaAccion(r.numero, que, pm).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setConfirmar(false);
    if (x.ok) { setFlash(ok); setTimeout(() => setFlash(null), 3200); router.refresh(); } else setError(es ? x.msg.es : x.msg.en);
  };
  const pickRel = r.pick === r.hoy ? E2("hoy", "today") : r.pick > r.hoy && new Date(`${r.pick}T12:00:00Z`).getTime() - new Date(`${r.hoy}T12:00:00Z`).getTime() === 86400000 ? E2("mañana", "tomorrow") : `${E2("el ", "on ")}${fL(r.pick)}`;
  const card = r.tarjeta ?? E2("tu tarjeta", "your card");
  const dano = r.dmgSt === "asked" || r.dmgSt === "disputed";
  const backS = (() => {
    if (r.dmgSt === "asked") return E2(`${r.bname} pide descontar ${dinero(r.dmgC ?? 0)} del depósito por un daño. Mira la foto y decide.`, `${r.bname} asks to take ${dinero(r.dmgC ?? 0)} from the deposit for damage. See the photo and decide.`);
    if (r.dmgSt === "disputed") return E2("No estás de acuerdo con el daño: To'Latino lo revisa con los dos. El depósito sigue retenido hasta entonces.", "You disagree with the damage: To'Latino reviews it with both of you. The deposit stays held until then.");
    const tarde = r.lateD ? E2(` Llegó ${r.lateD} ${r.lateD === 1 ? "día" : "días"} tarde: se cobraron ${dinero(r.lateC)} más.`, ` ${r.lateD} ${r.lateD === 1 ? "day" : "days"} late: ${dinero(r.lateC)} more charged.`) : "";
    const dn = r.dmgSt === "charged" ? E2(` Se descontaron ${dinero(r.dmgC ?? 0)} por el daño.`, ` ${dinero(r.dmgC ?? 0)} deducted for the damage.`) : r.dmgSt === "waived" ? E2(" To'Latino decidió no descontar el daño.", " To'Latino decided not to deduct the damage.") : "";
    if (!r.dep) return `${E2("Gracias por devolverla.", "Thanks for returning it.")}${tarde}`;
    const lib = r.depSt === "liberado" ? r.dep : Math.max(0, r.dep - r.depCobrado);
    return `${lib > 0 ? E2(`Se liberó ${lib === r.dep ? "el depósito de " : ""}${dinero(lib)} a ${card}.`, `${dinero(lib)}${lib === r.dep ? " deposit" : ""} released to ${card}.`) : E2("El depósito se usó completo.", "The whole deposit was used.")}${tarde}${dn}`;
  })();
  const H: Record<RentaVista["st"], [string, string, string, string, string, string]> = {
    held: ["bag", "bg-action/10", "var(--tl-action)", E2("APARTADA", "ON HOLD"), `${E2("Recógela ", "Pick it up ")}${pickRel}`, r.cardFailed ? E2("Tu banco no dejó cobrar al recoger. Cambia la tarjeta y avísale al negocio.", "Your bank declined at pickup. Change the card and let the business know.") : E2("Te la guardan 48 horas. Hoy no se cobró nada.", "Held 48 hours. Nothing charged today.")],
    out: ["wrench", "bg-pro/20", "var(--tl-pro-ink)", r.tardeHoy ? E2("SE PASÓ EL DÍA", "PAST DUE") : E2("LA TIENES", "YOU HAVE IT"), `${E2("Devuélvela el ", "Return it on ")}${fL(r.due)}`,
      r.tardeHoy ? E2(`Se tenía que devolver el ${fL(r.due)}. Cada día tarde se descuentan ${dinero(r.p)} del depósito.`, `It was due on ${fL(r.due)}. Each late day takes ${dinero(r.p)} from the deposit.`)
        : r.dep ? E2(`Cobrado ${dinero(r.rent)} de renta. Depósito de ${dinero(r.dep)} retenido en ${card}.`, `${dinero(r.rent)} rent charged. ${dinero(r.dep)} deposit held on ${card}.`) : E2(`Cobrado ${dinero(r.rent)} de renta.`, `${dinero(r.rent)} rent charged.`)],
    back: dano ? ["warning", "bg-pro/20", "var(--tl-pro-ink)", r.dmgSt === "asked" ? E2("TE ENSEÑAN UN DAÑO", "DAMAGE SHOWN") : E2("EN REVISIÓN", "UNDER REVIEW"), E2("Devuelta", "Returned"), backS]
      : ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("DEVUELTA", "RETURNED"), E2("Gracias", "Thanks"), backS],
    cancelled: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("CANCELADA", "CANCELLED"), r.cxBy === "business" ? E2(`${r.bname} canceló el apartado`, `${r.bname} cancelled the hold`) : E2("Ya no la necesitas", "No longer needed"), E2("No se cobró nada.", "Nothing was charged.")],
    expired: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("VENCIDA", "EXPIRED"), E2("Pasaron las 48 horas", "The 48 hours passed"), E2("Volvió a la tienda. No se cobró nada.", "It went back on the shelf. Nothing was charged.")],
  };
  const h = H[r.st];
  const steps = [{ label: E2("Apartada", "On hold"), time: hora(r.at), state: "done" }, { label: E2("Recogida", "Picked up"), time: hora(r.outAt), state: ["out", "back"].includes(r.st) ? "done" : r.st === "held" ? "current" : "next" },
    { label: E2("Devuelta", "Returned"), time: hora(r.backAt), state: r.st === "back" ? "done" : r.st === "out" ? "current" : "next" }];
  const llegar = () => abrirComoLlegar({ dir: r.dir || r.bname });
  const acts: [string, string, () => void][] = r.st === "held" ? [["pin", E2("Cómo llegar", "Directions"), llegar], ["close", E2("Ya no la necesito", "No longer needed"), () => setConfirmar(true)]]
    : r.st === "out" ? [["calendar", `${E2("Un día más · ", "One more day · ")}${dinero(r.p)}`, () => void hacer("dia", E2(`Listo: la devuelves el ${fL(new Date(new Date(`${r.due}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10))}`, "Done: one more day"))], ...(r.tel ? [["phone", E2("Llamar", "Call"), () => { location.href = `tel:${r.tel}`; }] as [string, string, () => void]] : [])]
      : r.st === "back" || r.st === "cancelled" || r.st === "expired" ? [["wrench", E2("Rentar otra vez", "Rent again"), () => router.push(`/n/${r.biz}/rentar?a=${r.itemId}`)]] : [];
  const depV = `${dinero(r.dep)}${r.depSt === "retenido" ? E2(" · retenido", " · held") : r.depSt === "liberado" ? E2(" · liberado", " · released") : r.depSt === "descontado" || r.depSt === "parcial" ? `${E2(" · se descontaron ", " · ")}${dinero(r.depCobrado)}${es ? "" : " deducted"}` : r.depSt === "no_retenido" ? E2(" · ya no retenido", " · no longer held") : E2(" · al recoger", " · at pickup")}`;
  const rows: [string, string][] = [[E2("HERRAMIENTA", "TOOL"), nm(r.n)], [E2("DÍAS", "DAYS"), `${r.dias}${r.week ? E2(" · semana, paga 5", " · week, pays 5") : ""}`], [E2("RENTA", "RENT"), `${dinero(r.rent)}${r.st === "held" ? E2(" · al recoger", " · at pickup") : ""}`],
    ...(r.dep ? [[E2("DEPÓSITO", "DEPOSIT"), depV] as [string, string]] : []), [E2("DEVOLVER", "RETURN BY"), `${cap(fL(r.due))}${r.close && r.close !== "24:00" ? ` · ${hL(r.close)}` : ""}`], [E2("DÓNDE", "WHERE"), r.dir.replace(/, Hazleton,? PA.*$/i, "") || r.bname],
    ...(r.st !== "cancelled" && r.st !== "expired" && r.tarjeta ? [[E2("TARJETA", "CARD"), r.tarjeta] as [string, string]] : [])];
  return (
    <div data-screen-label="APP-NEG-RENTAR-ESTADO" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3 lg:top-0">
        <button type="button" aria-label={E2("Volver al negocio", "Back to the business")} onClick={() => router.push(`/n/${r.biz}?tab=shop`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{nm(r.n)}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("RENTA #", "RENTAL #")}${r.numero} · ${r.bname}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        <div data-screen-label="Renta · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${h[1]}`}><Icon name={h[0]} size={26} color={h[2]} strokeWidth={2.2} /></div>
          <div className="mt-[13px] font-mono text-[9.5px] font-bold tracking-[0.14em]" style={{ color: h[2] }}>{h[3]}</div>
          <h1 className="m-0 mt-2 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.04em]">{cap(h[4])}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{h[5]}</p>
        </div>
        {r.cardFailed && (r.st === "held" || r.st === "out") && pago && <div className="grid"><Button block icon="card" onClick={() => setHoja(true)}>{E2("Cambiar la tarjeta", "Change the card")}</Button></div>}
        {r.dmgSt === "asked" && (
          <div data-screen-label="Renta · daño" className="rounded-[18px] border-[1.5px] border-pro bg-white p-4">
            <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-pro-ink">{E2("EL DAÑO · CON FOTO", "THE DAMAGE · WITH PHOTO")}</div>
            {r.dmgFoto && <div className="mt-2.5 aspect-[4/3] w-full rounded-[14px] bg-photo-bg" style={{ backgroundImage: `url(${r.dmgFoto})`, backgroundSize: "cover", backgroundPosition: "center" }} role="img" aria-label={E2("Foto del daño", "Damage photo")} />}
            <div className="mt-3 flex items-baseline justify-between gap-3"><span className="text-pretty text-[13.5px] font-bold leading-[1.4]">{r.dmgNota ? `«${r.dmgNota}»` : ""}</span><span className="flex-none font-display text-[18px] font-extrabold tracking-[-0.03em]">{dinero(r.dmgC ?? 0)}</span></div>
            <div className="mt-1 text-[12px] font-medium leading-[1.45] text-ink/60">{E2(`Sale del depósito de ${dinero(r.dep)}; lo demás vuelve a ${card}.`, `Comes out of the ${dinero(r.dep)} deposit; the rest returns to ${card}.`)}{r.dmgEsperaH != null ? E2(` Si no respondes en ${r.dmgEsperaH} h, lo revisa To'Latino.`, ` If you do not answer in ${r.dmgEsperaH} h, To'Latino reviews it.`) : ""}</div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div className="grid"><Button size="md" disabled={ocupado} onClick={() => void hacer("dano_ok", E2("Listo: se descontó del depósito", "Done: deducted from the deposit"))}>{E2("Está bien", "That is fine")}</Button></div>
              <div className="grid"><Button variant="secondary" size="md" disabled={ocupado} onClick={() => void hacer("dano_no", E2("Listo: To'Latino lo revisa", "Done: To'Latino reviews it"))}>{E2("No estoy de acuerdo", "I disagree")}</Button></div>
            </div>
          </div>
        )}
        <div className="grid"><OrderTracker steps={steps} /></div>
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="flex items-center gap-3 border-b border-ink/[.07] px-[15px] py-3">
            {r.foto && <span className="h-11 w-11 flex-none rounded-xl bg-photo-bg" style={{ backgroundImage: `url(${r.foto})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU RENTA", "YOUR RENTAL")}</span></div>
          <div className="px-[15px] py-0.5">{rows.map(([k, v], n) => (
            <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-pretty text-right text-[13px] font-semibold leading-[1.45]">{v}</span></div>))}</div>
        </div>
        {(r.st === "held" || r.st === "out") && r.dep > 0 && <div className="flex items-start gap-2 rounded-[14px] bg-white px-3.5 py-3"><span className="grid flex-none pt-0.5"><Icon name="shield" size={14} color="var(--tl-open-text)" /></span><span className="text-pretty text-[12px] font-semibold leading-[1.45] text-ink/70">{E2("Si llega dañada, te enseñan el daño con foto antes de descontar del depósito.", "If damaged, they show you with a photo before deducting from the deposit.")}</span></div>}
        {acts.length > 0 && <div className="grid grid-cols-2 gap-2">{acts.map(([icon, l, on]) => <div key={l} className="grid"><Button variant="secondary" size="md" icon={icon} disabled={ocupado} onClick={on}>{l}</Button></div>)}
          <div className="grid"><Button variant="secondary" size="md" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${r.biz}`)}>{E2("Mensaje", "Message")}</Button></div></div>}
      </div>
      {confirmar && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setConfirmar(false)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={E2("¿Ya no la necesitas?", "No longer needed?")} className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-7 pt-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("¿Ya no la necesitas?", "No longer needed?")}</div>
            <p className="m-0 mt-2 text-pretty text-[13px] leading-[1.55] text-ink/65">{E2("Se suelta el apartado y vuelve a la tienda. No se cobra nada.", "The hold is released and it goes back on the shelf. Nothing is charged.")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <div className="grid"><Button variant="danger" disabled={ocupado} onClick={() => void hacer("cancelar", E2("Listo: ya no está apartada", "Done: no longer on hold"))}>{E2("Sí, ya no la necesito", "Yes, I don't need it")}</Button></div>
              <div className="grid"><Button variant="secondary" onClick={() => setConfirmar(false)}>{E2("No, la quiero", "No, keep it")}</Button></div>
            </div>
          </div>
        </div>
      )}
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={null} declinada={null} modo={pago.modo} pk={pago.pk} guardarSiempre nota={E2("La renta se cobra con esta tarjeta al recogerla.", "The rental is charged to this card at pickup.")}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setHoja(false); void hacer("tarjeta", E2(`Listo: se cobra con ${tarjetaL(t)}`, `Done: charged to ${tarjetaL(t)}`), t.pm); }} />
      )}
    </div>
  );
}
