"use client";
/* APP-EVT-BOLETOS · móvil y desktop (prototipo To'Latino Eventos tkVals L1289 · «Boletos · tipos · mesas · extras · código»). Tipos con
   cantidad («MÁX. N POR PERSONA», «Solo quedan N.», «Agotado.»), UNA mesa por orden con su depósito («QUEDAN N»), extras («SOLO CON MESA»),
   código «Aplicar» → «CÓDIGO APLICADO · −$X» (lo calcula el servidor), y «Continuar»: el servidor aparta boletos y mesa por
   evt_apartado_min (Configuración) mientras pagas. Sin sesión: Entrar y vuelve con lo elegido. La suma de la barra es solo una vista
   de los precios del servidor; lo que se cobra lo decide el servidor al apartar (y lo muestra la pantalla de pago). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { PantallaBoletos } from "@/lib/boletos";
import { diaCorto, dinero, hora } from "@/lib/evt-comun";
import { evtApartar, evtCodigo } from "../../acciones-boletos";

type N = "Icon" | "Button" | "QtyStepper" | "AddOnRow" | "StepHeader";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, QtyStepper, AddOnRow, StepHeader } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";

export function Boletos({ p, es, yo, ini }: { p: PantallaBoletos; es: boolean; yo: boolean; ini: { t: Record<string, number>; m: string | null; a: string[] } }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [q, setQ] = useState<Record<string, number>>(() => Object.fromEntries(p.tipos.map((t) => [t.id, Math.min(ini.t[t.id] ?? 0, t.quedan)])));
  const [mesa, setMesa] = useState<string | null>(ini.m && p.mesas.some((m) => m.id === ini.m && m.quedan > 0) ? ini.m : null);
  const [extras, setExtras] = useState<string[]>(ini.a.filter((a) => p.extras.some((x) => x.id === a)));
  const [codigo, setCodigo] = useState(""), [aplicado, setAplicado] = useState<{ codigo: string; descuento: number } | null>(null), [codErr, setCodErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false);
  const nTk = Object.values(q).reduce((s, n) => s + n, 0);
  const mesaSel = p.mesas.find((m) => m.id === mesa) ?? null;
  const admits = nTk + (mesaSel?.seats ?? 0), libres = Math.max(0, p.maxPersona - p.yaTengo);
  // Vista de los precios del servidor (lo que se cobra lo decide el servidor al apartar).
  const vista = p.tipos.reduce((s, t) => s + t.p * (q[t.id] ?? 0), 0) + (mesaSel?.dep ?? 0) + p.extras.filter((x) => extras.includes(x.id)).reduce((s, x) => s + x.p, 0) - (aplicado?.descuento ?? 0);
  const elegido = nTk > 0 || !!mesa;
  const tope = nTk >= p.maxOrden || admits >= libres;
  const falta = !elegido ? E2("Elige al menos un boleto o una mesa", "Pick at least one ticket or a table") : admits > libres ? E2(`Hasta ${libres} entradas más para esta fecha`, `Up to ${libres} more entries for this date`) : "";
  const lista = new URLSearchParams({ fecha: p.fecha, t: Object.entries(q).filter(([, n]) => n > 0).map(([id, n]) => `${id}:${n}`).join(","), ...(mesa ? { m: mesa } : {}), ...(extras.length ? { a: extras.join(",") } : {}) });
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(`/eventos/${p.evento.slug}/boletos?${lista}`)}`);
  const cambiar = (id: string, d: number) => { setAplicado(null); setError(null); setQ((x) => ({ ...x, [id]: Math.max(0, Math.min((x[id] ?? 0) + d, p.tipos.find((t) => t.id === id)?.quedan ?? 0)) })); };
  const elegirMesa = (id: string) => { setError(null); setMesa(mesa === id ? null : id); if (mesa === id) setExtras((L) => L.filter((a) => !p.extras.find((x) => x.id === a)?.mesa)); };
  const aplicar = async () => {
    if (!yo) return entrar();
    if (!codigo.trim()) return;
    setCodErr(null);
    const r = await evtCodigo(p.fecha, Object.entries(q).filter(([, n]) => n > 0).map(([id, n]) => ({ id, q: n })), codigo).catch(() => null);
    if (r && !r.ok && r.entrar) return entrar();
    if (!r?.ok) { setAplicado(null); setCodErr(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); return; }
    setAplicado({ codigo: r.codigo, descuento: r.descuento });
  };
  const seguir = async () => {
    if (!elegido || ocupado || admits > libres) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await evtApartar({ fecha: p.fecha, boletos: Object.entries(q).filter(([, n]) => n > 0).map(([id, n]) => ({ id, q: n })), mesa, extras, codigo: aplicado?.codigo ?? null }).catch(() => null);
    if (r?.ok) { router.push(`/eventos/pagar/${r.apartado}`); return; }
    if (r && !r.ok && r.entrar) return entrar();
    setOcupado(false); setError(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not. Check your connection."));
    if (r && !r.ok && r.agotado) router.refresh();
  };
  const volver = () => router.push(`/eventos/${p.evento.slug}?fecha=${p.fecha}`);
  // 6f · Varios días: el rango; cada boleto dice para qué día vale («Vale solo el sáb 21 nov» / «Vale los 3 días»).
  const cuando = p.rango ?? `${diaCorto(p.evento.dia, es).toUpperCase()} · ${hora(p.evento.h0)}`;

  const cabeza = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[58px] w-[46px] flex-none rounded-[12px] bg-photo-bg" style={p.evento.img ? { backgroundImage: `url(${p.evento.img})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{p.evento.title}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${cuando} · ${p.evento.venue}`.toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Ver evento", "See event")}</button>
    </div>
  );
  const linea = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="dollar" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{E2("El precio que ves es el que pagas: cargos incluidos.", "The price you see is what you pay: fees included.")}</span></div>;
  const tipos = p.tipos.length ? (
    <div data-screen-label="Boletos · tipos" className={`flex flex-col p-4 ${caja}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span className={K}>{E2("BOLETOS", "TICKETS")}</span><span className="font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/45">{E2(`MÁX. ${Math.min(p.maxPersona, p.maxOrden)} POR PERSONA`, `MAX. ${Math.min(p.maxPersona, p.maxOrden)} PER PERSON`)}</span></div>
      {p.tipos.map((t, i) => {
        const n = q[t.id] ?? 0;
        return (
          <div key={t.id} data-tipo={t.id} className={`flex items-center gap-3 py-3 ${i ? "border-t border-ink/[.06]" : "mt-1"}`}>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold">{t.n}</div>
              {t.s && <div className="mt-0.5 text-[12px] font-medium text-ink/55">{t.s}</div>}
              {t.vale && <div className="mt-0.5 font-mono text-[9.5px] font-bold tracking-[0.06em] text-action">{t.vale.toUpperCase()}</div>}
              <div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-display text-[15px] font-extrabold">{dinero(t.p)}</span>
                {t.quedan === 0 ? <span className="font-mono text-[9.5px] font-bold tracking-[0.08em] text-danger">{E2("AGOTADO.", "SOLD OUT.")}</span>
                  : t.quedan <= 20 ? <span className="font-mono text-[9.5px] font-bold tracking-[0.08em] text-pro-ink">{E2(`SOLO QUEDAN ${t.quedan}.`, `ONLY ${t.quedan} LEFT.`)}</span> : null}</div>
            </div>
            {t.quedan > 0 && <div className="flex-none"><QtyStepper decLabel={E2("Uno menos", "One less")} incLabel={E2("Uno más", "One more")} value={n} size="sm" onDec={() => cambiar(t.id, -1)} onInc={() => { if (!tope) cambiar(t.id, 1); }} /></div>}
          </div>
        );
      })}
    </div>
  ) : null;
  const mesas = p.mesas.length ? (
    <div data-screen-label="Boletos · mesas" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span className={K}>{E2("MESA · UNA POR ORDEN", "TABLE · ONE PER ORDER")}</span><span className="font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/45">{E2("SE VENDEN UNA SOLA VEZ", "EACH SOLD ONLY ONCE")}</span></div>
      <div role="radiogroup" aria-label={E2("Mesa", "Table")} className="flex flex-col gap-2">
        {p.mesas.map((m) => {
          const on = mesa === m.id, off = m.quedan === 0;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => elegirMesa(m.id)}
              className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/[.1]"} ${off ? "opacity-50" : ""}`}>
              <span className="grid size-[36px] flex-none place-items-center rounded-xl bg-action/[.08] text-action"><Icon name="drink" size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{m.z}</span>
                <span className="mt-0.5 block text-[11.5px] font-medium text-ink/55">{E2(`${m.seats} personas · incluye sus entradas · consumo mínimo ${dinero(m.min)}`, `${m.seats} people · entry included · minimum spend ${dinero(m.min)}`)}</span></span>
              <span className="text-right"><span className="block font-display text-[14px] font-extrabold">{dinero(m.dep)}</span>
                <span className={`mt-0.5 block font-mono text-[9px] font-bold tracking-[0.06em] ${off ? "text-danger" : "text-ink/45"}`}>{off ? E2("AGOTADA", "SOLD OUT") : E2(`QUEDAN ${m.quedan}`, `${m.quedan} LEFT`)}</span></span>
            </button>
          );
        })}
      </div>
      <div className="text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("El depósito aparta tu mesa y se descuenta de tu consumo esa noche.", "The deposit holds your table and is deducted from your spend that night.")}</div>
    </div>
  ) : null;
  const extrasB = p.extras.length ? (
    <div data-screen-label="Boletos · extras" className={`flex flex-col gap-2 p-4 ${caja}`}>
      <span className={K}>{E2("EXTRAS", "EXTRAS")}</span>
      {p.extras.map((x) => {
        const bloqueado = (x.mesa && !mesa) || x.quedan === 0, on = extras.includes(x.id);
        return (
          <div key={x.id} className={bloqueado ? "opacity-50" : ""}>
            <AddOnRow label={`${x.n}${x.mesa ? E2(" · SOLO CON MESA", " · TABLE ONLY") : ""}`} price={dinero(x.p)} checked={on} onToggle={() => { if (bloqueado) return; setExtras((L) => (on ? L.filter((a) => a !== x.id) : [...L, x.id])); }} />
            {x.s && <div className="mt-1 px-1 text-[11.5px] font-medium text-ink/55">{x.s}</div>}
          </div>
        );
      })}
    </div>
  ) : null;
  const codigoB = p.conCodigos && p.tipos.length ? (
    <div data-screen-label="Boletos · código" className={`flex flex-col gap-2 p-4 ${caja}`}>
      <span className={K}>{E2("¿TIENES UN CÓDIGO?", "HAVE A CODE?")}</span>
      <div className="flex gap-2">
        <input value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)); setAplicado(null); setCodErr(null); }} aria-label={E2("Código de descuento", "Discount code")}
          placeholder={E2("Código", "Code")} className="h-[44px] min-w-0 flex-1 rounded-[13px] border border-ink/[.12] bg-white px-3.5 font-mono text-[14px] font-bold tracking-[0.08em] outline-none" />
        <Button variant="secondary" disabled={!codigo || nTk === 0} onClick={() => void aplicar()}>{E2("Aplicar", "Apply")}</Button>
      </div>
      {aplicado && <div role="status" className="font-mono text-[10px] font-bold tracking-[0.1em] text-open-text">{E2(`CÓDIGO APLICADO · −${dinero(aplicado.descuento)}`, `CODE APPLIED · −${dinero(aplicado.descuento)}`)}</div>}
      {codErr && <div role="alert" className="text-[12px] font-semibold text-danger">{codErr}</div>}
    </div>
  ) : null;
  const guarda = <div className="text-center text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2(`Al continuar te guardamos boletos y mesa por ${p.apartadoMin} minutos mientras pagas.`, `When you continue we hold your tickets and table for ${p.apartadoMin} minutes while you pay.`)}</div>;
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const cta = ocupado ? E2("Guardando…", "Holding…") : E2("Continuar", "Continue");

  return (
    <div data-pantalla="APP-EVT-BOLETOS" className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-EVT-BOLETOS · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid"><StepHeader title={E2("Boletos", "Tickets")} step={1} total={2} backLabel={E2("Volver", "Back")} onBack={volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">{cabeza}{tipos}{mesas}{extrasB}{codigoB}{linea}{errorBox}</div>
        <div data-screen-label="Boletos · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("TOTAL · CARGOS INCLUIDOS", "TOTAL · FEES INCLUDED")}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{dinero(Math.max(0, vista))}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!elegido || ocupado || admits > libres} onClick={() => void seguir()}>{cta}</Button></div>
          </div>
          <div className="mt-[9px]">{falta ? <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div> : guarda}</div>
        </div>
      </div>
      <div data-screen-label="APP-EVT-BOLETOS · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{p.evento.title}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{E2("Elige tus boletos", "Pick your tickets")}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${cuando} · ${p.evento.venue}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12">
          <div className="flex min-w-0 flex-col gap-3">{tipos}{mesas}{extrasB}{codigoB}</div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {cabeza}{linea}
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{E2("TOTAL · CARGOS INCLUIDOS", "TOTAL · FEES INCLUDED")}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{dinero(Math.max(0, vista))}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!elegido || ocupado || admits > libres} onClick={() => void seguir()}>{cta}</Button></div>
              </div>
              {falta ? <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div> : guarda}
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
