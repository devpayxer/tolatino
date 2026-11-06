import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { confirmarCorreo } from "@/lib/correo";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../yo";
import { Correo } from "./Correo";

export const metadata: Metadata = { title: "Correo · To'Latino" };
export const dynamic = "force-dynamic";

/* El enlace del correo «Confirma tu correo» (2q): pide sesión (la misma persona) y se usa una vez. */
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  const t = typeof sp.t === "string" ? sp.t : "";
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/cuenta/correo?t=${t}`)}`);
  const [r, me] = await Promise.all([confirmarCorreo(u.id, t), yoMarco(u, lang === "es")]);
  return <Correo ok={r.ok} email={r.email ?? null} msg={r.msg ?? null} es={lang === "es"} yo={me} />;
}
