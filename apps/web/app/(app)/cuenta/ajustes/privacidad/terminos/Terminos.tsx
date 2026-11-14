"use client";
/* 9d · USR-TERMINOS · Mi cuenta › Ajustes › Privacidad › Términos que aceptaste (L189; sin pantalla en el diseño: se compone con las piezas de
   Mi cuenta —nota, filas y vacío—). Cada término con su versión y su fecha; solo lo que quedó anotado. */
import type { Aceptado } from "@/lib/datos/terminos";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../../Marco";

export function Terminos({ es, yo, L }: { es: boolean; yo: Yo; L: Aceptado[] }) {
  const E2 = (a: string, b: string) => (es ? a : b), ui = useCuentaUi();
  const dia = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");
  const B: Bloque[] = [
    { type: "note", tone: "info", ic: "shield", s: E2("Aquí ves cada término que aceptaste en To'Latino, con su versión y su fecha. Solo sale lo que quedó anotado.", "Here you see each term you accepted on To'Latino, with its version and date. Only what was recorded shows up.") },
    L.length ? { type: "rows", rows: L.map((x) => ({ key: x.k, ic: "check", ibg: "rgba(0,229,196,.12)", ifg: "var(--tl-open-text)", t: es ? x.t.es : x.t.en,
      s: [x.s ? (es ? x.s.es : x.s.en).toUpperCase() : null, `${E2("ACEPTADO ", "ACCEPTED ")}${dia(x.at).toUpperCase()}`].filter(Boolean).join(" · ") })) }
      : { type: "empty", ic: "shield", t: E2("Todavía no hay términos anotados", "No terms recorded yet"), s: E2("Cuando aceptes unas reglas o los términos de un plan, salen aquí.", "When you accept rules or a plan's terms, they show up here.") },
  ];
  return <Marco es={es} code="USR-TERMINOS" back="/cuenta/ajustes/privacidad" t={E2("Términos que aceptaste", "Terms you accepted")} s={E2("CON SU VERSIÓN Y SU FECHA", "WITH VERSION AND DATE")} blocks={B} yo={yo} ui={ui} />;
}
