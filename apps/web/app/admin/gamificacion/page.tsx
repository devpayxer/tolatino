import { requerir } from "@/lib/admin";
import { gamificacion } from "@/lib/admin-gam";
import { Gamificacion } from "../Gamificacion";

/* 5f–5g · ADM-GAM · Gamification: Rangos · Puntos · Monedas · Cupones · Tabla del Barrio (?tab=rk|pts|coin|cup|tabla, ?c= ciudad,
   ?m=anterior, ?e= estado de los cupones, ?cur= cursor). Por ciudad de quien mira. */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string; m?: string; e?: string; cur?: string }> }) {
  const s = await requerir("gam", "ver");
  const sp = await searchParams;
  const tab = (["rk", "pts", "coin", "cup", "tabla"] as const).find((x) => x === sp.tab) ?? "rk";
  return <Gamificacion d={await gamificacion(s, { ciudad: sp.c, mes: sp.m, tab, estado: sp.e, cursor: sp.cur })} tab={tab} edita={s.puede("gam", "editar")} admin={s.role === "admin"} />;
}
