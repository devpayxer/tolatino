/* 9m · «Cómo llegar» abre el mapa DEL TELÉFONO (como DoorDash, L81, L92): en el iPhone, Mapas de Apple (maps://); en Android, la app de mapas que la
   persona tenga (geo:, ella elige: Google Maps, Waze…); en una computadora, las indicaciones en la web. No es un servicio nuestro ni una llamada a un
   tercero: es un enlace que la persona abre en SU app (nada de lo que se busca o se ubica pasa por ellos). El mini mapa y el mapa son los propios
   (teselas propias). Este es el ÚNICO lugar del código con esos enlaces (guardián direccionSinTerceros). Sin «server-only»: lo usan las pantallas. */
export type Destino = { lat?: number | null; lng?: number | null; dir?: string | null; nombre?: string | null };

const coords = (d: Destino) => d.lat != null && d.lng != null && Number.isFinite(d.lat) && Number.isFinite(d.lng);
const consulta = (d: Destino) => (coords(d) ? `${d.lat},${d.lng}` : encodeURIComponent(String(d.dir ?? d.nombre ?? "").slice(0, 200)));

/* Las indicaciones en la web (computadora y el modo sin conexión del Repartidor, que las abre fuera de la app). */
export const urlComoLlegar = (d: Destino) => `https://www.google.com/maps/dir/?api=1&destination=${consulta(d)}`;

/* El enlace a la app de mapas del teléfono según el sistema (null en una computadora). */
export function urlTelefono(d: Destino, ua: string): string | null {
  if (/iPhone|iPad|iPod/.test(ua)) return `maps://?daddr=${consulta(d)}${d.nombre ? `&q=${encodeURIComponent(d.nombre)}` : ""}`;
  if (/Android/.test(ua)) return coords(d) ? `geo:${d.lat},${d.lng}?q=${d.lat},${d.lng}${d.nombre ? `(${encodeURIComponent(d.nombre)})` : ""}` : `geo:0,0?q=${consulta(d)}`;
  return null;
}

export function abrirComoLlegar(d: Destino): void {
  if (!coords(d) && !d.dir && !d.nombre) return;
  const tel = typeof navigator !== "undefined" ? urlTelefono(d, navigator.userAgent) : null;
  // Un enlace que se toca (no window.location): el sistema lo abre en su app de mapas y la pantalla no se va de To'Latino.
  const a = document.createElement("a");
  a.href = tel ?? urlComoLlegar(d); a.rel = "noopener"; a.dataset.comoLlegar = "1";
  if (!tel) a.target = "_blank";
  document.body.appendChild(a); a.click(); a.remove();
}
