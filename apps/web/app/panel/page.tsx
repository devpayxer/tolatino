import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { misNegocios } from "@/lib/panel";

/* /panel → tu primer negocio (el que eres dueño primero). Sin negocios → Publica tu negocio. */
export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect("/entrar?volver=/panel");
  const n = await misNegocios(u.id);
  redirect(n[0] ? `/panel/${n[0].id}` : "/publica");
}
