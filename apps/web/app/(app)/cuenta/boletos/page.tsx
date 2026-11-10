import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misBoletos } from "@/lib/boletos";
import { yoMarco } from "../yo";
import { MisBoletos } from "./MisBoletos";

export const metadata: Metadata = { title: "Boletos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-BOLETOS · Mi cuenta › Boletos (APP-EVT-MIS, prototipo msVals L1462): Próximos · Pasados. Solo los de la persona (por su cuenta). */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/boletos")}`);
  const es = lang === "es";
  const [d, me] = await Promise.all([misBoletos(u.id, es), yoMarco(u, es)]);
  return <MisBoletos d={d} f={sp.f === "pasados" ? "pasados" : "proximos"} es={es} yo={me} />;
}
