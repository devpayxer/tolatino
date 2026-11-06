import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { borradoDe } from "@/lib/perfil";
import { yoMarco } from "../../yo";
import { Borrar } from "./Borrar";

export const metadata: Metadata = { title: "Borrar mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-BORRAR (diseño delV): por qué te vas, qué pasa, y el código para confirmar. 30 días para arrepentirte. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/borrar")}`);
  const [d, me] = await Promise.all([borradoDe(u.id), yoMarco(u, lang === "es")]);
  return <Borrar d={d} tel={u.phone} es={lang === "es"} yo={me} pruebas={process.env.TOLATINO_SMS_MODO === "pruebas"} />;
}
