import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../../yo";
import { Telefono } from "./Telefono";

export const metadata: Metadata = { title: "Cambiar mi número · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-TELEFONO (diseño phoneV): el número nuevo y el código que le mandamos. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/perfil/telefono")}`);
  const me = await yoMarco(u, lang === "es");
  return <Telefono actual={u.phone} es={lang === "es"} yo={me} pruebas={process.env.TOLATINO_SMS_MODO === "pruebas"} />;
}
