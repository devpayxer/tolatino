/* 8a · Humo de Android (cdp.mjs eval): una página del origen local (https://localhost: «Sin señal» o una isla) funciona sin red: React la
   hidrató (sus /_next/static salen del paquete) y el JS de Capacitor está, con el almacén del teléfono (TLLocal) si la app lo trae. */
JSON.stringify({
  hidratada: typeof window.next === "object" && window.next !== null,
  tllocal: !!(window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable("TLLocal")),
});
