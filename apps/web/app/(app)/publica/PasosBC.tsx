"use client";
/* Publica tu negocio v2 · paso 1 (ONB-NEG-B1 · tu negocio) y paso 2 (ONB-NEG-C1 · lo propio de tu categoría).
   Tal cual el diseño; las reglas vienen del prototipo (lib/onb/datos.ts). */
import * as UI from "@tolatino/ui";
import type { ComponentType, CSSProperties } from "react";
import { cap, F, Fl, opOf, own, TILES, X, ZERO, money, type Borrador } from "./logica";

import { tec } from "@/lib/tec";
type N = "Icon" | "Button" | "Chip" | "SearchSelect" | "OptionCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, SearchSelect, OptionCard } = UI as unknown as Record<N, ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
export const K: CSSProperties = { font: `700 10px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" };
export type UiB = { q: string; allCats: boolean; moreSubs: boolean; dupOk: boolean };
type Up = (p: Partial<Borrador> | ((d: Borrador) => Partial<Borrador>)) => void;

export function PasoB1({ d, up, ui, setUi, es, desk, dup, onClaim, toast }: {
  d: Borrador; up: Up; ui: UiB; setUi: (p: Partial<UiB>) => void; es: boolean; desk: boolean;
  dup: { id: string; name: string } | null; onClaim: () => void; toast: (t: string) => void;
}) {
  const E2 = (a: string, b: string) => (es ? a : b), q = ui.q || "", kc = d.cat ? X.cat(d.cat) : null;
  const res: { cat: string; sub: string; en: string }[] = q.trim().length >= 2 ? X.search(q).filter((r: { sub?: string }) => r.sub && r.sub.length < 60 && !/\*\*/.test(r.sub)) : [];
  const setCat = (c: string) => { if (c !== d.cat) up({ cat: c, subs: [], own: {}, sel: {}, cust: [], op: null, days: null, tpl: null, cita: false, join: null, joinName: "", via: "list" }); setUi({ allCats: false, moreSubs: false, q: "" }); };
  const togSub = (sub: string) => { const S = d.subs || []; if (S.includes(sub)) return up({ subs: S.filter((x) => x !== sub), sel: {} }); if (S.length >= 3) return toast(E2("Hasta 3. Quita una para cambiarla.", "Up to 3. Remove one to change it.")); up({ subs: S.concat([sub]), sel: {} }); };
  const inT = TILES.some((t) => t[0] === d.cat);
  const tile = (code: string | null, l: string, ic: string, onClick: () => void, on: boolean, soft = false) => (
    <div key={l} role="button" onClick={onClick} {...tec(onClick)} style={{ height: 76, boxSizing: "border-box", minWidth: 0, borderRadius: 16, background: on ? "var(--tl-ink)" : soft ? "rgba(75,55,245,.08)" : "var(--tl-white)", color: on ? "var(--tl-white)" : soft ? "var(--tl-action)" : "var(--tl-ink)", border: `1px solid ${on ? "var(--tl-ink)" : soft ? "rgba(75,55,245,.35)" : "rgba(11,14,18,.1)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer" }}>
      <Icon name={ic} size={22} color={on ? "var(--tl-white)" : soft ? "var(--tl-action)" : "var(--tl-ink)"} />
      <span style={{ maxWidth: "100%", padding: "0 4px", boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "700 11.5px Manrope,sans-serif" }}>{l}</span>
    </div>
  );
  const top: string[][] = d.cat ? Fl.top(d.cat) : [], names = top.map((t) => t[2]);
  const extra = (d.subs || []).filter((x) => !names.includes(x)).map((x) => Fl.subsOf(d.cat).find((z: string[]) => z[2] === x) || [x, x, x]);
  return (
    <div data-screen-label="ONB-NEG-B1 · tu negocio" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "oFade .2s ease-out" }}>
      <div style={{ height: 48, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${q ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}`, background: "var(--tl-white)", display: "flex", alignItems: "center", gap: 10, padding: "0 8px 0 14px" }}>
        <Icon name="search" size={18} color="rgba(11,14,18,.45)" />
        <input value={q} onChange={(e) => setUi({ q: e.target.value.slice(0, 40) })} placeholder={E2("Barbería, taller, panadería…", "Barbershop, auto shop, bakery…")} aria-label={E2("¿Qué haces?", "What do you do?")} style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "none", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)" }} />
        {q ? <span role="button" aria-label={E2("Borrar", "Clear")} onClick={() => setUi({ q: "" })} {...tec(() => setUi({ q: "" }))} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(11,14,18,.06)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={13} /></span> : null}
      </div>
      {res.length ? (
        <div style={{ display: "flex", flexDirection: "column", borderRadius: 16, border: "1px solid rgba(11,14,18,.1)", overflow: "hidden" }}>
          {res.map((r, i) => { const kk = X.cat(r.cat); return (
            <div key={i} role="button" className="hover:bg-[var(--tl-paper)]" onClick={() => { setCat(r.cat); const S = d.cat === r.cat ? d.subs || [] : []; up({ subs: S.includes(r.sub) ? S : S.concat([r.sub]).slice(-3) }); }} {...tec(() => { setCat(r.cat); const S = d.cat === r.cat ? d.subs || [] : []; up({ subs: S.includes(r.sub) ? S : S.concat([r.sub]).slice(-3) }); })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid rgba(11,14,18,.07)" : "none", cursor: "pointer" }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={kk ? kk[3] : "grid"} size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{es ? cap(r.sub) : r.en}</div><div style={{ marginTop: 2, font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>{(kk ? (es ? kk[1] : kk[2]) : "").toUpperCase()}</div></div>
              <Icon name="chevronRight" size={15} color="rgba(11,14,18,.4)" />
            </div>); })}
        </div>
      ) : null}
      {q.trim().length >= 2 && !res.length ? <div style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("No lo encontramos. Elige tu categoría abajo y busca lo que haces en «Otra».", "We could not find it. Pick your category below and look under “Other”.")}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 9 }}>
        {TILES.map((t) => tile(t[0], es ? t[1] : t[2], t[3], () => setCat(t[0]), d.cat === t[0]))}
        {tile(null, ui.allCats ? E2("Menos", "Less") : E2("Todas", "All"), "grid", () => setUi({ allCats: !ui.allCats }), false, !inT && !!d.cat)}
      </div>
      {ui.allCats ? (
        <div style={{ display: "grid", gridTemplateColumns: desk ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: 6 }}>
          {(X.CATS as string[][]).map((k) => { const on = d.cat === k[0]; return (
            <div key={k[0]} role="button" onClick={() => setCat(k[0]!)} {...tec(() => setCat(k[0]!))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 13, background: on ? "var(--tl-ink)" : "var(--tl-white)", color: on ? "var(--tl-white)" : "var(--tl-ink)", border: `1px solid ${on ? "var(--tl-ink)" : "rgba(11,14,18,.1)"}`, cursor: "pointer", minWidth: 0 }}>
              <Icon name={k[3]} size={17} color={on ? "var(--tl-white)" : "var(--tl-ink)"} /><span style={{ minWidth: 0, font: "700 13px/1.3 Manrope,sans-serif" }}>{es ? k[1] : k[2]}</span>
            </div>); })}
        </div>
      ) : null}
      {d.cat ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, font: `700 10px ${MONO}`, letterSpacing: ".14em" }}>
              <span style={{ color: "rgba(11,14,18,.5)" }}>{((kc ? (es ? kc[1] : kc[2]) : "") + E2(" · ¿QUÉ HACES?", " · WHAT DO YOU DO?")).toUpperCase()}</span>
              <span style={{ flex: "none", color: (d.subs || []).length ? "var(--tl-action)" : "rgba(11,14,18,.42)" }}>{(d.subs || []).length ? (d.subs || []).length + E2(" DE 3", " OF 3") : E2("HASTA 3", "UP TO 3")}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {extra.concat(top).map((t: string[]) => <Chip key={t[2]} variant={(d.subs || []).includes(t[2]!) ? "selected" : "filter"} onClick={() => togSub(t[2]!)}>{es ? t[0] : t[1]}</Chip>)}
              <span role="button" onClick={() => setUi({ moreSubs: !ui.moreSubs })} {...tec(() => setUi({ moreSubs: !ui.moreSubs }))} style={{ height: 34, boxSizing: "border-box", padding: "0 13px", borderRadius: 999, border: "1.5px dashed rgba(75,55,245,.45)", color: "var(--tl-action)", display: "flex", alignItems: "center", gap: 5, font: "700 13px Manrope,sans-serif", cursor: "pointer" }}>{E2("Otra", "Other")}<Icon name="chevronDown" size={13} color="var(--tl-action)" /></span>
            </div>
            {ui.moreSubs ? <SearchSelect items={Fl.subsOf(d.cat).map((t: string[]) => ({ k: t[2], l: es ? t[0] : t[1] }))} value={(d.subs || [])[(d.subs || []).length - 1] || ""} onPick={(v: string) => { togSub(v); setUi({ moreSubs: false }); }} placeholder={E2("Busca lo que haces", "Search what you do")} empty={E2("No está en la lista. Elige la más parecida.", "Not on the list. Pick the closest one.")} maxHeight={264} /> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={K}>{E2("EL NOMBRE DE TU NEGOCIO", "YOUR BUSINESS NAME")}</span>
            <input value={d.name || ""} onChange={(e) => { up({ name: e.target.value.slice(0, 48) }); if (ui.dupOk) setUi({ dupOk: false }); }} placeholder={E2("Ej.: Barbería Don Fello", "E.g. Barbería Don Fello")} autoComplete="organization" aria-label={E2("Nombre del negocio", "Business name")} style={{ height: 52, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${(d.name || "").trim().length >= 2 ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}`, background: "var(--tl-white)", padding: "0 14px", outline: "none", font: "700 16px Manrope,sans-serif", color: "var(--tl-ink)", width: "100%" }} />
            <span style={{ font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Así sale en la búsqueda y en tu página.", "This is how it shows in search and on your page.")}</span>
          </div>
          {dup && !ui.dupOk ? (
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,176,32,.13)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ font: "700 13.5px/1.45 Manrope,sans-serif" }}>{E2(`Ya hay un «${dup.name}» en To’Latino. ¿Es tuyo?`, `There is already a “${dup.name}” on To’Latino. Is it yours?`)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={onClaim}>{E2("Es mío · recuperarlo", "It’s mine · claim it")}</Button>
                <Button variant="ghost" size="sm" onClick={() => setUi({ dupOk: true })}>{E2("Es otro negocio", "It’s a different one")}</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PasoC1({ d, up, es }: { d: Borrador; up: Up; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), f = F(d), o = own(d), op = opOf(d);
  if (!f) return null;
  const setOwn = (k: string, v: unknown) => up((z) => ({ own: { ...z.own, [k]: v } }));
  const lk = f.own.link, rento = op === "rento";
  return (
    <div data-screen-label="ONB-NEG-C1 · lo propio de tu categoría" style={{ display: "flex", flexDirection: "column", gap: 20, animation: "oFade .2s ease-out" }}>
      {f.own.qs.filter((q: { k: string }) => Fl.visible(q, o, d)).map((q: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const v = o[q.k], t = q.t ? E2(q.t[0], q.t[1]) : "", sx = q.s ? E2(q.s[0], q.s[1]) : "", arr = Array.isArray(v) ? (v as string[]) : [];
        const w = q.warn ? q.warn(o) : null;
        return (
          <div key={q.k} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(q.type === "chips" || q.type === "one") && t ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, font: `700 10px ${MONO}`, letterSpacing: ".14em" }}>
                <span style={{ color: "rgba(11,14,18,.5)" }}>{t}</span>
                <span style={{ flex: "none", color: "var(--tl-action)" }}>{q.type === "chips" && arr.length ? arr.length + (es ? (arr.length === 1 ? " ELEGIDO" : " ELEGIDOS") : " PICKED") : ""}</span>
              </div>
            ) : null}
            {q.type === "opt" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {q.opts.map((x: { v: string; icon: string; t: string[]; s: string[] }) => <OptionCard key={x.v} icon={x.icon} title={E2(x.t[0]!, x.t[1]!)} sub={E2(x.s[0]!, x.s[1]!)} on={v === x.v} onClick={() => { setOwn(q.k, x.v); if (d.cat === "NEG-BELL" && d.op === "rento") up({ op: null }); }} />)}
              </div>
            ) : null}
            {q.type === "chips" || q.type === "one" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {q.opts.map((x: { v: string; l: string[] }) => { const on = q.type === "one" ? v === x.v : arr.includes(x.v); return (
                  <Chip key={x.v} variant={on ? "selected" : "filter"} onClick={() => { if (q.type === "one") return setOwn(q.k, x.v); let nx = on ? arr.filter((y) => y !== x.v) : arr.concat([x.v]); if (q.excl) nx = x.v === q.excl && !on ? [q.excl] : nx.filter((y) => y !== q.excl); setOwn(q.k, nx); }}>{E2(x.l[0]!, x.l[1]!)}</Chip>); })}
              </div>
            ) : null}
            {q.towns && Fl.TOWNS[v as string] ? <div style={{ font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(Fl.TOWNS[v as string][0], Fl.TOWNS[v as string][1])}.</div> : null}
            {q.type === "num" || q.type === "money" ? (() => { const n = Number(v) || 0, stp = q.step || 1, mn = q.min || 0, mx = q.max || 99; return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--tl-paper)" }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{t}</div>{sx ? <div style={{ marginTop: 3, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{sx}</div> : null}</div>
                <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 2, height: 40, padding: "0 4px", borderRadius: 13, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.12)" }}>
                  <span role="button" aria-label="−" onClick={() => setOwn(q.k, Math.max(mn, Math.round((n - stp) * 100) / 100))} {...tec(() => setOwn(q.k, Math.max(mn, Math.round((n - stp) * 100) / 100)))} style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer", opacity: n <= mn ? 0.3 : 1 }}><Icon name="minus" size={15} /></span>
                  <span style={{ minWidth: 58, textAlign: "center", font: "800 15px Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>{n === 0 && ZERO[q.k] ? E2(ZERO[q.k]![0], ZERO[q.k]![1]) : q.type === "money" ? money(n) : String(n)}</span>
                  <span role="button" aria-label="+" onClick={() => setOwn(q.k, Math.min(mx, Math.round((n + stp) * 100) / 100))} {...tec(() => setOwn(q.k, Math.min(mx, Math.round((n + stp) * 100) / 100)))} style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer", opacity: n >= mx ? 0.3 : 1 }}><Icon name="plus" size={15} /></span>
                </div>
              </div>); })() : null}
            {q.type === "yn" ? (
              <div role="switch" aria-checked={!!v} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOwn(q.k, !v); } }} onClick={() => setOwn(q.k, !v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(11,14,18,.1)", cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{t}</div>{sx ? <div style={{ marginTop: 3, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{sx}</div> : null}</div>
                <span style={{ width: 42, height: 26, boxSizing: "border-box", borderRadius: 99, padding: 3, background: v ? "var(--tl-ink)" : "rgba(11,14,18,.15)", display: "flex", justifyContent: v ? "flex-end" : "flex-start", flex: "none" }}><span style={{ width: 20, height: 20, borderRadius: 99, background: "var(--tl-white)", boxShadow: "0 1px 2px rgba(11,14,18,.2)" }} /></span>
              </div>
            ) : null}
            {w ? <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", borderRadius: 14, background: "rgba(255,176,32,.13)" }}><Icon name="info" size={16} color="var(--tl-pro-ink)" /><span style={{ font: "600 12.5px/1.45 Manrope,sans-serif" }}>{E2(w[0], w[1])}</span></div> : null}
          </div>
        );
      })}
      {lk ? (
        <div role="button" onClick={() => rento ? up({ op: null, join: null, joinName: "" }) : up((z) => ({ op: "rento", own: { ...z.own, team: "solo" } }))} {...tec(() => rento ? up({ op: null, join: null, joinName: "" }) : up((z) => ({ op: "rento", own: { ...z.own, team: "solo" } })))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, border: `1.5px dashed ${rento ? "var(--tl-action)" : "rgba(75,55,245,.35)"}`, background: rento ? "rgba(75,55,245,.06)" : "var(--tl-white)", cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="key" size={17} color="var(--tl-action)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{rento ? E2("Rentas silla en otro negocio", "You rent a chair elsewhere") : E2(lk.t[0], lk.t[1])}</div>
            <div style={{ marginTop: 2, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{rento ? E2("En el paso 4 eliges el local.", "You pick the shop in step 4.") : E2(lk.s[0], lk.s[1])}</div>
          </div>
          <span style={{ flex: "none", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)" }}>{rento ? E2("Deshacer", "Undo") : E2("Es mi caso", "That's me")}</span>
        </div>
      ) : null}
    </div>
  );
}
