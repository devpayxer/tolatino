import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { defApp } from "@/lib/app-nativa-comun";
import { verEnlace } from "@/lib/beta";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { BajarApk } from "./BajarApk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "App de prueba · To'Latino", robots: { index: false, follow: false } };

/* 8f · El enlace de un uso del APK propio (fase8-apps.md §6 #10). Ver esta página NO gasta el enlace (una vista previa de un mensajero tampoco):
   solo «Descargar» (un POST a ./bajar) lo gasta. Solo la cuenta del tester la abre: para cualquier otra, no existe (404). Sin sesión, a entrar. */
export default async function Page({ params, searchParams }: { params: Promise<{ ficha: string }>; searchParams: Promise<{ e?: string }> }) {
  const [{ ficha }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo().catch(() => null)]);
  if (!/^[A-Za-z0-9_-]{43}$/.test(ficha)) notFound();
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/beta/apk/${ficha}`)}`);
  const e = await verEnlace(ficha, u.id);
  if (!e) notFound();
  const app = defApp(e.app);
  return <BajarApk es={lang === "es"} ficha={ficha} e={{ ...e, nombre: app.nombre }} error={sp.e && /^\d{3}$/.test(sp.e) ? sp.e : null} />;
}
