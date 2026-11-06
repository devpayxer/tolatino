"use client";
/* Publica tu negocio v2 · paso 3 (ONB-NEG-D1 · lo que vendes) y paso 4 (ONB-NEG-E1 · dónde y cuándo). Tal cual el diseño.
   Fuera, por ahora: «Tómale foto a tu lista: El Compa la lee» (el prototipo lo simula e inventa precios; llega con El
   Compa) y las direcciones de ejemplo del prototipo como sugerencias. */
import * as UI from "@tolatino/ui";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { anfitriones } from "./acciones";
import { ahora, DAYS, daysOf, F, fmt, Fl, metaOf, money, needZone, opOf, own, rows, status, stepOf, X, zoneOf, type Borrador, type Dia } from "./logica";
import { K } from "./PasosBC";

type N = "Icon" | "Button" | "Chip" | "OptionCard" | "SelectBox" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, OptionCard, SelectBox, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
type Up = (p: Partial<Borrador> | ((d: Borrador) => Partial<Borrador>)) => void;
const precio = (v: string) => { const t = String(v).replace(/[^\d.]/g, "").slice(0, 9); return t === "" ? 0 : t.endsWith(".") ? t : +t; };

export function PasoD1({ d, up, es }: { d: Borrador; up: Up; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [add, setAdd] = useState<{ open: boolean; n: string; p: string }>({ open: false, n: "", p: "" });
  const R = rows(d), on = R.filter((r) => r.on).length + (d.cust || []).length;
  const setRow = (key: string, patch: Record<string, unknown>) => up((z) => ({ sel: { ...z.sel, [key]: { ...(z.sel || {})[key], ...patch } } }));
  const ancho = (p: number | string) => Math.max(22, (String(money(p)).length - 1) * 9.5) + "px";
  const caja = (op: number, bd: string): CSSProperties => ({ flex: "none", display: "flex", alignItems: "center", height: 34, padding: "0 2px", borderRadius: 11, border: `1px solid ${bd}`, background: "var(--tl-white)", opacity: op });
  const boton: CSSProperties = { width: 26, height: 30, display: "grid", placeItems: "center", cursor: "pointer", color: "rgba(11,14,18,.55)" };
  const addOk = add.n.trim().length >= 2;
  return (
    <div data-screen-label="ONB-NEG-D1 · lo que vendes" style={{ display: "flex", flexDirection: "column", gap: 12, animation: "oFade .2s ease-out" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
        <span style={K}>{R.length + (d.cust || []).length}{E2(" EN LA LISTA · ", " ON THE LIST · ")}{on}{E2(on === 1 ? " MARCADO" : " MARCADOS", " CHECKED")}</span>
        {Object.keys(d.sel || {}).length ? <span role="button" onClick={() => up({ sel: {}, via: "list" })} style={{ font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Volver a la lista sugerida", "Back to the suggested list")}</span> : null}
      </div>
      <div>
        {R.map((r) => { const free = r.u === "gratis", stp = stepOf(r.p, r), op = r.on ? 1 : 0.45; return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(11,14,18,.08)" }}>
            <div role="checkbox" aria-checked={r.on} onClick={() => setRow(r.key, { on: !r.on })} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <span style={{ display: "grid", flex: "none" }}><SelectBox on={r.on} /></span>
              <div style={{ flex: 1, minWidth: 0, opacity: op }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><span style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{r.n[es ? 0 : 1]}</span>{r.flag ? <Tag tone="neutral">{E2("REVISA", "CHECK")}</Tag> : null}</div>
                <div style={{ marginTop: 3, font: `700 9px/1.45 ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{metaOf(r, true, es)}</div>
              </div>
            </div>
            {!free ? (
              <div style={caja(op, "rgba(11,14,18,.12)")}>
                <span role="button" aria-label="−" onClick={() => setRow(r.key, { p: Math.max(0, Math.round((r.p - stp) * 100) / 100), on: true, flag: false })} style={boton}><Icon name="minus" size={13} /></span>
                <span style={{ font: "800 14px Sora,sans-serif" }}>$</span>
                <input value={r.praw != null ? r.praw : String(r.p)} onChange={(e) => setRow(r.key, { p: precio(e.target.value), on: true, flag: false })} inputMode="decimal" aria-label={E2("Precio", "Price")} style={{ width: ancho(r.p), border: 0, outline: "none", background: "none", padding: 0, font: "800 14px Sora,sans-serif", letterSpacing: "-.02em", color: "var(--tl-ink)" }} />
                <span role="button" aria-label="+" onClick={() => setRow(r.key, { p: Math.round((r.p + stp) * 100) / 100, on: true, flag: false })} style={{ ...boton, color: undefined }}><Icon name="plus" size={13} /></span>
              </div>
            ) : <span style={{ flex: "none", font: "800 13px Sora,sans-serif", color: "var(--tl-open-text)", opacity: op }}>{E2("Gratis", "Free")}</span>}
          </div>); })}
        {(d.cust || []).map((x, i) => (
          <div key={"c" + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(11,14,18,.08)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "grid", flex: "none" }}><SelectBox on /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{x.n}</div><div style={{ marginTop: 3, font: `700 9px/1.45 ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{E2("AGREGADO POR TI", "ADDED BY YOU")}</div></div>
            </div>
            <div style={caja(1, "rgba(11,14,18,.12)")}>
              <span role="button" aria-label="−" onClick={() => up((z) => ({ cust: z.cust.map((y, j) => j === i ? { ...y, p: Math.max(0, (Number(y.p) || 0) - stepOf(y.p)) } : y) }))} style={boton}><Icon name="minus" size={13} /></span>
              <span style={{ font: "800 14px Sora,sans-serif" }}>$</span>
              <input value={String(x.p)} onChange={(e) => { const v = precio(e.target.value); up((z) => ({ cust: z.cust.map((y, j) => j === i ? { ...y, p: v } : y) })); }} inputMode="decimal" aria-label={E2("Precio", "Price")} style={{ width: ancho(x.p), border: 0, outline: "none", background: "none", padding: 0, font: "800 14px Sora,sans-serif", color: "var(--tl-ink)" }} />
              <span role="button" aria-label="+" onClick={() => up((z) => ({ cust: z.cust.map((y, j) => j === i ? { ...y, p: (Number(y.p) || 0) + stepOf(y.p) } : y) }))} style={{ ...boton, color: undefined }}><Icon name="plus" size={13} /></span>
            </div>
            <span role="button" aria-label={E2("Quitar", "Remove")} onClick={() => up((z) => ({ cust: z.cust.filter((_, j) => j !== i) }))} style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="trash" size={15} color="rgba(11,14,18,.5)" /></span>
          </div>
        ))}
      </div>
      {add.open ? (
        <div style={{ padding: 14, borderRadius: 16, background: "var(--tl-paper)", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={K}>{E2("LO QUE NO ESTÁ EN LA LISTA", "NOT ON THE LIST")}</span>
          <input value={add.n} onChange={(e) => setAdd({ ...add, n: e.target.value.slice(0, 60) })} placeholder={E2("Nombre", "Name")} aria-label={E2("Nombre", "Name")} style={{ height: 46, boxSizing: "border-box", borderRadius: 13, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", padding: "0 13px", outline: "none", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)", width: "100%" }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0, height: 46, boxSizing: "border-box", borderRadius: 13, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", display: "flex", alignItems: "center", gap: 4, padding: "0 13px" }}>
              <span style={{ font: "800 15px Sora,sans-serif" }}>$</span>
              <input value={add.p} onChange={(e) => setAdd({ ...add, p: String(e.target.value).replace(/[^\d.]/g, "").slice(0, 9) })} inputMode="decimal" placeholder="0" aria-label={E2("Precio", "Price")} style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "none", font: "800 15px Sora,sans-serif", color: "var(--tl-ink)" }} />
            </div>
            <Button variant="primary" size="md" disabled={!addOk} onClick={() => { if (!addOk) return; up((z) => ({ cust: (z.cust || []).concat([{ n: add.n.trim(), p: Number(add.p) || 0, u: "fijo", dur: 0 }]) })); setAdd({ open: false, n: "", p: "" }); }}>{E2("Agregar", "Add")}</Button>
          </div>
        </div>
      ) : (
        <div role="button" onClick={() => setAdd({ ...add, open: true })} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "6px 0", font: "700 13.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="plus" size={16} color="var(--tl-action)" />{E2("Agregar otro", "Add another")}</div>
      )}
    </div>
  );
}

export function PasoE1({ d, up, es, ciudad, irA }: { d: Borrador; up: Up; es: boolean; ciudad: string; irA: (p: "C1") => void }) {
  const E2 = (a: string, b: string) => (es ? a : b), f = F(d), o = own(d), op = opOf(d), zone = zoneOf(d), c = d.cat ? X.CFG[d.cat] : null;
  const [hostQ, setHostQ] = useState(""), [hosts, setHosts] = useState<{ id: string; name: string; addr: string; foto: string | null }[]>([]);
  const [abierto, setAbierto] = useState(-1);
  const rento = op === "rento";
  useEffect(() => { if (!rento || d.join || d.joinName) return; let vivo = true; const t = setTimeout(() => anfitriones(hostQ, d.cat).then((h) => { if (vivo) setHosts(h); }), 180); return () => { vivo = false; clearTimeout(t); }; }, [rento, hostQ, d.cat, d.join, d.joinName]);
  if (!f) return null;
  const opF = Fl.opFrom(d.cat, d.own), OPS = (f.ops || null) as { v: string; icon: string; t: string[]; s: string[] }[] | null;
  let hasOps = !!OPS && !opF && !(d.cat === "NEG-BELL" && rento);
  const qOp = f.own.qs.find((q: { op?: boolean }) => q.op);
  const sumO = opF ? (qOp ? qOp.opts.find((x: { v: string }) => x.v === o[qOp.k]) : null) : d.cat === "NEG-BELL" && rento ? (OPS || []).find((x) => x.v === "rento") : null;
  let sum: { ic: string; t: string; s: string } | null = (opF || (d.cat === "NEG-BELL" && rento)) && sumO ? { ic: sumO.icon, t: E2(sumO.t[0], sumO.t[1]), s: E2("Lo elegiste en el paso 2.", "You picked this in step 2.") } : null;
  if (!OPS && !opF) hasOps = false;
  const hasZone = needZone(op) && !f.zoneFrom;
  if (needZone(op) && f.zoneFrom && !sum) sum = { ic: "pin", t: E2("Vas hasta ", "You go up to ") + zone + E2(" millas", " miles"), s: Fl.TOWNS[zone] ? E2(Fl.TOWNS[zone][0], Fl.TOWNS[zone][1]) + "." : "" };
  const hasAddr = op !== "casa" && !(rento && d.join), aq = (d.addr || "").trim();
  const days = daysOf(d), t = ahora(), stt = status(d, es, days, t);
  const D0: Dia[] = Fl.hours(d.cat, d.own), base = D0.find((x) => x.on) || { a: 9, b: 18 };
  const TPL: [string, string, (i: number) => boolean][] = [["lv", E2("Lun a vie", "Mon–Fri"), (i) => i < 5], ["ls", E2("Lun a sáb", "Mon–Sat"), (i) => i < 6], ["todos", E2("Todos los días", "Every day"), () => true], ["fds", E2("Fines de semana", "Weekends"), (i) => i >= 5], ["cita", E2("Por cita", "By appointment"), (i) => i < 6]];
  const setDay = (i: number, p: Partial<Dia>) => up((z) => { const D = daysOf(z).map((x) => ({ ...x })); Object.assign(D[i]!, p); return { days: D, tpl: null }; });
  const sp = c && c.sp ? E2(c.sp[0], c.sp[1]) : E2("espacio", "space");
  const entrada: CSSProperties = { flex: 1, minWidth: 0, border: 0, outline: "none", background: "none", font: "600 15px Manrope,sans-serif", color: "var(--tl-ink)" };
  const paso = (lbl: string, val: string, menos: () => void, mas: () => void) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ font: `700 9px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{lbl}</span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, padding: "0 4px", borderRadius: 12, background: "var(--tl-paper)" }}>
        <span role="button" aria-label="−" onClick={menos} style={{ width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="minus" size={14} /></span>
        <span style={{ font: "800 13.5px Sora,sans-serif", whiteSpace: "nowrap" }}>{val}</span>
        <span role="button" aria-label="+" onClick={mas} style={{ width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="plus" size={14} /></span>
      </div>
    </div>
  );
  return (
    <div data-screen-label="ONB-NEG-E1 · dónde y cuándo" style={{ display: "flex", flexDirection: "column", gap: 24, animation: "oFade .2s ease-out" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hasOps || sum ? <span style={K}>{E2("¿DÓNDE ATIENDES?", "WHERE DO YOU WORK?")}</span> : null}
        {hasOps ? <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{(OPS || []).filter((x) => !(d.cat === "NEG-BELL" && x.v === "rento")).map((x) => <OptionCard key={x.v} icon={x.icon} title={E2(x.t[0]!, x.t[1]!)} sub={E2(x.s[0]!, x.s[1]!)} on={x.v === op} onClick={() => up({ op: x.v, join: x.v === "rento" ? d.join : null })} />)}</div> : null}
        {sum ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--tl-paper)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--tl-ink)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={sum.ic} size={17} color="var(--tl-white)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{sum.t}</div><div style={{ marginTop: 2, font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{sum.s}</div></div>
            <span role="button" onClick={() => irA("C1")} style={{ flex: "none", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Cambiar", "Change")}</span>
          </div>
        ) : null}
        {rento ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <span style={K}>{E2(`¿EN QUÉ NEGOCIO RENTAS TU ${sp.toUpperCase()}?`, `WHERE DO YOU RENT YOUR ${sp.toUpperCase()}?`)}</span>
            {d.join || d.joinName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, border: "1.5px solid var(--tl-ink)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="store" size={17} /></span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.3 Manrope,sans-serif" }}>{d.joinName}</div><div style={{ marginTop: 3, font: `700 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{(d.addr ? d.addr + " · " : "") + E2("TE AVISA CUANDO TE ACEPTE", "THEY CONFIRM YOU")}</div></div>
                <span role="button" onClick={() => up({ join: null, joinName: "", addr: "" })} style={{ flex: "none", font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Cambiar", "Change")}</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 50, boxSizing: "border-box", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
                  <Icon name="search" size={17} color="rgba(11,14,18,.45)" />
                  <input value={hostQ} onChange={(e) => setHostQ(e.target.value.slice(0, 40))} placeholder={E2("Busca el negocio", "Search the business")} aria-label={E2("Busca el negocio", "Search the business")} style={entrada} />
                </div>
                {hosts.map((h) => (
                  <div key={h.id} role="button" className="hover:bg-[var(--tl-paper)]" onClick={() => up({ join: h.id, joinName: h.name, addr: h.addr || d.addr })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,14,18,.1)", cursor: "pointer" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 11, background: h.foto ? `url("${h.foto}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none" }} />
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.3 Manrope,sans-serif" }}>{h.name}</div><div style={{ marginTop: 2, font: `700 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{(h.addr || ciudad).toUpperCase()}</div></div>
                  </div>
                ))}
                {hostQ.trim().length >= 3 && !hosts.length ? <div role="button" onClick={() => up({ join: null, joinName: hostQ.trim() })} style={{ font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2(`No está en To’Latino: usar «${hostQ.trim()}»`, `Not on To’Latino: use “${hostQ.trim()}”`)}</div> : null}
              </div>
            )}
          </div>
        ) : null}
        {hasAddr ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <span style={K}>{op === "truck" ? E2("¿DÓNDE TE PONES?", "WHERE DO YOU PARK?") : op === "home" ? E2("TU DIRECCIÓN · SOLO SALE LA CALLE", "YOUR ADDRESS · ONLY THE STREET SHOWS") : rento ? E2("DIRECCIÓN DE ESE NEGOCIO", "THAT BUSINESS’S ADDRESS") : E2("TU DIRECCIÓN", "YOUR ADDRESS")}</span>
            <div style={{ height: 52, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${aq.length >= 4 ? "var(--tl-ink)" : "rgba(11,14,18,.14)"}`, background: "var(--tl-white)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
              <Icon name="pin" size={17} color="rgba(11,14,18,.45)" />
              <input value={d.addr || ""} onChange={(e) => up({ addr: e.target.value.slice(0, 60) })} placeholder={op === "truck" ? E2("Ej.: Wyoming St y E Broad St", "E.g. Wyoming St & E Broad St") : "312 N Wyoming St"} autoComplete="street-address" aria-label={E2("Dirección", "Address")} style={entrada} />
              <span style={{ flex: "none", font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.45)" }}>{ciudad.toUpperCase()}</span>
            </div>
            {op === "local" || op === "ambos" ? <input value={d.ref || ""} onChange={(e) => up({ ref: e.target.value.slice(0, 50) })} placeholder={E2("Referencia (opcional): frente al parque, 2.º piso…", "Landmark (optional): across from the park, 2nd floor…")} aria-label={E2("Referencia", "Landmark")} style={{ height: 46, boxSizing: "border-box", borderRadius: 13, border: "1.5px solid rgba(11,14,18,.1)", background: "var(--tl-white)", padding: "0 14px", outline: "none", font: "500 14px Manrope,sans-serif", color: "var(--tl-ink)", width: "100%" }} /> : null}
            {op === "home" ? <div style={{ display: "flex", gap: 9, alignItems: "flex-start", font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}><Icon name="lock" size={15} color="rgba(11,14,18,.5)" /><span>{E2("Tu dirección exacta solo la ve quien confirmas. En tu página sale la calle.", "Only people you confirm see your exact address. Your page shows the street.")}</span></div> : null}
          </div>
        ) : null}
        {hasZone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <span style={K}>{E2("¿HASTA DÓNDE VAS?", "HOW FAR DO YOU GO?")}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{[5, 10, 20, 30].map((z) => <Chip key={z} variant={zone === z ? "selected" : "filter"} onClick={() => up({ zone: z })}>{z} mi</Chip>)}</div>
            {Fl.TOWNS[zone] ? <div style={{ font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(Fl.TOWNS[zone][0], Fl.TOWNS[zone][1])}.</div> : null}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <span style={K}>{E2("¿CUÁNDO ABRES?", "WHEN ARE YOU OPEN?")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, font: "700 12px Manrope,sans-serif", color: stt.c, textAlign: "right" }}><span style={{ width: 7, height: 7, borderRadius: 99, background: stt.dot, flex: "none" }} />{E2(`Hoy ${DAYS[t.hoy]![2].toLowerCase()}: `, "Today: ")}{stt.s.charAt(0).toLowerCase() + stt.s.slice(1)}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {TPL.map(([k2, l, fn]) => <Chip key={k2} variant={d.tpl === k2 ? "selected" : "filter"} onClick={() => up({ tpl: k2, cita: k2 === "cita", days: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ on: !!fn(i), a: base.a, b: base.b, two: false, a2: 17, b2: 21 })) })}>{l}</Chip>)}
        </div>
        <div style={{ border: "1px solid rgba(11,14,18,.1)", borderRadius: 17, padding: "2px 14px" }}>
          {days.map((x, i) => { const open = abierto === i && x.on; return (
            <div key={i} style={{ borderTop: i ? "1px solid rgba(11,14,18,.07)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <span role="switch" aria-checked={x.on} aria-label={es ? DAYS[i]![2] : DAYS[i]![3]} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDay(i, { on: !x.on }); } }} onClick={() => setDay(i, { on: !x.on })} style={{ width: 40, height: 24, boxSizing: "border-box", borderRadius: 99, padding: 3, background: x.on ? "var(--tl-ink)" : "rgba(11,14,18,.15)", display: "flex", justifyContent: x.on ? "flex-end" : "flex-start", flex: "none", cursor: "pointer" }}><span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--tl-white)", boxShadow: "0 1px 2px rgba(11,14,18,.2)" }} /></span>
                <span style={{ width: 86, flex: "none", font: `${i === t.hoy ? 800 : 700} 13.5px Manrope,sans-serif` }}>{es ? DAYS[i]![2] : DAYS[i]![3]}</span>
                <span role="button" onClick={() => x.on && setAbierto(open ? -1 : i)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, font: "700 13px Manrope,sans-serif", color: x.on ? "var(--tl-ink)" : "rgba(11,14,18,.45)", cursor: "pointer", textAlign: "right" }}>{x.on ? fmt(x.a) + " – " + fmt(x.b) : E2("Cerrado", "Closed")}{x.on ? <Icon name={open ? "chevronDown" : "chevronRight"} size={13} color="rgba(11,14,18,.45)" /> : null}</span>
              </div>
              {open ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, padding: "0 0 12px" }}>
                  {paso(E2("ABRE", "OPENS"), fmt(x.a), () => setDay(i, { a: Math.max(0, x.a - 0.5) }), () => setDay(i, { a: Math.min(x.b - 1, x.a + 0.5) }))}
                  {paso(E2("CIERRA", "CLOSES"), fmt(x.b), () => setDay(i, { b: Math.max(x.a + 1, x.b - 0.5) }), () => setDay(i, { b: Math.min(x.a + 20, 30, x.b + 0.5) }))}
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><span role="button" onClick={() => up((z) => ({ days: daysOf(z).map((y) => (y.on ? { ...y, a: x.a, b: x.b } : y)), tpl: null }))} style={{ font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{E2("Igual los días abiertos", "Same for open days")}</span></div>
                </div>
              ) : null}
            </div>); })}
        </div>
      </div>
    </div>
  );
}
