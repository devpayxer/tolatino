import { requerir } from "@/lib/admin";
import { factoresDelEquipo } from "@/lib/equipo/dos-pasos";
import { idioma } from "@/lib/idioma";
import { MisDosPasos } from "./MisDosPasos";

/* 9n-3 · Mis dos pasos: qué segundo factor tiene la persona (sin secretos) y cómo cambiar su app de códigos o pedir códigos de recuperación nuevos.
   Cualquiera del equipo con su sesión en regla; solo ve y cambia lo suyo. */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("home", "ver");
  const [f, l] = await Promise.all([factoresDelEquipo([s.id]), idioma()]);
  const x = f.get(s.id);
  return <MisDosPasos app={x?.app ?? null} quedan={x?.quedan ?? 0} llaves={x?.llaves ?? 0} pruebas={x?.pruebas ?? false} ultimo={x?.ultimo ?? null} l={l} />;
}
