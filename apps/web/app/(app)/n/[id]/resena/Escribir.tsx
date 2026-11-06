"use client";
/* APP-NEG-RESENA (prototipo «APP-NEG-RESENA · móvil / · desktop», revWVals): sobre qué visita (verificada si hay un pedido
   o una mesa terminada; si no, visitante), estrellas, lo que importa (Comida), qué recomiendas, el texto (20 a 1000 letras,
   sin teléfonos ni correos), hasta 6 fotos y las reglas. En escritorio, «Así la van a ver» con la ReviewCard real. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { ParaEscribir, Respuestas, Tarjeta } from "@/lib/resenas";
import { subirFoto } from "@/lib/subir-foto";
import { publicarResena } from "../acciones-resena";
import { propsTarjeta } from "../Resenas";

type N = "Icon" | "Button" | "Chip" | "Tag" | "ReviewCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, ReviewCard } = UI as unknown as Record<N, ComponentType<any>>;

const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white p-[15px]";
const PII = /(\d[\s().-]*){10}|\S+@\S+\.\S+/;
type Foto = { id: string; url: string };

export function Escribir({ d, es, nombre, estrellas }: { d: ParaEscribir; es: boolean; nombre: string; estrellas: number }) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const m = d.mia, b = d.negocio, editar = !!m;
  const [src, setSrc] = useState<"op" | "vis">(m ? (m.src === "vis" ? "vis" : "op") : d.op ? "op" : "vis");
  const [stars, setStars] = useState(m?.stars ?? estrellas);
  const [ans, setAns] = useState<Respuestas>(m?.answers ?? {});
  const [rec, setRec] = useState<string[]>([]);
  const [text, setText] = useState(m?.body ?? "");
  const [fotos, setFotos] = useState<Foto[]>(m?.fotoIds ?? []);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  // Recomendaciones ya elegidas al editar (vienen como nombres; se marcan por id del menú del pedido).
  const [recIni] = useState(() => (m ? d.pool.filter((p) => m.rec.some((x) => x.es === p.name.es)).map((p) => p.id) : []));
  const recSel = rec.length || !m ? rec : recIni;

  const opSrc = m ? m.src : d.op?.src ?? "vis", isOrd = src === "op" && (opSrc === "dl" || opSrc === "pk"), dl = src === "op" && opSrc === "dl";
  const len = text.trim().length, pii = PII.test(text);
  const miss = !stars ? E2("TU CALIFICACIÓN", "YOUR RATING") : len < 20 ? E2("ESCRIBIR AL MENOS 20 LETRAS", "WRITE AT LEAST 20 CHARACTERS") : pii ? E2("QUITAR TELÉFONOS O CORREOS", "REMOVE PHONES OR EMAILS") : "";
  const numeroOp = m?.numero ?? d.op?.numero ?? null, mesa = (m ? m.src === "rsv" : d.op?.kind === "table"), cita = (m ? m.src === "cita" : d.op?.kind === "appointment");
  const title = editar ? E2("Editar reseña", "Edit review") : E2("Escribir reseña", "Write a review");
  const meta = `${b.name}${src === "op" && numeroOp ? (mesa || cita ? ` · ${numeroOp}` : E2(` · PEDIDO #${numeroOp}`, ` · ORDER #${numeroOp}`)) : ""}`.toUpperCase();
  const volver = () => router.push(editar ? `/n/${b.id}/resena/tuya` : `/n/${b.id}${b.pro ? "?tab=rev" : ""}`);

  // ¿Sobre qué visita? La verificada solo si el servidor encontró un pedido o una mesa terminada.
  const srcs: { k: "op" | "vis"; t: string; s: string; tag: string; tone: string }[] = [];
  if (m ? m.src !== "vis" : d.op) {
    const lin = (d.op?.lineas ?? []).slice(0, 2).join(", ");
    srcs.push({ k: "op", t: cita ? E2(`Cita ${numeroOp}`, `Booking ${numeroOp}`) : mesa ? E2(`Reservación ${numeroOp} · mesa`, `Booking ${numeroOp} · table`) : E2(`Pedido #${numeroOp} · ${dl ? "delivery" : "pickup"}`, `Order #${numeroOp} · ${dl ? "delivery" : "pickup"}`),
      s: lin || (cita ? E2("Fuiste con tu cita", "You went with your booking") : mesa ? E2("Fuiste con tu reservación", "You went with your booking") : ""), tag: E2("VERIFICADA", "VERIFIED"), tone: "signal" });
  }
  if (!m || m.src === "vis") srcs.push({ k: "vis", t: E2("Fui sin pedir por To'Latino", "I went without ordering on To'Latino"), s: E2("En el local, por teléfono o hace tiempo", "In person, by phone or a while ago"), tag: E2("VISITANTE", "VISITOR"), tone: "neutral" });

  const SL = [E2("Toca una estrella", "Tap a star"), E2("Malo", "Bad"), E2("Regular", "Fair"), E2("Bien", "Good"), E2("Muy bien", "Very good"), E2("Excelente", "Excellent")];
  type G = { k: string; key: keyof Respuestas; opts: [string | number, string][] };
  const grupos: G[] = !b.food ? [] : [
    { k: E2("SABOR", "FLAVOR"), key: "taste", opts: [[1, E2("Muy bueno", "Great")], [0, E2("Normal", "Okay")], [-1, E2("No me gustó", "Did not like it")]] },
    { k: dl ? E2("CÓMO LLEGÓ", "HOW IT ARRIVED") : E2("TEMPERATURA", "TEMPERATURE"), key: "hot", opts: [[1, E2("Caliente", "Hot")], [0, E2("Tibio", "Lukewarm")], [-1, E2("Frío", "Cold")]] },
    ...(isOrd ? [] : [{ k: E2("CUÁNTO ESPERASTE", "HOW LONG YOU WAITED"), key: "wait" as const, opts: [["a", E2("Menos de 15 min", "Under 15 min")], ["b", E2("15 a 30 min", "15 to 30 min")], ["c", E2("Más de 30 min", "Over 30 min")]] as [string, string][] }]),
    { k: E2("PRECIO", "PRICE"), key: "val", opts: [[1, E2("Vale lo que cuesta", "Worth it")], [0, E2("Más o menos", "So-so")], [-1, E2("Caro para lo que es", "Pricey for what it is")]] },
  ];
  const H = d.hechos, tm = isOrd && typeof H.late === "number" ? [
    { k: E2("PROMETIDO", "PROMISED"), v: H.promised ?? "—", fg: "var(--tl-ink)" },
    { k: dl ? E2("LLEGÓ", "ARRIVED") : E2("LISTO", "READY"), v: H.done ?? "—", fg: "var(--tl-ink)" },
    { k: E2("RESULTADO", "RESULT"), v: H.late <= 5 ? (dl ? E2("A tiempo", "On time") : E2("Listo a la hora", "Ready on time")) : E2(`${H.late} min tarde`, `${H.late} min late`), fg: H.late <= 5 ? "var(--tl-open-text)" : "var(--tl-danger)" },
  ] : [];

  const subir = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setSubiendo(true); setError(null);
    for (const f of Array.from(fl).slice(0, 6 - fotos.length)) {
      const r = await subirFoto(f).catch(() => null);
      if (r?.ok && r.id && r.url) setFotos((x) => (x.length < 6 ? [...x, { id: r.id!, url: r.url! }] : x));
      else { setError(r?.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo.")); break; }
    }
    setSubiendo(false);
    if (file.current) file.current.value = "";
  };
  const publicar = async () => {
    if (miss || enviando || subiendo) return;
    setEnviando(true); setError(null);
    const r = await publicarResena({ negocio: b.id, numero: src === "op" ? numeroOp : null, visitante: src === "vis", stars, answers: ans, rec: recSel, body: text, fotos: fotos.map((f) => f.id) })
      .catch(() => ({ ok: false as const, msg: { es: "No se pudo publicar. Revisa tu conexión.", en: "Could not post. Check your connection." } }));
    if (r.ok) { router.push(`/n/${b.id}/resena/tuya?ok=${editar ? 2 : 1}`); router.refresh(); return; }
    if ("entrar" in r && r.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${b.id}/resena`)}`); return; }
    setError(es ? r.msg.es : r.msg.en); setEnviando(false);
  };

  // «Así la van a ver»: la misma tarjeta de la ficha con lo que lleva escrito.
  const borrador: Tarjeta = {
    id: "draft", name: nombre, ini: nombre.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(), mine: true, cnt: m?.cnt ?? 1, d: 0, editada: editar,
    src: src === "op" ? (opSrc as Tarjeta["src"]) : "vis", stars, answers: isOrd ? { ...ans, wait: undefined } : ans, facts: isOrd ? H : {},
    body: text.trim() || E2("Tu reseña aparece aquí, así como la ven los vecinos.", "Your review shows here, the way neighbors see it."), fotos: fotos.map((f) => f.url),
    rec: d.pool.filter((p) => recSel.includes(p.id)).map((p) => p.name), reply: m?.reply ?? null, help: 0, helpOn: false, reported: false,
  };
  const low = stars > 0 && stars <= 2;
  const reglas = E2(`Se publica al instante como ${nombre}${/\.$/.test(nombre) ? " " : ". "}${b.name}${b.pro ? " puede responder, pero no borrarla ni cambiarla." : " no puede borrarla ni cambiarla."} Puedes editarla durante 48 h.`,
    `Posts instantly as ${nombre}${/\.$/.test(nombre) ? " " : ". "}${b.name}${b.pro ? " can reply, but cannot delete or change it." : " cannot delete or change it."} You can edit it for 48 h.`);

  const negocio = (
    <div className={caja}>
      <div className="flex items-center gap-[11px]">
        <span className="size-[42px] flex-none rounded-xl bg-photo-bg" style={b.logo ? { backgroundImage: `url(${b.logo})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{b.name}</div><div className="mt-[3px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{b.meta.toUpperCase()}</div></div>
      </div>
      <div className={`mt-4 ${K}`}>{E2("¿SOBRE QUÉ VISITA?", "WHICH VISIT?")}</div>
      <div role="radiogroup" className="mt-2.5 flex flex-col gap-2">
        {srcs.map((x) => {
          const on = src === x.k;
          return (
            <button key={x.k} type="button" role="radio" aria-checked={on} disabled={editar} onClick={() => setSrc(x.k)} className={`flex items-center gap-3 rounded-[14px] px-3.5 py-[13px] text-left ${on ? "border-[1.5px] border-ink" : "border border-ink/[.12]"}`}>
              <span className={`box-border size-5 flex-none rounded-full ${on ? "border-[6px] border-ink" : "border-[1.5px] border-ink/25"}`} />
              <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold leading-[1.3]">{x.t}</div>{x.s && <div className="mt-[3px] text-[12px] font-medium leading-[1.4] text-ink/55">{x.s}</div>}</div>
              <Tag tone={x.tone}>{x.tag}</Tag>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("Solo sale verificada si pediste, recogiste o reservaste por To'Latino.", "It only shows as verified if you ordered, picked up or booked on To'Latino.")}</div>
    </div>
  );
  const estrellasB = (
    <div data-screen-label="Reseña · estrellas" className={caja}>
      <div className={K}>{E2("TU CALIFICACIÓN", "YOUR RATING")}</div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} ★`} aria-pressed={n <= stars} onClick={() => setStars(n)} className="grid h-[54px] place-items-center rounded-[15px]" style={{ background: n <= stars ? "rgba(255,176,32,.14)" : "rgba(11,14,18,.04)" }}>
            <Icon name="star" size={26} color={n <= stars ? "var(--tl-pro)" : "rgba(11,14,18,.22)"} strokeWidth={2} />
          </button>
        ))}
      </div>
      <div className="mt-2.5 text-center font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]" style={{ color: stars ? "var(--tl-ink)" : "rgba(11,14,18,.45)" }}>{SL[stars]}</div>
    </div>
  );
  const importa = grupos.length > 0 && (
    <div data-screen-label="Reseña · lo que importa" className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("LO QUE IMPORTA EN LA COMIDA", "WHAT MATTERS IN FOOD")}</span><span className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/[.42]">{E2("OPCIONAL", "OPTIONAL")}</span></div>
      <div className="mt-0.5 flex flex-col">
        {grupos.map((g) => (
          <div key={g.key} className="border-b border-ink/[.06] py-[13px]">
            <div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50">{g.k}</div>
            <div className="mt-[9px] flex flex-wrap gap-[7px]">
              {g.opts.map(([v, l]) => <Chip key={String(v)} variant={ans[g.key] === v ? "selected" : "filter"} onClick={() => setAns((a) => ({ ...a, [g.key]: a[g.key] === v ? undefined : v }))}>{l}</Chip>)}
            </div>
          </div>
        ))}
      </div>
      {tm.length > 0 && (
        <div className="mt-[13px] rounded-[14px] border border-ink/[.06] bg-paper px-3.5 py-[13px]">
          <div className="flex items-center gap-[7px] font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/50"><Icon name="lock" size={12} color="rgba(11,14,18,.5)" />{dl ? E2("HORA DE ENTREGA · DATO DEL PEDIDO", "DELIVERY TIME · FROM THE ORDER") : E2("PICKUP · DATO DEL PEDIDO", "PICKUP · FROM THE ORDER")}</div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {tm.map((x) => <div key={x.k} className="min-w-0"><div className="font-mono text-[9px] font-bold tracking-[0.12em] text-ink/45">{x.k}</div><div className="mt-1 text-[13.5px] font-bold leading-[1.3]" style={{ color: x.fg }}>{x.v}</div></div>)}
          </div>
          <div className="mt-[9px] text-pretty text-[11.5px] font-medium leading-[1.45] text-ink/55">{E2("Sale de la hora prometida y la hora real del pedido. No se edita.", "Taken from the promised and actual order times. It cannot be edited.")}</div>
        </div>
      )}
    </div>
  );
  const recs = b.food && d.pool.length > 0 && (
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("¿QUÉ RECOMIENDAS?", "WHAT DO YOU RECOMMEND?")}</span><span className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/[.42]">{E2("OPCIONAL", "OPTIONAL")}</span></div>
      <div className="mt-[5px] text-[12px] font-medium leading-[1.45] text-ink/55">{E2('Sale en tu reseña y en "Los más recomendados".', 'Shows in your review and in "Most recommended".')}</div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {d.pool.map((p) => { const on = recSel.includes(p.id); return <Chip key={p.id} variant={on ? "selected" : "filter"} onClick={() => setRec(on ? recSel.filter((z) => z !== p.id) : [...recSel, p.id])}>{es ? p.name.es : p.name.en || p.name.es}</Chip>; })}
      </div>
    </div>
  );
  const texto = (
    <div data-screen-label="Reseña · texto" className={caja}>
      <div className="flex justify-between gap-2.5">
        <span className={K}>{E2(`CUÉNTALE A ${b.ciudad.toUpperCase()}`, `TELL ${b.ciudad.toUpperCase()}`)}</span>
        <span className="font-mono text-[9.5px] font-semibold" style={{ color: len < 20 ? "rgba(11,14,18,.42)" : "var(--tl-open-text)" }}>{len < 20 ? `${len} / 20 MÍN.` : `${len} / 1000`}</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={5} aria-label={E2("Tu reseña", "Your review")} placeholder={E2("Qué pediste, cómo llegó, si volverías…", "What you ordered, how it arrived, whether you would go back…")}
        className="mt-2.5 w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-3 text-[13.5px] font-medium leading-[1.55] text-ink outline-none" />
      {pii && (
        <div className="mt-[9px] flex items-start gap-2">
          <span className="grid flex-none pt-px"><Icon name="warning" size={14} color="var(--tl-danger)" /></span>
          <span className="text-[12px] font-semibold leading-[1.45] text-danger">{E2("Quita teléfonos y correos: por seguridad, la reseña no se publica con ellos.", "Remove phones and emails: for safety, reviews cannot include them.")}</span>
        </div>
      )}
    </div>
  );
  const fotosB = (
    <div className={caja}>
      <div className="flex justify-between gap-2.5"><span className={K}>{E2("FOTOS · OPCIONAL", "PHOTOS · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{fotos.length} / 6</span></div>
      <div className="mt-[11px] flex flex-wrap gap-2">
        {fotos.map((p) => (
          <div key={p.id} className="relative size-[76px] rounded-xl bg-photo-bg" style={{ backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <button type="button" aria-label={E2("Quitar foto", "Remove photo")} onClick={() => setFotos((x) => x.filter((z) => z.id !== p.id))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-lg bg-ink/[.72]"><Icon name="close" size={11} color="var(--tl-white)" strokeWidth={2.6} /></button>
          </div>
        ))}
        {fotos.length < 6 && (
          <button type="button" disabled={subiendo} onClick={() => file.current?.click()} className="box-border flex size-[76px] flex-col items-center justify-center gap-[5px] rounded-xl border-[1.5px] border-dashed border-ink/25">
            <Icon name="image" size={18} color="rgba(11,14,18,.6)" /><span className="text-[10px] font-bold text-ink/60">{subiendo ? E2("Subiendo…", "Uploading…") : E2("Agregar", "Add")}</span>
          </button>
        )}
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      </div>
    </div>
  );
  const bajo = low && (
    <div data-screen-label="Reseña · calificación baja" className="flex items-start gap-2.5 rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-[13px]">
      <span className="grid flex-none pt-px"><Icon name="help" size={16} color="var(--tl-danger)" /></span>
      <div className="min-w-0 flex-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/80">{E2("Cuenta qué pasó, sin insultos ni datos personales. Así el negocio puede responder y los vecinos entienden.", "Say what happened, without insults or personal data. That way the business can reply and neighbors understand.")}</div>
    </div>
  );
  const reglasB = (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-ink/[.04] px-3.5 py-3">
      <span className="grid flex-none pt-px"><Icon name="lock" size={15} color="rgba(11,14,18,.6)" /></span>
      <span className="text-pretty text-[12px] font-medium leading-[1.55] text-ink/[.68]">{reglas}</span>
    </div>
  );
  const fallo = error && <div role="alert" className="rounded-[14px] bg-[rgba(192,57,43,.07)] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>;
  const boton = <Button variant="primary" block disabled={!!miss || enviando || subiendo} onClick={publicar}>{editar ? E2("Guardar cambios", "Save changes") : E2("Publicar reseña", "Post review")}</Button>;
  const nota = <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-ink/45">{miss ? `${E2("FALTA: ", "MISSING: ")}${miss}` : E2("SE PUBLICA AL INSTANTE", "POSTS INSTANTLY")}</div>;
  const cuerpo = <>{fallo}{negocio}{estrellasB}{importa}{recs}{texto}{fotosB}{bajo}{reglasB}</>;

  return (
    <div data-pantalla="APP-NEG-RESENA" className="min-h-dvh bg-paper pb-[130px] lg:px-[30px] lg:pb-[60px] lg:pt-[22px]">
      <div data-screen-label="APP-NEG-RESENA · móvil" className="lg:hidden">
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-ink/[.07] bg-white px-4 py-3">
          <button type="button" aria-label={E2("Volver", "Back")} onClick={volver} className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{title}</div><div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{meta}</div></div>
        </div>
        <div className="flex flex-col gap-3 px-4 pt-4">{cuerpo}</div>
        <div data-screen-label="Reseña · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex">{boton}</div><div className="mt-[9px]">{nota}</div>
        </div>
      </div>
      <div data-screen-label="APP-NEG-RESENA · desktop" className="mx-auto hidden max-w-[1080px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{E2("Volver", "Back")}</button>
        <div className="mt-4 font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45">{meta}</div>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.04em]">{title}</h1>
        <div className="mt-[18px] grid items-start gap-x-12 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex min-w-0 flex-col gap-3.5">{cuerpo}</div>
          <div className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[96px]">
            <div className={K}>{E2("ASÍ LA VAN A VER", "HOW OTHERS WILL SEE IT")}</div>
            <ReviewCard {...propsTarjeta(borrador, { es, negocio: b.name, preview: true })} />
            <div className="flex">{boton}</div>{nota}
          </div>
        </div>
      </div>
    </div>
  );
}
