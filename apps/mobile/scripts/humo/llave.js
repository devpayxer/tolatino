// 8d · Humo de TLLlave en la cáscara (lo evalúa humo-android.sh por DevTools): ¿está el plugin?, ¿qué dice disponible()? y ¿obtener() sin estar
// activas se niega con «opciones» (sin abrir el diálogo del sistema)? Devuelve un JSON en texto.
(async () => {
  const C = window.Capacitor;
  const cabecera = !!(C && Array.isArray(C.PluginHeaders) && C.PluginHeaders.some((h) => h.name === "TLLlave"));
  const P = cabecera ? ((C.Plugins && C.Plugins.TLLlave) || (C.registerPlugin && C.registerPlugin("TLLlave"))) : null;
  const out = { plugin: !!P };
  if (!out.plugin) return JSON.stringify(out);
  out.disponible = await P.disponible().catch((e) => String(e && e.message));
  out.obtener = await P.obtener({ opciones: JSON.stringify({ rpId: "pruebas.tolatino.com", challenge: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }) }).then(() => "resolvió").catch((e) => (e && e.code) || String(e && e.message));
  return JSON.stringify(out);
})()
