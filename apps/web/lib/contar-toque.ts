/* Contar un toque de contacto desde la pantalla (llamar, cómo llegar, compartir, escribir). La ÚNICA vía (guardián toqueSobreviveSalida).
   Casi siempre la página se va en el mismo instante: tel:, el mapa del teléfono, la hoja de compartir. Una acción del servidor (un fetch normal,
   y además en cola del enrutador) se cancelaba en Safari al abrir tel: y el toque no se contaba (CI 45042985880: tarAK en iPhone SE e iPad);
   en el iPhone y el iPad está la mayoría de los vecinos, y es la cifra que el negocio más mira en su panel.
   Por eso sale con navigator.sendBeacon: el navegador lo pone en su propia cola en el momento del toque y lo entrega aunque la página se vaya o
   se corte (en WebKit va aparte de la página, no se cancela con ella). Si no hay sendBeacon o no lo acepta, fetch con keepalive (lo mismo,
   donde exista). Nunca se espera la respuesta: tel: tiene que salir del propio toque (iOS lo exige) y la respuesta no dice nada (204).
   Cuerpo de texto (sin preflight; el servidor lo lee como JSON y lo acota a 512 bytes). Las reglas están en el servidor (lib/toques.ts). */
export type Toque = "call" | "whatsapp" | "directions" | "share" | "calendar" | "copy" | "message";
const RUTA = "/api/toque";

function mandar(d: Record<string, string>): void {
  const cuerpo = JSON.stringify(d);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(RUTA, new Blob([cuerpo], { type: "text/plain;charset=UTF-8" }))) return;
  } catch { /* sigue con fetch */ }
  try {
    void fetch(RUTA, { method: "POST", body: cuerpo, keepalive: true, credentials: "same-origin", headers: { "content-type": "text/plain;charset=UTF-8" } }).catch(() => undefined);
  } catch { /* sin red: no se insiste */ }
}

/* Un toque en un negocio. */
export function contarToque(id: string, kind: Toque, origen: string): void {
  mandar({ id, kind, origen });
}

/* «Llamar» en una semilla (un negocio recomendado que aún no reclamó su página): siempre «call». */
export function contarToqueSemilla(id: string, origen: string): void {
  mandar({ semilla: id, origen });
}
