"use client";
/* 5h · «Ver traducción» / «Ver original» (D3) bajo el texto de una publicación, un comentario, una reseña, la respuesta del negocio y un
   comentario de Novedades. Solo sale cuando el idioma del texto (lo guarda el servidor al publicar) no es el de la app, y nunca en lo
   propio. Estados: «Ver traducción» → «Traduciendo…» → el texto traducido con «Ver original · Traducción automática del inglés»; si
   el traductor no responde: «La traducción no está disponible ahora.» con «Reintentar» (la pantalla sigue igual); si se llegó al
   límite, el motivo. Lo ya traducido se guarda en la pantalla: ir y volver entre original y traducción no vuelve a pedir nada.
   Cada pantalla usa un useTraducir(es) y pasa lo que devuelve a la prop `translate` de su pieza del sistema (PostCard, CommentCard,
   TopAnswer, ReplyThread, ReviewCard); donde la pieza no la trae (la respuesta del negocio, Novedades) va <LineaTr>, con el mismo
   aspecto que la del sistema. */
import { useState, type CSSProperties, type ReactNode } from "react";
import { NO_DISPONIBLE, type KindTr } from "@/lib/traduccion-comun";
import { verTraduccion } from "./acciones-traducir";

type Est = { st: "cargando" } | { st: "listo"; texto: string; de: "es" | "en"; ver: boolean } | { st: "error"; msg: string; otra: boolean };
export type TrProp = { label: ReactNode };
export type Tr = (kind: KindTr, id: string, lang: string | null | undefined, body: string, mio?: boolean) => { body: string; translate?: TrProp };

const BOTON: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: 0, padding: 0, margin: 0, cursor: "pointer" };
const TENUE: CSSProperties = { fontWeight: 600, color: "rgba(11,14,18,.55)" };

export function useTraducir(es: boolean): Tr {
  const [m, setM] = useState<Record<string, Est>>({});
  const E2 = (a: string, b: string) => (es ? a : b);
  const pon = (k: string, e: Est) => setM((x) => ({ ...x, [k]: e }));
  const pedir = async (k: string, kind: KindTr, id: string) => {
    pon(k, { st: "cargando" });
    const r = await verTraduccion(kind, id).catch(() => null);
    if (r?.ok) pon(k, { st: "listo", texto: r.texto, de: r.de, ver: true });
    else pon(k, { st: "error", msg: r ? (es ? r.msg.es : r.msg.en) : es ? NO_DISPONIBLE.es : NO_DISPONIBLE.en, otra: !r || r.motivo === "servicio" });
  };
  return (kind, id, lang, body, mio) => {
    const app = es ? "es" : "en";
    if (mio || !body.trim() || (lang !== "es" && lang !== "en") || lang === app) return { body };
    const k = `${kind}:${id}`, e = m[k];
    const ver = <button type="button" data-tr="ver" style={BOTON} onClick={() => (e?.st === "listo" ? pon(k, { ...e, ver: true }) : void pedir(k, kind, id))}>{E2("Ver traducción", "See translation")}</button>;
    if (!e) return { body, translate: { label: ver } };
    if (e.st === "cargando") return { body, translate: { label: <span role="status" data-tr="cargando" style={TENUE}>{E2("Traduciendo…", "Translating…")}</span> } };
    if (e.st === "error") return { body, translate: { label: <span role="status" data-tr="error"><span style={TENUE}>{e.msg}</span>{e.otra && <>{" · "}<button type="button" style={BOTON} onClick={() => void pedir(k, kind, id)}>{E2("Reintentar", "Try again")}</button></>}</span> } };
    if (!e.ver) return { body, translate: { label: ver } };
    const deDonde = e.de === "en" ? E2("Traducción automática del inglés", "Machine translation from English") : E2("Traducción automática del español", "Machine translation from Spanish");
    return { body: e.texto, translate: { label: <span data-tr="traducido"><button type="button" style={BOTON} onClick={() => pon(k, { ...e, ver: false })}>{E2("Ver original", "See original")}</button><span style={TENUE}>{` · ${deDonde}`}</span></span> } };
  };
}

/* La línea de «Ver traducción» donde la pieza del sistema no trae la prop (mismo aspecto que la de PostCard / ReviewCard: 700 12px, Action). */
export function LineaTr({ t, mt = 6 }: { t?: TrProp; mt?: number }) {
  return t ? <div style={{ marginTop: mt }}><span style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)" }}>{t.label}</span></div> : null;
}
