"use client";
/* 9m · Una lista de conversaciones que se pone al día sola cuando llega un mensaje (Mi cuenta › Mensajes, Comunidad › Mensajes y Panel › Mensajes):
   el aviso en vivo (/api/vivo) → la página vuelve a pedir su lista al servidor (router.refresh), juntando los avisos seguidos en uno (400 ms).
   Sin preguntar cada N segundos (guardián mensajesEnVivo). No pinta nada. */
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useMensajesVivo, type AvisoVivo } from "@/lib/vivo-cliente";

export function RefrescoVivo({ negocio = null, k = null }: { negocio?: string | null; k?: AvisoVivo["k"] | null }) {
  const router = useRouter(), t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pedir = () => { if (t.current) return; t.current = setTimeout(() => { t.current = null; router.refresh(); }, 400); };
  useMensajesVivo({
    negocio,
    on: (x) => { if ((!k || x.k === k) && (!negocio || x.para === "negocio")) pedir(); },
    // Al conectarse, una vez, también la primera: lo que llegó entre que el servidor pintó la lista y que se abrió la conexión no lo
    // trae ningún aviso (vec9m en el iPhone SE lo cazó: el panel no veía el mensaje). Y al volver de un corte, igual.
    listo: () => pedir(),
  });
  return null;
}
