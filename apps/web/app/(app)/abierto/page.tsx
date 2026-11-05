import { redirect } from "next/navigation";
import { idioma } from "@/lib/idioma";

/* APP-NEG-ABIERTO: en el prototipo «Abierto ahora» es Buscar con esa intención (searchFrom). */
export default async function Page() {
  redirect((await idioma()) === "es" ? "/buscar?q=abierto%20ahora" : "/buscar?q=open%20now");
}
