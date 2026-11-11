/* 8a · Humo de Android (cdp.mjs eval): en el marco principal de nuestro origen (la página local), el puente SÍ está (androidBridge, por
   addWebMessageListener) y no queda ningún objeto Java de Capacitor abierto a todos los marcos (*AndroidInterface). */
JSON.stringify({
  puente: typeof window.androidBridge !== "undefined",
  abiertos: Object.getOwnPropertyNames(window).filter((k) => /AndroidInterface$/.test(k)),
});
