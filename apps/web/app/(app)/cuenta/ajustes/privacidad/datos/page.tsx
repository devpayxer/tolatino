import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { valor } from "@/lib/config";
import { misArchivos } from "@/lib/datos/exportar";
import { yoMarco } from "../../../yo";
import { Datos } from "./Datos";

export const metadata: Metadata = { title: "Descargar mis datos · To'Latino" };
export const dynamic = "force-dynamic";

/* 9d · USR-DATOS (hueco #4): tu archivo (estado, vence, bajar una vez) y pedirlo con el código. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/ajustes/privacidad/datos")}`);
  const [archivos, me, dias] = await Promise.all([misArchivos(u.id, null), yoMarco(u, lang === "es"), valor("export_cada_dias")]);
  return <Datos es={lang === "es"} yo={me} tel={u.phone} archivos={archivos} pruebas={process.env.TOLATINO_SMS_MODO === "pruebas"} dias={dias} />;
}
