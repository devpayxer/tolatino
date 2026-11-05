import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hayAdmin, staff } from "@/lib/admin";
import { yo } from "@/lib/cuenta";
import { Arranque } from "./Arranque";
import { gruposNav } from "@/lib/admin-nav";
import { Shell } from "./ui";

export const metadata: Metadata = { title: "Admin · To'Latino", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await yo();
  if (!u) redirect("/entrar");
  if (!u.first_name) redirect("/entrar");
  const s = await staff();
  if (!s) {
    if (!(await hayAdmin())) return <Arranque nombre={u.first_name} />;
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-2 px-5">
        <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">SIN ACCESO</span>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.04em]">Esta zona es del equipo de To&rsquo;Latino</h1>
        <p className="text-[13.5px] text-text-2">Si eres del equipo, pídele a un Admin que te agregue con tu teléfono.</p>
      </main>
    );
  }
  const grupos = await gruposNav((k) => s.puede(k, "ver"));
  const nombre = [s.first_name, s.last_name].filter(Boolean).join(" ");
  const iniciales = ((s.first_name?.[0] ?? "") + (s.last_name?.[0] ?? "")).toUpperCase();
  return (
    <Shell yo={{ nombre, rol: s.roleName.toUpperCase(), iniciales }} grupos={grupos}>
      {children}
    </Shell>
  );
}
