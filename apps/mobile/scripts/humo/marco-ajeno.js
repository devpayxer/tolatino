/* 8a · Humo de Android (cdp.mjs eval): un iframe de OTRO origen (srcdoc con sandbox = origen opaco, como un tercero embebido) busca el
   puente nativo: Capacitor, androidBridge, los objetos *AndroidInterface de Capacitor y cualquier otro objeto Java inyectado. Responde
   "false" si no ve ninguno, o la lista de lo que ve. El humo exige "false" en las cuatro apps (guardián puenteSoloNuestroOrigen). */
new Promise((ok) => {
  const f = document.createElement("iframe");
  f.srcdoc = "<script>" +
    "var n=['Capacitor','androidBridge','CapacitorHttpAndroidInterface','CapacitorCookiesAndroidInterface']" +
    ".concat(Object.getOwnPropertyNames(window).filter(function(k){return /AndroidInterface$|Bridge$/.test(k)}));" +
    "var v=n.filter(function(k,i){return n.indexOf(k)===i&&typeof window[k]!=='undefined'});" +
    "parent.postMessage(v.length?v.join(','):'false','*')<\/script>";
  f.sandbox = "allow-scripts";
  addEventListener("message", (e) => { if (e.source === f.contentWindow) ok(e.data); });
  document.body.appendChild(f);
  setTimeout(() => ok("sin respuesta"), 3000);
});
