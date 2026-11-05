import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { AppShell } from "./AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [lang, u] = await Promise.all([idioma(), yo().catch(() => null)]);
  const t = T[lang];
  const iniciales = u ? (((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")).toUpperCase() || "TL") : "";
  return (
    <AppShell lang={lang} t={{ search: t.search, searchDesk: t.searchDesk, nav: t.nav, tabs: t.tabs, login: t.login, publish: t.publish }} yo={u ? { iniciales } : null}>
      {children}
    </AppShell>
  );
}
