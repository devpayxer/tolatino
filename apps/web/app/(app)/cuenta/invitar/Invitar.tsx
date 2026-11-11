"use client";
/* USR-INVITAR (diseño «To'Latino Mi cuenta» · invV): TU CÓDIGO «NOMBRE-N» con tu enlace (copiar, WhatsApp, mensaje, compartir), «Cuenta
   para tu rango» (Capitán: los vecinos que invitaste y participan; sin premios en dinero) y «Tus invitados» (SE UNIÓ · PARTICIPA). */
import { compartir as compartirNativo } from "@/lib/nativo/compartir";
import { useEffect, useState } from "react";
import type { Invitado } from "@/lib/invitar";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

export function Invitar({ es, yo, nombre, ciudad, code, invitados }: { es: boolean; yo: Yo; nombre: string | null; ciudad: string; code: string | null; invitados: Invitado[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const ui = useCuentaUi();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${location.origin}/${code ? `i/${code.toLowerCase()}` : ""}`), [code]);
  const txt = E2(`${nombre ? `${nombre} te invita a To'Latino: ` : ""}los negocios latinos de ${ciudad} en un solo lugar. Pide, reserva y encuentra trabajo.`, `${nombre ? `${nombre} invites you to To'Latino: ` : ""}the Latino businesses of ${ciudad} in one place. Order, book and find jobs.`);
  const copiar = async () => { try { await navigator.clipboard.writeText(`${txt} ${url}`); ui.toast(E2("Enlace copiado.", "Link copied.")); } catch { ui.toast(E2("No se pudo copiar.", "Could not copy.")); } };
  // 8e · En la app, la hoja nativa de compartir; en la web, la del navegador o copiar (lib/nativo/compartir.ts).
  const compartir = async () => { const r = await compartirNativo({ titulo: "To'Latino", texto: txt, url, copiar: `${txt} ${url}` }); if (r === "copiado") ui.toast(E2("Enlace copiado.", "Link copied.")); else if (r === "no") ui.toast(E2("No se pudo copiar.", "Could not copy.")); };
  const B: Bloque[] = [
    { type: "rows", rows: [{ ic: "share", t: code ?? E2("Comparte To'Latino con tus vecinos", "Share To'Latino with your neighbors"), s: code ? E2("TU CÓDIGO · TUS VECINOS LO USAN AL CREAR SU CUENTA", "YOUR CODE · NEIGHBORS USE IT WHEN SIGNING UP") : url.replace(/^https?:\/\//, "").toUpperCase(), x: `${txt} ${url}` }] },
    { type: "acts", cols: "repeat(3,minmax(0,1fr))", btns: [
      ["WhatsApp", "primary", "chat", () => window.open(`https://wa.me/?text=${encodeURIComponent(`${txt} ${url}`)}`, "_blank", "noopener")],
      [E2("Mensaje", "Message"), "secondary", "phone", () => { location.href = `sms:?&body=${encodeURIComponent(`${txt} ${url}`)}`; }],
      [E2("Copiar enlace", "Copy link"), "secondary", "share", () => void copiar()],
    ] },
    { type: "acts", cols: "minmax(0,1fr)", btns: [[E2("Compartir", "Share"), "secondary", "share", () => void compartir()]] },
    { type: "note", tone: "info", ic: "shield", t: E2("Cuenta para tu rango", "It counts toward your rank"), s: E2("Llegas a Capitán cuando los vecinos que invitaste participan: publican, comentan, piden o reservan. No hay premios en dinero.", "You reach Captain when neighbors you invited take part: they post, comment, order or book. No cash rewards.") },
    { type: "sec", t: E2("Tus invitados", "Your invitees"), s: `${invitados.length} ${E2("INVITADOS", "INVITED")}` },
    invitados.length
      ? { type: "rows", rows: invitados.map((x) => ({ key: x.id, ph: x.foto, ini: x.ini, t: x.nombre, tag: x.activo ? [E2("PARTICIPA", "ACTIVE"), "signal"] as [string, string] : [E2("SE UNIÓ", "JOINED"), "neutral"] as [string, string],
          s: x.activo ? E2("YA CUENTA PARA TU RANGO", "ALREADY COUNTS FOR YOUR RANK") : E2("CUENTA CUANDO PUBLIQUE O PIDA", "COUNTS WHEN THEY POST OR ORDER") })) }
      : { type: "empty", ic: "share", t: E2("Todavía no invitas a nadie", "No invitees yet"), s: E2(`Comparte tu código con tu familia y tus vecinos de ${ciudad}.`, `Share your code with family and ${ciudad} neighbors.`) },
  ];
  return <Marco es={es} code="USR-INVITAR" back="/cuenta" t={E2("Invita vecinos", "Invite neighbors")} s={code ?? E2("COMPARTE TO'LATINO", "SHARE TO'LATINO")} blocks={B} yo={yo} ui={ui} />;
}
