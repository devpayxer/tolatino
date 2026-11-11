#!/usr/bin/env node
/* 8a · Humo de las cáscaras en el emulador (CI): habla con el WebView de una app de pruebas por el protocolo de DevTools (los builds de pruebas
   dejan depurar el WebView; los de producción no) para ver lo que de verdad muestra la cáscara.
   Uso: node cdp.mjs <puerto> titulo                 → imprime el título y la URL de la página
        node cdp.mjs <puerto> ir <ruta>              → navega (en el origen de la página) y espera
        node cdp.mjs <puerto> eval "<expresión>"      → imprime el resultado
   Sin dependencias (WebSocket de Node 22). */
const [puerto, op, arg] = process.argv.slice(2);
const L = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
const p = L.find((x) => x.type === "page");
if (!p) { console.error("✗ sin página en el WebView"); process.exit(1); }
const ws = new WebSocket(p.webSocketDebuggerUrl);
await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
let id = 0;
const pedir = (method, params = {}) => new Promise((ok) => { const n = ++id; ws.addEventListener("message", function f(e) { const m = JSON.parse(e.data); if (m.id === n) { ws.removeEventListener("message", f); ok(m.result); } }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluar = async (expression) => (await pedir("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))?.result?.value;
if (op === "titulo") console.log(JSON.stringify({ titulo: await evaluar("document.title"), url: await evaluar("location.href"), texto: await evaluar("document.body.innerText.slice(0, 400)") }));
else if (op === "ir") { await evaluar(`location.href = location.origin + ${JSON.stringify(arg)}`); await new Promise((r) => setTimeout(r, 6000)); console.log("ok"); }
else if (op === "eval") console.log(JSON.stringify(await evaluar(arg)));
ws.close();
