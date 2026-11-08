"use client";
/* Pestaña Novedades de la ficha (prototipo «Ficha · novedades», novVals): seguir al negocio, filtros por tipo y cada
   publicación como PostCard del sistema de diseño con lo propio de su tipo (oferta, hoy hay, aviso, encuesta, novedad con
   botón), votos + y −, comentarios con la respuesta del negocio, guardar (ofertas) y compartir. El servidor decide qué se
   ve (en vivo, quién lo ve) y el precio de la oferta (el mismo que se cobra). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import type { NovedadesFicha, Post } from "@/lib/novedades";
import { novComentar, novEncuesta, novGuardar, novLikeComentario, novVista, novVoto, seguir } from "./acciones-novedades";
import { LineaTr, useTraducir } from "../../Traducir";

type N = "Icon" | "Button" | "Chip" | "Tag" | "PostCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, PostCard } = UI as unknown as Record<N, ComponentType<any>>;

const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const sc1 = (s: string) => { const t = s.toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const T = (es: boolean): Record<Post["kind"], [string, string, string]> => ({
  oferta: [es ? "OFERTA" : "DEAL", "ink", es ? "Ofertas" : "Deals"], hoy: [es ? "HOY HAY" : "TODAY", "signal", es ? "Hoy hay" : "Today"],
  aviso: [es ? "HORARIO" : "HOURS", "danger", es ? "Avisos" : "Notices"], encuesta: [es ? "ENCUESTA" : "POLL", "action", es ? "Encuestas" : "Polls"],
  novedad: [es ? "NOVEDAD" : "NEWS", "neutral", es ? "Novedades" : "News"],
});

export function NovTab({ v, logo, sesion, es, onItem, onHoras }: { v: NovedadesFicha; logo: string | null; sesion: boolean; es: boolean; onItem: (id: string) => void; onHoras: () => void }) {
  const router = useRouter(), tr = useTraducir(es);
  const E2 = (a: string, b: string) => (es ? a : b);
  const [f, setF] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fol, setFol] = useState(v.fol);
  // Vista: una por persona o dispositivo y día (para las cifras del dueño).
  useEffect(() => { void novVista(v.negocio.id); }, [v.negocio.id]);
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(`/n/${v.negocio.id}?tab=nov`)}`);
  const hacer = async (fn: () => Promise<{ ok: boolean; msg?: { es: string; en: string }; entrar?: true }>, after?: () => void) => {
    if (!sesion) return entrar();
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await fn().catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not do it. Check your connection." } }));
    setBusy(false);
    if (r.ok) { after?.(); router.refresh(); return; }
    if ("entrar" in r && r.entrar) return entrar();
    if (r.msg) setErr(es ? r.msg.es : r.msg.en);
  };
  const ago = (h: number) => h < 1 ? E2("AHORA", "NOW") : h < 24 ? E2(`HACE ${h} H`, `${h} H AGO`) : h < 48 ? E2("AYER", "YESTERDAY") : E2(`HACE ${Math.floor(h / 24)} DÍAS`, `${Math.floor(h / 24)} DAYS AGO`);
  const hasta = (iso: string | null) => {
    if (!iso) return E2("Sin fecha", "No end");
    const d = new Date(iso), hoy = new Date(), mismo = d.toDateString() === hoy.toDateString();
    const hora = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
    return mismo ? E2(`Hasta hoy · ${hora}`, `Until today · ${hora}`) : E2(`Hasta el ${new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short" }).format(d).replace(/\./g, "")} · ${hora}`, `Until ${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d)} · ${hora}`);
  };
  const TT = T(es), kinds = [...new Set(v.posts.map((p) => p.kind))];
  const lista = v.posts.filter((p) => f === "all" || p.kind === f);
  const caja = "mt-3 rounded-2xl bg-paper p-[13px]";
  const plato = (p: Post) => p.item && (
    <div className="flex items-center gap-3">
      <span className="size-14 flex-none rounded-[13px] bg-photo-bg" style={p.item.ph ? { backgroundImage: `url(${p.item.ph})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-bold leading-[1.25] tracking-[-0.02em]">{es ? p.item.name.es : p.item.name.en || p.item.name.es}</div>
        <div className="mt-[5px] flex flex-wrap items-baseline gap-[7px]">
          <span className="font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{money(p.kind === "oferta" && p.now ? p.now : p.item.cents)}</span>
          {p.kind === "oferta" && p.was && <span className="text-[12.5px] font-medium text-ink/50 line-through">{money(p.was)}</span>}
        </div>
      </div>
    </div>
  );
  const cuerpo = (p: Post) => {
    if (p.kind === "oferta" && p.item) return (
      <div className={caja}>
        {plato(p)}
        <div className="mt-[11px] text-[12.5px] font-medium leading-[1.4] text-ink/60">{hasta(p.ends)}</div>
        <div className="mt-[11px] flex"><Button variant="primary" icon="bag" block onClick={() => onItem(p.item!.id)}>{`${E2("Pedir · ", "Order · ")}${money(p.now ?? p.item.cents)}`}</Button></div>
      </div>
    );
    if (p.kind === "hoy" && p.link === "item" && p.item) return (
      <div className={caja}>{plato(p)}<div className="mt-[11px] flex"><Button variant="secondary" icon="plus" block onClick={() => onItem(p.item!.id)}>{E2("Agregar al pedido", "Add to order")}</Button></div></div>
    );
    if (p.kind === "aviso" && p.aviso) {
      const HL: Record<string, [string, string]> = { closed: ["Cerrado todo el día", "Closed all day"], late: ["Abrimos más tarde", "Opening later"], early: ["Cerramos más temprano", "Closing early"], ext: ["Horario extendido", "Extended hours"] };
      const h = HL[p.aviso.hrs] ?? HL.closed!;
      return (
        <div className={`${caja} flex items-center gap-3`}>
          <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-[rgba(192,57,43,.1)]"><Icon name="clock" size={18} color="var(--tl-danger)" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold leading-[1.3] text-ink/60">{sc1(p.aviso.day)}</div>
            <div className="mt-[3px] font-display text-[15px] font-bold leading-[1.25] tracking-[-0.02em]">{(es ? h[0] : h[1]) + (p.aviso.hrsT && p.aviso.hrs !== "closed" ? ` · ${p.aviso.hrsT}` : "")}</div>
          </div>
          <button type="button" onClick={onHoras} className="flex-none text-[12px] font-bold text-action">{E2("Ver horario", "See hours")}</button>
        </div>
      );
    }
    if (p.kind === "encuesta" && p.poll) {
      const P = p.poll, voto = P.mine != null, tot = P.total;
      return (
        <div className="mt-3 flex flex-col gap-1.5">
          {P.opts.map((o, j) => {
            const pc = tot ? Math.round((100 * o.n) / tot) : 0, on = P.mine === j;
            return (
              <button key={j} type="button" disabled={voto} onClick={() => hacer(() => novEncuesta(p.id, j))} className="relative box-border flex min-h-[46px] items-center gap-2.5 overflow-hidden rounded-xl bg-paper px-3.5 py-3 text-left">
                <span className="absolute inset-y-0 left-0 transition-[width] duration-[400ms]" style={{ width: voto ? `${pc}%` : "0%", background: on ? "rgba(75,55,245,.14)" : "rgba(11,14,18,.05)" }} />
                <span className={`relative min-w-0 flex-1 text-[13.5px] leading-[1.3] ${on ? "font-extrabold" : "font-bold"}`}>{o.l}</span>
                {voto && <span className="relative font-display text-[13px] font-bold tracking-[-0.02em]">{pc}%</span>}
              </button>
            );
          })}
          <div className="mt-1 text-[12.5px] font-medium leading-[1.4] text-ink/60">
            {sc1(`${tot} ${E2("VOTOS", "VOTES")}${P.closesH != null ? E2(` · CIERRA EN ${P.closesH} H`, ` · CLOSES IN ${P.closesH} H`) : ""}${voto ? E2(" · YA VOTASTE", " · YOU VOTED") : ""}`)}
          </div>
        </div>
      );
    }
    // Novedad u «Hoy hay» con botón: algo que vende, el menú, llamar o un enlace web.
    if ((p.kind === "novedad" || p.kind === "hoy") && p.link !== "none") {
      let L: { t: string; s: string; ic: string; bg?: string; cta: string; on: () => void } | null = null;
      if (p.link === "item" && p.item) L = { t: es ? p.item.name.es : p.item.name.en || p.item.name.es, s: money(p.item.cents), ic: p.item.ph ? "" : "bag", bg: p.item.ph ?? undefined, cta: E2("Ver", "See"), on: () => onItem(p.item!.id) };
      else if (p.link === "menu") L = { t: E2("Menú", "Menu"), s: "", ic: "restaurant", cta: E2("Ver", "See"), on: () => onItem("") };
      else if (p.link === "tel" && v.negocio.tel) L = { t: E2(`Llama a ${v.negocio.name}`, `Call ${v.negocio.name}`), s: "", ic: "phone", cta: E2("Llamar", "Call"), on: () => { location.href = `tel:${v.negocio.tel}`; } };
      else if (p.link === "web" && p.url) { let h = p.url; try { h = new URL(p.url).host.replace(/^www\./, ""); } catch { /* enlace raro: se muestra entero */ } L = { t: h, s: E2("SALE DE TO'LATINO", "LEAVES TO'LATINO"), ic: "globe", cta: E2("Abrir", "Open"), on: () => window.open(p.url!, "_blank", "noopener,noreferrer") }; }
      if (L) return (
        <button type="button" onClick={L.on} className={`${caja} flex w-full items-center gap-3 text-left`}>
          <span className="grid size-14 flex-none place-items-center rounded-[13px] bg-[rgba(75,55,245,.1)] bg-cover bg-center" style={L.bg ? { backgroundImage: `url(${L.bg})` } : {}}>{L.ic && <Icon name={L.ic} size={20} color="var(--tl-action)" />}</span>
          <div className="min-w-0 flex-1"><div className="font-display text-[15px] font-bold leading-[1.25] tracking-[-0.02em]">{L.t}</div>{L.s && <div className="mt-1 text-[12.5px] font-medium leading-[1.3] text-ink/60">{L.s}</div>}</div>
          <span className="flex-none text-[12px] font-bold text-action">{L.cta}</span>
        </button>
      );
    }
    return null;
  };
  const comentarios = (p: Post) => {
    const cms = [...p.cm].sort((a, z) => z.up - a.up || z.h - a.h);
    return (
      <div data-slot="after">
        {open === p.id && (
          <div className="mt-1.5 animate-[tlFade_.2s_ease-out]">
            {cms.map((c, j) => { const t = tr("post_comment", c.id, c.lang, c.body, c.propio); return (
              <div key={c.id} className="border-t border-ink/[.07] py-3">
                <div className="flex gap-2.5">
                  <span className="grid size-[30px] flex-none place-items-center rounded-full bg-desk font-display text-[11px] font-extrabold">{c.ini}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[13px] font-bold">{c.name}</span>
                      <span className="font-mono text-[9.5px] font-semibold text-ink/45">{ago(c.h)}</span>
                      {j === 0 && cms.length > 1 && c.up >= 5 && <Tag tone="signal">{E2("MÁS VOTADO", "TOP")}</Tag>}
                    </div>
                    <div className="mt-[3px] text-pretty text-[13px] font-medium leading-[1.5]">{t.body}</div>
                    <LineaTr t={t.translate} mt={3} />
                    <div className="mt-1.5 flex items-center gap-3.5 text-[11.5px] font-bold">
                      <button type="button" disabled={c.propio} onClick={() => hacer(() => novLikeComentario(c.id))} className="flex items-center gap-[5px]" style={{ color: c.mine ? "var(--tl-action)" : "rgba(11,14,18,.55)" }}>
                        <Icon name="like" size={13} color={c.mine ? "var(--tl-action)" : "rgba(11,14,18,.55)"} />{c.up}
                      </button>
                    </div>
                    {c.reply && (
                      <div className="mt-2.5 rounded-[13px] bg-[rgba(75,55,245,.06)] px-3 py-[11px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="size-[22px] flex-none rounded-full bg-photo-bg bg-cover bg-center" style={logo ? { backgroundImage: `url(${logo})` } : {}} />
                          <span className="text-[12.5px] font-bold">{v.negocio.name}</span>
                          <Tag tone="action">{E2("NEGOCIO", "BUSINESS")}</Tag>
                        </div>
                        <div className="mt-1.5 text-pretty text-[13px] font-medium leading-[1.5]">{c.reply}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ); })}
            <div className="flex items-center gap-2 border-t border-ink/[.07] pt-3">
              <div className="box-border flex h-[42px] min-w-0 flex-1 items-center rounded-xl border border-ink/[.12] px-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 300))} placeholder={E2("Escribe un comentario…", "Write a comment…")} aria-label={E2("Comentario", "Comment")}
                  className="min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-ink outline-none" />
              </div>
              <div className="grid"><Button variant="primary" size="md" disabled={!draft.trim() || busy} onClick={() => hacer(() => novComentar(p.id, draft), () => setDraft(""))}>{E2("Enviar", "Send")}</Button></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-screen-label="Ficha · novedades" className="flex animate-[tlFade_.2s_ease-out] flex-col gap-3 px-4 pt-[18px] lg:px-0 lg:pt-6">
      <div className="flex flex-wrap items-center gap-3 rounded-[17px] border border-ink/[.08] bg-white px-[15px] py-3.5">
        <span className="grid size-10 flex-none place-items-center rounded-xl bg-[rgba(75,55,245,.1)]"><Icon name="bell" size={18} color="var(--tl-action)" /></span>
        <div className="min-w-0 flex-[1_1_180px]">
          <div className="text-[13.5px] font-bold leading-[1.3]">{fol ? E2(`Sigues a ${v.negocio.name}`, `You follow ${v.negocio.name}`) : E2(`Sigue a ${v.negocio.name}`, `Follow ${v.negocio.name}`)}</div>
          <div className="mt-[3px] text-[12px] font-medium leading-[1.45] text-ink/60">
            {fol ? E2("Ves las publicaciones solo para seguidores.", "You see follower-only posts.") : v.seguidores ? E2(`${v.seguidores} ${v.seguidores === 1 ? "vecino lo sigue" : "vecinos lo siguen"} · ve las publicaciones solo para seguidores`, `${v.seguidores} ${v.seguidores === 1 ? "neighbor follows" : "neighbors follow"} · see follower-only posts`) : E2("Ve las publicaciones solo para seguidores.", "See follower-only posts.")}
          </div>
        </div>
        <div className="grid"><Button variant={fol ? "soft" : "primary"} size="md" disabled={busy} onClick={() => hacer(() => seguir(v.negocio.id), () => setFol(!fol))}>{fol ? E2("Siguiendo", "Following") : E2("Seguir", "Follow")}</Button></div>
      </div>
      {kinds.length > 1 && (
        <div className="hs flex gap-[7px] overflow-x-auto">
          {[["all", E2("Todo", "All")] as [string, string], ...kinds.map((k) => [k, TT[k][2]] as [string, string])].map(([k, l]) => <Chip key={k} variant={f === k ? "selected" : "filter"} onClick={() => { setF(k); setOpen(null); }}>{l}</Chip>)}
        </div>
      )}
      {err && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{err}</div>}
      {lista.map((p) => {
        const fotos = p.fotos;
        return (
          <PostCard key={p.id} card screenLabel="Novedades · publicación" avatar={logo ? `url(${logo}) center/cover` : undefined} avatarColor="var(--tl-photo-bg)" initials={logo ? undefined : v.negocio.name.slice(0, 1)}
            name={v.negocio.name} nameFont="700 14.5px/1.2" time={sc1(ago(p.h))}
            tags={[p.pinned ? { label: E2("FIJADO", "PINNED"), tone: "ink" } : null, { label: TT[p.kind][0], tone: TT[p.kind][1] }, p.hoy ? { label: E2(`EN HOY EN EL BARRIO · QUEDAN ${p.hoy} H`, `IN TODAY NEARBY · ${p.hoy} H LEFT`), tone: "signal" } : null].filter(Boolean)}
            body={p.body ? `${p.title}. ${p.body}` : p.title} bodyFont="500 14px/1.55" bodyGap={10}
            vote={{ labels: { up: E2("Votar a favor", "Upvote"), down: E2("Votar en contra", "Downvote"), comments: E2("Comentarios", "Comments"), save: E2("Guardar", "Save"), share: E2("Compartir", "Share") }, score: p.score, onUp: () => hacer(() => novVoto(p.id, 1)), onDown: () => hacer(() => novVoto(p.id, -1)), upColor: p.myVote === 1 ? "var(--tl-action)" : "rgba(11,14,18,.6)", downColor: p.myVote === -1 ? "var(--tl-danger)" : "rgba(11,14,18,.6)", scoreColor: p.myVote ? "var(--tl-action)" : "var(--tl-ink)" }}
            voteStyle={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(11,14,18,.07)", gap: 6 }}
            comments={p.cm.length ? String(p.cm.length) : E2("Comentar", "Comment")} onComments={() => { setOpen(open === p.id ? null : p.id); setDraft(""); }}
            onSave={p.kind === "oferta" ? () => hacer(() => novGuardar(p.id)) : undefined} saveColor={p.saved ? "var(--tl-danger)" : "rgba(11,14,18,.6)"}
            onShare={() => { const u = `${location.origin}/n/${v.negocio.id}?tab=nov`; if (navigator.share) navigator.share({ title: p.title, url: u }).catch(() => undefined); else navigator.clipboard?.writeText(u).catch(() => undefined); }}>
            {fotos.length > 0 && (
              <div className="mt-3 grid gap-1.5 overflow-hidden rounded-[14px]" style={{ gridTemplateColumns: `repeat(${Math.min(2, fotos.length)},minmax(0,1fr))` }}>
                {fotos.map((u, i) => <span key={i} className="bg-photo-bg bg-cover bg-center" style={{ height: fotos.length > 2 ? 120 : fotos.length > 1 ? 150 : 200, backgroundImage: `url(${u})` }} />)}
              </div>
            )}
            {cuerpo(p)}
            {comentarios(p)}
          </PostCard>
        );
      })}
      {!lista.length && <div className="p-6 text-center text-[13px] font-medium text-ink/55">{E2("No hay publicaciones de este tipo.", "No posts of this type.")}</div>}
    </div>
  );
}
