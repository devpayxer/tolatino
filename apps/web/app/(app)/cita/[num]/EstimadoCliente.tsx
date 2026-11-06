"use client";
/* Tu cita de taller o de hogar · el estimado (diseño neg-auto-flow.js / neg-hogar-flow.js › citaVals: «Cita auto ·
   estimado», «algo más», «dinero», «listo»). Nada se hace ni se cobra sin tu OK: apruebas línea por línea y solo se retiene
   lo aprobado. Los montos vienen del servidor; aquí solo se suman para mostrar lo que marcas antes de aprobar. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { CitaVista } from "@/lib/citas";
import type { LineaEst } from "@/lib/estimados";
import { MetodoPago, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../pago/MetodoPago";
import { citaAccion, estimadoDecidir, extraDecidir } from "./acciones";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
export type PagoEst = { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null;

export function EstimadoCliente({ c, es, pago, aviso }: { c: CitaVista; es: boolean; pago: PagoEst; aviso: (t: string) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter();
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const e = c.est!, est = e.estimado, d = e.dinero, auto = c.rubro === "auto", paso = c.paso ?? "", who = c.negocio.nombre;
  const abierto = paso === "est" && est?.st === "sent";
  const [sel, setSel] = useState<string[]>(() => (est ? est.lineas.filter((l) => l.urg === "now").map((l) => l.id) : []));
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null);
  const correr = async (f: () => Promise<{ ok: true } | { ok: false; msg: { es: string; en: string }; tarjeta?: boolean }>, ok: string) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await f().catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { aviso(ok); router.refresh(); } else { setError(es ? r.msg.es : r.msg.en); if ("tarjeta" in r && r.tarjeta && tarjeta) setDeclinada(tarjeta.pm); }
  };
  const conTarjeta = d.tarjeta && !!pago;
  // Lo que se retendría con lo marcado (vista previa: el servidor lo vuelve a calcular al aprobar).
  const selL = est ? est.lineas.filter((l) => sel.includes(l.id)) : [], selRep = selL.reduce((n, l) => n + l.tot, 0);
  const selCred = selL.length ? est?.credit ?? 0 : 0, base = est?.base ?? d.base;
  const selHold = Math.max(0, base - selCred + selRep + d.aprobado - d.dep - d.retenido - d.cobrado);
  const CAT: Record<LineaEst["urg"], [string, string, string]> = { now: [E2("NECESARIO AHORA", "NEEDED NOW"), "var(--tl-danger)", E2("Seguridad o la falla que traes.", "Safety or the problem you came in with.")],
    soon: [E2("RECOMENDADO PRONTO", "RECOMMENDED SOON"), "var(--tl-pro-ink)", E2("No es urgente, pero conviene este año.", "Not urgent, but worth doing this year.")], later: [E2("PUEDE ESPERAR", "CAN WAIT"), "rgba(11,14,18,.55)", E2("Te lo dicen para que lo sepas.", "So you know.")] };
  const linea = (l: LineaEst, on: boolean, toca: boolean) => (
    <div key={l.id} role={toca ? "checkbox" : undefined} aria-checked={toca ? on : undefined} tabIndex={toca ? 0 : undefined} aria-label={toca ? `${nm(l.t)} · ${dinero(l.tot)}` : undefined}
      onClick={toca ? () => setSel((s) => (on ? s.filter((x) => x !== l.id) : [...s, l.id])) : undefined}
      onKeyDown={toca ? (ev) => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); setSel((s) => (on ? s.filter((x) => x !== l.id) : [...s, l.id])); } } : undefined}
      className={`flex items-start gap-[11px] rounded-[15px] p-3 ${on ? "border-[1.5px] border-ink" : "border border-ink/10"} ${toca ? "cursor-pointer" : ""} ${l.dec === "no" ? "opacity-55" : ""}`}>
      <span className={`mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] ${on ? "bg-ink" : "border-[1.5px] border-ink/[.22] bg-white"}`}>{on && <Icon name="check" size={14} color="var(--tl-white)" strokeWidth={2.6} />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5"><span className="min-w-0 flex-1 text-[13.5px] font-bold leading-[1.35]">{nm(l.t)}</span><span className="text-[14px] font-extrabold">{l.final != null && l.final < l.tot ? dinero(l.final) : dinero(l.tot)}</span></div>
        <div className="mt-1 text-pretty text-[12px] font-medium leading-[1.45] text-ink/65">{nm(l.why)}</div>
        <div className="mt-[7px] font-mono text-[9.5px] font-semibold leading-[1.6] tracking-[0.03em] text-ink/50">
          {l.parts.length > 0 && <div>{l.parts.map((p) => `${nm(p.n)} ${dinero(p.cents)}`).join(" · ")}</div>}
          <div>{l.hrs ? `${E2("Mano de obra ", "Labor ")}${l.hrs} h × ${dinero(est?.rate ?? 0)} = ${dinero(l.lab)}` : E2("Mano de obra incluida", "Labor included")}</div>
          {l.tax > 0 && <div>{auto ? E2("Impuesto de PA sobre piezas ", "PA sales tax on parts ") : E2("Impuesto de PA sobre materiales ", "PA sales tax on materials ")}{dinero(l.tax)}</div>}
          {l.dec && !toca && <div className={l.dec === "ok" ? "text-open-text" : ""}>{l.dec === "ok" ? E2("APROBADA", "APPROVED") : E2("NO APROBADA", "NOT APPROVED")}</div>}
        </div>
      </div>
      <span className="h-[52px] w-[52px] flex-none rounded-xl bg-photo-bg" style={l.foto ? { backgroundImage: `url(${l.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
    </div>
  );
  const xt = e.extras.find((l) => l.dec == null) ?? null, xtL = e.extras.filter((l) => l.dec != null);
  const tarjetaFila = conTarjeta && (abierto || (paso === "xtra" && xt)) && (
    <button type="button" onClick={() => setHoja(true)} className="mt-3 flex w-full items-center gap-3 rounded-[14px] border border-ink/10 px-3 py-2.5 text-left" data-screen-label="Cita · tarjeta">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-ink/5"><Icon name="card" size={15} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{tarjeta ? tarjetaL(tarjeta) : E2("Elige tu tarjeta", "Choose your card")}</span>
        <span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("SE RETIENE AQUÍ · SE COBRA AL FINAL SOLO LO APROBADO", "HELD HERE · ONLY WHAT YOU APPROVE IS CHARGED AT THE END")}</span></span>
      <span className="text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</span>
    </button>
  );
  const pm = conTarjeta ? tarjeta?.pm ?? null : null, faltaTarjeta = conTarjeta && !tarjeta;
  const garantia = c.garantia ? (() => { const [m, mi] = c.garantia.split("|").map(Number); return `${m} ${E2("meses", "months")}${mi ? ` / ${mi!.toLocaleString("en-US")} ${E2("millas", "miles")}` : ""}`; })() : null;
  const pagaAhora = Math.max(0, d.final - d.dep - d.cobrado);

  return (
    <>
      {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
      {xt && (
        <div data-screen-label="Cita auto · algo más" className="overflow-hidden rounded-[18px] border-[1.5px] border-pro/60 bg-white">
          <div className="h-[150px] bg-photo-bg" style={xt.foto ? { backgroundImage: `url(${xt.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
          <div className="p-4">
            <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-pro-ink">{E2("ALGO MÁS · TU OK", "SOMETHING ELSE · YOUR OK")}</div>
            <div className="mt-1.5 flex items-baseline gap-2.5"><span className="min-w-0 flex-1 font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]">{nm(xt.t)}</span><span className="font-display text-[17px] font-extrabold">{dinero(xt.tot)}</span></div>
            <div className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{nm(xt.why)}</div>
            <div className="mt-2 font-mono text-[9.5px] font-semibold leading-[1.6] text-ink/50">{xt.parts.map((p) => `${nm(p.n)} ${dinero(p.cents)}`).join(" · ")}<br />{xt.hrs ? `${E2("Mano de obra ", "Labor ")}${xt.hrs} h × ${dinero(est?.rate ?? 0)} = ${dinero(xt.lab)}` : E2("Sin mano de obra", "No labor")}</div>
            {tarjetaFila}
            <div className="mt-3.5 flex flex-col gap-2">
              <div className="grid"><Button size="md" disabled={ocupado || faltaTarjeta} onClick={() => correr(() => extraDecidir(c.numero, true, pm), E2("Aprobado: siguen con eso", "Approved: they go ahead"))}>{`${E2("Sí, hazlo · +", "Yes, do it · +")}${dinero(xt.tot)}`}</Button></div>
              <div className="grid"><Button variant="secondary" size="md" disabled={ocupado} onClick={() => correr(() => extraDecidir(c.numero, false, null), E2("Listo: no se hace ni se cobra", "Done: not done or charged"))}>{E2("No, déjalo así", "No, leave it")}</Button></div>
            </div>
          </div>
        </div>
      )}
      {est && (
        <div data-screen-label="Cita auto · estimado" className="rounded-[18px] border border-ink/[.08] bg-white p-4">
          <div className="font-display text-[17px] font-extrabold tracking-[-0.03em]">{auto ? E2("Estimado", "Estimate") : E2("Precio completo", "Full price")}</div>
          <div className="mt-1.5 font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{`${auto ? E2("ESTIMADO #", "ESTIMATE #") : E2("PRECIO COMPLETO #", "FULL PRICE #")}${c.numero.replace("C-", "E-")}${est.v > 1 ? ` · V${est.v}` : ""}${c.veh ? ` · ${c.veh.toUpperCase()}` : c.casa ? ` · ${c.casa.toUpperCase()}` : ""}`}</div>
          {c.pre && (() => { const rep = abierto ? selRep : est.lineas.filter((l) => l.dec === "ok").reduce((n, l) => n + l.tot, 0), inR = rep <= c.pre.hi + 50, extra = (abierto ? selL : est.lineas.filter((l) => l.dec === "ok")).some((l) => l.urg !== "now");
            const rg = `${dinero(c.pre.lo)}–${dinero(c.pre.hi)}`;
            return <div data-screen-label="Cita · contra tu pre-estimado" className={`mt-3 flex items-start gap-[9px] rounded-[13px] px-[13px] py-[11px] ${inR ? "bg-signal/[.14]" : "bg-pro/[.16]"}`}><span className="grid flex-none pt-px"><Icon name={inR ? "check" : "warning"} size={15} color={inR ? "var(--tl-open-text)" : "var(--tl-pro-ink)"} /></span>
              <span className="text-pretty text-[12.5px] font-bold leading-[1.45]" style={{ color: inR ? "var(--tl-open-text)" : "var(--tl-pro-ink)" }}>{inR ? E2(`Dentro de tu pre-estimado (${rg}).`, `Within your pre-estimate (${rg}).`)
                : extra ? E2(`Pasa tu pre-estimado (${rg}) porque marcaste trabajos recomendados. Puedes quitarlos.`, `Over your pre-estimate (${rg}) because you checked recommended work. You can uncheck it.`)
                  : E2(`Pasa tu pre-estimado (${rg}). Cada línea explica por qué; pregunta antes de aprobar.`, `Over your pre-estimate (${rg}). Each line explains why; ask before approving.`)}</span></div>; })()}
          <div className="mt-[3px] text-[12px] font-medium text-ink/55">{`${E2("Lo hizo ", "By ")}${est.by ?? who}${E2(` · mano de obra ${dinero(est.rate)} la hora`, ` · labor ${dinero(est.rate)}/h`)}`}</div>
          {(["now", "soon", "later"] as const).map((k) => { const L = est.lineas.filter((l) => l.urg === k); if (!L.length) return null; return (
            <div key={k} className="mt-4">
              <div className="font-mono text-[10px] font-extrabold tracking-[0.14em]" style={{ color: CAT[k][1] }}>{CAT[k][0]}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-ink/50">{CAT[k][2]}</div>
              <div className="mt-[9px] flex flex-col gap-2">{L.map((l) => linea(l, abierto ? sel.includes(l.id) : l.dec === "ok", abierto))}</div>
            </div>); })}
          <div className="mt-3.5 border-t border-ink/[.08] pt-3">
            <div className="flex flex-col gap-1.5">
              {[[auto ? E2("Arreglos aprobados", "Repairs approved") : E2("Trabajos aprobados", "Work approved"), dinero(abierto ? selRep : est.lineas.filter((l) => l.dec === "ok").reduce((n, l) => n + l.tot, 0))],
                ...(base ? [[auto ? E2("Diagnóstico o servicio", "Diagnosis or service") : E2("Visita", "Visit"), dinero(base)]] : []),
                ...((abierto ? selCred : d.credito) ? [[auto ? E2("Se descuenta el diagnóstico", "Diagnosis credited") : E2("La visita se descuenta", "Visit credited"), `−${dinero(est.credit)}`]] : [])].map(([k, v]) => (
                <div key={k} className="flex gap-2.5"><span className="flex-1 text-[12.5px] font-semibold text-ink/65">{k}</span><span className="text-[13px] font-bold">{v}</span></div>))}
            </div>
            {abierto && (
              <>
                <div className="mt-2.5 flex items-baseline gap-2.5"><span className="flex-1 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50">{conTarjeta ? E2("SE RETIENE AL APROBAR", "HELD ON APPROVAL") : E2("PAGAS AL TERMINAR", "YOU PAY WHEN DONE")}</span><span className="font-display text-[20px] font-extrabold leading-none">{dinero(selHold)}</span></div>
                <div className="mt-1.5 text-[12px] font-medium text-ink/55">{conTarjeta ? E2("Se retiene en tu tarjeta; al final se cobra solo lo aprobado y se libera el resto.", "Held on your card; at the end only what you approved is charged and the rest is released.") : E2(`Pagas en ${who} al terminar, en efectivo o tarjeta.`, `You pay at ${who} when done, cash or card.`)}</div>
                {tarjetaFila}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="grid"><Button size="md" block disabled={ocupado || (faltaTarjeta && selHold > 0)} onClick={() => correr(() => estimadoDecidir(c.numero, sel, pm), selL.length ? E2("Aprobado: empiezan con eso", "Approved: they start on it") : E2("Listo: no se hace ningún arreglo", "Done: no repairs"))}>
                    {selL.length ? `${E2("Aprobar ", "Approve ")}${selL.length}${selL.length === 1 ? (auto ? E2(" arreglo · ", " repair · ") : E2(" trabajo · ", " item · ")) : auto ? E2(" arreglos · ", " repairs · ") : E2(" trabajos · ", " items · ")}${dinero(selRep)}` : auto ? E2("No hacer arreglos", "No repairs") : E2("No hacer nada", "Do nothing")}</Button></div>
                  {c.negocio.telefono && <div className="grid"><Button variant="secondary" size="md" icon="phone" block onClick={() => { location.href = `tel:${c.negocio.telefono}`; }}>{`${E2("Llamar a ", "Call ")}${who}`}</Button></div>}
                </div>
                {sel.length > 0 && <button type="button" onClick={() => setSel([])} className="mt-2.5 w-full text-center text-[12px] font-bold leading-[1.45] text-action">{base ? E2(`Solo ${auto ? "el diagnóstico" : "la visita"}: pago ${dinero(base)} y lo dejo así.`, `Just the ${auto ? "diagnosis" : "visit"}: I pay ${dinero(base)} and leave it.`) : E2("No aprobar nada por ahora.", "Approve nothing for now.")}</button>}
              </>
            )}
          </div>
        </div>
      )}
      {xtL.length > 0 && <div className="flex flex-col gap-2">{xtL.map((l) => linea(l, l.dec === "ok", false))}</div>}
      {paso === "ready" && (
        <div data-screen-label="Cita auto · listo" className="rounded-[18px] border border-ink/[.07] bg-white p-4">
          <div className="font-display text-[17px] font-extrabold leading-[1.2] tracking-[-0.03em]">{auto ? E2("Al recogerlo", "At pickup") : E2("Al terminar", "When done")}</div>
          <div className="mt-2.5">
            {[[E2("APROBADO", "APPROVED"), dinero(d.base - d.credito + d.aprobado)], ...(d.final < d.base - d.credito + d.aprobado ? [[E2("LO FINAL", "FINAL"), dinero(d.final)]] : []), ...(d.dep ? [[E2("DEPÓSITO PAGADO", "DEPOSIT PAID"), `−${dinero(d.dep)}`]] : []), [E2("PAGAS AHORA", "YOU PAY NOW"), dinero(pagaAhora)],
              [E2("GARANTÍA", "WARRANTY"), garantia ?? E2("Pregunta al recoger", "Ask at pickup")]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[118px_minmax(0,1fr)] gap-2.5 border-t border-ink/[.06] py-[9px]"><span className="font-mono text-[9.5px] font-bold leading-[1.6] tracking-[0.12em] text-ink/45">{k}</span><span className="text-pretty text-[13px] font-semibold leading-[1.45]">{v}</span></div>))}
          </div>
          <div className="mt-2.5 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{E2("Si al recogerlo algo no está bien, dilo antes de irte. Después, en Ayuda con la cita.", "If something is not right at pickup, say so before leaving. Afterwards, use Appointment help.")}</div>
          <div className="mt-3.5 grid"><Button size="md" block disabled={ocupado} onClick={() => correr(() => citaAccion(c.numero, "recibi"), auto ? E2("Listo: cita terminada", "Done: booking finished") : E2("Listo: visita terminada", "Done: visit finished"))}>
            {`${auto ? E2("Ya lo recogí · pagar ", "Picked it up · pay ") : E2("Todo bien · pagar ", "All good · pay ")}${dinero(pagaAhora)}`}</Button></div>
        </div>
      )}
      {(est || e.extras.length > 0) && (
        <div data-screen-label="Cita auto · dinero" className="rounded-[18px] border border-ink/[.07] bg-white p-4">
          <div className="font-display text-[17px] font-extrabold leading-[1.2] tracking-[-0.03em]">{E2("Tu dinero", "Your money")}</div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {[...(base ? [[auto ? E2("Diagnóstico o servicio", "Diagnosis or service") : E2("Visita o servicio", "Visit or service"), dinero(base)]] : []),
              ...[...(est?.lineas ?? []), ...e.extras].filter((l) => l.dec === "ok").map((l) => [nm(l.t), dinero(l.final ?? l.tot)]),
              ...(d.credito ? [[auto ? E2("Se descuenta el diagnóstico", "Diagnosis credited") : E2("La visita se descuenta", "Visit credited"), `−${dinero(d.credito)}`]] : []),
              ...(d.dep ? [[E2("Depósito pagado al reservar", "Deposit paid at booking"), `−${dinero(d.dep)}`]] : [])].map(([k, v], i) => (
              <div key={`${k}${i}`} className="flex gap-2.5"><span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.45] text-ink/65">{k}</span><span className="text-[13px] font-bold">{v}</span></div>))}
          </div>
          <div className="mt-3 flex items-baseline gap-2.5 border-t border-ink/[.08] pt-3">
            <span className="flex-1 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50">{c.st === "done" ? (d.cobrado ? E2("COBRADO", "CHARGED") : E2("PAGADO EN EL LOCAL", "PAID IN PERSON")) : d.retenido ? E2("RETENIDO AHORA", "HELD NOW") : E2("POR AHORA", "SO FAR")}</span>
            <span className="font-display text-[20px] font-extrabold leading-none">{dinero(c.st === "done" ? (d.cobrado || Math.max(0, d.final - d.dep)) : d.retenido)}</span>
          </div>
          <div className="mt-2 text-pretty text-[12px] font-medium leading-[1.5] text-ink/60">{c.st === "done"
            ? `${d.cobrado ? E2("Se cobró lo aprobado.", "What you approved was charged.") : E2("Se pagó en el local.", "Paid in person.")}${d.liberado ? E2(` Se liberaron ${dinero(d.liberado)}.`, ` ${dinero(d.liberado)} released.`) : ""}${d.aprobado + (d.base - d.credito) > d.final ? E2(` Lo final salió ${dinero(d.aprobado + d.base - d.credito - d.final)} más barato de lo aprobado.`, ` The final came in ${dinero(d.aprobado + d.base - d.credito - d.final)} under what you approved.`) : ""}`
            : d.retenido ? `${E2("Retenido en tu ", "Held on your ")}${d.pagos.find((p) => p.st === "held")?.tarjeta ?? E2("tarjeta", "card")}${E2(". Se cobra al final solo lo que aprobaste.", ". Only what you approved is charged at the end.")}${d.local ? E2(` Pagas ${dinero(d.local)} en el local.`, ` You pay ${dinero(d.local)} in person.`) : ""}`
              : d.local ? E2(`Pagas ${dinero(d.local)} en ${who} al terminar. No se ha cobrado nada en la app.`, `You pay ${dinero(d.local)} at ${who} when done. Nothing has been charged in the app.`) : E2("No se ha cobrado ni retenido nada.", "Nothing has been charged or held.")}</div>
        </div>
      )}
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk} nota={E2("Se retiene solo lo que apruebas. Al final se cobra lo final y se libera el resto.", "Only what you approve is held. At the end the final amount is charged and the rest released.")}
          onClose={() => setHoja(false)} onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </>
  );
}
