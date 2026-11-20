"use client";
/* 9t · El esqueleto en el instante del toque (pedido del fundador, 19 nov). Cuando empieza una navegación a OTRA pantalla (la barra de navegación
   avisa con «tl:pendiente»; ver BarraNavegacion.tsx), el contenido de la pantalla vieja se cambia por el esqueleto de la que viene (ficha, muro,
   Super Admin o lista, según la dirección); el marco (encabezado, pestañas, menú) se queda. Llega la página nueva → se pinta ella.
   - No con loading.tsx: un límite de Suspense por ruta hace que el servidor mande la página en dos partes, y por un instante hay una copia
     escondida del contenido además de la visible (lo cazaron fic005 y a11y9c con «strict mode»). Esto es solo del navegador y solo al navegar.
   - Sale a los 120 ms: si la página llega antes, no hay parpadeo (la barra ya respondió en el toque). Solo si cambia la ruta (no por ?tab=).
   - Si la navegación no llega en 12 s (sin señal), vuelve el contenido de antes.
   - 20 nov · En cuanto la dirección cambia, se pinta la página nueva en ese mismo render (no un instante después, en el efecto): antes había
     unos milisegundos con la dirección nueva y todavía el esqueleto (pq4e lo cazó en la confirmación 44755954339: contó 0 casillas). */
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EsqAdmin, EsqFicha, EsqLista, EsqMuro } from "./_esqueletos";

type Tipo = "ficha" | "muro" | "admin" | "lista";
const tipoDe = (ruta: string): Tipo => (/^\/n\/[^/]+/.test(ruta) ? "ficha" : /^\/comunidad\/?$/.test(ruta) ? "muro" : /^\/admin(\/|$)/.test(ruta) ? "admin" : "lista");

export function Pendiente({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const tics = useRef<number[]>([]);
  const origen = useRef(ruta); // la pantalla desde la que se empezó a navegar: el esqueleto solo vale mientras se siga en ella
  const limpiar = () => { for (const t of tics.current) window.clearTimeout(t); tics.current = []; };

  useEffect(() => {
    const alEmpezar = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      let destino: string;
      try { destino = new URL(url, location.href).pathname; } catch { return; }
      if (destino === location.pathname) return; // misma pantalla (cambia solo ?tab= u otro filtro): la barra basta
      limpiar();
      origen.current = location.pathname;
      // Fuera de la transición de Next (un setState aquí adentro esperaría a la página nueva): un temporizador.
      tics.current.push(window.setTimeout(() => setTipo(tipoDe(destino)), 120));
      tics.current.push(window.setTimeout(() => setTipo(null), 12000));
    };
    window.addEventListener("tl:pendiente", alEmpezar);
    return () => { window.removeEventListener("tl:pendiente", alEmpezar); limpiar(); };
  }, []);

  // Llegó la página nueva.
  useEffect(() => { limpiar(); setTipo(null); }, [ruta]);

  if (!tipo || origen.current !== ruta) return <>{children}</>;
  return tipo === "ficha" ? <EsqFicha /> : tipo === "muro" ? <EsqMuro /> : tipo === "admin" ? <EsqAdmin /> : <EsqLista />;
}
