import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { Entrar } from "./Entrar";

export const metadata: Metadata = { title: "Entra · To'Latino" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await yo();
  if (u?.first_name) redirect("/cuenta");
  return <Entrar inicial={u ? { paso: 2, telefono: u.phone } : { paso: 1 }} />;
}
