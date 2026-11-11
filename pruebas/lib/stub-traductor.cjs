// SOLO PRUEBAS (nunca se publica): imita la API de LibreTranslate (/detect, /translate, /languages) para probar lib/traductor.ts
// sin el servicio real. Las traducciones son marcadas «[stub→es]» para que nadie las confunda con una traducción de verdad.
// GET /__n = cuántas llamadas a /translate y /detect · GET /__lento?ms=N = responde tarde · GET /__reset.
const http = require('http');
const PORT = Number(process.argv[2] || 5099);
let n = { translate: 0, detect: 0 }, lento = 0;
const EN = /\b(the|and|is|are|you|does|anyone|know|for|with|thanks|this|that|great|good|my|was|we|they|please|neighbors?|old)\b/gi;
const ES = /\b(el|la|los|las|que|de|y|es|por|para|con|gracias|una?|muy|bueno|mi|vecinos?|alguien|dónde|donde)\b/gi;
const cuerpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const json = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/__n') return json(n);
  if (u.pathname === '/__reset') { n = { translate: 0, detect: 0 }; lento = 0; return json({ ok: true }); }
  if (u.pathname === '/__lento') { lento = Number(u.searchParams.get('ms') || 0); return json({ lento }); }
  if (u.pathname === '/languages') return json([{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }]);
  const b = await cuerpo(req);
  if (lento) await new Promise((r) => setTimeout(r, lento));
  if (u.pathname === '/detect') {
    n.detect++;
    const q = String(b.q || ''), e = (q.match(EN) || []).length, s = (q.match(ES) || []).length;
    return json([{ language: e > s ? 'en' : 'es', confidence: e === s ? 30 : 90 }]);
  }
  if (u.pathname === '/translate') {
    n.translate++;
    if (!b.q || !b.source || !b.target) return json({ error: 'faltan datos' }, 400);
    return json({ translatedText: `[stub→${b.target}] ${b.q}` });
  }
  json({ error: 'no' }, 404);
}).listen(PORT, '127.0.0.1', () => console.log('stub traductor en', PORT));
