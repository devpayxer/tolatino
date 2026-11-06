"use client";
/* Pestaña Jobs de la ficha (prototipo «Ficha · jobs», jobAdd): «Están contratando», cada vacante con su pago real por
   hora, horario, idiomas, lo que ofrecen, el estado de tu solicitud y guardar. Aplicar no pide CV. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { VacanteFicha } from "@/lib/jobs";
import { bi, diasL, haceL, horarioL, idiomasL, pagoL, tipoL } from "@/lib/jobs-txt";
import { vacGuardar } from "./acciones-jobs";

type N = "Icon" | "Chip" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Chip, Tag } = UI as unknown as Record<N, ComponentType<any>>;

export const TAG_APP = (es: boolean, ivOk = false): Record<string, [string, string]> => ({
  sent: [es ? "ENVIADA" : "SENT", "neutral"], seen: [es ? "VISTA" : "SEEN", "action"], contact: [es ? "TE VAN A LLAMAR" : "THEY WILL CALL", "signal"],
  interview: [ivOk ? (es ? "ENTREVISTA CONFIRMADA" : "INTERVIEW CONFIRMED") : es ? "ENTREVISTA" : "INTERVIEW", "signal"], not_selected: [es ? "NO SELECCIONADO" : "NOT SELECTED", "danger"], withdrawn: [es ? "RETIRADA" : "WITHDRAWN", "neutral"],
});

export function JobsTab({ jobs, negocio, sesion, es }: { jobs: VacanteFicha[]; negocio: string; sesion: boolean; es: boolean }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const [saved, setSaved] = useState<Record<string, boolean>>(Object.fromEntries(jobs.map((j) => [j.id, j.saved])));
  const guardar = async (id: string) => {
    if (!sesion) return router.push(`/entrar?volver=${encodeURIComponent(`/n/${negocio}?tab=jobs`)}`);
    setSaved((s) => ({ ...s, [id]: !s[id] }));
    const r = await vacGuardar(id).catch(() => null);
    if (!r?.ok) setSaved((s) => ({ ...s, [id]: !s[id] }));
  };
  return (
    <div data-screen-label="Ficha · jobs" className="flex animate-[tlFade_.2s_ease-out] flex-col gap-3 px-4 pt-[18px] lg:px-0 lg:pt-6">
      <div className="px-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{E2("Están contratando", "They are hiring")}</div>
        <div className="mt-[7px] text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{E2(`${jobs.length} ${jobs.length > 1 ? "vacantes" : "vacante"} · aplicas sin CV`, `${jobs.length} ${jobs.length > 1 ? "openings" : "opening"} · apply without a resume`)}</div>
      </div>
      {jobs.map((j) => {
        const tg = j.mi ? TAG_APP(es, j.ivOk)[j.mi] : null;
        return (
          <div key={j.id} role="link" tabIndex={0} onClick={() => router.push(`/n/${negocio}/empleo/${j.id}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/n/${negocio}/empleo/${j.id}`); }}
            className="flex cursor-pointer flex-col gap-[11px] rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-display text-[16.5px] font-extrabold leading-[1.2] tracking-[-0.02em]">{bi(j.title, es)}</div>
                <div className="mt-[5px] text-[12.5px] font-medium text-ink/60">{tipoL(j.kind, es)} · {haceL(j.ago, es)}</div>
              </div>
              {tg && <Tag tone={tg[1]}>{tg[0]}</Tag>}
              <button type="button" aria-label={saved[j.id] ? E2("Quitar de guardadas", "Unsave") : E2("Guardar", "Save")} aria-pressed={!!saved[j.id]} onClick={(e) => { e.stopPropagation(); void guardar(j.id); }} className="grid size-[34px] flex-none place-items-center rounded-[11px]">
                <Icon name="heart" size={17} color={saved[j.id] ? "var(--tl-danger)" : "rgba(11,14,18,.4)"} />
              </button>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{pagoL(j.payFrom, j.payTo, es)}</span>
              {j.tips && <Chip variant="slot">{E2("+ PROPINAS", "+ TIPS")}</Chip>}
            </div>
            <div className="flex flex-col gap-1.5 text-[12.5px] font-medium leading-[1.4] text-ink/70">
              <span className="flex items-center gap-2"><Icon name="clock" size={14} color="rgba(11,14,18,.5)" />{diasL(j.days, es)} · {horarioL(j.start, j.end)}</span>
              <span className="flex items-center gap-2"><Icon name="language" size={14} color="rgba(11,14,18,.5)" />{idiomasL(j.langEs, j.langEn, es)}</span>
            </div>
            {j.ben.length > 0 && <div className="flex flex-wrap gap-[5px]">{j.ben.slice(0, 3).map((b, i) => <Chip key={i} variant="feature">{es ? b[0] : b[1] || b[0]}</Chip>)}</div>}
          </div>
        );
      })}
    </div>
  );
}
