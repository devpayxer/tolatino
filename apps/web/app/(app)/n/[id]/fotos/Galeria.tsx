"use client";
/* APP-NEG-GALERIA (diseño «To'Latino Galería»): cuadrícula de fotos del negocio, visor a pantalla completa (flechas,
   deslizar, teclado) y «Reportar foto». Las fotos de los vecinos (reseñas) se suman cuando existan las reseñas (Fase 2). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { reportarFoto } from "../../../acciones";

type N = "Icon" | "IconButton" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, IconButton, Button } = UI as unknown as Record<N, ComponentType<any>>;

type Foto = { id: string; chica: string; grande: string; reportada: boolean };
type Textos = Record<string, string | undefined>;
const fondo = (u: string) => ({ backgroundImage: `url("${u}")`, backgroundSize: "cover", backgroundPosition: "center" });

export function Galeria({ g, inicial, conSesion, t, motivos }: {
  g: { id: string; nombre: string; fotos: Foto[] }; inicial: number; conSesion: boolean; t: Textos; motivos: { k: string; l: string }[];
}) {
  const router = useRouter();
  const [vi, setVi] = useState(inicial);
  const [rep, setRep] = useState<{ why: string; note: string; sent: boolean; id: string } | null>(null);
  const [reportadas, setReportadas] = useState(() => new Set(g.fotos.filter((f) => f.reportada).map((f) => f.id)));
  const [enviando, setEnviando] = useState(false);
  const toque = useRef<number | null>(null);
  const n = g.fotos.length;
  const ir = (d: number) => n > 1 && setVi((v) => (((v + d) % n) + n) % n);
  const volver = () => router.push(`/n/${g.id}`);

  // Teclado: ← → para moverse, Esc para cerrar (visor u hoja de reporte).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (rep) { if (e.key === "Escape") setRep(null); return; }
      if (vi < 0) return;
      if (e.key === "ArrowLeft") ir(-1); else if (e.key === "ArrowRight") ir(1); else if (e.key === "Escape") setVi(-1);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  const x = vi >= 0 ? g.fotos[vi] : undefined;
  const yaReportada = !!x && reportadas.has(x.id);
  const pedirReporte = () => {
    if (!x) return;
    if (!conSesion) return router.push(`/entrar?volver=${encodeURIComponent(`/n/${g.id}/fotos?at=${vi}`)}`);
    setRep({ why: "", note: "", sent: false, id: x.id });
  };
  const enviar = async () => {
    if (!rep?.why || enviando) return;
    setEnviando(true);
    const r = await reportarFoto(rep.id, rep.why, rep.note);
    setEnviando(false);
    if (r.ok) { setReportadas((s) => new Set(s).add(rep.id)); setRep({ ...rep, sent: true }); }
    else if ("entrar" in r && r.entrar) router.push(`/entrar?volver=${encodeURIComponent(`/n/${g.id}/fotos?at=${vi}`)}`);
  };

  return (
    <div data-pantalla="APP-NEG-GALERIA" className="min-h-full bg-white">
      {/* ── Teléfono ── */}
      <div className="pb-10 lg:hidden">
        <div className="flex items-center gap-3 px-5 pt-3.5">
          <IconButton icon="chevronLeft" size={38} onClick={volver} />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold tracking-[0.12em] text-ink/50">{t.ojo}</div>
            <div className="mt-[3px] truncate font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{g.nombre}</div>
          </div>
        </div>
        <div className="flex flex-col gap-[3px] px-5 pb-[9px] pt-[22px]">
          <span className="font-mono text-[10.5px] font-extrabold tracking-[0.12em]">{t.seccion}</span>
          <span className="text-[12px] font-medium leading-[1.45] text-ink/60">{t.seccionSub}</span>
        </div>
        <div className="grid grid-cols-3 gap-[3px]">
          {g.fotos.map((f, i) => <button key={f.id} type="button" aria-label={`${i + 1} / ${n}`} onClick={() => setVi(i)} className="aspect-square bg-photo-bg" style={fondo(f.chica)} />)}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden px-[30px] pb-16 pt-[22px] lg:block">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[18px]">
          <button type="button" onClick={volver} className="flex items-center gap-1.5 self-start text-[13px] font-bold text-action">
            <Icon name="chevronLeft" size={15} color="var(--tl-action)" strokeWidth={2} />{t.volver}
          </button>
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink/50">{t.ojo}</div>
            <h1 className="mt-1.5 text-balance font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em]">{t.titulo}</h1>
          </div>
          <div className="flex flex-col gap-3 pt-1.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[11px] font-extrabold tracking-[0.12em]">{t.seccion}</span>
              <span className="text-[13px] font-medium leading-[1.45] text-ink/60">{t.seccionSub}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
              {g.fotos.map((f, i) => <button key={f.id} type="button" aria-label={`${i + 1} / ${n}`} onClick={() => setVi(i)} className="aspect-square rounded-[14px] bg-photo-bg" style={fondo(f.chica)} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Visor: pantalla completa en el teléfono, ventana en escritorio ── */}
      {x && (
        <div role="dialog" aria-modal="true" aria-label={g.nombre} data-screen-label="Galería · foto"
          className="fixed inset-0 z-[96] flex flex-col bg-ink lg:block lg:bg-ink/90" onClick={(e) => { if (e.target === e.currentTarget) setVi(-1); }}>
          <div className="contents lg:absolute lg:left-1/2 lg:top-20 lg:flex lg:w-[980px] lg:max-w-[calc(100%-80px)] lg:-translate-x-1/2 lg:flex-col lg:gap-3.5">
            <div className="flex items-center gap-3 px-4 pb-3 pt-14 lg:p-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold leading-[1.3] text-white lg:text-[15px]">{g.nombre}</div>
                <div className="mt-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-white/60 lg:text-[10.5px]">
                  {t.delNegocio}<span className="hidden lg:inline"> · {vi + 1} / {n}</span>
                </div>
              </div>
              <button type="button" aria-label={t.cerrar} onClick={() => setVi(-1)} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-white/[.12] lg:size-10">
                <Icon name="close" size={16} color="var(--tl-white)" strokeWidth={2.2} />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 touch-pan-y select-none bg-contain bg-center bg-no-repeat lg:h-[620px] lg:flex-none lg:rounded-2xl lg:bg-ink"
              style={{ backgroundImage: `url("${x.grande}")` }}
              onPointerDown={(e) => { toque.current = e.clientX; }}
              onPointerUp={(e) => { const dx = e.clientX - (toque.current ?? e.clientX); toque.current = null; if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); }}>
              {n > 1 && (
                <>
                  <button type="button" aria-label={t.anterior} onClick={() => ir(-1)} className="absolute left-3.5 top-1/2 -mt-6 hidden size-12 place-items-center rounded-2xl bg-white/[.14] lg:grid"><Icon name="chevronLeft" size={20} color="var(--tl-white)" strokeWidth={2} /></button>
                  <button type="button" aria-label={t.siguiente} onClick={() => ir(1)} className="absolute right-3.5 top-1/2 -mt-6 hidden size-12 place-items-center rounded-2xl bg-white/[.14] lg:grid"><Icon name="chevronRight" size={20} color="var(--tl-white)" strokeWidth={2} /></button>
                </>
              )}
            </div>
            <div className="grid grid-cols-[46px_minmax(0,1fr)_46px] items-center gap-2.5 px-4 pb-[30px] pt-3.5 lg:flex lg:flex-wrap lg:gap-5 lg:p-0">
              {n > 1 ? <button type="button" aria-label={t.anterior} onClick={() => ir(-1)} className="grid size-[46px] place-items-center rounded-[15px] bg-white/[.12] lg:hidden"><Icon name="chevronLeft" size={18} color="var(--tl-white)" strokeWidth={2} /></button> : <span className="lg:hidden" />}
              <div className="flex min-w-0 flex-col items-center gap-2 lg:flex-row lg:gap-5">
                <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-white/60 lg:hidden">{vi + 1} / {n}</span>
                {yaReportada
                  ? <span className="text-center text-[12px] font-semibold text-white/55 lg:text-[12.5px]">{t.reportada}</span>
                  : <button type="button" onClick={pedirReporte} className="text-[13px] font-bold text-white/75 lg:text-[13.5px]">{t.reportar}</button>}
              </div>
              {n > 1 ? <button type="button" aria-label={t.siguiente} onClick={() => ir(1)} className="grid size-[46px] place-items-center rounded-[15px] bg-white/[.12] lg:hidden"><Icon name="chevronRight" size={18} color="var(--tl-white)" strokeWidth={2} /></button> : <span className="lg:hidden" />}
              <span className="ml-auto hidden font-mono text-[10.5px] font-semibold tracking-[0.06em] text-white/50 lg:inline">{t.pista}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Reportar foto: hoja abajo en el teléfono, ventana en escritorio ── */}
      {rep && (
        <div role="dialog" aria-modal="true" aria-label={t.rpTitulo} className="fixed inset-0 z-[97]">
          <div onClick={() => setRep(null)} className="absolute inset-0 bg-ink/55" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 rounded-t-[26px] bg-white px-5 pb-[30px] pt-5 lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-[120px] lg:w-[480px] lg:-ml-[240px] lg:rounded-[22px] lg:px-[26px] lg:pb-[26px] lg:pt-6">
            {!rep.sent ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.03em]">{t.rpTitulo}</span>
                  <span className="text-pretty text-[13px] font-medium leading-[1.5] text-ink/60">{t.rpSub}</span>
                </div>
                <div className="flex flex-col" role="radiogroup">
                  {motivos.map((m, i) => (
                    <button key={m.k} type="button" role="radio" aria-checked={rep.why === m.k} onClick={() => setRep({ ...rep, why: m.k })}
                      className={`flex items-center gap-3 py-3 text-left ${i ? "border-t border-ink/[.08]" : ""}`}>
                      <span className="size-5 flex-none rounded-full" style={{ border: rep.why === m.k ? "6px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)" }} />
                      <span className="text-[14px] font-bold leading-[1.35]">{m.l}</span>
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/40">{t.notaK}</span>
                  <textarea value={rep.note} onChange={(e) => setRep({ ...rep, note: e.target.value.slice(0, 200) })} placeholder={t.notaPh} rows={3}
                    className="w-full resize-none rounded-[13px] border-[1.5px] border-line-strong px-3.5 py-3 text-[14px] font-medium leading-[1.45] outline-none" />
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex"><Button block disabled={!rep.why || enviando} onClick={enviar}>{t.enviar}</Button></div>
                  <div className="flex"><Button variant="secondary" block onClick={() => setRep(null)}>{t.cancelar}</Button></div>
                </div>
              </>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-[15px] bg-signal/[.16]"><Icon name="check" size={22} color="var(--tl-open-text)" strokeWidth={2.2} /></span>
                <div className="flex flex-col gap-1.5">
                  <span className="font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.03em]">{t.enviadoT}</span>
                  <span className="text-pretty text-[13.5px] font-medium leading-[1.55] text-ink/65">{t.enviadoS}</span>
                </div>
                <div className="flex"><Button block onClick={() => setRep(null)}>{t.listo}</Button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
