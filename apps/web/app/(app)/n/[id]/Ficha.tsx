"use client";
/* APP-NEG-LISTING (prototipo «APP-NEG-LISTING · móvil» y «· desktop»): ficha base de la Fase 1, compuesta con el
   sistema de diseño. Pro: pestañas cuando hay más de una (Resumen, Relacionados…); Free: una sola página. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { ficha } from "@/lib/ficha";
import type { MenuPublico } from "@/lib/pedir";
import type { RsvPublica } from "@/lib/reservas";
import { guardarNegocio, registrarToque } from "../../acciones";
import { MenuCapas, MenuDesk, MenuMovil, MenuResumen, PedidoTarjeta, useMenu } from "./MenuCliente";
import { RsvBarra, RsvRapida, RsvRiel, RsvTab, useRsv } from "./Reservar";

type N = "Icon" | "Button" | "IconButton" | "Tabs" | "DesktopTabs" | "TodayCard" | "HoursPro" | "Tag" | "Chip" | "OwnerCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, IconButton, Tabs, DesktopTabs, TodayCard, HoursPro, Tag, Chip, OwnerCard } = UI as unknown as Record<N, ComponentType<any>>;

type F = NonNullable<Awaited<ReturnType<typeof ficha>>> & { guardado: boolean };
type Textos = Record<string, string>;
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const h2 = "font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]";

export function Ficha({ f, t, menu, rsv, sesion, es, tabInicial, rsvInicial }: { f: F; t: Textos; menu: MenuPublico | null; rsv: RsvPublica | null; sesion: boolean; es: boolean; tabInicial?: string; rsvInicial?: { p?: number; i?: number; h?: number; editar?: string } }) {
  const router = useRouter();
  const [tab, setTabS] = useState(tabInicial === "menu" || (tabInicial === "rsv" && rsv) ? tabInicial : "res");
  // Sin sesión: «Entra» y vuelve al pago con el carrito igual (vive en el teléfono).
  const pagar = () => router.push(sesion ? `/n/${f.id}/pagar` : `/entrar?volver=${encodeURIComponent(`/n/${f.id}/pagar`)}`);
  const mn = useMenu(menu && !menu.vacio ? menu : null, es, { onPay: pagar });
  // Reservaciones (Pro, módulo encendido): pestaña, tarjeta rápida en el Resumen y riel «Tu mesa».
  const rv = useRsv(rsv, es, sesion, rsvInicial?.editar ?? null, rsvInicial);
  // Free con pedidos este mes: se pide desde el Resumen; Free sin pedidos: la lista de platos y Llamar.
  const freeOn = !!mn && !f.pro && (mn.est.freeLeft ?? 0) > 0;
  const setTab = (id: string) => { setTabS(id); window.scrollTo({ top: 0 }); };
  const [guardado, setGuardado] = useState(f.guardado);
  const [copiado, setCopiado] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  const tabs = [{ id: "res", label: t.tabRes, icon: "grid" }, ...(mn && f.pro ? [{ id: "menu", label: es ? "Menú" : "Menu", icon: "restaurant" }] : []), ...(rv ? [{ id: "rsv", label: es ? "Reservaciones" : "Reservations", icon: "calendar" }] : []), ...(f.relacionados.length ? [{ id: "rel", label: t.tabRel, icon: "store" }] : [])];
  const conTabs = f.pro && tabs.length > 1;
  const verFotos = (i?: number) => router.push(`/n/${f.id}/fotos${typeof i === "number" ? `?at=${i}` : ""}`);

  const llamar = () => { if (!f.telefono) return; void registrarToque(f.id, "call", "ficha"); location.href = `tel:${f.telefono}`; };
  const llegar = () => {
    if (f.lat == null || f.lng == null) return;
    void registrarToque(f.id, "directions", "ficha");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`, "_blank", "noopener");
  };
  const compartir = async () => {
    void registrarToque(f.id, "share", "ficha");
    const url = location.href;
    try {
      if (navigator.share) return await navigator.share({ title: f.nombre, url });
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch { /* la persona cerró la hoja de compartir */ }
  };
  const guardar = async () => {
    const antes = guardado;
    setGuardado(!antes);
    const r = await guardarNegocio(f.id);
    if (r.ok) return setGuardado(!!r.on);
    setGuardado(antes);
    if ("entrar" in r && r.entrar) router.push(`/entrar?volver=${encodeURIComponent(location.pathname)}`);
  };

  const stColor = f.abierto ? "var(--tl-open-text)" : "var(--tl-danger)", stDot = f.abierto ? "var(--tl-open)" : "var(--tl-danger)";
  const verificado = (s: number) => (
    <svg width={s} height={s} viewBox="0 0 24 24" className="flex-none" aria-label="Verificado">
      <circle cx="12" cy="12" r="10" fill="var(--tl-action)" />
      <path d="M7.6 12.4l3 3 5.9-6.4" stroke="var(--tl-white)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
  const logo = (cls: string) => (
    <span className={`grid flex-none place-items-center border border-line font-display font-extrabold leading-none text-white ${cls}`}
      style={{ ...fondo(f.logo), backgroundColor: f.logo ? "var(--tl-photo-bg)" : "var(--tl-ink)" }}>{f.logo ? "" : f.iniciales}</span>
  );

  /* ── Bloques del Resumen ── */
  const hoy = (desk: boolean) => (
    <div data-screen-label={desk ? "Resumen desktop · hoy" : "Resumen · hoy"} className="grid">
      <TodayCard eyebrow={f.hoy.eyebrow} title={f.hoy.title} dot={f.hoy.dot} sub={f.hoy.sub} cols={f.hoy.cols} desktop={desk} />
    </div>
  );
  const oferta = f.oferta && (
    <div className="flex items-center gap-3 rounded-[17px] bg-action/[.06] py-3 pl-[15px] pr-3">
      <div className="min-w-0 flex-1">
        <Tag tone="action">{t.today}</Tag>
        <div className="mt-[7px] text-pretty text-[14px] font-bold leading-[1.4]">{f.oferta}</div>
      </div>
    </div>
  );
  const fotos = f.nFotos > 1 && (
    <div>
      <div className="flex items-baseline justify-between gap-3 px-5 lg:px-0">
        <span className={h2}>{t.photos}</span>
        <button type="button" onClick={() => verFotos()} className="flex-none text-[12.5px] font-bold text-action lg:text-[13.5px]">{t.photosAll}</button>
      </div>
      <div className="hs mt-3 flex gap-[9px] overflow-x-auto px-5 lg:px-0">
        {f.fotos.slice(0, 12).map((u, i) => (
          <button key={i} type="button" aria-label={`${t.photos} ${i + 1}`} onClick={() => verFotos(i)} className="h-[106px] w-[150px] flex-none rounded-[15px] bg-photo-bg lg:h-[140px] lg:w-[200px]" style={fondo(u)} />
        ))}
      </div>
    </div>
  );
  const horario = f.pro ? (
    <div className="grid">
      <HoursPro data={f.horario.data} dateLabel={f.horario.dateLabel} status={f.horario.status} statusColor={stColor} nextLabel={f.horario.nextLabel}
        nowLabel={t.now} changesLabel={t.changes} weekLabel={t.week} />
    </div>
  ) : (
    <div>
      <div className={`${h2} lg:hidden`}>{t.hours}</div>
      <div className="mt-3 rounded-[17px] border border-line px-[15px] py-1 lg:mt-0 lg:px-[18px] lg:py-4">
        <div className="hidden font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/50 lg:block">{t.hoursCaps}</div>
        <div className="lg:mt-1.5">
          {f.semana.map((w) => (
            <div key={w.d} className={`flex items-center py-2.5 lg:border-t lg:border-ink/[.06] lg:py-[9px] ${w.primero ? "" : "border-t border-ink/[.06]"}`}>
              <span className="w-[52px] font-mono text-[10.5px] font-extrabold tracking-[0.08em] lg:w-14" style={{ color: w.hoy ? stColor : "rgba(11,14,18,.55)" }}>{w.d}</span>
              <span className={`text-[12.5px] lg:text-[13px] ${w.hoy ? "font-extrabold" : "font-semibold"}`}>{w.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const comoLlegar = (
    <div data-screen-label="Resumen · cómo llegar">
      <div className={h2}>{f.direccion ? t.map : t.mapZone}</div>
      <div className="mt-3 flex items-center gap-3 lg:mt-4 lg:rounded-[20px] lg:border lg:border-line lg:px-6 lg:py-[22px]">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold lg:text-[17px] lg:leading-[1.35]">{f.direccion ?? f.zona}</div>
          <div className="mt-1 font-mono text-[10px] font-semibold text-ink/45 lg:mt-3 lg:text-[11px] lg:tracking-[0.04em] lg:text-ink/55">{f.direccionMeta}</div>
        </div>
        {f.direccion && f.lat != null && (
          <button type="button" onClick={llegar} className="grid h-[38px] flex-none place-items-center rounded-xl bg-ink/5 px-[15px] text-[12.5px] font-bold">{t.openMaps}</button>
        )}
      </div>
      {f.amen.length > 0 && (
        <>
          <div className="mt-3.5 font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{f.amenK}</div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3.5 gap-y-0.5">
            {f.amen.map((a) => (
              <div key={a.l} className="flex items-center gap-[9px] py-2"><Icon name={a.icon} size={17} color="var(--tl-action)" /><span className="text-[12.5px] font-semibold text-ink/70">{a.l}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
  /* ¿PUEDE HACERLO POR LEY? (Prototipo L781 / L1577, bundle-3 V.ax.veh): lleva a la ficha Licencia. */
  const ley = f.ley && (
    <div data-screen-label="Resumen · puede hacerlo por ley" role={f.ley.enlace ? "link" : undefined} onClick={f.ley.enlace ? () => router.push(`/n/${f.id}/licencia`) : undefined}
      className="flex items-center gap-3 rounded-[17px] border border-line bg-white px-3.5 py-[13px]" style={{ cursor: f.ley.enlace ? "pointer" : "default" }}>
      <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-ink"><Icon name={f.ley.enlace ? "verified" : "ban"} size={20} color="var(--tl-white)" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{f.ley.enlace ? t.leyK : t.leyNoK}</span>
        <span className="mt-1 block text-[14px] font-bold leading-[1.3]">{f.ley.titulo}</span>
        {f.ley.texto ? <span className="mt-0.5 block text-[12px] font-medium leading-[1.45] text-ink/60">{f.ley.texto}</span> : null}
        {f.ley.cant ? <span className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-pro-ink"><Icon name="warning" size={13} color="var(--tl-pro-ink)" />{`${t.leyNo} ${f.ley.cant}`}</span> : null}
      </span>
      {f.ley.enlace ? <span className="flex-none text-[12.5px] font-bold text-action">{t.leyCta}</span> : null}
    </div>
  );
  const quien = (desk: boolean) => f.quien && (
    <div data-screen-label={desk ? "Resumen desktop · quién está detrás" : "Resumen · quién está detrás"} className="grid">
      <OwnerCard {...f.quien} teamCta="" desktop={desk} />
    </div>
  );
  const preguntas = f.pro && f.faqs.length > 0 && (
    <div className="lg:max-w-[760px]">
      <div className={h2}>{t.faq}</div>
      <div className="mt-1.5">
        {f.faqs.map((q, i) => (
          <button key={i} type="button" onClick={() => setFaq(faq === i ? null : i)} className="block w-full border-b border-line py-3.5 text-left" aria-expanded={faq === i}>
            <span className="flex items-center gap-2.5">
              <span className="flex-1 text-[13.5px] font-bold lg:text-[15px]">{q.q}</span>
              <span className="grid text-ink/40 transition-transform" style={{ transform: `rotate(${faq === i ? 180 : 0}deg)` }}><Icon name="chevronDown" size={16} strokeWidth={2} /></span>
            </span>
            {faq === i && <span className="mt-2 block text-pretty text-[13px] leading-[1.6] text-ink/70 lg:text-[14.5px]">{q.a}</span>}
          </button>
        ))}
      </div>
    </div>
  );
  const relacionados = (
    <div data-screen-label="Ficha · relacionados" className="flex flex-col gap-[18px] px-4 pt-[18px] lg:px-0 lg:pt-0">
      <div className="px-1 lg:px-0">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em] lg:text-[24px]">{t.tabRel}</div>
        <div className="mt-[7px] text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60 lg:text-[14px]">{t.relSub}</div>
      </div>
      {[...new Set(f.relacionados.map((x) => x.grupo))].map((g) => {
        const items = f.relacionados.filter((x) => x.grupo === g);
        return (
          <div key={g} className="flex flex-col gap-2.5">
            <div className="px-1 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45 lg:px-0">{g} · {items.length}</div>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-4">
              {items.map((x) => (
                <div key={x.id} role="link" tabIndex={0} onClick={() => router.push(`/n/${x.id}`)} onKeyDown={(e) => e.key === "Enter" && router.push(`/n/${x.id}`)}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-line bg-white">
                  <div className="relative h-[150px] bg-photo-bg" style={fondo(x.foto)}>
                    <span className="absolute left-3 top-3 flex"><Tag tone="ink">{x.tag}</Tag></span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-[15px] pb-[15px] pt-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{x.nombre}</span>
                      {x.verificado && <span className="grid flex-none"><Icon name="verified" size={16} color="var(--tl-action)" /></span>}
                    </div>
                    <div className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{x.meta}</div>
                    <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: x.abierto ? "var(--tl-open-text)" : "var(--tl-danger)" }}>
                      <span className="size-[7px] flex-none rounded-full" style={{ background: x.abierto ? "var(--tl-open)" : "var(--tl-danger)" }} />{x.abierto ? t.open : t.closed}
                    </div>
                    {x.nota && (
                      <div className="mt-0.5 flex items-start gap-[9px] rounded-xl bg-paper px-3 py-2.5">
                        <span className="grid flex-none pt-px"><Icon name="quote" size={14} color="rgba(11,14,18,.45)" /></span>
                        <span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/75">{x.nota}</span>
                      </div>
                    )}
                    {x.chips.length > 0 && <div className="flex flex-wrap gap-[5px]">{x.chips.map((c) => <Chip key={c} variant="feature">{c}</Chip>)}</div>}
                    <div className="mt-auto flex gap-2 pt-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="grid min-w-0 flex-1">
                        <Button variant="secondary" size="md" icon={x.movil ? "phone" : "pin"}
                          onClick={() => {
                            if (x.movil && x.telefono) { void registrarToque(x.id, "call", "relacionados"); location.href = `tel:${x.telefono}`; }
                            else if (x.lat != null && x.lng != null) { void registrarToque(x.id, "directions", "relacionados"); window.open(`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`, "_blank", "noopener"); }
                          }}>{x.movil ? t.call : t.map}</Button>
                      </div>
                      <div className="grid min-w-0 flex-1"><Button variant="primary" size="md" onClick={() => router.push(`/n/${x.id}`)}>{x.cta}</Button></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div data-pantalla="APP-NEG-LISTING" className="mx-auto w-full max-w-[1440px] bg-white pb-[110px] lg:px-[30px] lg:pb-14 lg:pt-[18px]">
      {/* ── Escritorio: volver, fotos y encabezado ── */}
      <div className="hidden lg:block">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action">
          <Icon name="chevronLeft" size={16} strokeWidth={2} />{t.back}
        </button>
        {f.pro ? (
          <div className="relative mt-4 grid h-[440px] grid-cols-[2fr_1fr] grid-rows-2 gap-2 overflow-hidden rounded-[24px]">
            <button type="button" aria-label={t.photosAll} onClick={() => verFotos(0)} className="row-span-2 bg-photo-bg-2" style={fondo(f.hero)} />
            {f.mosaico.map((u, i) => <button key={i} type="button" aria-label={t.photosAll} onClick={() => verFotos(Math.min(i + 1, f.nFotos - 1))} className="bg-photo-bg" style={fondo(u)} />)}
            <button type="button" onClick={() => verFotos()} className="absolute bottom-[18px] right-[18px] flex h-10 items-center gap-2 rounded-xl bg-white px-[15px] text-[13px] font-bold text-ink shadow-[0_10px_24px_-12px_rgba(11,14,18,.6)]">
              <Icon name="image" size={15} />{t.photosAll}
            </button>
          </div>
        ) : (
          <div className="mt-4 h-[300px] rounded-[24px] bg-photo-bg-2" style={fondo(f.hero)} />
        )}
        <div className="mt-7 flex flex-wrap items-end justify-between gap-7">
          <div className="flex min-w-0 items-center gap-[18px]">
            {logo("size-[76px] rounded-[24px] text-[24px]")}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-[42px] font-extrabold leading-none tracking-[-0.045em]">{f.nombre}</h1>
                {f.verificado && verificado(20)}
              </div>
              <div className="mt-[9px] text-[15px] font-semibold leading-[1.3] text-ink/60">{f.subsLinea}</div>
              <div className="mt-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-ink/50">{f.metaD}</div>
              <div className="mt-2.5 flex flex-wrap items-center gap-[9px] text-[14px] font-semibold">
                <span className="size-2 flex-none rounded-full" style={{ background: stDot }} />
                <span className="font-bold" style={{ color: stColor }}>{f.estadoCorto}</span>
                {f.estadoResto && <span className="text-ink/60">{f.estadoResto}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-none gap-2">
            <Button variant={guardado ? "soft" : "secondary"} size="md" icon="heart" onClick={guardar}>{guardado ? t.saved : t.save}</Button>
            <Button variant="secondary" size="md" icon="share" onClick={compartir}>{copiado ? t.copied : t.share}</Button>
            {f.telefono && <Button variant="secondary" size="md" icon="phone" onClick={llamar}>{t.call}</Button>}
          </div>
        </div>
        {conTabs ? (
          <div className="mt-[26px] grid"><DesktopTabs items={tabs.map((x) => ({ ...x, icon: null }))} active={tab} onChange={setTab} asideWidth={0} gap={0} /></div>
        ) : (
          <div className="mt-[26px] border-t border-line" />
        )}
      </div>

      {/* ── Teléfono: portada y encabezado ── */}
      <div className="lg:hidden">
        <div className={`relative bg-photo-bg-2 ${f.pro ? "h-[272px]" : "h-[210px]"}`} style={fondo(f.hero)}>
          <div className="absolute inset-x-0 top-0 h-[120px] bg-[linear-gradient(180deg,rgba(11,14,18,.55),transparent)]" />
          <button type="button" aria-label={t.back} onClick={() => router.back()} className="absolute left-4 top-3.5 grid size-[38px] place-items-center rounded-[13px] bg-white/95">
            <Icon name="chevronLeft" size={18} strokeWidth={2} />
          </button>
          {f.nFotos > 0 && (
            <button type="button" onClick={() => verFotos()} className="absolute bottom-10 right-4 flex items-center gap-[7px] rounded-[10px] bg-ink/70 px-[11px] py-[7px] font-mono text-[10px] font-bold tracking-[0.1em] text-white">
              <Icon name="image" size={13} color="var(--tl-white)" />{t.photoCount}
            </button>
          )}
        </div>
        <div className="relative -mt-[26px] rounded-t-[26px] bg-white px-5 pt-5">
          <div className="flex items-center gap-[13px]">
            {logo("size-[62px] rounded-[18px] text-[19px]")}
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div className="flex items-center gap-[7px]">
                <h1 className="text-balance font-display text-[23px] font-extrabold leading-[1.1] tracking-[-0.04em]">{f.nombre}</h1>
                {f.verificado && verificado(17)}
              </div>
              <div className="line-clamp-2 text-[12.5px] font-semibold leading-[1.3] text-ink/60">{f.subsLinea}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 rounded-[17px] border border-line">
            <div className="flex min-w-0 flex-col items-center gap-[5px] px-1.5 pb-[11px] pt-3 text-center">
              <div className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{f.s1Estrella && <span className="text-[var(--tl-pro)]">★ </span>}{f.s1}</div>
              <div className="font-mono text-[9.5px] font-semibold leading-[1.25] tracking-[0.06em] text-ink/50">{f.s1Sub}</div>
            </div>
            <div className="flex min-w-0 flex-col items-center gap-[5px] border-l border-line px-1.5 pb-[11px] pt-3 text-center">
              <div className="flex items-center gap-1.5 font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: stColor }}>
                <span className="size-[7px] flex-none rounded-full" style={{ background: stDot }} />{f.estadoCorto}
              </div>
              <div className="font-mono text-[9.5px] font-semibold leading-[1.25] tracking-[0.06em] text-ink/50">{f.estadoNota}</div>
            </div>
            <button type="button" onClick={llegar} className="flex min-w-0 flex-col items-center gap-[5px] border-l border-line px-1.5 pb-[11px] pt-3 text-center">
              <span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{f.dist}</span>
              <span className="font-mono text-[9.5px] font-semibold leading-[1.25] tracking-[0.06em] text-ink/50">{f.ciudad}</span>
            </button>
          </div>
          <div className="mt-3.5 flex gap-[9px]">
            {f.telefono && <div className="flex min-w-0 flex-1"><Button icon="phone" block onClick={llamar}>{t.call}</Button></div>}
            <IconButton icon="heart" active={guardado} onClick={guardar} />
            <IconButton icon="share" onClick={compartir} />
          </div>
          {copiado && <div className="mt-2 text-center text-[12px] font-semibold text-open-text">{t.copied}</div>}
        </div>
        {conTabs ? (
          <div className="mt-[18px] bg-white"><Tabs items={tabs} active={tab} onChange={setTab} /></div>
        ) : (
          <div className="mx-5 mt-[22px] border-t border-line" />
        )}
      </div>

      {/* ── Contenido ── */}
        {tab === "menu" && mn ? (
          <div className="lg:grid lg:items-start lg:gap-12 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
            <div className="min-w-0"><MenuMovil mn={mn} /><MenuDesk mn={mn} unaColumna={false} /><div className="mt-7 hidden max-w-[520px] lg:max-[1099px]:block"><PedidoTarjeta mn={mn} /></div></div>
            <aside className="hidden pt-6 min-[1100px]:sticky min-[1100px]:top-[96px] min-[1100px]:block"><PedidoTarjeta mn={mn} /></aside>
          </div>
        ) : tab === "rsv" && rv ? (
          <div className="pb-[110px] lg:grid lg:items-start lg:gap-12 lg:pb-0 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
            <div className="min-w-0"><div className="lg:hidden"><RsvTab v={rv} desk={false} /></div><div className="hidden lg:block"><RsvTab v={rv} desk /></div><div className="mt-7 hidden max-w-[520px] lg:max-[1099px]:block"><RsvRiel v={rv} /></div></div>
            <aside className="hidden pt-6 min-[1100px]:sticky min-[1100px]:top-[96px] min-[1100px]:block"><RsvRiel v={rv} /></aside>
          </div>
        ) : tab === "rel" ? (
          <div className="lg:mt-8">{relacionados}</div>
        ) : (
          <div data-screen-label="Ficha · resumen" className="lg:mt-8 lg:grid lg:items-start lg:gap-12 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
            <div className="flex min-w-0 flex-col gap-0 lg:gap-9">
              {f.quien && <div className="px-5 pt-[18px] lg:hidden">{quien(false)}</div>}
              {f.quien && <div className="hidden lg:block">{quien(true)}</div>}
              <div className="px-5 pt-3.5 lg:hidden">{hoy(false)}</div>
              {ley && <div className="mx-5 mt-3.5 lg:mx-0 lg:mt-0">{ley}</div>}
              <div className="hidden lg:block">{hoy(true)}</div>
              {rv && <div className="mx-5 mt-3.5 lg:hidden"><RsvRapida v={rv} onMas={(p, i, h) => { if (p) { rv.setP(p); if (i != null) rv.setI(i); if (h != null) rv.setSel(h); } setTab("rsv"); }} /></div>}
              {oferta && <div className="mx-5 mt-3.5 lg:mx-0 lg:mt-0">{oferta}</div>}
              {mn && (f.pro || freeOn) && mn.tiles.length > 0 && (
                <>
                  <div className="px-5 pt-[26px] lg:hidden"><MenuResumen mn={mn} desk={false} onAll={f.pro ? () => setTab("menu") : undefined} /></div>
                  <div className="hidden lg:block"><MenuResumen mn={mn} desk onAll={f.pro ? () => setTab("menu") : undefined} /></div>
                </>
              )}
              {menu && !menu.vacio && !f.pro && !freeOn && (
                <div data-screen-label="Resumen · menú" className="px-5 pt-[26px] lg:px-0 lg:pt-0">
                  <div className={h2}>{es ? "Menú" : "Menu"}</div>
                  <div className="mt-3 rounded-[18px] border border-line px-[15px] py-0.5 lg:grid lg:grid-cols-2 lg:gap-x-8">
                    {menu.secs.flatMap((s) => s.items).map((id) => menu.items[id]!).map((it) => (
                      <div key={it.id} className="flex items-baseline gap-3 border-t border-ink/[.07] py-[13px] first:border-t-0 lg:[&:nth-child(2)]:border-t-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold leading-[1.3]">{it.name}</div>
                          {it.desc && <div className="mt-[3px] text-[11.5px] font-medium leading-[1.45] text-ink/55">{it.desc}</div>}
                        </div>
                        <span className="flex-none font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">${(it.cents / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fotos && <div className="pt-[26px] lg:pt-0">{fotos}</div>}
              <div className="px-5 pt-[26px] lg:hidden">{horario}</div>
              <div className="px-5 pt-[26px] lg:px-0 lg:pt-0">{comoLlegar}</div>
              {preguntas && <div className="px-5 pt-[26px] lg:px-0 lg:pt-0">{preguntas}</div>}
            </div>
            <aside className="hidden lg:flex lg:flex-col lg:gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">
              {rv && <RsvRapida v={rv} onMas={(p, i, h) => { if (p) { rv.setP(p); if (i != null) rv.setI(i); if (h != null) rv.setSel(h); } setTab("rsv"); }} />}
              {mn && (
                <div data-screen-label="Resumen desktop · pedir" className="rounded-[22px] border border-ink/10 bg-white p-6 shadow-[var(--shadow-float)]">
                  <div className="font-display text-[32px] font-extrabold leading-none tracking-[-0.04em]">{es ? "Desde" : "From"} ${(mn.m.desde / 100).toFixed(2)}</div>
                  <div className="mt-2.5 text-pretty text-[13px] font-medium leading-[1.6] text-ink/60">
                    {f.pro || freeOn ? (es ? "Pide aquí y pasa a recoger. Pagas en el local." : "Order here and pick it up. You pay at the store.") : (es ? "Llama para pedir o pasa por el local. Pago en el local." : "Call to order or stop by. Pay in store.")}
                  </div>
                  {(f.pro || freeOn) && mn.canOrd && <div className="mt-3.5 flex flex-wrap gap-1.5"><Chip variant="feature">Pickup</Chip><Chip variant="feature">{mn.etaL}</Chip></div>}
                  <div className="mt-[18px] flex">
                    {f.pro || freeOn ? <Button icon="bag" block onClick={() => (f.pro ? setTab("menu") : document.querySelector('[data-screen-label="Resumen desktop · menú"]')?.scrollIntoView({ behavior: "smooth", block: "center" }))}>{es ? "Pedir" : "Order"}</Button>
                      : f.telefono ? <Button icon="phone" block onClick={llamar}>{t.call}</Button> : null}
                  </div>
                </div>
              )}
              {horario}
            </aside>
          </div>
        )}
      {tab === "rsv" && rv && <RsvBarra v={rv} />}
      {tab !== "rsv" && mn && !mn.has && (f.pro || freeOn || !mn.canOrd) && (
        <div data-screen-label="Ficha · barra de pedido" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{es ? "Desde" : "From"} ${(mn.m.desde / 100).toFixed(2)}</div>
            <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">
              {f.pro ? mn.etaCaps : freeOn ? (es ? "PICKUP · PAGAS EN EL LOCAL" : "PICKUP · PAY AT THE STORE") : (es ? "PAGO EN EL LOCAL" : "PAY IN STORE")}
            </div>
          </div>
          {f.pro || freeOn ? (
            <Button icon="bag" onClick={() => { if (f.pro) return setTab("menu"); const el = document.querySelector('[data-screen-label="Resumen · menú"]'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); }}>{es ? "Pedir" : "Order"}</Button>
          ) : f.telefono ? <Button icon="phone" onClick={llamar}>{t.call}</Button> : null}
        </div>
      )}
      {mn && tab !== "rsv" && <MenuCapas mn={mn} nombre={f.nombre} />}
    </div>
  );
}
