"use client";
/* APP-NEG-RECOMENDAR (diseño «To'Latino Recomendar»): el negocio (nombre, categoría, dónde o sin local), su contacto
   (opcional), tú (cómo lo conoces, por qué, si decirle que fuiste tú) y la recomendación enviada. El borrador se guarda
   en este teléfono hasta enviarla; enviarla pide entrar. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { enviarRecomendacion } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;

export type VistaRec = {
  lang: "es" | "en"; ciudad: { id: string; n: string }; cat: string | null; q: string;
  cats: { id: string; l: string }[]; yo: { nombre: string; primero: string } | null;
};
type F = { name: string; cat: string | null; where: string; casa: boolean; con: string; know: string | null; why: string; show: boolean };
const F0: F = { name: "", cat: null, where: "", casa: false, con: "", know: null, why: "", show: true };
const DK = "tl-rec-borrador";
const MONO = "'JetBrains Mono',monospace";
const K: CSSProperties = { font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.42)" };
const caja: CSSProperties = { padding: 16, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)", display: "flex", flexDirection: "column" };
const entrada: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)", outline: "none", background: "var(--tl-white)", boxSizing: "border-box", width: "100%" };

function useAncho() {
  const [w, setW] = useState(0);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}
function Interruptor({ on }: { on: boolean }) {
  return (
    <span style={{ flex: "none", width: 42, height: 24, borderRadius: 99, background: on ? "var(--tl-ink)" : "rgba(11,14,18,.18)", position: "relative" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 99, background: "var(--tl-white)", boxShadow: "0 1px 3px rgba(11,14,18,.25)" }} />
    </span>
  );
}

export function Recomendar({ v }: { v: VistaRec }) {
  const es = v.lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname(), sp = useSearchParams();
  const dw = useAncho(), D = dw >= 1024;
  const [f, setF] = useState<F>(F0);
  const [tried, setTried] = useState(false), [enviando, setEnviando] = useState(false), [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | { name: string; cat: string | null; where: string; casa: boolean; con: string; show: boolean; at: string; ciudad: string }>(null);

  // Borrador de este teléfono (el prototipo hace lo mismo); la categoría de donde vienes si no habías elegido una.
  useEffect(() => {
    let b: Partial<F> = {};
    try { b = JSON.parse(localStorage.getItem(DK) ?? "{}") ?? {}; } catch { /* sin almacenamiento */ }
    setF({ ...F0, ...b, cat: b.cat ?? v.cat ?? null });
  }, [v.cat]);
  const up = (o: Partial<F>) => setF((x) => { const n = { ...x, ...o }; try { localStorage.setItem(DK, JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; });

  const city = v.ciudad.n, who = v.yo ? v.yo.nombre : E2("Un vecino", "A neighbor");
  const faltan = () => {
    const m: string[] = [];
    if (f.name.trim().length < 2) m.push(E2("Escribe el nombre del negocio", "Enter the business name"));
    if (!f.cat) m.push(E2("Elige la categoría", "Pick the category"));
    if (!f.casa && f.where.trim().length < 3) m.push(E2("Dinos dónde está, o marca que no tiene local", "Tell us where it is, or mark it has no storefront"));
    if (!f.know) m.push(E2("Dinos cómo lo conoces", "Tell us how you know it"));
    return m;
  };
  const miss = tried ? faltan() : [];
  const enviar = async () => {
    if (faltan().length) { setTried(true); return; }
    if (!v.yo) { router.push(`/entrar?volver=${encodeURIComponent(sp.size ? `${ruta}?${sp}` : ruta)}`); return; }
    setEnviando(true); setError(null);
    const r = await enviarRecomendacion({ ciudad: v.ciudad.id, ...f });
    setEnviando(false);
    if (r.ok) {
      setSent({ name: r.name, cat: f.cat, where: f.where.trim(), casa: f.casa, con: f.con.trim(), show: f.show, at: r.at, ciudad: r.ciudad });
      setF(F0); setTried(false); try { localStorage.removeItem(DK); } catch { /* sin almacenamiento */ }
      window.scrollTo(0, 0);
    } else if (r.error === "entrar") router.push(`/entrar?volver=${encodeURIComponent(ruta)}`);
    else setError(r.error === "repetida" ? E2("Ya recomendaste este negocio. Te avisamos cuando publique.", "You already recommended this business. We will tell you when it joins.")
      : r.error === "muchas" ? E2("Ya mandaste muchas recomendaciones hoy. Prueba mañana.", "You sent many recommendations today. Try tomorrow.")
      : E2("No se pudo enviar. Prueba otra vez.", "Couldn’t send. Try again."));
  };
  const atras = () => { if (window.history.length > 1) router.back(); else router.push("/"); };

  const nm = f.name.trim() || E2("tu negocio", "your business");
  const quien = f.show && v.yo ? v.yo.nombre : E2("un vecino", "a neighbor");
  const sms = E2(`Hola, ${quien} recomendó ${nm} en To'Latino${f.why.trim() ? `: «${f.why.trim()}»` : "."} Publicar es gratis: tolatino.com/publica`,
    `Hi, ${quien} recommended ${nm} on To'Latino${f.why.trim() ? `: "${f.why.trim()}"` : "."} Listing is free: tolatino.com/publica`);
  const how = [
    E2(`Lo buscamos y revisamos que exista y esté en ${city}.`, `We look it up and check it exists and is in ${city}.`),
    E2("Si dejaste su teléfono, le mandamos un SMS de tu parte, una sola vez. Publicar es gratis para el negocio.", "If you left their phone, we text them once on your behalf. Listing is free for the business."),
    E2("Nada se publica sin que el negocio diga que sí. Te avisamos cuando publique.", "Nothing goes live until the business says yes. We tell you when it does."),
  ];
  const catL = (id: string | null) => v.cats.find((c) => c.id === id)?.l ?? "—";
  const knows = [["cli", E2("Soy cliente", "I’m a customer")], ["fam", E2("Es de un familiar o amigo", "A friend or family member’s")], ["mio", E2("Es mío", "It’s mine")]] as const;
  const ctaL = v.yo ? E2("Enviar recomendación", "Send recommendation") : E2("Entra para enviar", "Sign in to send");
  const lay = D ? { max: "1080px", pad: "28px 32px 70px", cols: "minmax(0,1fr) 360px", gap: "28px 48px", h1: 32 } : { max: "100%", pad: "16px 16px 0", cols: "minmax(0,1fr)", gap: "14px", h1: 26 };
  const cityK = `${E2("EN ", "IN ")}${city}`.toUpperCase();

  const comoFunciona = (
    <div style={{ ...caja, gap: 10 }}>
      <span style={K}>{E2("CÓMO FUNCIONA", "HOW IT WORKS")}</span>
      {how.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ flex: "none", width: 22, height: 22, borderRadius: 99, background: "var(--tl-ink)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: `800 10px ${MONO}` }}>{i + 1}</span>
          <span style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.75)" }}>{t}</span>
        </div>
      ))}
    </div>
  );
  const boton = <Button variant="primary" size="lg" block disabled={enviando} onClick={enviar}>{ctaL}</Button>;

  if (!dw) return <div style={{ minHeight: 600, background: "var(--tl-paper)" }} />;
  return (
    <div data-screen-label={`APP-NEG-RECOMENDAR${sent ? " · enviada" : ""}${D ? " · desktop" : " · móvil"}`} style={{ minHeight: "100%", background: "var(--tl-paper)", color: "var(--tl-ink)", fontFamily: "Manrope,sans-serif" }}>
      <style>{"@keyframes rPop{from{transform:scale(.96);opacity:0}to{transform:none;opacity:1}}"}</style>
      {!D ? (
        <div style={{ padding: "12px 16px", background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <span role="button" aria-label={E2("Volver", "Back")} onClick={atras} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Recomienda un negocio", "Recommend a business")}</div>
            <div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{cityK}</div>
          </div>
        </div>
      ) : null}
      <div style={{ maxWidth: lay.max, margin: "0 auto", padding: lay.pad, display: "grid", gridTemplateColumns: lay.cols, gap: lay.gap, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {D ? <div role="button" onClick={atras} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="chevronLeft" size={15} strokeWidth={2} />{E2("Volver", "Back")}</div> : null}

          {!sent ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={K}>{cityK}</span>
                <h1 style={{ margin: 0, font: `800 ${lay.h1}px/1.08 Sora,sans-serif`, letterSpacing: "-.04em", textWrap: "balance" } as CSSProperties}>{E2("¿Conoces un negocio que no está aquí?", "Know a business that isn’t here?")}</h1>
                <p style={{ margin: 0, font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.65)", textWrap: "pretty" } as CSSProperties}>{E2("Cuéntanos cuál es y le escribimos de tu parte para que publique gratis.", "Tell us which one and we will reach out on your behalf so it can list for free.")}</p>
                {v.q ? <div style={{ alignSelf: "flex-start", padding: "7px 11px", borderRadius: 10, background: "rgba(75,55,245,.08)", color: "var(--tl-action-ink-2)", font: "700 12px Manrope,sans-serif" }}>{E2("Buscabas: ", "You searched: ")}{v.q}</div> : null}
              </div>

              <div data-screen-label="Recomendar · el negocio" style={{ ...caja, gap: 14 }}>
                <span style={K}>{E2("EL NEGOCIO", "THE BUSINESS")}</span>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("¿Cómo se llama?", "What is it called?")}</span>
                  <input value={f.name} onChange={(e) => up({ name: e.target.value.slice(0, 80) })} placeholder={E2("Ej.: Pica Pollo La Vieja Fefa", "E.g. Pica Pollo La Vieja Fefa")} style={entrada} />
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("¿Qué es?", "What is it?")}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{v.cats.map((c) => <Chip key={c.id} variant={f.cat === c.id ? "selected" : "filter"} onClick={() => up({ cat: f.cat === c.id ? null : c.id })}>{c.l}</Chip>)}</div>
                </div>
                {!f.casa ? (
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("¿Dónde está?", "Where is it?")}</span>
                    <input value={f.where} onChange={(e) => up({ where: e.target.value.slice(0, 120) })} placeholder={E2("Calle o dirección", "Street or address")} style={entrada} />
                  </label>
                ) : null}
                <div role="switch" aria-checked={f.casa} onClick={() => up({ casa: !f.casa })} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ flex: 1, minWidth: 0, font: "600 13px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.75)" }}>{E2("No tiene local: va a domicilio o trabaja desde su casa", "No storefront: goes to you or works from home")}</span>
                  <Interruptor on={f.casa} />
                </div>
              </div>

              <div data-screen-label="Recomendar · contacto" style={{ ...caja, gap: 10 }}>
                <span style={K}>{E2("SU TELÉFONO O INSTAGRAM · OPCIONAL", "THEIR PHONE OR INSTAGRAM · OPTIONAL")}</span>
                <input value={f.con} onChange={(e) => up({ con: e.target.value.slice(0, 60) })} placeholder={E2("(570) 555-0100 o @negocio", "(570) 555-0100 or @business")} aria-label={E2("Teléfono o Instagram del negocio", "Business phone or Instagram")} style={entrada} />
                <span style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Si lo dejas, le mandamos un SMS de tu parte, una sola vez. Nunca lo mostramos.", "If you leave it, we text them once on your behalf. We never show it.")}</span>
              </div>

              <div data-screen-label="Recomendar · tú" style={{ ...caja, gap: 14 }}>
                <span style={K}>{E2("TÚ", "YOU")}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ font: "700 13px Manrope,sans-serif" }}>{E2("¿Cómo lo conoces?", "How do you know it?")}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{knows.map(([k, l]) => <Chip key={k} variant={f.know === k ? "selected" : "filter"} onClick={() => up({ know: f.know === k ? null : k })}>{l}</Chip>)}</div>
                </div>
                {f.know === "mio" ? (
                  <div style={{ padding: 14, borderRadius: 15, background: "rgba(75,55,245,.07)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "700 13.5px/1.45 Manrope,sans-serif", color: "var(--tl-action-ink-2)" }}>{E2("Si es tuyo, publícalo tú mismo: es gratis y toma unos minutos.", "If it’s yours, list it yourself: it’s free and takes a few minutes.")}</span>
                    <div style={{ display: "flex" }}><Button variant="action" size="md" onClick={() => router.push("/publica")}>{E2("Publica tu negocio", "List your business")}</Button></div>
                  </div>
                ) : null}
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 10, font: "700 13px Manrope,sans-serif" }}><span>{E2("¿Por qué lo recomiendas? · Opcional", "Why do you recommend it? · Optional")}</span><span style={{ font: `600 10px ${MONO}`, color: "rgba(11,14,18,.42)" }}>{f.why.length} / 280</span></span>
                  <textarea value={f.why} onChange={(e) => up({ why: e.target.value.slice(0, 280) })} placeholder={E2("Ej.: el mejor sancocho del barrio, siempre a tiempo…", "E.g. best sancocho around, always on time…")} rows={3} style={{ padding: "12px 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", font: "500 14px/1.5 Manrope,sans-serif", color: "var(--tl-ink)", outline: "none", resize: "none", boxSizing: "border-box", width: "100%" }} />
                </label>
                <div role="switch" aria-checked={f.show} onClick={() => up({ show: !f.show })} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "700 13.5px Manrope,sans-serif" }}>{E2("Decirle que fuiste tú", "Tell them it was you")}</span>
                    <span style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{f.show ? E2(`El mensaje dice «${who} te recomendó».`, `The message says "${who} recommended you".`) : E2("El mensaje dice «un vecino te recomendó».", "The message says \"a neighbor recommended you\".")}</span>
                  </span>
                  <Interruptor on={f.show} />
                </div>
              </div>

              {!D ? comoFunciona : null}
              {miss.length ? (
                <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(11,14,18,.04)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E2("TE FALTA", "STILL NEEDED")}</span>
                  {miss.map((m) => <span key={m} style={{ font: "600 13px Manrope,sans-serif", color: "rgba(11,14,18,.7)" }}>· {m}</span>)}
                </div>
              ) : null}
              {error ? <span role="alert" style={{ font: "700 13px/1.5 Manrope,sans-serif", color: "var(--tl-danger)" }}>{error}</span> : null}
              {!D ? <div style={{ display: "flex", paddingBottom: 24 }}>{boton}</div> : null}
            </>
          ) : (
            <div data-screen-label="Recomendar · enviada" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "rPop .3s ease-out" }}>
              <span style={{ width: 54, height: 54, borderRadius: 18, background: "var(--tl-signal)", display: "grid", placeItems: "center" }}><Icon name="check" size={26} strokeWidth={2.2} /></span>
              <h1 style={{ margin: 0, font: `800 ${lay.h1}px/1.08 Sora,sans-serif`, letterSpacing: "-.04em" }}>{E2("Recomendación enviada", "Recommendation sent")}</h1>
              <p style={{ margin: 0, font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.65)" }}>{E2(`Gracias${v.yo?.primero ? `, ${v.yo.primero}` : ""}. Te avisamos cuando ${sent.name} publique en To'Latino.`, `Thanks${v.yo?.primero ? `, ${v.yo.primero}` : ""}. We will tell you when ${sent.name} joins To'Latino.`)}</p>
              <div style={{ padding: "16px 18px", borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)" }}>
                <OrderTracker steps={[
                  { label: E2("Enviada", "Sent"), time: sent.at, state: "done" },
                  { label: sent.con ? E2("Le escribimos al negocio", "We text the business") : E2("Lo buscamos nosotros", "We look it up"), time: E2("Hoy", "Today"), state: "current" },
                  { label: E2("Publicó en To'Latino", "Joined To'Latino"), time: "", state: "next" },
                ]} />
              </div>
              <div style={{ padding: "6px 16px", borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)" }}>
                {([[E2("NEGOCIO", "BUSINESS"), sent.name], [E2("CATEGORÍA", "CATEGORY"), catL(sent.cat)], [E2("DÓNDE", "WHERE"), sent.casa ? `${E2("Sin local · ", "No storefront · ")}${sent.ciudad}` : `${sent.where} · ${sent.ciudad}`], [E2("CONTACTO", "CONTACT"), sent.con || E2("No lo dejaste", "Not given")], [E2("SALE COMO", "SHOWS AS"), sent.show ? who : E2("Un vecino", "A neighbor")]] as const).map(([k, val]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "11px 0", borderBottom: "1px solid rgba(11,14,18,.06)" }}>
                    <span style={{ font: `700 10px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)", paddingTop: 2 }}>{k}</span>
                    <span style={{ font: "600 13.5px/1.4 Manrope,sans-serif", textAlign: "right", minWidth: 0 }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, paddingBottom: 24 }}>
                <Button variant="primary" size="md" block onClick={() => setSent(null)}>{E2("Recomendar otro", "Recommend another")}</Button>
                <Button variant="secondary" size="md" block onClick={atras}>{E2("Listo", "Done")}</Button>
              </div>
            </div>
          )}
        </div>

        {D ? (
          <div style={{ alignSelf: "stretch" }}>
            <div style={{ position: "sticky", top: 172, display: "flex", flexDirection: "column", gap: 14 }}>
              <div data-screen-label="Recomendar · lo que recibe" style={{ ...caja, gap: 10 }}>
                <span style={K}>{E2("LO QUE RECIBE EL NEGOCIO", "WHAT THE BUSINESS GETS")}</span>
                <div style={{ alignSelf: "flex-start", maxWidth: "100%", padding: "12px 14px", borderRadius: "16px 16px 16px 5px", background: "var(--tl-paper)", font: "500 13.5px/1.5 Manrope,sans-serif", textWrap: "pretty" } as CSSProperties}>{sms}</div>
                <span style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{E2("Solo si dejaste su teléfono. Un solo mensaje.", "Only if you left their phone. One message only.")}</span>
              </div>
              {comoFunciona}
              {!sent ? <div style={{ display: "flex" }}>{boton}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
