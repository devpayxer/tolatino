import { requerir } from "@/lib/admin";
import { gamificacion } from "@/lib/admin-gam";
import { Gamificacion } from "../Gamificacion";

/* 5f · ADM-GAM · Gamification: Rangos · Puntos · Tabla del Barrio (?tab=rk|pts|tabla, ?c= ciudad, ?m=anterior). Por ciudad de quien mira. */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string; m?: string }> }) {
  const s = await requerir("gam", "ver");
  const sp = await searchParams;
  const tab = (["rk", "pts", "tabla"] as const).find((x) => x === sp.tab) ?? "rk";
  return <Gamificacion d={await gamificacion(s, { ciudad: sp.c, mes: sp.m })} tab={tab} edita={s.puede("gam", "editar")} admin={s.role === "admin"} />;
}
