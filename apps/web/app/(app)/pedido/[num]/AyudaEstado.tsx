"use client";
/* La solicitud de ayuda en el pedido (diseño Mi cuenta · orderV, nota «Solicitud enviada / resuelta»): enviada (el negocio
   responde en las horas de Configuración · ayuda_negocio_h), la respuesta del negocio (y «Pedir que To'Latino la revise»), To'Latino la revisa, o resuelta. Si no
   hay solicitud y se puede, el botón «Ayuda con el pedido». */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Ayuda } from "@/lib/ayuda";
import { horasTxt } from "@/lib/plazo-txt";
import { ayudaRevision } from "./acciones";
import { dosIdiomas } from "@/lib/dos-idiomas";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
const MOT = (es: unknown): Record<string, string> => { const E2 = (a: string, b: string) => dosIdiomas(es, a, b); return { falta: E2("Falta algo", "Something is missing"), equivocado: E2("Llegó algo equivocado", "Wrong item"), frio: E2("Llegó frío o mal preparado", "Cold or poorly made"), danado: E2("Llegó dañado o derramado", "Damaged or spilled"), tarde: E2("Llegó tarde", "Arrived late"), nollego: E2("No me llegó", "It never arrived"), pago: E2("Problema con el pago", "Payment issue"), otro: E2("Otro problema", "Something else") }; };

export function AyudaEstado({ numero, negocio, a, puede, es }: { numero: string; negocio: string; a: Ayuda | null; puede: boolean; es: boolean }) {
  const E2 = (x: string, y: string) => dosIdiomas(es, x, y);
  const router = useRouter();
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  if (!a) return puede ? <div className="flex"><Button variant="secondary" icon="help" block onClick={() => router.push(`/pedido/${numero}/ayuda`)}>{E2("Ayuda con el pedido", "Help with this order")}</Button></div> : null;
  const hora = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
  const mot = MOT(es)[a.reason] ?? MOT(es).otro!;
  const [tono, ic, t, s] = a.status === "resolved" ? ["ok", "check", E2("Solicitud resuelta por To’Latino", "Request resolved by To’Latino"), a.resolution ?? ""]
    : a.status === "escalated" ? ["warn", "shield", E2("To’Latino está revisando tu solicitud", "To’Latino is reviewing your request"), a.porUsuario ? E2("Pediste que la revisemos. Te respondemos aquí.", "You asked us to review it. We reply here.") : E2(`${negocio} no respondió en ${horasTxt(a.plazoH, true)}. Te respondemos aquí.`, `${negocio} did not reply within ${horasTxt(a.plazoH, false)}. We reply here.`)]
    : a.status === "answered" ? ["ok", "chat", E2(`${negocio} respondió`, `${negocio} replied`), `“${a.reply ?? ""}”`]
    : ["warn", "clock", E2("Solicitud enviada", "Request sent"), E2(`${negocio} responde antes del ${hora(a.vence)}. Si no, To’Latino revisa.`, `${negocio} replies before ${hora(a.vence)}. If not, To’Latino reviews it.`)];
  const bg = tono === "ok" ? "bg-[rgba(0,229,196,.12)]" : "bg-[rgba(255,176,32,.14)]", fg = tono === "ok" ? "text-open-text" : "text-pro-ink";
  const revisar = async () => { setBusy(true); setErr(""); const r = await ayudaRevision(numero).catch(() => null); setBusy(false); if (r?.ok) router.refresh(); else setErr(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not do it.")); };
  return (
    <div className={`flex flex-col gap-2 rounded-[18px] px-4 py-3.5 ${bg}`}>
      <div className="flex items-start gap-2.5">
        <span className="grid flex-none pt-px"><Icon name={ic} size={16} color={tono === "ok" ? "var(--tl-open-text)" : "var(--tl-pro-ink)"} /></span>
        <div className="min-w-0 flex-1">
          <div className={`text-[13.5px] font-bold ${fg}`}>{t}</div>
          <div className="mt-0.5 font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/60">{`${a.number} · ${mot}`.toUpperCase()}{a.items.length ? ` · ${a.items.map((x) => `${x.q} × ${x.n}`).join(", ")}` : ""}</div>
          {s && <div className="mt-1.5 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{s}</div>}
        </div>
      </div>
      {a.status === "answered" && <button type="button" disabled={busy} onClick={revisar} className="inline-flex min-h-11 items-center self-start text-[12.5px] font-bold text-action">{E2("¿No se arregló? Pedir que To’Latino lo revise", "Not solved? Ask To’Latino to review it")}</button>}
      {err && <div role="alert" className="text-[12px] font-semibold text-danger">{err}</div>}
    </div>
  );
}
