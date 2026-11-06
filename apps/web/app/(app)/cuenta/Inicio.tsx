"use client";
import { useRouter } from "next/navigation";
import { Marco, useCuentaUi, type Bloque, type Yo } from "./Marco";

export function Inicio({ es, yo, tel, nombre, dirs, sanciones }: { es: boolean; yo: Yo; tel: string; nombre: string; dirs: number; sanciones: { kind: string; reason: string; hasta: string | null }[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const dia = (d: string) => new Date(d).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" });
  const salir = async () => { await fetch("/api/cuenta/salir", { method: "POST" }); router.replace("/entrar"); };
  const blocks: Bloque[] = [
    ...sanciones.map((x): Bloque => ({ type: "note", tone: "danger", ic: "warning", s: x.kind === "adv" ? E2(`To’Latino te mandó una advertencia: ${x.reason}.`, `To’Latino sent you a warning: ${x.reason}.`) : E2(`No puedes publicar hasta el ${dia(x.hasta!)}: ${x.reason}.`, `You can’t post until ${dia(x.hasta!)}: ${x.reason}.`) })),
    { type: "kv", rows: [{ k: E2("NOMBRE", "NAME"), v: nombre }, { k: E2("TELÉFONO", "PHONE"), v: tel }] },
    { type: "sec", t: E2("Mi cuenta", "My account") },
    { type: "rows", rows: [{ ic: "home", t: E2("Direcciones", "Addresses"), s: `${dirs}${E2(" GUARDADAS", " SAVED")}`, chev: true, on: () => router.push("/cuenta/direcciones") }] },
    { type: "acts", btns: [[E2("Cerrar sesión", "Sign out"), "secondary", "close", () => ui.setHoja({ title: E2("¿Cerrar sesión?", "Sign out?"), sub: E2("Para volver a entrar te pedimos tu teléfono.", "To sign back in we ask for your phone."), yes: E2("Cerrar sesión", "Sign out"), onYes: salir })]] },
  ];
  return <Marco es={es} code="USR-HOME" home t={E2("Mi cuenta", "My account")} s={yo.badge} blocks={blocks} yo={yo} ui={ui} />;
}
