"use client";
/* USR-INVITAR (diseño «To'Latino Mi cuenta» · invV): comparte To'Latino con tus vecinos (WhatsApp, mensaje o copiar el
   enlace). Sin código de referido ni puntos hasta que exista la gamificación (anotado en REVISION). */
import { useEffect, useState } from "react";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

export function Invitar({ es, yo, nombre, ciudad }: { es: boolean; yo: Yo; nombre: string | null; ciudad: string }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const ui = useCuentaUi();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${location.origin}/`), []);
  const txt = E2(`${nombre ? `${nombre} te invita a To'Latino: ` : ""}los negocios latinos de ${ciudad} en un solo lugar. Pide, reserva y encuentra trabajo.`, `${nombre ? `${nombre} invites you to To'Latino: ` : ""}the Latino businesses of ${ciudad} in one place. Order, book and find jobs.`);
  const copiar = async () => { try { await navigator.clipboard.writeText(`${txt} ${url}`); ui.toast(E2("Enlace copiado.", "Link copied.")); } catch { ui.toast(E2("No se pudo copiar.", "Could not copy.")); } };
  const compartir = async () => { if (navigator.share) { try { await navigator.share({ title: "To'Latino", text: txt, url }); } catch { /* la persona cerró */ } } else void copiar(); };
  const B: Bloque[] = [
    { type: "rows", rows: [{ ic: "share", t: E2("Comparte To'Latino con tus vecinos", "Share To'Latino with your neighbors"), s: url.replace(/^https?:\/\//, "").toUpperCase(), x: txt }] },
    { type: "acts", cols: "repeat(3,minmax(0,1fr))", btns: [
      ["WhatsApp", "primary", "chat", () => window.open(`https://wa.me/?text=${encodeURIComponent(`${txt} ${url}`)}`, "_blank", "noopener")],
      [E2("Mensaje", "Message"), "secondary", "phone", () => { location.href = `sms:?&body=${encodeURIComponent(`${txt} ${url}`)}`; }],
      [E2("Copiar enlace", "Copy link"), "secondary", "share", () => void copiar()],
    ] },
    { type: "acts", cols: "minmax(0,1fr)", btns: [[E2("Compartir", "Share"), "secondary", "share", () => void compartir()]] },
    { type: "note", tone: "info", ic: "info", s: E2("Mientras más vecinos y negocios estén, más útil es para todos.", "The more neighbors and businesses join, the more useful it is for everyone.") },
  ];
  return <Marco es={es} code="USR-INVITAR" back="/cuenta" t={E2("Invita vecinos", "Invite neighbors")} s={E2("COMPARTE TO'LATINO", "SHARE TO'LATINO")} blocks={B} yo={yo} ui={ui} />;
}
