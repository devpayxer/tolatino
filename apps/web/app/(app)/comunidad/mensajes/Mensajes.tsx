"use client";
/* APP-COM-MENSAJES (prototipo msgsV): la regla a la vista («Puedes escribirle a quien te sigue…»), una fila por conversación (foto,
   nombre, hace cuánto, «Tú: …» o lo último que te escribió, punto si hay algo sin leer) y «Ver más» por cursor. Los mensajes con
   negocios siguen en Mi cuenta › Mensajes. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { hace } from "@/lib/comunidad-comun";
import type { Conv } from "@/lib/mensajes-vecinos";
import { dmLista } from "../acciones";
import { Avatar, LINE, MONO, Marco, useAncho, useComUi, type YoCom } from "../Marco";

import { tec } from "@/lib/tec";
type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;

export function Mensajes({ es, yo, ciudad, d }: { es: boolean; yo: YoCom; ciudad: string; d: { items: Conv[]; mas: string | null } }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024;
  const [items, setItems] = useState(d.items), [mas, setMas] = useState(d.mas), [busy, setBusy] = useState(false);
  const verMas = async () => {
    if (!mas || busy) return; setBusy(true);
    const r = await dmLista(mas).catch(() => null); setBusy(false);
    if (r && r.ok && "items" in r) { setItems((L) => [...L, ...r.items.filter((x) => !L.some((y) => y.id === x.id))]); setMas(r.mas); }
    else ui.setAviso({ t: E2("No se pudo cargar. Revisa tu conexión.", "Could not load. Check your connection.") });
  };
  const nuevos = items.filter((x) => x.unread > 0).length;
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-COM-MENSAJES" titulo={E2("Mensajes", "Messages")} sub={nuevos ? `${nuevos} ${nuevos === 1 ? E2("SIN LEER", "UNREAD") : E2("SIN LEER", "UNREAD")}` : E2("VECINOS QUE TE SIGUEN", "NEIGHBORS WHO FOLLOW YOU")} back="/comunidad">
      <div data-screen-label="APP-COM-MENSAJES · mensajes" style={{ padding: D ? 0 : "14px 16px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(75,55,245,.07)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="info" size={15} color="var(--tl-action)" /></span>
          <span style={{ font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-action-ink)", textWrap: "pretty" }}>{E2("Puedes escribirle a quien te sigue. Solo texto: sin teléfonos ni datos. Los negocios te escriben desde tus pedidos y citas.", "You can message people who follow you. Text only: no phone numbers or personal details. Businesses reach you from your orders and bookings.")}</span>
        </div>
        <div style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
          {items.map((x, i) => (
            <div key={x.id} role="link" data-screen-label="Mensajes · conversación" onClick={() => router.push(`/comunidad/mensajes/${x.otro.id}`)} {...tec(() => router.push(`/comunidad/mensajes/${x.otro.id}`))}
              style={{ padding: "13px 16px", borderTop: i ? LINE : "none", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", background: x.unread ? "rgba(75,55,245,.04)" : "var(--tl-white)" }}>
              <Avatar foto={x.otro.foto} ini={x.otro.ini} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ font: "700 13.5px Manrope,sans-serif" }}>{x.otro.nombre}</span><span style={{ font: `600 9px ${MONO}`, color: "rgba(11,14,18,.45)", flex: "none" }}>{hace(x.at, es).toUpperCase()}</span></div>
                <div style={{ marginTop: 3, font: `${x.unread ? 700 : 500} 12.5px/1.4 Manrope,sans-serif`, color: "rgba(11,14,18,.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(x.mio ? E2("Tú: ", "You: ") : "") + (x.oculto ? E2("Mensaje oculto por To'Latino", "Message hidden by To'Latino") : x.last)}
                </div>
              </div>
              {x.unread > 0 && <span aria-label={E2("Sin leer", "Unread")} style={{ width: 9, height: 9, borderRadius: 99, background: "var(--tl-action)", flex: "none" }} />}
            </div>
          ))}
          {!items.length && <div style={{ padding: "18px 16px", font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{E2("Todavía no tienes mensajes. Cuando un vecino te siga, le podrás escribir desde su perfil.", "No messages yet. When a neighbor follows you, you can write from their profile.")}</div>}
        </div>
        {mas && <div style={{ display: "flex", justifyContent: "center" }}><Button variant="secondary" size="md" disabled={busy} onClick={verMas}>{busy ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div>}
        <div role="link" onClick={() => router.push("/cuenta/mensajes")} {...tec(() => router.push("/cuenta/mensajes"))} style={{ padding: "12px 16px", borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
          <Icon name="store" size={18} color="var(--tl-action)" />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px Manrope,sans-serif" }}>{E2("Mensajes con negocios", "Messages with businesses")}</div><div style={{ marginTop: 2, font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)" }}>{E2(`EN MI CUENTA · ${ciudad.toUpperCase()}`, `IN MY ACCOUNT · ${ciudad.toUpperCase()}`)}</div></div>
          <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" />
        </div>
      </div>
    </Marco>
  );
}
