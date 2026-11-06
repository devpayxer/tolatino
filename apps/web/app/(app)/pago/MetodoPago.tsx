"use client";
/* Método de pago (prototipo pay-methods.js · TLPay): hoja en el teléfono, ventana de 560 en escritorio. TUS TARJETAS (la
   elegida, la predeterminada, «TU BANCO LA RECHAZÓ HACE UN MOMENTO»), «Agregar tarjeta de crédito o débito» y el
   formulario (número, vence, CVC, código postal, nombre, «Guardar para la próxima»).
   Seguridad: con Stripe de verdad, el número, la fecha y el CVC van en el campo seguro de Stripe (iframe): To'Latino nunca
   los ve. En el sandbox (simulador) el número se queda en el navegador y solo sale «pm_sim_<marca>_<últimos 4>». */
import * as UI from "@tolatino/ui";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { guardarTarjeta, type TarjetaG } from "./acciones";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
export type Tarjeta = { pm: string; marca: string; ultimos4: string; vence: string; def?: boolean; unaVez?: boolean };
export type ModoTarjeta = "stripe" | "simulador";
const BR: Record<string, [string, string]> = { visa: ["VISA", "Visa"], mc: ["MC", "Mastercard"], mastercard: ["MC", "Mastercard"], amex: ["AMEX", "Amex"], disc: ["DISC", "Discover"], discover: ["DISC", "Discover"] };
export const marcaL = (b: string) => BR[b]?.[1] ?? b;
export const marcaB = (b: string) => BR[b]?.[0] ?? b.toUpperCase().slice(0, 4);
export const tarjetaL = (t: Tarjeta) => `${marcaL(t.marca)} ·· ${t.ultimos4}`;
const brandOf = (n: string) => (/^4/.test(n) ? "visa" : /^(5[1-5]|2[2-7])/.test(n) ? "mc" : /^3[47]/.test(n) ? "amex" : /^6(011|5)/.test(n) ? "disc" : null);
const dg = (x: string) => x.replace(/\D/g, "");
const K = "font-mono text-[10px] font-bold tracking-[0.16em] text-ink/45";
const campo = (err: boolean) => `h-[46px] w-full rounded-[13px] bg-white px-3.5 text-[14.5px] font-semibold outline-none ${err ? "border-[1.5px] border-danger" : "border border-ink/[.12]"}`;

// Stripe.js (solo con Stripe de verdad): se carga una vez desde Stripe, como exige su norma de seguridad (PCI).
type StripeJs = { elements: () => { create: (t: "card", o?: unknown) => { mount: (el: HTMLElement) => void; destroy: () => void; on: (e: string, f: (x: { complete: boolean; error?: { message: string } }) => void) => void } };
  createPaymentMethod: (o: unknown) => Promise<{ paymentMethod?: { id: string; card: { brand: string; last4: string; exp_month: number; exp_year: number } }; error?: { message: string } }> };
let stripeJs: Promise<StripeJs> | null = null;
function cargarStripe(pk: string): Promise<StripeJs> {
  if (!stripeJs) stripeJs = new Promise((ok, mal) => {
    const w = window as unknown as { Stripe?: (k: string) => StripeJs };
    if (w.Stripe) return ok(w.Stripe(pk));
    const s = document.createElement("script"); s.src = "https://js.stripe.com/v3/"; s.async = true;
    s.onload = () => (w.Stripe ? ok(w.Stripe(pk)) : mal(new Error("stripe"))); s.onerror = () => { stripeJs = null; mal(new Error("stripe")); };
    document.head.appendChild(s);
  });
  return stripeJs;
}

export function MetodoPago({ es, tarjetas, sel, declinada, nota, modo, pk, onUsar, onClose }: {
  es: boolean; tarjetas: Tarjeta[]; sel: string | null; declinada: string | null; nota: string; modo: ModoTarjeta; pk: string | null;
  onUsar: (t: Tarjeta, nueva?: Tarjeta) => void; onClose: () => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [paso, setPaso] = useState<"list" | "add">(tarjetas.length ? "list" : "add");
  const [elegida, setElegida] = useState(sel ?? tarjetas[0]?.pm ?? null);
  const [f, setF] = useState({ n: "", e: "", c: "", z: "", nm: "", save: true });
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState("");
  const uf = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));
  // Stripe de verdad: el campo seguro.
  const caja = useRef<HTMLDivElement>(null), [listo, setListo] = useState(false);
  const el = useRef<{ s: StripeJs; card: ReturnType<ReturnType<StripeJs["elements"]>["create"]> } | null>(null);
  useEffect(() => {
    if (modo !== "stripe" || paso !== "add" || !pk || !caja.current) return;
    let vivo = true;
    cargarStripe(pk).then((s) => {
      if (!vivo || !caja.current) return;
      // El iframe de Stripe no lee variables CSS: se le pasa el color del sistema ya resuelto.
      const card = s.elements().create("card", { hidePostalCode: false, style: { base: { fontFamily: "Manrope, sans-serif", fontSize: "15px", color: getComputedStyle(document.documentElement).getPropertyValue("--tl-ink").trim() } } });
      card.mount(caja.current); card.on("change", (x) => { setListo(x.complete); setError(x.error?.message ?? ""); });
      el.current = { s, card };
    }).catch(() => setError(E2("No se pudo cargar el pago seguro. Revisa tu conexión.", "Could not load secure payment. Check your connection.")));
    return () => { vivo = false; el.current?.card.destroy(); el.current = null; };
  }, [modo, paso, pk]); // eslint-disable-line react-hooks/exhaustive-deps

  // El formulario del sandbox (mismas reglas que el prototipo).
  const n = dg(f.n), br = brandOf(n), nMax = br === "amex" ? 15 : 16, nDone = n.length >= nMax;
  const ex = dg(f.e), mm = +ex.slice(0, 2), yy = +ex.slice(2, 4), eDone = ex.length === 4, eBadM = eDone && (mm < 1 || mm > 12);
  const hoy = new Date(), ePast = eDone && !eBadM && (2000 + yy < hoy.getFullYear() || (2000 + yy === hoy.getFullYear() && mm < hoy.getMonth() + 1));
  const cv = dg(f.c), cDone = cv.length === (br === "amex" ? 4 : 3), zDone = dg(f.z).length === 5, nm = f.nm.trim();
  const nErr = nDone && !br ? E2("No reconocemos esta tarjeta. Revisa el número.", "We do not recognize this card. Check the number.") : "";
  const eErr = eBadM ? E2("El mes va del 01 al 12.", "The month goes from 01 to 12.") : ePast ? E2("Esta tarjeta ya venció.", "This card has expired.") : "";
  const okSim = nDone && !!br && eDone && !eErr && cDone && zDone && nm.length > 1;
  const ok = modo === "stripe" ? listo && nm.length > 1 : okSim;
  const falta = modo === "stripe" ? (!listo ? E2("la tarjeta", "the card") : E2("el nombre", "name"))
    : !nDone || nErr ? E2("el número", "number") : !eDone || eErr ? E2("la fecha", "expiry") : !cDone ? "CVC" : !zDone ? E2("el código postal", "ZIP code") : E2("el nombre", "name");
  const fmtN = (d: string) => d.replace(/(\d{4})(?=\d)/g, "$1 "), fmtE = (d: string) => (d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d);

  const usarNueva = async () => {
    if (!ok || ocupado) return;
    setOcupado(true); setError("");
    let t: Tarjeta;
    if (modo === "stripe") {
      const r = await el.current!.s.createPaymentMethod({ type: "card", card: el.current!.card, billing_details: { name: nm } });
      if (!r.paymentMethod) { setOcupado(false); setError(r.error?.message ?? E2("Revisa la tarjeta.", "Check the card.")); return; }
      const c = r.paymentMethod.card;
      t = { pm: r.paymentMethod.id, marca: c.brand, ultimos4: c.last4, vence: `${String(c.exp_month).padStart(2, "0")}/${String(c.exp_year).slice(-2)}`, unaVez: !f.save };
    } else t = { pm: `pm_sim_${br}_${n.slice(-4)}`, marca: br!, ultimos4: n.slice(-4), vence: fmtE(ex), unaVez: !f.save };
    if (f.save) {
      const g = await guardarTarjeta(t.pm, t.vence).catch(() => null);
      if (g?.ok) { const s: TarjetaG = g.tarjeta; t = { pm: s.pm, marca: s.marca, ultimos4: s.ultimos4, vence: s.vence, def: s.def }; }
      else { setOcupado(false); setError(g ? (es ? g.msg.es : g.msg.en) : E2("No se pudo guardar. Revisa tu conexión.", "Could not save. Check your connection.")); return; }
    }
    setOcupado(false);
    onUsar(t, t);
  };
  const elegidaT = tarjetas.find((t) => t.pm === elegida) ?? null;

  const cuerpo = (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        {paso === "add" && tarjetas.length > 0 && <button type="button" aria-label={E2("Volver", "Back")} onClick={() => setPaso("list")} className="grid size-9 flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name="chevronLeft" size={16} /></button>}
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{paso === "add" ? E2("Agregar tarjeta", "Add a card") : E2("Método de pago", "Payment method")}</div>
          {nota && <div className="mt-1 font-mono text-[10px] font-bold tracking-[0.12em] text-ink/45">{nota}</div>}
        </div>
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onClose} className="grid size-9 flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name="close" size={15} /></button>
      </div>
      {paso === "list" ? (
        <>
          <div className={K}>{E2("TUS TARJETAS", "YOUR CARDS")}</div>
          <div className="flex flex-col gap-2">
            {tarjetas.map((t) => { const on = elegida === t.pm, dec = declinada === t.pm; return (
              <button key={t.pm} type="button" onClick={() => setElegida(t.pm)} className={`flex w-full items-center gap-3 rounded-[15px] bg-white px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/10"}`}>
                <span className="grid h-[26px] w-[40px] flex-none place-items-center rounded-[6px] bg-ink font-mono text-[8.5px] font-extrabold tracking-[0.06em] text-white">{marcaB(t.marca)}</span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-[1.3]">{tarjetaL(t)}</span>
                  <span className={`mt-0.5 block font-mono text-[9.5px] font-bold tracking-[0.08em] ${dec ? "text-danger" : "text-ink/50"}`}>{dec ? E2("TU BANCO LA RECHAZÓ HACE UN MOMENTO", "YOUR BANK DECLINED IT A MOMENT AGO") : `${E2("VENCE ", "EXPIRES ")}${t.vence}${t.def ? E2(" · PREDETERMINADA", " · DEFAULT") : ""}${t.unaVez ? E2(" · SOLO PARA ESTE PAGO", " · THIS PAYMENT ONLY") : ""}`}</span></span>
                <span className={`size-[18px] flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
              </button>); })}
            <button type="button" onClick={() => setPaso("add")} className="flex w-full items-center gap-3 rounded-[15px] border border-dashed border-ink/20 px-3.5 py-3 text-left">
              <span className="grid size-[26px] flex-none place-items-center rounded-[8px] bg-action/10"><Icon name="plus" size={14} color="var(--tl-action)" /></span>
              <span className="text-[13.5px] font-bold text-action">{E2("Agregar tarjeta de crédito o débito", "Add a credit or debit card")}</span>
            </button>
          </div>
          <div className="text-pretty text-[12px] font-medium leading-[1.5] text-ink/55">{E2(`Si hay un reembolso, vuelve a tu ${elegidaT ? tarjetaL(elegidaT) : "tarjeta"} en 3 a 5 días hábiles.`, `If there is a refund, it goes back to your ${elegidaT ? tarjetaL(elegidaT) : "card"} in 3 to 5 business days.`)}</div>
          <div className="flex"><Button variant="primary" block disabled={!elegidaT} onClick={() => elegidaT && onUsar(elegidaT)}>{`${E2("Usar ", "Use ")}${elegidaT ? tarjetaL(elegidaT) : ""}`}</Button></div>
        </>
      ) : (
        <>
          {modo === "stripe" ? (
            <div><div className={K}>{E2("TARJETA", "CARD")}</div><div ref={caja} className="mt-1.5 rounded-[13px] border border-ink/[.12] bg-white px-3.5 py-[14px]" /></div>
          ) : (
            <>
              <div>
                <div className={K}>{E2("NÚMERO DE LA TARJETA", "CARD NUMBER")}</div>
                <div className="relative mt-1.5"><input value={f.n} onChange={(e) => { const d = dg(e.target.value); uf({ n: fmtN(d.slice(0, brandOf(d) === "amex" ? 15 : 16)) }); }} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" aria-label={E2("Número de la tarjeta", "Card number")} className={campo(!!nErr)} />
                  {br && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[5px] bg-ink px-1.5 py-[3px] font-mono text-[8.5px] font-extrabold text-white">{marcaB(br)}</span>}</div>
                {nErr && <div className="mt-1 text-[11.5px] font-semibold text-danger">{nErr}</div>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><div className={K}>{E2("VENCE", "EXPIRES")}</div><input value={f.e} onChange={(e) => uf({ e: fmtE(dg(e.target.value).slice(0, 4)) })} inputMode="numeric" autoComplete="cc-exp" placeholder={E2("MM/AA", "MM/YY")} aria-label={E2("Vence", "Expires")} className={`mt-1.5 ${campo(!!eErr)}`} /></div>
                <div><div className={K}>CVC</div><input value={f.c} onChange={(e) => uf({ c: dg(e.target.value).slice(0, 4) })} inputMode="numeric" autoComplete="cc-csc" placeholder={br === "amex" ? "1234" : "123"} aria-label="CVC" className={`mt-1.5 ${campo(false)}`} /></div>
                <div><div className={K}>{E2("CÓD. POSTAL", "ZIP CODE")}</div><input value={f.z} onChange={(e) => uf({ z: dg(e.target.value).slice(0, 5) })} inputMode="numeric" autoComplete="postal-code" placeholder="18201" aria-label={E2("Código postal", "ZIP code")} className={`mt-1.5 ${campo(false)}`} /></div>
              </div>
              {eErr && <div className="-mt-2 text-[11.5px] font-semibold text-danger">{eErr}</div>}
            </>
          )}
          <div><div className={K}>{E2("NOMBRE EN LA TARJETA", "NAME ON CARD")}</div><input value={f.nm} onChange={(e) => uf({ nm: e.target.value.replace(/[0-9]/g, "").slice(0, 40) })} autoComplete="cc-name" placeholder={E2("Como aparece en la tarjeta", "As it appears on the card")} aria-label={E2("Nombre en la tarjeta", "Name on card")} className={`mt-1.5 ${campo(false)}`} /></div>
          <button type="button" role="switch" aria-checked={f.save} onClick={() => uf({ save: !f.save })} className="flex w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Guardar para la próxima", "Save for next time")}</span><span className="mt-0.5 block text-[11.5px] font-medium text-ink/55">{E2("To'Latino nunca ve el número completo.", "To'Latino never sees the full number.")}</span></span>
            <span className={`relative h-[22px] w-10 flex-none rounded-full ${f.save ? "bg-ink" : "bg-ink/[.18]"}`}><span className="absolute top-0.5 size-[18px] rounded-full bg-white transition-all" style={{ left: f.save ? 20 : 2 }} /></span>
          </button>
          {modo === "simulador" && <div className="rounded-[12px] bg-action/[.08] px-3 py-2.5 text-[11.5px] font-semibold leading-[1.5] text-action">{E2("Sandbox: usa 4242 4242 4242 4242 (aprobada), 4000 0000 0000 0002 (rechazada) o 4000 0000 0000 9995 (sin fondos). No se cobra nada real.", "Sandbox: use 4242 4242 4242 4242 (approved), 4000 0000 0000 0002 (declined) or 4000 0000 0000 9995 (no funds). Nothing real is charged.")}</div>}
          {error && <div role="alert" className="text-[12px] font-semibold text-danger">{error}</div>}
          <div className="flex"><Button variant="primary" block disabled={!ok || ocupado} onClick={usarNueva}>{ocupado ? E2("Guardando…", "Saving…") : ok ? E2("Usar esta tarjeta", "Use this card") : `${E2("Falta: ", "Missing: ")}${falta}`}</Button></div>
          <div className="text-center font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/40">{E2("PAGO SEGURO CON STRIPE · 3D SECURE", "SECURED BY STRIPE · 3D SECURE")}</div>
        </>
      )}
    </div>
  );
  return (
    <>
      <div data-screen-label="Método de pago" className="fixed inset-0 z-[95] lg:hidden">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onClose} className="absolute inset-0 bg-ink/50" />
        <div role="dialog" aria-modal="true" className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[26px] bg-paper px-5 pb-7 pt-3"><div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-ink/15" />{cuerpo}</div>
      </div>
      <div data-screen-label="Método de pago · desktop" className="fixed inset-0 z-[95] hidden lg:block">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={onClose} className="absolute inset-0 bg-ink/45" />
        <div role="dialog" aria-modal="true" className="absolute left-1/2 top-[10vh] max-h-[80vh] w-[560px] -translate-x-1/2 overflow-y-auto rounded-[22px] bg-paper p-6 shadow-[0_30px_60px_-20px_rgba(11,14,18,.5)]">{cuerpo}</div>
      </div>
    </>
  );
}
