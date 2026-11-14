import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { leerRotulo } from "@/lib/app-nativa-comun";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misNegocios } from "@/lib/panel";
import { SinNegocio } from "./SinNegocio";

export const dynamic = "force-dynamic";

/* /panel → tu primer negocio (el que eres dueño primero). Sin negocios → Publica tu negocio en la web. 9n-2 · En la app To'Latino Negocios, Publica tu negocio
   está FUERA de su alcance (apps/mobile/apps.json): quien entra sin negocio no se va a una ruta que la cáscara no abre; ve aquí qué hacer (publicar, entrar a un
   equipo con una invitación) y llega a Mi cuenta › Ajustes › Borrar mi cuenta (Apple 5.1.1(v); guardián borrarCuentaEnCadaApp). */
export default async function Page() {
  const [u, lang, h] = await Promise.all([yo(), idioma(), headers()]);
  if (!u?.first_name) redirect("/entrar?volver=/panel");
  const n = await misNegocios(u.id);
  if (n[0]) redirect(`/panel/${n[0].id}`);
  if (leerRotulo(h.get("user-agent"))?.app !== "negocio") redirect("/publica");
  return <SinNegocio es={lang === "es"} nombre={u.first_name} tel={u.phone} />;
}
