"use client";
/* APP-GAM-MONEDAS · tus monedas (prototipo «To'Latino Comunidad» coinsV y la hoja «cup», 1:1 con tokens): la tarjeta oscura con el saldo,
   «MONEDAS» y la línea fija, con «SIN VALOR EN DINERO»; CÓMO SE GANAN (las reglas encendidas: bienvenida y premio del mes; las «monedas
   diarias» llegan con El Patio, decisión G); «Cámbialas por cupones»: los cupones de los negocios de la ciudad con su costo, el negocio y
   Canjear · Te faltan N · Ver mi código · Agotado este mes; la hoja confirma el canje (cuesta, tienes, uno por persona, vence, sin valor en
   dinero) y después muestra el código TL-CQ-xxxx con «Muéstralo en el local» y la fecha en que vence; TUS CUPONES (en escritorio, en la
   columna derecha) y MOVIMIENTOS. El servidor decide todo (saldo, cupo, uno por persona, código); la pantalla solo pinta. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { hace } from "@/lib/comunidad-comun";
import { LINEA_MONEDAS, NOTA_CANJE, REGLAS_MONEDAS, SIN_VALOR, type CuponVecino, type MiCanje, type MisMonedas, type Movimiento } from "@/lib/monedas-comun";
import { monCanjear, monCupones, monMisCupones, monMovimientos } from "../acciones";
import { LINE, MONO, Marco, useAncho, useComUi, type YoCom } from "../Marco";

type N = "Icon" | "Button" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const CARD = { borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 } as const;
const K = { font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" } as const;
const dia = (iso: string, es: boolean) => new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" });

export function Monedas({ es, yo, d }: { es: boolean; yo: YoCom; d: MisMonedas }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024;
  const [saldo, setSaldo] = useState(d.saldo);
  const [cups, setCups] = useState<{ filas: CuponVecino[]; mas: string | null }>({ filas: d.cupones, mas: d.masCupones });
  const [mios, setMios] = useState<{ filas: MiCanje[]; mas: string | null }>({ filas: d.mios, mas: d.masMios });
  const [log, setLog] = useState<{ filas: Movimiento[]; mas: string | null }>({ filas: d.log, mas: d.masLog });
  const [busy, setBusy] = useState(false);
  const t = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es);

  const codigo = (c: { titulo: { es: string; en: string }; negocio: { id: string; nombre: string } }, m: { codigo: string; vence: string; estado: string }) => ui.setHoja({
    title: t(c.titulo), sub: c.negocio.nombre, listo: E2("Listo", "Done"),
    extra: (
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div data-screen-label="Monedas · tu código" style={{ padding: "18px 16px", borderRadius: 16, background: "var(--tl-paper)", textAlign: "center" }}>
          <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.5)" }}>{m.estado === "used" ? E2("CÓDIGO USADO", "CODE USED") : E2("TU CÓDIGO", "YOUR CODE")}</div>
          <div data-codigo={m.codigo} style={{ marginTop: 8, font: `800 30px/1.1 ${MONO}`, letterSpacing: ".06em", color: m.estado === "used" ? "rgba(11,14,18,.4)" : "var(--tl-ink)", textDecoration: m.estado === "used" ? "line-through" : "none" }}>{m.codigo}</div>
          <div style={{ marginTop: 8, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.65)", textWrap: "pretty" }}>
            {m.estado === "used" ? E2(`Ya lo usaste en ${c.negocio.nombre}.`, `You already used it at ${c.negocio.nombre}.`)
              : E2(`Muéstralo en el local de ${c.negocio.nombre}. Lo validan desde su panel y queda usado.`, `Show it in store at ${c.negocio.nombre}. They validate it from their dashboard and it is used.`)}
          </div>
          {m.estado !== "used" && <div style={{ marginTop: 8, font: `700 10px ${MONO}`, letterSpacing: ".08em", color: "var(--tl-pro-ink)" }}>{E2(`VENCE EL ${dia(m.vence, true).toUpperCase()}`, `EXPIRES ${dia(m.vence, false).toUpperCase()}`)}</div>}
        </div>
        <div style={{ font: "500 12px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Si vence sin usarse, te devolvemos las monedas. Sin valor en dinero.", "If it expires unused, we return your coins. No cash value.")}</div>
        <div style={{ display: "flex" }}><Button variant="secondary" block icon="store" onClick={() => { ui.setHoja(null); router.push(`/n/${c.negocio.id}`); }}>{E2("Ver el negocio", "See the business")}</Button></div>
      </div>
    ),
  });

  const canjear = (c: CuponVecino) => {
    if (busy) return;
    setBusy(true);
    monCanjear(c.id).then((r) => {
      setBusy(false);
      if (!r || !r.ok) { ui.setAviso({ t: r && "msg" in r ? t(r.msg) : E2("No se pudo canjear. Intenta otra vez.", "Could not redeem. Try again."), ms: 5000 }); router.refresh(); return; }
      const m = { codigo: r.codigo, vence: r.vence, estado: "issued" as const };
      setSaldo(r.saldo);
      setCups((x) => ({ ...x, filas: x.filas.map((y) => (y.id === c.id ? { ...y, mio: m } : y)) }));
      setMios((x) => ({ ...x, filas: [{ id: `n${Date.now()}`, codigo: r.codigo, titulo: c.titulo, negocio: { id: c.negocio.id, nombre: c.negocio.nombre }, costo: r.costo, estado: "issued", vence: r.vence, usado: null, at: new Date().toISOString() }, ...x.filas] }));
      setLog((x) => ({ ...x, filas: [{ id: `n${Date.now()}`, t: { es: `Canjeaste un cupón · ${c.titulo.es} · ${c.negocio.nombre}`, en: `You redeemed a coupon · ${c.titulo.en || c.titulo.es} · ${c.negocio.nombre}` }, v: -r.costo, at: new Date().toISOString() }, ...x.filas] }));
      codigo(c, m);
      router.refresh();
    }).catch(() => { setBusy(false); ui.setAviso({ t: E2("No se pudo canjear. Intenta otra vez.", "Could not redeem. Try again.") }); });
  };

  const abrir = (c: CuponVecino) => {
    if (c.mio) return codigo(c, c.mio);
    const puede = saldo >= c.costo && !c.agotado;
    ui.setHoja({
      title: t(c.titulo), sub: c.negocio.nombre,
      yes: puede ? E2(`Canjear por ${c.costo} monedas`, `Redeem for ${c.costo} coins`) : undefined, onYes: puede ? () => canjear(c) : undefined,
      listo: puede ? E2("Cancelar", "Cancel") : E2("Entendido", "Got it"),
      extra: (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div data-screen-label="Monedas · cuesta" style={{ padding: 14, borderRadius: 16, background: "var(--tl-paper)" }}>
            <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.5)" }}>{E2("CUESTA", "COSTS")}</div>
            <div style={{ marginTop: 6, font: "800 22px/1.1 Sora,sans-serif", letterSpacing: "-.03em" }}>{E2(`${c.costo} monedas`, `${c.costo} coins`)}</div>
            <div style={{ marginTop: 4, font: "500 13px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2(`Tienes ${saldo.toLocaleString("en-US")} monedas.`, `You have ${saldo.toLocaleString("en-US")} coins.`)}</div>
          </div>
          {t(c.condiciones) && <div style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.75)", textWrap: "pretty" }}>{t(c.condiciones)}</div>}
          <div style={{ padding: "10px 12px", borderRadius: 12, background: c.agotado || saldo < c.costo ? "rgba(255,176,32,.14)" : "rgba(75,55,245,.06)", font: "600 12.5px/1.5 Manrope,sans-serif", color: c.agotado || saldo < c.costo ? "var(--tl-pro-ink)" : "var(--tl-ink)" }}>
            {c.agotado ? E2("Se acabaron los de este mes. Vuelve el mes que viene.", "This month's are gone. Come back next month.")
              : saldo < c.costo ? E2(`Te faltan ${c.costo - saldo} monedas. ${t(NOTA_CANJE(c.dias))}`, `You need ${c.costo - saldo} more coins. ${t(NOTA_CANJE(c.dias))}`) : t(NOTA_CANJE(c.dias))}
          </div>
        </div>
      ),
    });
  };

  const mas = (k: "cup" | "mios" | "log") => {
    if (busy) return;
    setBusy(true);
    const f = k === "cup" ? monCupones(cups.mas ?? "") : k === "mios" ? monMisCupones(mios.mas ?? "") : monMovimientos(log.mas ?? "");
    f.then((r) => {
      setBusy(false);
      if (!r) return;
      if (k === "cup") setCups((x) => ({ filas: [...x.filas, ...(r.filas as CuponVecino[])], mas: r.mas }));
      else if (k === "mios") setMios((x) => ({ filas: [...x.filas, ...(r.filas as MiCanje[])], mas: r.mas }));
      else setLog((x) => ({ filas: [...x.filas, ...(r.filas as Movimiento[])], mas: r.mas }));
    }).catch(() => setBusy(false));
  };

  const Mios = mios.filas.length > 0 && (
    <div data-screen-label="Monedas · tus cupones" style={CARD}>
      <div style={K}>{E2("TUS CUPONES", "YOUR COUPONS")}</div>
      {mios.filas.map((x) => {
        const vivo = x.estado === "issued";
        return (
          <div key={x.id} role="button" tabIndex={0} onClick={() => codigo({ titulo: x.titulo, negocio: x.negocio }, { codigo: x.codigo, vence: x.vence, estado: x.estado })}
            onKeyDown={(e) => { if (e.key === "Enter") codigo({ titulo: x.titulo, negocio: x.negocio }, { codigo: x.codigo, vence: x.vence, estado: x.estado }); }}
            style={{ marginTop: 10, padding: 12, borderRadius: 14, border: `1.5px dashed ${vivo ? "rgba(11,14,18,.25)" : "rgba(11,14,18,.12)"}`, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", opacity: vivo ? 1 : 0.6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 13px Manrope,sans-serif" }}>{t(x.titulo)}</div>
              <div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>
                {`${x.negocio.nombre.toUpperCase()} · ${vivo ? E2(`VENCE EL ${dia(x.vence, true)}`, `EXPIRES ${dia(x.vence, false)}`).toUpperCase() : x.estado === "used" ? E2("USADO", "USED") : E2("VENCIÓ · MONEDAS DEVUELTAS", "EXPIRED · COINS RETURNED")}`}
              </div>
            </div>
            <span style={{ font: `800 13px ${MONO}`, letterSpacing: ".1em", textDecoration: vivo ? "none" : "line-through" }}>{x.codigo}</span>
          </div>);
      })}
      {mios.mas && <div style={{ marginTop: 10, display: "flex" }}><Button variant="secondary" size="sm" block onClick={() => mas("mios")}>{E2("Ver más", "See more")}</Button></div>}
    </div>
  );
  const Ganan = (
    <div data-screen-label="Monedas · cómo se ganan" style={CARD}>
      <div style={K}>{E2("CÓMO SE GANAN", "HOW TO EARN")}</div>
      {d.reglas.map((x, i) => (
        <div key={x.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "10px 0", borderTop: i ? LINE : "none", marginTop: i ? 0 : 6 }}>
          <span style={{ font: "500 13px/1.4 Manrope,sans-serif" }}>{t(x.label)}</span><span style={{ font: "800 13px Sora,sans-serif", color: "var(--tl-pro-ink)", flex: "none" }}>{`+${x.v}`}</span>
        </div>))}
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {REGLAS_MONEDAS.map((x) => <div key={x.es} style={{ display: "flex", gap: 8, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}><span style={{ width: 5, height: 5, borderRadius: 99, background: "rgba(11,14,18,.35)", flex: "none", marginTop: 7 }} />{t(x)}</div>)}
      </div>
    </div>
  );

  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-GAM-MONEDAS" titulo={E2("Monedas", "Coins")} sub={E2(`${saldo.toLocaleString("en-US")} MONEDAS · SE GANAN, NUNCA SE COMPRAN`, `${saldo.toLocaleString("en-US")} COINS · EARNED, NEVER BOUGHT`)} back="/comunidad/rango"
      aside={D ? <>{Mios}{Ganan}</> : undefined}>
      <div data-screen-label="APP-GAM-MONEDAS · monedas" style={{ padding: D ? 0 : 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
        <div data-screen-label="Monedas · saldo" style={{ borderRadius: 22, background: "var(--tl-ink)", color: "var(--tl-white)", padding: "20px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".16em", color: "rgba(255,255,255,.55)" }}>{E2("TUS MONEDAS", "YOUR COINS")}</span>
            <span data-screen-label="Monedas · sin valor" style={{ padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,.08)", font: `700 9px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-signal)" }}>{t(SIN_VALOR).toUpperCase()}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span data-saldo={saldo} style={{ font: "800 44px/1 Sora,sans-serif", letterSpacing: "-.05em" }}>{saldo.toLocaleString("en-US")}</span>
            <span style={{ font: `700 11px ${MONO}`, letterSpacing: ".12em", color: "var(--tl-pro)" }}>{E2("MONEDAS", "COINS")}</span>
          </div>
          <div style={{ marginTop: 8, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{t(LINEA_MONEDAS)}</div>
        </div>

        {!D && Ganan}

        <div>
          <div style={{ font: "800 17px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Cámbialas por cupones", "Trade them for coupons")}</div>
          <div style={{ marginTop: 5, font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2(`Los pone cada negocio de ${d.ciudad}. Lo canjeas en el local con tu código.`, `Each ${d.ciudad} business sets them. Redeem in store with your code.`)}</div>
        </div>
        {cups.filas.length ? (
          <div style={{ display: "grid", gridTemplateColumns: D ? "repeat(auto-fill,minmax(200px,1fr))" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {cups.filas.map((c) => {
              const falta = c.costo - saldo, l = c.mio ? E2("Ver mi código", "See my code") : c.agotado ? E2("Agotado este mes", "Gone this month") : falta > 0 ? E2(`Te faltan ${falta}`, `Need ${falta}`) : E2("Canjear", "Redeem");
              return (
                <div key={c.id} data-screen-label="Monedas · cupón" data-cupon={c.id} style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 92, background: c.negocio.foto ? `url("${c.negocio.foto}") center/cover` : undefined, backgroundColor: "var(--tl-desk)", position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, bottom: 10, padding: "4px 8px", borderRadius: 8, background: "var(--tl-ink)", color: "var(--tl-pro)", font: `700 9.5px ${MONO}`, letterSpacing: ".08em" }}>{E2(`${c.costo} MONEDAS`, `${c.costo} COINS`)}</span>
                    {c.mio && <span style={{ position: "absolute", right: 10, top: 10 }}><Tag tone={c.mio.estado === "used" ? "neutral" : "action"}>{c.mio.estado === "used" ? E2("USADO", "USED") : E2("CANJEADO", "REDEEMED")}</Tag></span>}
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ font: "800 14px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{t(c.titulo)}</div>
                    <div style={{ font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{c.negocio.nombre.toUpperCase()}</div>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", marginTop: 4 }}><Button variant={c.mio || c.agotado || falta > 0 ? "secondary" : "primary"} size="sm" block onClick={() => abrir(c)}>{l}</Button></div>
                  </div>
                </div>);
            })}
          </div>
        ) : (
          <div style={{ ...CARD, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ display: "grid", flex: "none" }}><Icon name="ticket" size={20} color="rgba(11,14,18,.45)" /></span>
            <div><div style={{ font: "800 14px Sora,sans-serif" }}>{E2(`Todavía no hay cupones en ${d.ciudad}`, `No coupons in ${d.ciudad} yet`)}</div>
              <div style={{ marginTop: 4, font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Cuando un negocio del barrio ofrezca uno, sale aquí. Tus monedas te esperan: no vencen.", "When a neighborhood business offers one, it shows here. Your coins wait for you: they don't expire.")}</div></div>
          </div>
        )}
        {cups.mas && <div style={{ display: "flex" }}><Button variant="secondary" size="md" block onClick={() => mas("cup")}>{E2("Ver más cupones", "See more coupons")}</Button></div>}

        {!D && Mios}

        {log.filas.length > 0 && (
          <div data-screen-label="Monedas · movimientos" style={CARD}>
            <div style={K}>{E2("MOVIMIENTOS", "ACTIVITY")}</div>
            {log.filas.map((x, i) => (
              <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i ? LINE : "none", marginTop: i ? 0 : 6 }}>
                <div style={{ minWidth: 0 }}><div style={{ font: "600 13px/1.4 Manrope,sans-serif" }}>{t(x.t)}</div><div style={{ marginTop: 2, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.45)" }}>{hace(x.at, es).toUpperCase()}</div></div>
                <span style={{ font: "800 13px Sora,sans-serif", color: x.v < 0 ? "var(--tl-danger)" : "var(--tl-open-text)", flex: "none" }}>{x.v > 0 ? `+${x.v}` : `−${Math.abs(x.v)}`}</span>
              </div>))}
            {log.mas && <div style={{ marginTop: 8, display: "flex" }}><Button variant="secondary" size="sm" block onClick={() => mas("log")}>{E2("Ver más", "See more")}</Button></div>}
          </div>
        )}
      </div>
    </Marco>
  );
}
