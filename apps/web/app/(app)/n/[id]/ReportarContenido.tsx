"use client";
/* 9m · «Reportar» una novedad o una vacante (L299, L309): el diseño no trae el botón; se compone con Chip y Button del sistema, como el reporte de una
   reseña (motivos cortos, una nota opcional, «To'Latino lo revisa en 48 horas»). Sin cuenta, primero Entra. Pieza compuesta (REVISION 9m). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import { contenidoReportar } from "./acciones-reportar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Chip, Button, Icon } = UI as unknown as Record<"Chip" | "Button" | "Icon", ComponentType<any>>;
const MOT: [string, string, string][] = [["spam", "Spam o publicidad engañosa", "Spam or misleading ads"], ["falso", "Es falso o engañoso", "False or misleading"], ["off", "Ofensivo o discrimina", "Offensive or discriminatory"], ["otro", "Otra cosa", "Something else"]];

export function ReportarContenido({ kind, id, es, conSesion, volver }: { kind: "post" | "job"; id: string; es: boolean; conSesion: boolean; volver: string }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), [pend, start] = useTransition();
  const [abierto, setAbierto] = useState(false), [m, setM] = useState<string | null>(null), [nota, setNota] = useState(""), [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);
  const abrir = () => { if (!conSesion) { router.push(`/entrar?volver=${encodeURIComponent(volver)}`); return; } setAbierto((x) => !x); setRes(null); };
  const enviar = () => start(async () => {
    if (!m) return;
    const r = await contenidoReportar(kind, id, m, nota).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setRes(r.ok ? { ok: true, t: r.ya ? E2("Ya lo habías reportado. To’Latino lo revisa.", "You had already reported it. To’Latino reviews it.") : E2("Gracias. To’Latino lo revisa en 48 horas.", "Thank you. To’Latino reviews it within 48 hours.") } : { ok: false, t: es ? r.msg.es : r.msg.en });
    if (r.ok) { setAbierto(false); setM(null); setNota(""); }
  });
  return (
    <div data-reportar={`${kind}:${id}`} className="flex flex-col gap-2">
      <button type="button" onClick={abrir} className="inline-flex items-center gap-1.5 self-start py-1 text-[12.5px] font-bold text-ink/55">
        <Icon name="warning" size={14} color="rgba(11,14,18,.5)" />{kind === "job" ? E2("Reportar esta vacante", "Report this job") : E2("Reportar esta publicación", "Report this post")}
      </button>
      {abierto ? (
        <div className="flex flex-col gap-2.5 rounded-[16px] border border-ink/[.08] bg-white p-3.5">
          <div className="text-[13px] font-bold">{E2("¿Qué pasa?", "What is wrong?")}</div>
          <div className="flex flex-wrap gap-1.5">{MOT.map(([k, a, b]) => <Chip key={k} variant={m === k ? "selected" : "filter"} onClick={() => setM(k)}>{es ? a : b}</Chip>)}</div>
          <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 300))} rows={2} placeholder={E2("Cuéntanos más (opcional)", "Tell us more (optional)")} aria-label={E2("Nota", "Note")}
            className="rounded-[12px] border-[1.5px] border-ink/[.14] px-3 py-2 text-[14px] outline-none" />
          <div className="flex gap-2"><Button variant="primary" size="sm" disabled={!m || pend} onClick={enviar}>{E2("Enviar reporte", "Send report")}</Button><Button variant="secondary" size="sm" onClick={() => setAbierto(false)}>{E2("Cancelar", "Cancel")}</Button></div>
        </div>
      ) : null}
      {res ? <div role={res.ok ? "status" : "alert"} className={`text-[12.5px] font-semibold ${res.ok ? "text-[var(--tl-open-text)]" : "text-[var(--tl-danger)]"}`}>{res.t}</div> : null}
    </div>
  );
}
