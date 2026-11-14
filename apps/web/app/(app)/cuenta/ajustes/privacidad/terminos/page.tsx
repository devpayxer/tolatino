import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { terminosAceptados } from "@/lib/datos/terminos";
import { yoMarco } from "../../../yo";
import { Terminos } from "./Terminos";

export const metadata: Metadata = { title: "Términos que aceptaste · To'Latino" };
export const dynamic = "force-dynamic";

/* 9d · USR-TERMINOS (L189): lo que aceptaste y quedó anotado, con su versión y su fecha. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/privacidad/terminos")}`);
  const [L, me] = await Promise.all([terminosAceptados(u.id), yoMarco(u, lang === "es")]);
  return <Terminos es={lang === "es"} yo={me} L={L} />;
}
