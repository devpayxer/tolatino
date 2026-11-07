"use client";
/* APP-GAM-TABLA · la Tabla del Barrio (prototipo «To'Latino Comunidad» tablaV, 1:1 con tokens): el mes en curso y el anterior (selector),
   las pestañas General · Recomendaciones · Respuestas (Chip), «Vas #N con X puntos» (tu lugar; abre Tu rango), las filas con posición
   (los 3 primeros en dorado), foto, nombre, rango y barrio, y los puntos; «Ver más» con cursor; las notas. Excluidos y la cuenta oficial no
   salen; los vecinos con un bloqueo de por medio tampoco (su lugar cuenta). Todo del servidor (lib/tabla.ts). */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { rango } from "@/lib/comunidad-comun";
import { nombreMes, type FilaTabla, type Tabla } from "@/lib/puntos-comun";
import { tablaMas } from "../acciones";
import { Avatar, LINE, MONO, Marco, useAncho, useComUi, type YoCom } from "../Marco";

type N = "Button" | "Chip" | "Icon";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Chip, Icon } = UI as unknown as Record<N, ComponentType<any>>;
const fecha = (iso: string, es: boolean) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "UTC" });

export function TablaBarrio({ es, yo, ciudad, d }: { es: boolean; yo: YoCom; ciudad: string; d: Tabla | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), path = usePathname(), ui = useComUi(yo), D = useAncho() >= 1024;
  const [mas, setMas] = useState<{ filas: FilaTabla[]; cur: string | null; key: string }>({ filas: [], cur: null, key: "" });
  const [busy, setBusy] = useState(false);
  if (!d) return <Marco es={es} yo={yo} ui={ui} code="APP-GAM-TABLA" titulo={E2("Tabla del Barrio", "Leaderboard")} sub={ciudad.toUpperCase()}><div style={{ padding: 20 }}>{E2("Esta ciudad todavía no tiene tabla.", "This city has no board yet.")}</div></Marco>;
  const key = `${d.mes}|${d.tab}`, extra = mas.key === key ? mas : { filas: [], cur: d.mas, key };
  const filas = [...d.filas, ...extra.filas], cursor = mas.key === key ? mas.cur : d.mas;
  const m = d.mes === "anterior" ? d.meses.anterior : d.meses.actual, mesN = nombreMes(m, es), ciudadC = ciudad.toUpperCase();
  const sub = d.mes === "actual" ? E2(`${mesN} · ${ciudadC} · SE REINICIA EL ${fecha(d.estado.reinicia, true)}`, `${mesN} · ${ciudadC} · RESETS ${fecha(d.estado.reinicia, false)}`).toUpperCase()
    : d.estado.cerrada ? (d.estado.ganador ? E2(`${mesN} · CERRADA · GANÓ ${d.estado.ganador}`, `${mesN} · CLOSED · WON BY ${d.estado.ganador}`) : E2(`${mesN} · CERRADA`, `${mesN} · CLOSED`)).toUpperCase()
      : E2(`${mesN} · CONGELADA · SE CIERRA EL ${fecha(d.estado.cierraEl ?? d.meses.actual, true)}`, `${mesN} · FROZEN · CLOSES ${fecha(d.estado.cierraEl ?? d.meses.actual, false)}`).toUpperCase();
  const ir = (q: { m?: string; t?: string }) => { const p = new URLSearchParams(); const mm = q.m ?? d.mes, tt = q.t ?? d.tab; if (mm === "anterior") p.set("m", "anterior"); if (tt !== "general") p.set("t", tt); router.push(`${path}${p.size ? `?${p}` : ""}`, { scroll: false }); };
  const verMas = async () => {
    if (!cursor || busy) return; setBusy(true);
    const r = await tablaMas(d.mes, d.tab, cursor).catch(() => null); setBusy(false);
    if (r) setMas({ filas: [...extra.filas, ...r.filas], cur: r.mas, key }); else ui.setAviso({ t: E2("No se pudo cargar. Revisa tu conexión.", "Could not load. Check your connection.") });
  };
  const mine = d.yo ? { t: E2(`Vas #${d.yo.pos} con ${d.yo.v.toLocaleString("en-US")} puntos`, `You are #${d.yo.pos} with ${d.yo.v.toLocaleString("en-US")} points`), s: E2("Suben cuando tus vecinos votan lo que aportas.", "They go up when neighbors vote on what you contribute.") }
    : d.excluido ? { t: E2("No sales en la tabla de este mes", "You are off this month's board"), s: E2("Te avisamos el motivo. Tus puntos y tu rango siguen igual.", "We told you why. Your points and rank stay the same.") }
      : { t: E2("Aún no estás en la tabla", "Not on the board yet"), s: E2("Aporta y entras: los puntos llegan cuando otros votan lo que publicas.", "Contribute and you are in: points come when others vote on your posts.") };
  const notas = [
    E2("Los 3 primeros del mes reciben la insignia «Top del mes». Las monedas del premio llegan con Mis monedas.", "The top 3 each month get the «Top of the month» badge. The prize coins arrive with My coins."),
    E2("El mes se congela el último día a medianoche; en 3 días se cierra con los 3 primeros. Quien hizo trampa no sale.", "The month freezes on the last day at midnight; it closes within 3 days with the top 3. Cheaters are left out."),
    E2("Cada ciudad tiene su tabla. Aquí nada se compra: el orden lo ponen los votos de los vecinos.", "Each city has its own board. Nothing here is bought: neighbors’ votes set the order."),
  ];
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-GAM-TABLA" titulo={E2("Tabla del Barrio", "Leaderboard")} sub={sub}>
      <div data-screen-label="APP-GAM-TABLA · Tabla del Barrio" style={{ padding: D ? 0 : 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div role="tablist" aria-label={E2("Mes", "Month")} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "rgba(11,14,18,.06)" }}>
            {(["actual", "anterior"] as const).map((k) => (
              <span key={k} role="tab" aria-selected={d.mes === k} onClick={() => ir({ m: k })} style={{ padding: "7px 12px", borderRadius: 9, background: d.mes === k ? "var(--tl-white)" : "transparent", color: d.mes === k ? "var(--tl-ink)" : "rgba(11,14,18,.55)", font: "700 12px Manrope,sans-serif", cursor: "pointer", textTransform: "capitalize" }}>{nombreMes(k === "actual" ? d.meses.actual : d.meses.anterior, es)}</span>))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {([["general", E2("General", "Overall")], ["rec", E2("Recomendaciones", "Recommendations")], ["resp", E2("Respuestas", "Answers")]] as const).map(([k, l]) => (
              <Chip key={k} variant={d.tab === k ? "selected" : "filter"} onClick={() => ir({ t: k })}>{l}</Chip>))}
          </div>
        </div>
        <div role="link" data-screen-label="Tabla · tu lugar" onClick={() => router.push("/comunidad/rango")} style={{ borderRadius: 16, background: "rgba(75,55,245,.07)", padding: "13px 15px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
          <Avatar foto={yo.foto} ini={yo.ini} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{mine.t}</div><div style={{ marginTop: 3, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{mine.s}</div></div>
          <Icon name="chevronRight" size={16} color="var(--tl-action)" />
        </div>
        <div data-screen-label="Tabla · filas" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
          {filas.length ? filas.map((x, i) => (
            <div key={x.id} role="link" data-fila={x.pos} onClick={() => router.push(`/comunidad/v/${x.yo ? "yo" : x.id}`)} style={{ padding: "11px 16px", borderTop: i ? LINE : "none", background: x.yo ? "rgba(75,55,245,.07)" : "var(--tl-white)", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
              <span style={{ width: 26, font: "800 15px Sora,sans-serif", color: x.pos <= 3 ? "var(--tl-pro-ink)" : "rgba(11,14,18,.4)", flex: "none", textAlign: "center" }}>{x.pos}</span>
              <Avatar foto={x.foto} ini={x.ini} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 13.5px/1.25 Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.yo ? `${x.nombre} · ${E2("tú", "you")}` : x.nombre}</div>
                <div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{[es ? rango(x.rango).es : rango(x.rango).en, x.zona ? (es ? x.zona.es : x.zona.en) : null].filter(Boolean).join(" · ").toUpperCase()}</div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}><div style={{ font: "800 16px/1 Sora,sans-serif", letterSpacing: "-.02em" }}>{x.v.toLocaleString("en-US")}</div><div style={{ marginTop: 4, font: `600 8.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.45)" }}>{E2("PUNTOS", "POINTS")}</div></div>
            </div>))
            : <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}><div style={{ font: "800 16px/1.25 Sora,sans-serif" }}>{E2("Todavía nadie suma puntos", "Nobody has points yet")}</div><div style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Pregunta, responde o recomienda: los votos de tus vecinos te ponen aquí.", "Ask, answer or recommend: your neighbors’ votes put you here.")}</div></div>}
        </div>
        {cursor && <div style={{ display: "flex", justifyContent: "center" }}><Button variant="secondary" size="md" disabled={busy} onClick={verMas}>{busy ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 4px" }}>
          {notas.map((t) => <div key={t} style={{ display: "flex", gap: 8, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}><span style={{ width: 5, height: 5, borderRadius: 99, background: "rgba(11,14,18,.35)", flex: "none", marginTop: 7 }} />{t}</div>)}
        </div>
      </div>
    </Marco>
  );
}
