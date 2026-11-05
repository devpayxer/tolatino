"use client";
/* APP-NEG-LICENCIA · «¿Puede hacerlo por ley?» (To'Latino Licencia.dc.html, plantilla L18-60, lógica L62-100), portada
   1:1 con tokens. Pública: lo que la licencia permite, lo que no, quién la emitió, el estado real y el enlace al
   registro oficial (del catálogo, nunca del dueño). */
import * as UI from "@tolatino/ui";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import type { LicFila } from "@/lib/licencias";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = UI.Icon as ComponentType<any>;
const MONO = "'JetBrains Mono',monospace";
const MES = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const fecha = (iso: string | null, es: boolean) => { if (!iso) return "—"; const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso); return es ? `${d.getDate()} ${MES[d.getMonth()]![0]} ${d.getFullYear()}` : `${MES[d.getMonth()]![1]} ${d.getDate()}, ${d.getFullYear()}`; };

export function Licencia({ l, lang }: { l: { id: string; nombre: string; cant: string | null; licencias: LicFila[] }; lang: "es" | "en" }) {
  const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const [desk, setDesk] = useState(false);
  useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setDesk(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const lay = desk ? { max: "760px", pad: "28px 32px 70px", h1: 32 } : { max: "100%", pad: "16px 16px 0", h1: 26 };
  const bizK = l.nombre.toUpperCase(), L = (x: { es: string; en: string } | null) => (x ? x[lang] || x.es : "");
  const k = { font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "var(--tl-text-muted)" } as const;
  return (
    <div data-screen-label={`APP-NEG-LICENCIA · ${l.id} · ${desk ? "desktop" : "móvil"}`} style={{ background: "var(--tl-paper)", color: "var(--tl-ink)", font: "500 14px Manrope,sans-serif", minHeight: "100dvh" }}>
      {!desk ? (
        <div style={{ position: "sticky", top: 0, zIndex: 20, padding: "12px 16px", background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/n/${l.id}`} role="button" aria-label={E2("Volver", "Back")} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none", color: "var(--tl-ink)" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Licencia", "License")}</div>
            <div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "var(--tl-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bizK}</div>
          </div>
        </div>
      ) : null}
      <div style={{ maxWidth: lay.max, margin: "0 auto", padding: lay.pad, display: "flex", flexDirection: "column", gap: 14 }}>
        {desk ? <Link href={`/n/${l.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)" }}><Icon name="chevronLeft" size={15} strokeWidth={2} />{E2("Volver a la ficha", "Back to the page")}</Link> : null}
        <div>
          <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.45)" }}>{bizK}</div>
          <h1 style={{ margin: "6px 0 0", font: `800 ${lay.h1}px/1.08 Sora,sans-serif`, letterSpacing: "-.04em", textWrap: "balance" }}>{E2("¿Puede hacerlo por ley?", "Are they allowed by law?")}</h1>
          <p style={{ margin: "8px 0 0", font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.65)" }}>{E2("Lo que su licencia le permite, quién la emitió y cómo la verificas tú mismo.", "What their license allows, who issued it and how to check it yourself.")}</p>
        </div>
        <div data-screen-label="Licencia · línea fija" style={{ padding: "16px 18px", borderRadius: 18, background: "var(--tl-ink)", color: "var(--tl-white)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ font: "800 17px/1.25 Sora,sans-serif" }}>{E2("Nadie te garantiza un resultado.", "No one can guarantee you a result.")}</div>
          <div style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(255,255,255,.75)" }}>{E2("Si alguien te promete que aprueban tu caso o que te devuelven más impuestos, desconfía. La licencia dice lo que puede hacer, no cómo va a salir.", "If someone promises your case will be approved or a bigger tax refund, be wary. A license says what they can do, not how it will turn out.")}</div>
        </div>
        {l.licencias.map((c, i) => {
          const st = c.status === "valid" ? { ic: "verified", bg: "var(--tl-action)", fg: "var(--tl-open-text)", ok: `${E2("VERIFICADA POR TO’LATINO", "VERIFIED BY TO’LATINO")} · ${fecha(c.checked, es).toUpperCase()}`, l: E2("Activa · sin sanciones", "Active · no sanctions") }
            : c.status === "review" ? { ic: "clock", bg: "var(--tl-pro-ink)", fg: "var(--tl-pro-ink)", ok: E2("POR VERIFICAR · TO’LATINO LA REVISA EN 72 H", "PENDING · TO’LATINO CHECKS IT WITHIN 72 H"), l: E2("En revisión", "Under review") }
            : c.status === "expired" ? { ic: "warning", bg: "var(--tl-danger)", fg: "var(--tl-danger)", ok: E2("VENCIDA · TO’LATINO LA REVISA", "EXPIRED · TO’LATINO IS CHECKING"), l: E2("Vencida según el registro", "Expired per the registry") }
            : { ic: "warning", bg: "var(--tl-danger)", fg: "var(--tl-danger)", ok: E2("NO SE PUDO VERIFICAR · PREGÚNTALE AL NEGOCIO", "COULD NOT BE VERIFIED · ASK THE BUSINESS"), l: E2("No aparece en el registro", "Not found in the registry") };
          const no = [i === 0 ? l.cant : null, L(c.cannot) || null].filter(Boolean).map((x) => (/[.!?]$/.test(x!) ? x : `${x}.`)).join(" ");
          const filas: [string, string][] = [[E2("EMITIDA POR", "ISSUED BY"), L(c.issuer)], [E2("NÚMERO", "NUMBER"), c.number ? `${c.label} ${c.number}` : "—"], [E2("ESTADO", "STATUS"), st.l], [E2("PRÓXIMA REVISIÓN", "NEXT CHECK"), c.status === "valid" ? fecha(c.next, es) : "—"]];
          return (
            <div key={c.id} data-screen-label="Licencia · tarjeta" style={{ padding: 16, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.07)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 13, background: st.bg, display: "grid", placeItems: "center", flex: "none" }}><Icon name={st.ic} size={20} strokeWidth={2.2} color="var(--tl-white)" /></span>
                <div style={{ minWidth: 0 }}><div style={{ font: "800 16px/1.25 Sora,sans-serif" }}>{L(c.title)}</div><div style={{ marginTop: 3, font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: st.fg }}>{st.ok}</div></div>
              </div>
              <div><div style={k}>{E2("LO QUE PUEDE HACER", "WHAT THEY CAN DO")}</div><div style={{ marginTop: 6, font: "500 13.5px/1.55 Manrope,sans-serif" }}>{L(c.can)}</div></div>
              {no ? <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,176,32,.14)" }}><div style={{ ...k, color: "var(--tl-pro-ink)" }}>{E2("LO QUE NO PUEDE", "WHAT THEY CANNOT DO")}</div><div style={{ marginTop: 6, font: "600 13.5px/1.5 Manrope,sans-serif", color: "var(--tl-ink)" }}>{no}</div></div> : null}
              <div>{filas.map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(11,14,18,.06)" }}><span style={{ font: `700 10px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-text-muted)" }}>{a}</span><span style={{ font: "600 13px/1.4 Manrope,sans-serif", textAlign: "right" }}>{b}</span></div>)}</div>
              <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", color: "var(--tl-ink)", textDecoration: "none" }}>
                <span style={{ minWidth: 0 }}><span style={{ display: "block", font: "700 13.5px Manrope,sans-serif" }}>{E2("Verifícala tú en el registro oficial", "Check it yourself in the official registry")}</span><span style={{ display: "block", marginTop: 3, font: `600 10px ${MONO}`, color: "var(--tl-action)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.site}</span></span>
                <Icon name="chevronRight" size={16} strokeWidth={2} />
              </a>
            </div>
          );
        })}
        <div style={{ marginBottom: 24 }}>
          <div style={k}>{E2("CÓMO LA VERIFICAMOS", "HOW WE VERIFY IT")}</div>
          {[E2("Al publicar, revisamos el número en el registro oficial que la emite.", "When they list, we check the number in the official registry that issues it."),
            E2("La volvemos a revisar cada 3 meses. Si vence o tiene una sanción, la quitamos de su ficha.", "We check again every 3 months. If it expires or is sanctioned, we take it off their page."),
            E2("Cada persona tiene su propia licencia: mira quién te va a atender.", "Each person has their own license: check who will help you.")].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginTop: 10 }}><span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--tl-ink)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: `800 10px ${MONO}`, flex: "none" }}>{i + 1}</span><span style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.75)" }}>{t}</span></div>))}
        </div>
      </div>
    </div>
  );
}
