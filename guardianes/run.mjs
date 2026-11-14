#!/usr/bin/env node
/* Guardianes del build (decisión N). Cada uno vigila una CLASE de problema y rompe el build si la encuentra.
   Regla de oro: un guardián se prueba al revés (se inyecta el defecto y debe fallar) antes de confiar en él.
   Uso: node guardianes/run.mjs   (corre todos)   ·   node guardianes/run.mjs --solo secretos */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { AUDIENCIAS, TEMAS, audienciaPorNombre, faseInterna, leerAyuda } from "../scripts/ayuda/forma.mjs";
// 8i · Las fichas y la privacidad: el guardián usa el MISMO código que genera las salidas (y fija aquí lo que no se puede aflojar).
import { LIMITES as LIMITES_FICHAS, SUPERLATIVOS as SUPERLATIVOS_FICHA, salida as salidaFichas } from "../apps/mobile/scripts/fichas.mjs";
import { problemas as problemasPrivacidad, salidas as salidasPrivacidad, xcprivacy as xcprivacyDe } from "../apps/mobile/scripts/privacidad.mjs";
// 9d · El mapa de datos: el guardián revisa lo mismo que se aplica (las filas de data_map, la semilla y los problemas del mapa).
import { filas as filasMapa, leer as leerMapa, problemas as problemasMapa, semilla as semillaMapa, SEMILLA as SEMILLA_MAPA } from "../scripts/datos/mapa.mjs";
// 9e · Las páginas legales: el guardián lee docs/legal/ con el MISMO código que el indexador (forma, pares ES/EN, sha256).
import { paginasLegales } from "../scripts/legal/indexar.mjs";
import { BORRADOR as BORRADOR_LEGAL, CLAVES as CLAVES_LEGALES } from "../scripts/legal/forma.mjs";
// 9f · Las cadenas de la interfaz: el guardián usa el MISMO extractor que genera apps/web/lib/cms-cadenas.json.
import { cadenasDelCodigo, comoJson as cmsComoJson, SALIDA as CMS_SALIDA } from "../scripts/cms/extraer.mjs";

const solo = process.argv.includes("--solo") ? process.argv[process.argv.indexOf("--solo") + 1] : null;
// 9f · Lo que el extractor saca del código (si el código no se deja leer, el guardián lo dice).
let CMS = { errores: [], cadenas: [] };
if (!solo || /^(cadenaConLlave|lineaFijaBloqueada|cmsConLimite|cuentaBorradaBilingue|idioma)$/.test(solo)) { try { CMS = await cadenasDelCodigo(); } catch (e) { CMS = { errores: [`el extractor de cadenas falló: ${e.message}`], cadenas: [] }; } }
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
// Incluye los archivos nuevos que todavía no están en git (5 nov, 1l: corrían limpios en local y la CI los cazó).
const archivos = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter((f) => f && existsSync(f));
// .github/ también: un flujo de CI podría apuntar la semilla o un secreto a producción (5 nov: no se revisaba).
const codigo = archivos.filter((f) => /^(apps|packages|services|guardianes|infra|scripts|\.github)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs|css|sh|ya?ml|json)$/.test(f));
const fallos = [];
const falla = (g, f, linea, msg) => fallos.push(`[${g}] ${f}${linea ? ":" + linea : ""} — ${msg}`);
// 8i · Avisos: lo que todavía no rompe el build (9a: las secciones pendientes del Super Admin en sinEnConstruccion, hasta TOLATINO_FASE=9). Se imprimen siempre.
const avisos = [];

/* Texto de un archivo sin comentarios (los guardianes de la Comunidad miran código, no prosa) y el cuerpo de una función de primer nivel. */
const sinComent = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
/* La última definición de una función de la base en las migraciones (una migración nueva puede reemplazarla). */
const ultimaFn = (nombre) => { let b = ""; for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) { const t = readFileSync(`packages/db/migrations/${x}`, "utf8"); const re = new RegExp(`create or replace function ${nombre}\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`, "g"); for (const m of t.matchAll(re)) b = m[1]; } return b; };
/* Las filas del catálogo config_keys en todas las migraciones que lo amplían (0105 Comunidad, 0106 Eventos…). */
const catalogoConfig = () => { const out = []; for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) { const t = readFileSync(`packages/db/migrations/${x}`, "utf8"); if (!/insert into config_keys/.test(t)) continue; for (const m of t.matchAll(/^\s*\('([a-z0-9_]+)', (-?\d+), (-?\d+), (-?\d+), '\{/gm)) out.push({ k: m[1], a: +m[2], b: +m[3], d: +m[4], f: `packages/db/migrations/${x}` }); } return out; };
/* El cuerpo de un método de Java (desde su firma hasta la llave que lo cierra, contando llaves). */
const cuerpoJava = (t, nombre) => { const i = t.search(new RegExp(`\\b\\w+ ${nombre}\\([^)]*\\)\\s*\\{`)); if (i < 0) return ""; let n = 0; for (let j = t.indexOf("{", i); j < t.length; j++) { if (t[j] === "{") n++; else if (t[j] === "}" && --n === 0) return t.slice(i, j + 1); } return t.slice(i); };
/* 9b-3 · Tipo de cada columna (tabla → columna → tipo) según las migraciones, para parametroSinTipo. */
let _tipos = null;
const normTipo = (t) => { t = t.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  return ({ int: "integer", int4: "integer", int8: "bigint", int2: "smallint", bool: "boolean", varchar: "text", "character varying": "text", "timestamp with time zone": "timestamptz", float8: "double precision", serial: "integer", bigserial: "bigint" })[t] ?? t; };
function tiposDeColumnas() {
  if (_tipos) return _tipos;
  _tipos = new Map();
  const col = (tb, c, ty) => { if (/^(primary|unique|check|foreign|constraint|exclude|like)$/i.test(c)) return; (_tipos.get(tb) ?? _tipos.set(tb, new Map()).get(tb)).set(c, normTipo(ty)); };
  const TIPO = "((?:timestamp with time zone|double precision|character varying|[a-z_0-9]+)(?:\\s*\\([^)]*\\))?(?:\\[\\])?)";
  for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) {
    const t = readFileSync(`packages/db/migrations/${x}`, "utf8").replace(/--.*$/gm, "");
    for (const m of t.matchAll(/create (?:unlogged )?table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\)/gi)) {
      for (const l of m[2].split("\n")) { const c = new RegExp(`^\\s*(\\w+)\\s+${TIPO}`, "i").exec(l); if (c) col(m[1], c[1], c[2]); }
    }
    for (const m of t.matchAll(new RegExp(`alter table (?:if exists )?(\\w+) add column (?:if not exists )?(\\w+) ${TIPO}`, "gi"))) col(m[1], m[2], m[3]);
  }
  return _tipos;
}
/* Los tipos que cada $n sin «::» recibe en una consulta (lo que Postgres deduciría). */
function deducirParametros(q, tipos) {
  const out = new Map(), pon = (n, ty) => { if (ty) (out.get(n) ?? out.set(n, new Set()).get(n)).add(ty); };
  const ins = /\binsert into (\w+)\s*(?:as \w+\s*)?\(([^)]*)\)\s*values\s*\(/i.exec(q);
  const upd = /\bupdate (\w+)(?:\s+(?:as\s+)?(?!set\b)(\w+))?\s+set\b/i.exec(q);
  const sel = /\bfrom (\w+)(?:\s+(?:as\s+)?(?!where\b|join\b|left\b|order\b|group\b|limit\b|on\b|inner\b|cross\b|for\b)(\w+))?/i.exec(q);
  const base = ins ? { tb: ins[1], al: null } : upd ? { tb: upd[1], al: upd[2] ?? null } : sel ? { tb: sel[1], al: sel[2] ?? null } : null;
  const cols = base ? tipos.get(base.tb) : null;
  if (ins && cols) {
    // La lista de valores, partida por comas de primer nivel.
    let i = ins.index + ins[0].length, d = 1, cur = "";
    const vals = [];
    for (; i < q.length; i++) { const ch = q[i]; if (ch === "(") d++; if (ch === ")") d--; if (d === 0) break; if (ch === "," && d === 1) { vals.push(cur.trim()); cur = ""; } else cur += ch; }
    vals.push(cur.trim());
    const nombres = ins[2].split(",").map((x) => x.trim());
    vals.forEach((v, k) => { const p = /^\$(\d+)$/.exec(v); if (p && nombres[k]) pon(p[1], cols.get(nombres[k])); });
  }
  if (cols) {
    // Una columna sin tabla delante solo se resuelve si la consulta nombra UNA tabla (con subconsultas o joins, «id» puede ser de otra).
    const una = [...q.matchAll(/\b(?:from|join|update|into)\s+(\w+)/gi)].length === 1;
    const ref = (a, c) => ((!a && una) || (a && (a === base.al || a === base.tb) && !new RegExp(`\\b(?:from|join)\\s+\\w+\\s+(?:as\\s+)?${a}\\b`, "i").test(q.replace(base.tb + " " + (base.al ?? ""), "")))) ? cols.get(c) : null;
    for (const m of q.matchAll(/(?:\b(\w+)\.)?\b(\w+)\s*(?:=|<>|<=|>=|<|>)\s*\$(\d+)(?![\d:])/g)) pon(m[3], ref(m[1], m[2]));
    for (const m of q.matchAll(/\$(\d+)(?![\d:])\s*(?:=|<>|<=|>=|<|>)\s*(?:\b(\w+)\.)?\b(\w+)\b(?!\s*\()/g)) pon(m[1], ref(m[2], m[3]));
  }
  return out;
}
/* 9d · Tablas y columnas de las migraciones (create table, cada «add column» de un alter, nombres entre comillas y «rename to»), para el mapa de
   datos. Devuelve { cols: Map(tabla → Set(columna)), renombre: Map(viejo → nuevo) }. */
let _cols = null;
function columnasMigraciones() {
  if (_cols) return _cols;
  const cols = new Map(), renombre = new Map(), refsUsers = [], pon = (t, c) => (cols.get(t) ?? cols.set(t, new Set()).get(t)).add(c);
  for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) {
    const t = readFileSync(`packages/db/migrations/${x}`, "utf8").replace(/--.*$/gm, "");
    for (const m of t.matchAll(/create (?:unlogged )?table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\)/gi))
      for (const d of defsTabla(m[2])) { const c = /^"?(\w+)"?\s+[a-z]/i.exec(d); if (c && !/^(primary|unique|check|foreign|constraint|exclude|like)$/i.test(c[1])) { pon(m[1], c[1]); if (/\breferences users\b/i.test(d)) refsUsers.push([x, m[1], c[1]]); } }
    for (const st of t.split(";")) {
      const a = /^\s*alter table (?:if exists )?(?:only )?(\w+)\b/i.exec(st);
      if (!a) continue;
      for (const m of st.matchAll(/add column (?:if not exists )?"?(\w+)"?([^,]*)/gi)) { pon(a[1], m[1]); if (/\breferences users\b/i.test(m[2])) refsUsers.push([x, a[1], m[1]]); }
      for (const m of st.matchAll(/rename column "?(\w+)"? to "?(\w+)"?/gi)) pon(a[1], m[2]);
      const r = /rename to (\w+)/i.exec(st); if (r) renombre.set(a[1], r[1]);
    }
  }
  for (const [v, n] of renombre) for (const c of cols.get(v) ?? []) pon(n, c);
  return (_cols = { cols, renombre, refsUsers });
}
/* Las definiciones de una tabla separadas por las comas de primer nivel (varias columnas en una línea; un check con comas dentro). */
function defsTabla(cuerpo) {
  const out = []; let d = 0, cur = "";
  for (const ch of cuerpo) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += ch; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const cuerpoFn = (t, nombre) => { const i = t.search(new RegExp(`\\n(?:export )?(?:async )?function ${nombre}\\(`)); if (i < 0) return ""; const j = t.indexOf("\n}", i + 1); return t.slice(i, j < 0 ? undefined : j + 2); };

const guardianes = {
  /* 1. Ningún secreto en el repo (regla Q y U). */
  secretos() {
    const patrones = [
      [/sk-ant-[A-Za-z0-9_-]{20,}/, "clave de Anthropic"],
      [/sk_(live|test)_[A-Za-z0-9]{16,}/, "clave de Stripe"],
      [/AKIA[0-9A-Z]{16}/, "clave de AWS"],
      [/-----BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY-----/, "llave privada"],
      [/(password|contrasena|secret|token|api[_-]?key)\s*[:=]\s*["'][^"'\s]{12,}["']/i, "secreto escrito a mano"],
    ];
    for (const f of archivos) {
      if (/\.(png|jpe?g|gif|webp|svg|woff2?|ico|lock)$/.test(f) || f.startsWith("docs/diseno/")) continue;
      const lineas = readFileSync(f, "utf8").split("\n");
      lineas.forEach((l, i) => {
        for (const [re, que] of patrones) if (re.test(l) && !/GUARDIAN-OK/.test(l)) falla("secretos", f, i + 1, que);
      });
    }
  },

  /* 2. Colores solo por tokens: ningún hex a pelo fuera de packages/ui/src/tokens.css (regla 7 del CLAUDE.md). */
  tokens() {
    for (const f of codigo) {
      if (f === "packages/ui/src/tokens.css" || !/\.(tsx?|jsx?|css)$/.test(f)) continue;
      const lineas = readFileSync(f, "utf8").split("\n");
      lineas.forEach((l, i) => {
        if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/.test(l) && !/GUARDIAN-OK/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l))
          falla("tokens", f, i + 1, "color hex a pelo; usar un token del sistema");
      });
    }
  },

  /* 3. Nada de datos de ejemplo apuntando a producción. */
  semilla() {
    for (const f of codigo) {
      const t = readFileSync(f, "utf8");
      if (/TOLATINO_ENTORNO\s*[:=]\s*["']?produccion/.test(t) && /seed|semilla/i.test(t)) falla("semilla", f, 0, "semilla configurada contra producción");
      // La semilla de pruebas solo la puede invocar el despliegue del sandbox (y la define migrar.sh). El CI la aplica en una
      // base desechable (proyecto «ci») para probar que se puede volver a aplicar.
      // 8i · Y el job «capturas» de tiendas.yml (también una base desechable del CI, para las capturas de las fichas). 9b-3 · Y la carga (carga.yml): otra base desechable del CI.
      if (/(--semilla-pruebas|infra\/pruebas\/semilla)/.test(t) && !/^(infra\/pruebas\/|packages\/db\/migrar\.sh$|scripts\/semilla\/|guardianes\/|\.github\/workflows\/(ci|tiendas|carga)\.yml$)/.test(f))
        falla("semilla", f, 0, "la semilla de pruebas se llama desde fuera del sandbox");
    }
    // 9o · Ni un archivo de infra/pruebas/semilla alcanzable desde producción: el despliegue de producción, el paquete común, el ensayo y los scripts de
    // producción no nombran la semilla fuera de sus comentarios (ni SEMILLA_DIR, ni --semilla-pruebas, ni la carpeta).
    for (const f of archivos) {
      if (!/^(infra\/(produccion|comun|ensayo)\/|scripts\/produccion\/)/.test(f) || !/\.(sh|ya?ml|conf|tpl|json|mjs)$|tolatino-sync$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (!/^\s*(#|\/\/|\*)/.test(l) && /semilla|SEMILLA_DIR|infra\/pruebas\/semilla/i.test(l.replace(/#.*$/, ""))) falla("semilla", f, i + 1, "la semilla de pruebas no se alcanza desde producción"); });
    }
  },

  /* 3b. El código de entrada en «modo pruebas» jamás en producción (decisión E2). */
  modoPruebas() {
    for (const f of archivos) {
      if (!/(^|\/)(infra\/produccion|\.env\.produccion)/.test(f) && !/produccion/.test(f)) continue;
      if (/TOLATINO_SMS_MODO\s*[:=]\s*["']?pruebas/.test(readFileSync(f, "utf8"))) falla("modoPruebas", f, 0, "modo pruebas del código en un archivo de producción");
    }
    const ent = readFileSync("apps/web/lib/entorno.ts", "utf8");
    if (!/ENTORNO === "produccion" && MODO_SMS === "pruebas"[\s\S]{0,40}throw/.test(ent)) falla("modoPruebas", "apps/web/lib/entorno.ts", 0, "falta el candado de tiempo de ejecución");
    // 9o · El compose de producción manda el código por Telnyx (sin él, el candado de arriba no deja arrancar la app) y ni producción ni el ensayo nombran
    // un simulador, un modo de pruebas o la dirección de un simulador.
    if (existsSync("infra/produccion/compose-app.yml") && !/\n\s+TOLATINO_SMS_MODO: telnyx\n/.test(readFileSync("infra/produccion/compose-app.yml", "utf8"))) falla("modoPruebas", "infra/produccion/compose-app.yml", 0, "la app de producción sin TOLATINO_SMS_MODO: telnyx");
    for (const f of archivos) {
      if (!/^infra\/(produccion|ensayo)\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (!/^\s*#/.test(l) && /TOLATINO_PAGOS_SIMULADOR|TOLATINO_COMPA_MOTOR|TOLATINO_CORREO_MODO|_API_BASE\b|_API_URL\b|staff_mfa_pruebas|SMS_MODO[:=]\s*["']?pruebas/.test(l)) falla("modoPruebas", f, i + 1, "un simulador o un modo de pruebas en producción"); });
    }
  },

  /* 3c. Un componente de servidor no puede usar piezas del sistema a través de un objeto del navegador
     (p. ej. <A.KpiRow>): en el servidor llegan vacías y React falla (error #130, 5 nov). Importarlas directo. */
  servidorCliente() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/.*\.tsx$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (/^\s*["']use client["']/.test(t)) continue;
      t.split("\n").forEach((l, i) => { if (/<[A-Z][A-Za-z]*\.[A-Z]/.test(l)) falla("servidorCliente", f, i + 1, "componente de servidor usando <Objeto.Pieza>: importa la pieza directo de @tolatino/ui"); });
    }
  },

  /* 4id. Un componente de cliente («use client») no importa VALORES de un módulo del servidor (import "server-only"): solo tipos
     (7 nov: Dealer.tsx importó una función de lib/autos-publico.ts y el build se cayó). Lo que el navegador necesita vive en *-comun.ts. */
  clienteSinServidor() {
    const srv = new Set(codigo.filter((f) => /^apps\/web\/lib\/.*\.ts$/.test(f) && /^import "server-only";/m.test(readFileSync(f, "utf8"))).map((f) => f.replace(/^apps\/web\/lib\//, "").replace(/\.ts$/, "")));
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use client["']/.test(t)) continue;
      for (const m of t.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+"@\/lib\/([^"]+)"/g)) {
        if (m[1] || !srv.has(m[3])) continue;
        const valores = m[2].split(",").map((x) => x.trim()).filter((x) => x && !/^type\s/.test(x));
        if (valores.length) falla("clienteSinServidor", f, t.slice(0, m.index).split("\n").length, `importa ${valores.join(", ")} de lib/${m[3]}.ts (server-only): en el cliente solo tipos; lo demás va en un *-comun.ts`);
      }
    }
  },

  /* 3d. Ningún enlace a una pantalla que no existe (5 nov: «/ciudad» del encabezado no tenía página).
     Toda ruta literal en router.push/replace, href o Link debe casar con un page.tsx de apps/web/app
     (los grupos «(app)» no cuentan en la URL; «[slug]» acepta cualquier segmento). */
  rutasVivas() {
    const paginas = archivos.filter((f) => /^apps\/web\/app\/.*page\.tsx$/.test(f) || f === "apps/web/app/page.tsx")
      .map((f) => f.replace(/^apps\/web\/app/, "").replace(/\/page\.tsx$/, "").split("/").filter((s) => s && !/^\(.*\)$/.test(s)))
      // «[[...r]]» (opcional, cualquier cantidad de segmentos) casa con nada o con /lo/que/sea.
      .map((seg) => new RegExp("^/" + seg.map((s) => (/^\[\[\.\.\..*\]\]$/.test(s) ? "\u0000" : /^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/").replace(/\/?\u0000/, "(?:/.*)?") + "/?$"));
    // 8g · Una ruta de API con «[param]» (p. ej. /api/pases/apple/[codigo]) acepta cualquier segmento ahí, como las páginas.
    const apis = archivos.filter((f) => /^apps\/web\/app\/.*route\.ts$/.test(f)).map((f) => f.replace(/^apps\/web\/app/, "").replace(/\/route\.ts$/, ""))
      .map((a) => ({ startsWith: (r) => new RegExp("^" + a.split("/").map((s) => (/^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/") + "(?:/|$)").test(r) }));
    for (const f of codigo) {
      if (!/^apps\/web\/(app|lib)\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/(?:\.push|\.replace|redirect|href[=:]\s*\{?)\s*\(?\s*[`"'](\/[^`"'?#\s]*)/g)) {
          let r = m[1].split("${")[0];
          if (m[0].includes("`") && m[1].includes("${")) r = r.replace(/\/[^/]*$/, "/x"); // `/c/${slug}` → /c/x
          // Archivos de apps/web/public (fuentes, logos): existen como archivo o, si la ruta lleva ${…}, su carpeta.
          if (existsSync("apps/web/public" + r) || (m[1].includes("${") && existsSync("apps/web/public" + r.replace(/\/[^/]*$/, "")) && r.replace(/\/[^/]*$/, "") !== "")) continue;
          if (!r || r === "/" ? false : r.startsWith("/api/") ? !apis.some((a) => a.startsWith(r)) : !paginas.some((re) => re.test(r.replace(/\/$/, ""))))
            falla("rutasVivas", f, i + 1, `enlace a «${m[1]}» y no existe esa pantalla`);
        }
      });
    }
  },

  /* 3e. El build no descarga nada de terceros (5 nov: next/font/google falló y tumbó el CI). Fuentes = archivos
     del repo con next/font/local. */
  buildSinRed() {
    for (const f of codigo) {
      if (!/\.(tsx?|jsx?|mjs|css)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(l) && !/GUARDIAN-OK/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l))
          falla("buildSinRed", f, i + 1, "fuente descargada de Google en el build; usar next/font/local con app/fuentes");
      });
    }
  },

  /* 3f. Panel del negocio: toda acción del servidor revisa en el servidor que la persona sea miembro activo con acceso
     a esa parte (5 nov, 1h). Cada «export async function» de app/panel/acciones*.ts debe pasar por entrar(…) /
     accesoPanel(…) antes de tocar la base. */
  accionesConAcceso() {
    for (const f of codigo) {
      const admin = /^apps\/web\/app\/admin\/acciones[^/]*\.ts$/.test(f);
      if (!admin && !/^apps\/web\/app\/panel\/acciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use server["']/.test(t)) falla("accionesConAcceso", f, 0, "las acciones del panel van en un archivo «use server»");
      const partes = t.split(/\nexport async function /).slice(1);
      for (const p of partes) {
        const nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, 1500);
        // Super Admin (5 nov, 1i): requerir()/staff()/quien() o el envoltorio hacer() que los llama.
        const iAcc = cuerpo.search(admin ? /await (requerir|staff|quien|arrancar|hacer)\(|return hacer\(/ : /await (entrar|accesoPanel)\(|(return|await) hacer\(/), iDb = cuerpo.search(/db\(\)|tx\(/);
        if (iAcc < 0 || (iDb >= 0 && iDb < iAcc)) falla("accionesConAcceso", f, 0, `«${nombre}» no revisa ${admin ? "el permiso del equipo" : "el acceso al panel"} antes de usar la base`);
      }
    }
  },

  /* 3f-bis. Las acciones del lado del cliente (app/(app)/…/acciones*.ts) revisan que la llamada venga de nuestra página
     (mismoOrigen) antes de escribir (6 nov, 2e: enviarPedido, retenerMesa y enviarMesa no lo hacían). Una acción que
     solo lee lleva «// solo lectura» justo encima. */
  clienteMismoOrigen() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/(.*\/)?acciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8"), partes = t.split(/\nexport async function /);
      for (let i = 1; i < partes.length; i++) {
        const p = partes[i], nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, p.indexOf("\n}") + 1 || 1500);
        if (/\/\/ solo lectura\s*$/.test(partes[i - 1])) continue;
        // Vale también un ayudante del archivo que lo revisa primero (p. ej. entrar() en recuperar).
        const ayudantes = [...t.matchAll(/\nasync function (\w+)\([^)]*\)[^{]*\{\n\s*if \(!\(await mismoOrigen\(\)\)\)/g)].map((m) => m[1]);
        if (ayudantes.some((h) => new RegExp(`await ${h}\\(`).test(cuerpo))) continue;
        if (!/await mismoOrigen\(\)/.test(cuerpo)) falla("clienteMismoOrigen", f, 0, `«${nombre}» escribe sin revisar mismoOrigen() (o marcarla «// solo lectura»)`);
      }
    }
  },

  /* 3f-ter. Nunca una fecha en crudo (2026-11-07) como texto para la gente (6 nov, 2e: Hoy mostraba «2026-11-07»).
     Un texto bilingüe { es, en } no toma un campo ymd/day/fecha tal cual: se formatea («sáb 7 nov»). */
  fechaEnCrudo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\b(es|en):\s*[\w.]*\b(ymd|day|fecha)\s*[,}]/.test(l)) falla("fechaEnCrudo", f, i + 1, "fecha en crudo en un texto para la gente; formatéala (p. ej. fechaCorta)"); });
    }
  },

  /* 4e. Ninguna emergencia sin la línea del 911 (plan 4e): «Si huele a gas, hay chispas o humo, sal de la casa y llama al
     911.» La línea vive en lib/solicitudes.ts (LINE911) y la muestran el formulario y el estado de la emergencia. */
  emergencia911() {
    const L = "apps/web/lib/solicitudes.ts", F = "apps/web/app/(app)/emergencia/Emergencia.tsx", S = "apps/web/app/(app)/pre/[num]/Solicitud.tsx";
    if (!existsSync(L)) return;
    if (!/LINE911[^;]*llama al 911/.test(readFileSync(L, "utf8"))) falla("emergencia911", L, 1, "LINE911 debe decir «…sal de la casa y llama al 911.»");
    if (existsSync(F) && !/linea911\.es/.test(readFileSync(F, "utf8"))) falla("emergencia911", F, 1, "el formulario de emergencia debe mostrar la línea del 911");
    if (existsSync(S) && !/em && <div role="note"[^\n]*linea911/.test(readFileSync(S, "utf8"))) falla("emergencia911", S, 1, "el estado de la emergencia debe mostrar la línea del 911");
    // 5a · Comunidad: «Una emergencia no se pregunta aquí: llama al 911.» al escribir (si parece emergencia) y el aviso de Salud en la publicación.
    const CF = "apps/web/lib/comunidad-filtro.ts", CT = "apps/web/app/(app)/comunidad/Tarjeta.tsx", CN = "apps/web/app/(app)/comunidad/nuevo/Nuevo.tsx", CM = "packages/db/migrations/0097_comunidad_base.sql";
    if (existsSync(CF)) {
      const f = readFileSync(CF, "utf8");
      if (!/LINEA911: Bi = \{ es: "[^"]*llama al 911\."/.test(f) || !/EMERGENCIA911: Bi = \{ es: "Una emergencia no se pregunta aquí: llama al 911\."/.test(f)) falla("emergencia911", CF, 1, "LINEA911 y EMERGENCIA911 deben decir «…llama al 911.»");
      if (existsSync(CT) && !/p\.salud && \([\s\S]{0,800}LINEA911\.es/.test(readFileSync(CT, "utf8"))) falla("emergencia911", CT, 1, "una publicación de Salud debe mostrar la línea del 911");
      if (existsSync(CN) && !/emergencia && <div role="note"[^\n]*EMERGENCIA911\.es/.test(readFileSync(CN, "utf8"))) falla("emergencia911", CN, 1, "Publicar debe mostrar la línea del 911 si el texto parece una emergencia");
      if (existsSync(CM) && !/new\.health_notice := [^;]*new\.topic = 'salud'/.test(readFileSync(CM, "utf8"))) falla("emergencia911", CM, 1, "el tema Salud debe encender el aviso del 911 en la base");
    }
  },

  /* 4e. to_char con nombres de día o mes (Dy, Day, Mon, Month) los escribe en inglés aunque la pantalla esté en español
     (6 nov, 4e: «Válido 7 días: hasta el Fri 13 Nov»). Se manda la fecha y se formatea en los dos idiomas (Intl). */
  fechaEnInglesSQL() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (/Jan: "ene"/.test(t)) continue; // el archivo traduce el mes (publica/page.tsx)
      t.split("\n").forEach((l, i) => { if (/to_char\(.{0,200}?'[^']*\b(Dy|Day|Mon|Month|DAY|DY|MON|MONTH)\b[^']*'/.test(l)) falla("fechaEnInglesSQL", f, i + 1, "to_char con nombre de día o mes sale en inglés: formatea la fecha en los dos idiomas"); });
    }
  },

  /* 3f-sexies. Una fecha que viaja al navegador va en ISO completo (…Z o ±hh:mm). to_char con «OF» da «-05», que
     Chrome no lee: new Date() sale inválida y Intl revienta la pantalla (6 nov, 2g: «Tu reseña» quedó en blanco). */
  fechaIsoNavegador() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/to_char\([^)]*SSOF/.test(l)) falla("fechaIsoNavegador", f, i + 1, "to_char con OF no es ISO para el navegador; usa at time zone 'UTC' y \"Z\""); });
    }
  },

  /* 3f-quinquies. Un pedido aceptado y aún no entregado está en cocina, listo o en camino (6 nov, 2f: el delivery «en
     camino» desaparecía de Hoy porque la agenda solo miraba ok/ready). Ningún filtro enumera esos estados a mano: usa enCurso. */
  pedidoEnCurso() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/st === "ok"\s*\|\|\s*\w+\.st === "ready"/.test(l) && !/"out"/.test(l)) falla("pedidoEnCurso", f, i + 1, "filtro de pedidos en curso sin «en camino»; usa enCurso()");
      });
    }
  },

  /* 3f-octies. El id se convierte al tipo de su tabla (6 nov, 2h: «Cerrar» una sesión no cerraba nada porque el id de
     sessions es uuid y la consulta lo pasaba como bigint). Los tipos salen de las migraciones. */
  idSegunTipo() {
    const tipo = new Map();
    for (const f of archivos.filter((x) => /^packages\/db\/migrations\/.*\.sql$/.test(x)))
      for (const m of readFileSync(f, "utf8").matchAll(/create table if not exists (\w+) \(\s*\n?\s*id\s+(uuid|bigint)/g)) tipo.set(m[1], m[2]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/\b(?:from|update)\s+(\w+)(?:\s+\w+)?\s+(?:set\s[^`]*?)?where\s+(?:\w+\.)?id\s*=\s*\$\d+::(bigint|uuid)/g)) {
          const t = tipo.get(m[1]);
          if (t && t !== m[2]) falla("idSegunTipo", f, i + 1, `el id de «${m[1]}» es ${t} y la consulta lo pasa como ${m[2]}`);
        }
      });
    }
  },

  /* 3f-sexies. Nada promete un SMS que no sale (6 nov, 2g-3: el prototipo de Jobs decía «Te avisamos por SMS» y aún no hay
     proveedor de SMS). Las promesas que ya existen están anotadas en LAUNCH-CHECKLIST con su archivo; un archivo nuevo no
     puede sumar otra: di dónde lo ve la persona dentro de To'Latino. */
  /* 9l · SIN EXCEPCIONES: ya no hay promesas «anotadas para después». Cada pantalla que promete un SMS dice qué plantilla la CUMPLE; la plantilla existe con
     SMS (no «nunca») y el código la manda de verdad (un avisar…(…, "clave") o el SMS del código). Al revés: una promesa nueva sin su plantilla, una plantilla
     sin SMS o que nadie manda → falla. */
  promesaSms() {
    const G = "promesaSms";
    const CUMPLIDAS = {
      "apps/web/app/(app)/reserva/[num]/Estado.tsx": ["rsv_ok", "rsv_hoy"], "apps/web/app/(app)/n/[id]/reservar/Detalles.tsx": ["rsv_ok", "rsv_hoy"],
      "apps/web/app/(app)/CiudadSelector.tsx": ["ciudad_abierta"], "apps/web/lib/textos-fijas.ts": ["ciudad_abierta"], "apps/web/lib/textos-acceso.ts": ["ciudad_abierta"],
      "apps/web/app/panel/Equipo.tsx": ["equipo_invitado"], "apps/web/app/panel/acciones-equipo.ts": ["equipo_invitado"],
      "apps/web/lib/textos.ts": ["foto_rep_quitada", "foto_rep_queda"], "apps/web/app/panel/Menu.tsx": ["biz_quedan_pocos"], "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx": ["lay_listo", "lay_pronto"],
      // Lo que explica el camino del SMS (el respaldo del push, lo crítico, el código): lo cumple el SMS del código para entrar (crit, siempre) y el único camino.
      "apps/web/app/(app)/cuenta/avisos/Avisos.tsx": ["cuenta_codigo"], "apps/web/app/admin/IntegracionesPush.tsx": ["cuenta_codigo"], "apps/web/lib/push/admin.ts": ["cuenta_codigo"],
      "apps/web/app/admin/Notificaciones.tsx": ["cuenta_codigo"], "apps/web/app/admin/U360.tsx": ["cuenta_codigo"],
    };
    const sms = new Map(); // clave → ¿lleva SMS? (la última migración que la define)
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) for (const m of readFileSync(`packages/db/migrations/${x}`, "utf8").matchAll(/\(\s*'([a-z0-9_]+)',\s*'(?:crit|tx|mod|biz|mkt|community|events|support)',\s*(?:'\w+'|null),\s*(true|false)(?:,\s*'(siempre|sin_push|nunca)')?/g)) sms.set(m[1], m[2] === "true" && m[3] !== "nunca");
    const enviadas = new Set();
    for (const f of codigo) if (/^apps\/web\/(lib|app)\/.+\.tsx?$/.test(f)) for (const l of sinComent(f).split("\n").filter((x) => /\bavisar\w*\(|tpl: "/.test(x))) for (const m of l.matchAll(/"([a-z]+_[a-z0-9_]+)"/g)) enviadas.add(m[1]);
    if (existsSync("apps/web/lib/sms/codigo.ts") && /tpl: "cuenta_codigo"/.test(sinComent("apps/web/lib/sms/codigo.ts"))) enviadas.add("cuenta_codigo");
    for (const [f, L] of Object.entries(CUMPLIDAS)) for (const k of L) {
      if (!sms.has(k)) falla(G, f, 0, `la plantilla «${k}» que cumple la promesa no existe`);
      else if (!sms.get(k)) falla(G, f, 0, `la plantilla «${k}» no lleva SMS: la promesa no se cumple`);
      else if (!enviadas.has(k)) falla(G, f, 0, `nadie manda «${k}»: la promesa no se cumple`);
    }
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || CUMPLIDAS[f]) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/["'`][^"'`]*(por SMS\b|by SMS\b|We will text|we text you|We text you|te llega un SMS|Le llegó por SMS|Sent by text)/i.test(l) && !/c[oó]digo|code/i.test(l)) falla(G, f, i + 1, "promete un SMS: di qué plantilla lo cumple (CUMPLIDAS en este guardián) o di dónde lo ve en To'Latino");
      });
    }
  },

  /* 3f-octies. La distancia de un negocio a domicilio (sin local) es null: nunca se pinta tal cual (6 nov, 2j: «null MI» en
     Abierto ahora del inicio). Se usa ?? o se pregunta antes (!= null). */
  distanciaNula() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/\$\{\s*[\w.]+\.mi\s*\}\s*MI/.test(l) && !/\.mi\s*!=\s*null/.test(l)) falla("distanciaNula", f, i + 1, "distancia que puede ser null pintada tal cual; usa ?? o pregunta != null");
      });
    }
  },

  /* 3f-septies. Un Button «block» del sistema de diseño va dentro de una fila (display:flex), nunca suelto en una columna
     (6 nov, 2g-3: «Aplicar» en la barra de la vacante salía aplastado dentro de un flex-col). */
  botonEnColumna() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/className="[^"]*\bflex-col\b[^"]*">\s*(\{boton\}|<Button[^>]*\bblock\b)/.test(l)) falla("botonEnColumna", f, i + 1, "Button block dentro de un flex-col; envuélvelo en <div className=\"flex\">");
      });
    }
  },

  /* 3f-quater. Pedidos y reservaciones viven en la misma tabla (operations). Toda consulta que cuente, liste o cambie
     operaciones dice de qué tipo (kind) o va a una sola por su número / id / clave (6 nov, 2e: el vencer de pedidos cerraba
     reservaciones, y el tope de 3 pedidos pendientes contaba mesas). */
  operacionesConTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8"), re = /(from|update) operations\b/g;
      let m;
      while ((m = re.exec(t))) {
        const fin = t.indexOf("`", m.index), q = t.slice(m.index, fin < 0 ? m.index + 600 : fin);
        if (/\bkind\b|\bnumber = |\bid = \$|\.id = \$|client_key|operation_id|where id = /.test(q)) continue;
        falla("operacionesConTipo", f, t.slice(0, m.index).split("\n").length, "consulta sobre operations sin kind (pedido o mesa) ni número/id");
      }
    }
  },

  /* 3g. Un archivo «use server» solo exporta funciones async (5 nov, 1k: una lista exportada desde acciones rompe Next).
     Las constantes compartidas van a lib/. */
  servidorSoloFunciones() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      if (!/^\s*["']use server["']/.test(t)) continue;
      t.split("\n").forEach((l, i) => { if (/^export\s+(const|let|var|class|default\s+(?!async))/.test(l)) falla("servidorSoloFunciones", f, i + 1, "un archivo «use server» solo puede exportar funciones async (y tipos)"); });
    }
  },

  /* 3h. Documentos privados (reclamos, 1j): nginx nunca sirve /medios/privado/, y nada en la app arma una URL pública
     con «privado/». */
  documentosPrivados() {
    const ng = "infra/pruebas/nginx-pruebas.conf";
    if (existsSync(ng) && !/^\s*location \^~ \/medios\/privado\/ \{ return 404; \}/m.test(readFileSync(ng, "utf8"))) falla("documentosPrivados", ng, 0, "falta el bloqueo de /medios/privado/");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/urlPublica\([^)]*privado|["'`]\/medios\/privado/.test(l)) falla("documentosPrivados", f, i + 1, "un documento privado no se sirve por /medios"); });
    }
  },

  /* El historial del admin lo lee una persona: nada de valores internos (estado en inglés, ids) en el antes → después.
     Lo interno va dentro de `ref: { … }` (se guarda, no se muestra). Clase cazada en 1l: «active → Silencio 7 días». */
  auditoriaLegible() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const x = l.replace(/ref: \{[^}]*\}/g, "");
        if (/(before|after): \{[^}]*:\s*[a-z]\w*\.(status|estado|kind|owner|device|user_id|owner_user_id)\s*[,}]/.test(x)) falla("auditoriaLegible", f, i + 1, "valor interno en el historial: tradúcelo o muévelo a ref");
      });
    }
  },

  /* Lo que ve el público solo lee subcategorías vivas (vista subcategorias_vivas): una que el equipo quitó en Catálogo
     no puede seguir saliendo en tarjetas, ficha, mapa o Buscar (1m). El admin y sus libs sí leen la tabla. */
  subcategoriasVivas() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || /^apps\/web\/app\/admin\//.test(f) || /^apps\/web\/lib\/admin[-.]/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\b(from|join)\s+subcategories\b/.test(l)) falla("subcategoriasVivas", f, i + 1, "usa la vista subcategorias_vivas"); });
    }
  },

  /* Analítica: un evento que la base no acepta se pierde en silencio (evento() nunca rompe la pantalla). La lista del
     tipo Evento (lib/eventos.ts) y el check de app_events en la última migración que lo define deben ser idénticas (1n). */
  eventosEnLista() {
    const lib = "apps/web/lib/eventos.ts";
    if (!existsSync(lib)) return;
    const tipo = (readFileSync(lib, "utf8").match(/export type Evento = ([^;]+);/) || [])[1];
    const migs = archivos.filter((f) => /^packages\/db\/migrations\/.*\.sql$/.test(f)).sort().reverse();
    const sql = migs.map((f) => readFileSync(f, "utf8").match(/(?:name\s+text not null|app_events_name_check)\s+check \(name in \(([^)]+)\)\)/)).find(Boolean);
    if (!tipo || !sql) { falla("eventosEnLista", lib, 0, "no encuentro la lista de eventos en el código o en la base"); return; }
    const a = [...tipo.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort().join(","), b = [...sql[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort().join(",");
    if (a !== b) falla("eventosEnLista", lib, 0, `la lista del código (${a}) no es la de la base (${b})`);
  },

  /* 3l. La tarjeta nunca toca el servidor (6 nov, 2d): el número y el código de seguridad los toma Stripe (o, en el sandbox,
     se quedan en el navegador). Ningún archivo de servidor (lib/, acciones "use server", app/api) nombra un número de
     tarjeta ni un CVC. */
  tarjetaEnServidor() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      const servidor = /^apps\/web\/(lib|app\/api)\//.test(f) || /^["']use server["']/.test(t.trimStart());
      if (!servidor) continue;
      t.split("\n").forEach((l, i) => {
        if (/\b(cvc|cvv|card_?number|numero_?tarjeta|numeroTarjeta|cardNumber)\b/i.test(l) && !/GUARDIAN-OK/.test(l)) falla("tarjetaEnServidor", f, i + 1, "un dato de tarjeta (número o CVC) en código de servidor; lo toma Stripe, nunca To'Latino");
      });
    }
  },

  /* 3l-bis. La clave idempotente de una retención incluye la tarjeta (6 nov, 2d: después de un rechazo, al cambiar de
     tarjeta se reusaba la clave del pedido y Stripe devolvía el mismo rechazo). Misma tarjeta = mismo intento; otra = otro. */
  retencionPorTarjeta() {
    const f = "apps/web/lib/cobros.ts", t = readFileSync(f, "utf8");
    t.split("\n").forEach((l, i) => {
      if (/pasarela\.retener\(/.test(l) && !/idem:\s*`[^`]*\$\{x\.pm/.test(l)) falla("retencionPorTarjeta", f, i + 1, "la clave idempotente de la retención debe incluir la tarjeta (x.pm)");
    });
    // El cobro de Pro: la clave lleva el inicio exacto del período (no solo la fecha), la tarjeta y el intento.
    const s2 = "apps/web/lib/suscripcion.ts";
    readFileSync(s2, "utf8").split("\n").forEach((l, i) => {
      if (/idem = `sub-/.test(l) && !(/toISOString\(\)\}/.test(l) && /card_pm/.test(l) && /failed_attempts/.test(l))) falla("retencionPorTarjeta", s2, i + 1, "la clave del cobro de Pro debe llevar el inicio exacto del período, la tarjeta y el intento");
    });
  },

  /* 3n. El botón del sistema de diseño es un botón de verdad (6 nov, 2l: era un <div> sin rol ni teclado). */
  botonAccesible() {
    for (const f of ["packages/ui/src/ds/core/Button.js", "packages/ui/src/ds/core/IconButton.js"]) {
      const t = readFileSync(f, "utf8");
      if (!/role: "button"/.test(t) || !/onKeyDown/.test(t) || !/tabIndex/.test(t)) falla("botonAccesible", f, 1, "botón sin rol, foco o teclado; se arregla en scripts/portar-sistema.mjs (parches Button / IconButton)");
    }
    if (!/"aria-label"/.test(readFileSync("packages/ui/src/ds/core/IconButton.js", "utf8"))) falla("botonAccesible", "packages/ui/src/ds/core/IconButton.js", 1, "IconButton sin nombre (aria-label)");
  },

  /* 3m. El simulador de pagos vive en un solo lugar (6 nov, 2d): solo lib/pagos/pasarela.ts toca sim_intents, y esa
     pasarela no corre el simulador en producción (candado). Ningún otro archivo «cobra» por su cuenta. */
  simuladorAislado() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === "apps/web/lib/pagos/pasarela.ts") continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/\bsim_intents\b/.test(l)) falla("simuladorAislado", f, i + 1, "el simulador de pagos solo se toca desde lib/pagos/pasarela.ts");
      });
    }
    const pas = readFileSync("apps/web/lib/pagos/pasarela.ts", "utf8");
    if (!/ENTORNO === "produccion" \? "apagado" : "simulador"/.test(pas)) falla("simuladorAislado", "apps/web/lib/pagos/pasarela.ts", 1, "sin clave de Stripe, producción debe quedar «apagado», nunca en simulador");
  },

  /* 3k. El dinero lo decide el servidor (6 nov, 2b): lo que manda el teléfono para un pedido (los tipos …In de
     lib/pedir.ts) nunca trae precios, impuestos ni totales; el servidor los calcula del menú al enviar. */
  dineroDelServidor() {
    // 6c · Boletos: lo que manda el teléfono para apartar (BoletosIn) y las acciones de compra traen ids y cantidades, nunca montos.
    const B6 = "apps/web/lib/boletos.ts", A6 = "apps/web/app/(app)/eventos/acciones-boletos.ts";
    if (existsSync(B6)) { const m = /export type BoletosIn = \{([^\n]*)\};/.exec(readFileSync(B6, "utf8")); if (!m) falla("dineroDelServidor", B6, 0, "falta BoletosIn"); else if (/\b(cents|price|precio|total|tax|impuesto|subtotal|descuento|unit|monto)\w*\??:/i.test(m[1])) falla("dineroDelServidor", B6, 0, "BoletosIn trae un monto desde el teléfono; lo calcula el servidor"); }
    // 6d · Cancelar, devolver y las cortesías: el teléfono y el panel mandan códigos y números de orden, nunca cuánto se devuelve.
    // 9k · 3-D Secure, quitar tarjeta y la conciliación: la pantalla manda el PaymentIntent, la tarjeta o la diferencia, nunca un monto (el de la hoja
    // del banco lo decidió el servidor y solo se muestra).
    for (const A of [A6, "apps/web/app/(app)/eventos/acciones-despues.ts", "apps/web/app/panel/acciones-eventos.ts", "apps/web/app/(app)/pago/acciones.ts", "apps/web/app/admin/acciones-conciliacion.ts"])
      if (existsSync(A)) for (const m of readFileSync(A, "utf8").matchAll(/export async function (\w+)\(([^)]*)\)/g)) if (/\b(cents|price|precio|total|monto|descuento|devuelve|refund)\w*\s*:/i.test(m[2])) falla("dineroDelServidor", A, 0, `«${m[1]}» recibe un monto desde el teléfono`);
    const f = "apps/web/lib/pedir.ts";
    if (!existsSync(f)) return;
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/export type (\w+In) = \{([^}]*)\}/g)) {
      if (/\b(cents|price|precio|total|tax|impuesto|subtotal)\w*\??:/i.test(m[2])) falla("dineroDelServidor", f, 0, `«${m[1]}» trae un precio o total desde el teléfono; lo calcula el servidor`);
    }
  },

  /* 3l. Debajo del encabezado de la app (sticky, 57 px en el teléfono) nada se pega con «sticky top-0»: queda tapado
     (6 nov, 2b: chips del menú y barra del checkout). Excepción: pantallas sin encabezado (Buscar, Licencia). */
  pegadoBajoEncabezado() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/.*\.tsx$/.test(f) || /AppShell\.tsx$|\/buscar\/|\/licencia\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\bsticky top-0\b/.test(l)) falla("pegadoBajoEncabezado", f, i + 1, "«sticky top-0» queda debajo del encabezado; usar top-[57px] en el teléfono"); });
    }
  },

  /* 3m. Una conexión en transacción (el cliente «c») no recibe dos consultas a la vez (6 nov, 2b: pg lo deja de aceptar en
     su versión 9 y el orden dentro de la transacción deja de estar garantizado). Prohibido Promise.all con «c» dentro. */
  transaccionEnFila() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      // También cuando el Promise.all ocupa varias líneas (6 nov, 3b: servicios() y contexto() de citas lo hacían así).
      const txt = readFileSync(f, "utf8");
      for (const m of txt.matchAll(/Promise\.all\(\[[\s\S]{0,1600}?\]\)/g))
        if (/(\(c[,)]|\bc\.query\b)/.test(m[0])) falla("transaccionEnFila", f, txt.slice(0, m.index).split("\n").length, "consultas en paralelo sobre el cliente de una transacción; van una tras otra");
    }
  },

  /* 3n. Toda acción auditada sobre un negocio (negocio.* y plan.*) tiene su verbo en el historial del 360° (6 nov, 2o: el
     historial mostraba «plan.cortesia» crudo). Las que no apuntan a un negocio (targetKind distinto) no cuentan. */
  verboEnHistorial() {
    const n360 = "apps/web/app/admin/N360.tsx";
    if (!existsSync(n360)) return;
    const verbos = new Set([...readFileSync(n360, "utf8").matchAll(/"((?:negocio|plan)\.[a-z_.]+)":/g)].map((m) => m[1]));
    for (const f of codigo) {
      if (!/^apps\/web\/(app\/admin\/acciones[^/]*|lib\/[^/]*)\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/targetKind: "(?!business")/.test(l)) return;
        for (const m of l.matchAll(/"((?:negocio|plan)\.[a-z_]+(?:\.[a-z_]+)*)"/g))
          if (!verbos.has(m[1])) falla("verboEnHistorial", f, i + 1, `«${m[1]}» no tiene verbo en el historial del 360° (VERBO en N360.tsx)`);
      });
    }
  },

  /* 3o-quater. Una pantalla de la app del vecino con su propia barra fija abajo («fixed inset-x-0 bottom-0») tiene que
     ser «compacta» en AppShell (sin la barra de pestañas del teléfono); si no, la barra de pestañas la tapa y no se puede
     enviar (6 nov, 3e: «Ayuda con la cita» y todo /cita/ quedaban debajo de Inicio · Negocios · …). */
  barraFijaCompacta() {
    const shell = "apps/web/app/(app)/AppShell.tsx";
    const m = /const compacto = [^\n]*\/\^\\\/\(([^)]*)\)\//.exec(readFileSync(shell, "utf8"));
    if (!m) { falla("barraFijaCompacta", shell, 1, "no encuentro la lista «compacto» de AppShell"); return; }
    const pref = m[1].split("|").map((x) => x.replace(/\\\//g, "/"));
    // 4s: también la barra de un componente importado de otra carpeta (/mercado/{num}/ayuda usa la pantalla de /cita/…).
    const conBarra = (f) => {
      const t = readFileSync(f, "utf8");
      if (/fixed inset-x-0 bottom-0/.test(t)) return true;
      for (const m of t.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) { const p = join(dirname(f), m[1]) + ".tsx"; if (existsSync(p) && /fixed inset-x-0 bottom-0/.test(readFileSync(p, "utf8"))) return true; }
      return false;
    };
    for (const f of codigo) {
      const r = /^apps\/web\/app\/\(app\)\/([^/]+)\/.*\.tsx$/.exec(f);
      if (!r || !conBarra(f)) continue;
      const seg = r[1];
      if (!pref.some((p) => p === seg || p === `${seg}/` || seg.startsWith(p))) falla("barraFijaCompacta", f, 1, `/${seg}/ tiene barra fija abajo pero no es «compacto» en AppShell: la barra de pestañas la tapa`);
    }
  },

  /* 4d. Los montos de una línea del estimado (mano de obra, impuesto, total) los calcula la base con su disparador; el
     código nunca los escribe (6 nov, 4d: el panel y el cliente solo muestran). Y lo que se cobra al liquidar sale de
     capture_target_cents, que solo fija planLiquidar dentro del candado. */
  derivadosDelEstimado() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.(ts|tsx)$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/(insert into|update)\s+estimate_lines\b[^`]*/gi)) if (/\b(labor_cents|tax_cents|line_total_cents)\b/.test(m[0])) falla("derivadosDelEstimado", f, t.slice(0, m.index).split("\n").length, "los montos de la línea los calcula la base (disparador): no se escriben desde el código");
      if (!f.endsWith("lib/estimados.ts")) for (const m of t.matchAll(/capture_target_cents\s*=/g)) falla("derivadosDelEstimado", f, t.slice(0, m.index).split("\n").length, "capture_target_cents solo lo fija lib/estimados.ts (planLiquidar) dentro del candado");
    }
  },

  /* 4d. Un comentario «//» al final de una línea se traga el código que sigue en esa misma línea (6 nov, 4d: en la
     pasarela, «// tarjeta y billeteras… transfer_data: {…}, metadata, expand» dejaba el cobro real de Stripe sin destino:
     el dinero no iba al negocio, y el simulador no lo veía). Si el texto del comentario parece código (dos «clave: valor,»
     o «clave: {»), falla. */
  comentarioTragaCodigo() {
    for (const f of codigo) {
      if (!/^(apps|packages)\/.*\.(ts|tsx|mjs|cjs|js)$/.test(f) || f.includes("/ds/") || f.includes("node_modules")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const k = l.indexOf(", // "); if (k < 0) return;
        const t = l.slice(k + 5);
        if (/\b[a-z_]\w*: (\{|\[|x\.|"[^"]*",)/i.test(t) && /, [a-z_]\w*: /i.test(t)) falla("comentarioTragaCodigo", f, i + 1, "el «//» se traga código de la misma línea: pon el comentario en su propia línea");
      });
    }
  },

  /* 3o-ter. «.find(...)!.» supone que siempre encuentra: si los datos no traen ese elemento, la pantalla se cae entera
     (6 nov, 3d: la página de la silla de Andy daba error 500 por un servicio que él no hace). Se usa «?.» con un valor. */
  findSeguro() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\.find\([^;]*\)!\./.test(l)) falla("findSeguro", f, i + 1, "«.find(...)!.» puede no encontrar: usa «?.» y un valor por defecto"); });
    }
  },

  /* 4g-2. Un rubro que siempre trae valor («belleza» | «auto» | «hogar») usado como verdadero/falso: «rub ? …» es verdad
     también en Belleza y la ayuda de Belleza mostraba el texto de Hogar/Auto. Donde el tipo es RubroAyuda se compara con el
     valor («rub !== "belleza"»). */
  rubroComoBooleano() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const src = readFileSync(f, "utf8");
      if (!/RubroAyuda|CitaAyudaVista/.test(src)) continue;
      src.split("\n").forEach((l, i) => { if (/\b(rub|rubro)\s*(\?(?!\.)|&&)/.test(l)) falla("rubroComoBooleano", f, i + 1, "el rubro siempre tiene valor («belleza» también): compáralo («rub !== \"belleza\"»)"); });
    }
  },

  /* 4f-3. Un parámetro de SQL sin tipo sumado a un intervalo («$5 + interval '48 hours'», «greatest(now(), $5 - …)») hace que
     Postgres no sepa el tipo y la consulta se cae (42804): apartar no se podía mandar. Siempre «$n::timestamptz».
     Prueba de punta a punta no lo ve si nadie toca ese camino; esto sí. */
  parametroSinTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(?<!time zone )\$\d+\s*[-+]\s*interval/.test(l)) falla("parametroSinTipo", f, i + 1, "parámetro de SQL sin tipo junto a un interval: escribe $n::timestamptz (o ::date)"); });
    }
    /* 9b-3 (LAUNCH L176) · «inconsistent types deduced for parameter $n» (salió dos veces; lo cazaba solo la punta a punta si alguien pasaba por
       ahí): el MISMO $n sin tipo en dos lugares de una consulta que le dan tipos distintos (una columna uuid y otra text). Los tipos salen de las
       migraciones (create table / add column); se deduce el tipo de cada $n sin «::» en: la lista de un insert (su columna), «set col = $n» y
       «col = $n» / «$n = col» sobre una columna de la tabla de la consulta (sin alias o con el suyo). Dos tipos distintos → falla. */
    const tipos = tiposDeColumnas();
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/`[^`]*`/g)) {
        for (const [n, ts] of deducirParametros(m[0], tipos)) if (ts.size > 1) falla("parametroSinTipo", f, t.slice(0, m.index).split("\n").length, `$${n} sin tipo recibe ${[...ts].join(" y ")} en la misma consulta (Postgres: «inconsistent types deduced»): escribe $${n}::tipo en cada uso o usa dos parámetros`);
      }
    }
  },

  /* 4j. Privacidad de Salud (fase4-salud-pro.md §3): (1) ningún aviso de Doctores (sal_*, biz_sal_*) lleva el nombre del
     consultorio ni del servicio: en la pantalla bloqueada ya diría demasiado; (2) la nota cifrada (op_private.note_enc) solo
     se escribe o se lee donde toca (crear la cita, el detalle del panel, el borrado a los 30 días): nunca en avisos, correos,
     logs ni el Super Admin. */
  privacidadSalud() {
    for (const f of readdirSync("packages/db/migrations").map((x) => `packages/db/migrations/${x}`)) {
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\('(sal_|biz_sal_)[a-z_]+'/.test(l) && /\{(negocio|servicio|svc|cliente)\}/.test(l)) falla("privacidadSalud", f, i + 1, "un aviso de Salud no lleva {negocio}, {servicio} ni {cliente}: tiene que ser neutro"); });
    }
    const PERMITIDOS = new Set(["apps/web/lib/citas-salud.ts", "apps/web/lib/citas-panel.ts", "apps/web/lib/citas-flujo.ts", "apps/web/lib/citas-pro.ts", "apps/web/lib/cifrado.ts", "apps/web/lib/viajes.ts", "apps/web/lib/envios.ts", "apps/web/lib/ninos-privado.ts", "apps/web/lib/visitas-inm.ts", "apps/web/lib/compa/canales.ts", "apps/web/lib/push/cola.ts", "apps/web/lib/beta.ts", "apps/web/lib/pases/pases.ts", "apps/web/lib/equipo/dos-pasos.ts", "apps/web/lib/sms/index.ts"]); // 9l: el teléfono y el texto cifrados de un SMS se abren solo para mandarlo (el único camino de los SMS) // 9j: el secreto del TOTP del equipo se abre solo para comprobar un código // 8f: el correo de Apple del tester se abre solo para invitarlo por la API y mostrarlo tapado // 8c: el token de push y el contenido cifrado se abren solo para mandarlos · 7h: el teléfono cifrado de una entrada de WhatsApp/SMS (para contestar a ese teléfono) · 4ie: la dirección cifrada de la prueba en casa (crear y ver confirmada) · crear · ver en el panel · borrar a los 30 d · 4y-2: el destinatario de la caja (crear en viajes, ver en envios) // 8g: el token de push del teléfono de Wallet (pass_devices.push_token_enc), solo para mandarle el aviso de cambio
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || PERMITIDOS.has(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/note_enc|descifrar\(/.test(l)) falla("privacidadSalud", f, i + 1, "la nota cifrada de una cita (op_private) solo se toca en lib/citas-salud o lib/citas-pro (crear), lib/citas-panel (ver) o lib/citas-flujo (borrar a los 30 d)"); });
    }
  },

  /* 4m-1. Una reseña pública de Doctores o Profesionales no lleva datos de salud ni del caso (§3): el servidor filtra con
     PRIVADO (lib/resenas-filtro.ts) además de PII, el filtro caza lo que tiene que cazar y deja pasar una reseña normal, nadie
     copia la regla en otro archivo (se desincroniza), y el dato de la cita guardado en la reseña nunca lleva el plan ni el número
     del seguro. */
  resenaPrivada() {
    const F = "apps/web/lib/resenas-filtro.ts", R = "apps/web/lib/resenas.ts";
    if (!existsSync(F) || !existsSync(R)) return;
    const m = /export const PRIVADO = \/(.+)\/([a-z]*);/.exec(readFileSync(F, "utf8"));
    if (!m) { falla("resenaPrivada", F, 1, "falta la regla PRIVADO"); return; }
    const re = new RegExp(m[1], m[2]);
    for (const x of ["Mi A-number es A123456789", "caso IOE1234567890", "me dieron metformina", "tomo 500 mg", "el diagnóstico fue malo", "por la depresión"])
      if (!re.test(x)) falla("resenaPrivada", F, 1, `PRIVADO deja pasar «${x}»`);
    for (const x of ["La doctora habló español y me explicó todo con calma.", "Cobraron lo del total por escrito, sin sorpresas.", "Me atendieron a la hora."])
      if (re.test(x)) falla("resenaPrivada", F, 1, `PRIVADO bloquea una reseña normal: «${x}»`);
    const src = readFileSync(R, "utf8"), L = src.split("\n");
    if (!/if \(PRIVADO\.test\(body\)\) return no\(/.test(src)) falla("resenaPrivada", R, 1, "guardarResena tiene que rechazar el texto con PRIVADO (el servidor decide)");
    L.forEach((l, i) => { if (/seguro\??\.(nombre|last4|plan)|member_last4/.test(l)) falla("resenaPrivada", R, i + 1, "el dato de una reseña no lleva el plan ni el número del seguro: solo si tenía y si lo aceptaron"); });
    for (const f of codigo) {
      if (f === F || !/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/const (PII|PRIVADO) = \//.test(l)) falla("resenaPrivada", f, i + 1, "la regla de lo que una reseña no lleva vive solo en lib/resenas-filtro.ts: impórtala"); });
    }
  },

  /* 4m-2. Las fotos de una ayuda de Salud o Pro son privadas (factura médica, recibo de un trámite): se suben por
     /api/ayuda/foto (bajo «privado/»), se ven solo por /api/ayuda/foto/{id} con permiso, y toda consulta de fotos de ayuda
     pasa por FOTO_AYUDA_SQL (nunca m.url a pelo, que para una privada es la clave del almacenamiento). Y los nombres de
     los motivos de ayuda viven en una sola lista (lib/ayuda-motivos.ts): había dos copias (panel y Super Admin). */
  fotoAyudaPrivada() {
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/select m\.url from media m where m\.owner_kind = 'help'/.test(l)) falla("fotoAyudaPrivada", f, i + 1, "las fotos de una ayuda se leen con FOTO_AYUDA_SQL (las privadas van por /api/ayuda/foto/{id})");
        if (f !== "apps/web/lib/ayuda-motivos.ts" && /(MOT_C|QUI_C)\b.*=|win: \[?"No llegó en la franja"/.test(l) && !/app\/\(app\)\/cita/.test(f)) falla("fotoAyudaPrivada", f, i + 1, "los nombres de los motivos de ayuda salen de lib/ayuda-motivos.ts (motivoAyuda / quiereAyuda)");
      });
    }
    const A = "apps/web/app/(app)/cita/[num]/ayuda/AyudaCita.tsx";
    if (existsSync(A) && !/sp( \|\| rub === "ninos")? \? await subirFotoPrivada\(file\)/.test(readFileSync(A, "utf8"))) falla("fotoAyudaPrivada", A, 1, "en Salud y Pro la foto de la ayuda se sube privada (subirFotoPrivada)");
    const L = "apps/web/lib/ayuda-cita.ts";
    if (existsSync(L) && !/\$4::boolean = false or private/.test(readFileSync(L, "utf8"))) falla("fotoAyudaPrivada", L, 1, "el servidor tiene que rechazar una foto pública en una ayuda de Salud o Pro");
    // 4if · Iglesias, Bienes Raíces y Autos: el recibo o el contrato llevan nombres y direcciones → privadas en el servidor y en la pantalla.
    if (existsSync(L)) {
      const pr = readFileSync(L, "utf8").split("\n").find((l) => /export const PRIVADA = \(r: RubroAyuda\) =>/.test(l)) ?? "";
      for (const r of ["fe", "inm", "dealer"]) if (!pr.includes(`r === "${r}"`)) falla("fotoAyudaPrivada", L, 0, `las fotos de una ayuda de ${r} tienen que ser privadas (PRIVADA)`);
    }
    if (existsSync(A)) {
      const t = readFileSync(A, "utf8");
      if (!/const sd = rub === "fe" \|\| rub === "inm" \|\| rub === "dealer";/.test(t) || !/const x = sd \? await subirFotoPrivada\(file\)/.test(t)) falla("fotoAyudaPrivada", A, 0, "en Iglesias, Bienes Raíces y Autos la foto de la ayuda se sube privada (subirFotoPrivada)");
    }
  },

  /* 4n-2. El constructor del Menú también arma los Productos de Mercados y Tiendas (module 'shop'). Antes tenía
     module = 'menu' escrito en cada consulta y un mercado no podía tener secciones ni productos. El módulo sale de la categoría
     (moduloDe en acciones-menu.ts; menuPanel(negocio, mod)): ninguna consulta de esos dos archivos lo escribe a mano. */
  productosModulo() {
    for (const f of ["apps/web/app/panel/acciones-menu.ts", "apps/web/lib/menu.ts"]) {
      if (!existsSync(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/module = 'menu'/.test(l)) falla("productosModulo", f, i + 1, "el módulo (menu o shop) sale de la categoría: usa moduloDe / el parámetro mod, no 'menu' a mano"); });
    }
  },

  /* 4p. Pedido del mercado: lo retenido (estimado + 10 %) NUNCA se captura completo. Se cobra lo que pesó (≤ lo retenido) y se
     libera el resto. Antes, repararPagos capturaba todo lo retenido de cualquier pedido aceptado: con un pedido por peso eso
     cobraba el estimado. La línea pesada lleva su foto (la base lo exige) y el teléfono nunca manda precios. */
  capturaMercado() {
    const C = "apps/web/lib/cobros.ts", M = "apps/web/lib/mercado.ts";
    if (!existsSync(C) || !existsSync(M)) return;
    const c = readFileSync(C, "utf8"), m = readFileSync(M, "utf8");
    // 4q-2: lo mismo para el envío de la tienda (apartado con tarjeta): se cobra lo que se envía (cobrarApartado), nunca todo lo retenido.
    if (!/o\.status not in \('pending', 'change_proposed'\) and o\.kind not in \('market_order', 'hold'(, 'tickets')?\)/.test(c)) falla("capturaMercado", C, 1, "repararPagos no puede capturar completo lo retenido de un pedido del mercado ni de un envío de la tienda");
    const A = existsSync("apps/web/lib/apartados.ts") ? readFileSync("apps/web/lib/apartados.ts", "utf8") : "";
    if (A && !/Math\.min\(p\.tot, p\.held\)/.test(A)) falla("capturaMercado", "apps/web/lib/apartados.ts", 1, "cobrarApartado cobra lo que se envía y nunca más de lo retenido (Math.min(p.tot, p.held))");
    A.split("\n").forEach((l, i) => { if (/cobrarOperacion\(/.test(l)) falla("capturaMercado", "apps/web/lib/apartados.ts", i + 1, "un envío de la tienda no usa cobrarOperacion (captura todo): usa cobrarApartado"); });
    if (!/Math\.min\(t\.real, p\.held\)/.test(m)) falla("capturaMercado", M, 1, "liquidarMercado cobra lo real y nunca más de lo retenido (Math.min(t.real, p.held))");
    m.split("\n").forEach((l, i) => { if (/cobrarOperacion\(/.test(l)) falla("capturaMercado", M, i + 1, "un pedido del mercado no usa cobrarOperacion (captura todo): usa liquidarMercado"); });
    for (const x of m.matchAll(/export type (\w+In) = \{([^}]*)\}/g)) if (/\b(cents|price|precio|total|tax|impuesto|subtotal)\w*\??:/i.test(x[2])) falla("capturaMercado", M, 0, `«${x[1]}» trae un precio o total desde el teléfono; lo calcula el servidor`);
    const mig = readdirSync("packages/db/migrations").find((f) => f.startsWith("0065_"));
    if (mig && !/operation_lines_peso_foto check \(weight_final is null or \(weigh_photo_id is not null/.test(readFileSync(`packages/db/migrations/${mig}`, "utf8"))) falla("capturaMercado", mig, 1, "una línea pesada sin foto de la balanza tiene que estar prohibida en la base");
  },

  /* 4p. Un detalle del panel que nadie puede abrir: Panel.tsx sabía abrir «merc:…» pero la lista de ?det= permitidos de la
     página no lo tenía y el detalle no salía (ni desde el aviso). Cada prefijo que abre detalle() tiene que estar en DET. */
  detalleEnRuta() {
    const P = "apps/web/app/panel/Panel.tsx", G = "apps/web/app/panel/[id]/[[...r]]/page.tsx";
    if (!existsSync(P) || !existsSync(G)) return;
    const det = /const DET = \/(.+)\/;/.exec(readFileSync(G, "utf8"))?.[1] ?? "";
    const src = readFileSync(P, "utf8"), ini = src.indexOf("function detalle(c: Ctx)"), cuerpo = ini < 0 ? "" : src.slice(ini, src.indexOf("\n}\n", ini));
    for (const m of cuerpo.matchAll(/id\.startsWith\("([a-z]+):"\)/g)) if (!det.includes(`${m[1]}:`)) falla("detalleEnRuta", G, 1, `el detalle «${m[1]}:» existe en Panel.tsx pero ?det=${m[1]}:… no está permitido en DET`);
  },

  /* 4q. Las horas de un apartado eran 48 fijas en el texto y en el SQL; las Tiendas guardan 24, 48 o 72 (Tu herramienta). El
     motor y las pantallas del apartado no escriben «48» a mano: usan horas/hold_hours. Y una línea con talla devuelve su
     existencia a item_variants (devolverStock lo hace por las dos vías). */
  horasApartado() {
    const F = ["apps/web/lib/apartados.ts", "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx", "apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx", "apps/web/app/panel/Apartados.tsx"];
    for (const f of F) {
      if (!existsSync(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\*|\*|\/\/)/.test(l) || /coalesce\([^)]*, 48\)/.test(l)) return;
        if (/interval '48 hours'|\b48 (horas|hours|h)\b|48 \* 3600000/.test(l)) falla("horasApartado", f, i + 1, "las horas del apartado salen de la tienda (24/48/72): usa horas / hold_hours, no 48 escrito a mano");
      });
    }
    const A = existsSync(F[0]) ? readFileSync(F[0], "utf8") : "";
    const dev = A.slice(A.indexOf("async function devolverStock"), A.indexOf("\n}\n", A.indexOf("async function devolverStock")));
    if (A && !/update item_variants/.test(dev)) falla("horasApartado", F[0], 1, "devolverStock tiene que devolver también la talla (item_variants)");
  },

  /* 4q-2. «Could not choose a best candidate operator»: en SQL, sumar dos parámetros sin tipo ($7 + $8) falla en Postgres en
     tiempo de ejecución (el tipo no se deduce) y el pedido con envío no se guardaba. Toda cuenta entre parámetros lleva ::tipo. */
  sumaSinTipo() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { for (const m of l.matchAll(/\$\d+(::\w+)? [-+*\/] \$\d+(::\w+)?/g)) if (!m[1] || !m[2]) falla("sumaSinTipo", f, i + 1, `«${m[0]}»: una cuenta entre parámetros SQL sin ::tipo falla en Postgres; escribe $n::int`); });
    }
  },

  /* 4r. Layaway: el acuerdo aceptado no cambia (disparador), lo que se lee antes de aceptar es lo mismo que se guarda (terminos()
     de layaway-comun en el teléfono y en el servidor), Σ pagos = total, la devolución es lo cobrado menos el cargo y nada se cobra
     solo (los pagos se pagan con la persona presente o en la tienda). */
  layawayAceptado() {
    const M = readdirSync("packages/db/migrations").find((f) => f.startsWith("0068_")), L = "apps/web/lib/layaway.ts", C = "apps/web/lib/layaway-comun.ts", A = "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx";
    if (!M || !existsSync(L) || !existsSync(C)) return;
    const m = readFileSync(`packages/db/migrations/${M}`, "utf8"), l = readFileSync(L, "utf8"), c = readFileSync(C, "utf8");
    if (!/create trigger layaway_plans_inmutable before update/.test(m) || !/new\.terms is distinct from old\.terms/.test(m)) falla("layawayAceptado", M, 1, "el acuerdo del plan aceptado tiene que ser inmutable en la base");
    if (!/i === r\.n - 1 \? resto - base \* \(r\.n - 1\)/.test(c)) falla("layawayAceptado", C, 1, "cuotas(): el último pago lleva lo que sobra para que Σ pagos = total");
    if (!/objetivo = Math\.max\(0, cobrado - p\.kept\)/.test(l)) falla("layawayAceptado", L, 1, "reembolsarPlan devuelve lo cobrado en la app menos el cargo, nunca más");
    if (/off_session|offSession|cobrarSolo/.test(l)) falla("layawayAceptado", L, 1, "los pagos del plan no se cobran solos (Preguntas #11): con la persona presente o en la tienda");
    if (existsSync(A) && !/terminos\(o\.negocio\.nombre, sub, o\.plan!\)/.test(readFileSync(A, "utf8"))) falla("layawayAceptado", A, 1, "el acuerdo que se lee antes de aceptar sale de terminos() (el mismo texto que se guarda)");
    if (!/terminos\(x\.negocio, x\.total, x\.r\)/.test(l)) falla("layawayAceptado", L, 1, "crearPlan guarda el texto de terminos() (el mismo que se leyó)");
  },

  /* 4w. «Quedan 4 asientos» se deriva (asientos − vendidos en la oficina − reservados en la app). Si alguna pantalla o acción
     escribe seats_booked por su cuenta, la app vende asientos que no existen. Solo el motor de Transporte lo toca. */
  /* 4ea. Una matrícula igual o mayor que el precio del curso no aparta nada: el cliente pagaría todo «para apartar». La base lo
     impide (items_matricula_check) y el servidor lo valida al guardar el curso y en la herramienta. */
  /* 4eb. «Con licencia» en una guardería sin licencia es lo más grave que puede decir la app a una familia. «lic» de Niños sale SOLO de
     una licencia del DHS verificada: la pone y la quita la base (licencias_refrescar, 0086); ningún código ni semilla lo escribe. */
  /* 4ec. «¿Me puedo salir cuando quiera?» es lo que más preguntan en Deporte. Una membresía siempre se puede cancelar (con contrato, lo
     que cuesta se dice antes de firmar; sin contrato, $0): ningún texto ni ajuste de Deporte o de inscripciones dice que no se puede, y
     «sin contrato» (filtro y tarjeta) nunca sale con un contrato o una penalidad (check en la base). */
  cancelarSiempreSePuede() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/(deporte|inscripciones)[^/]*\.ts|app\/panel\/Deporte\.tsx)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/no (se )?puedes? (cancelar|salirte)|sin cancelaci[oó]n|cannot cancel|can.t cancel|no cancellations?\b/i.test(l)) falla("cancelarSiempreSePuede", f, i + 1, "una membresía siempre se puede cancelar: con contrato se dice lo que cuesta, sin contrato es $0"); });
    }
    const dir = "packages/db/migrations";
    if (!readdirSync(dir).some((x) => /insc_settings_contrato_check check \(contract_m > 0 or cancel_fee_cents = 0\)/.test(readFileSync(`${dir}/${x}`, "utf8")))) falla("cancelarSiempreSePuede", dir, 0, "falta el check: sin contrato, salirse cuesta $0");
    const dep = "apps/web/lib/deporte.ts";
    if (existsSync(dep) && !/if \(h\.memb && !h\.contrato\) F\.add\("sincontrato"\)/.test(readFileSync(dep, "utf8"))) falla("cancelarSiempreSePuede", dep, 0, "«sin contrato» tiene que salir solo de contract_m = 0");
  },

  /* 4ed. El enlace de una clase en línea es solo para inscritos confirmados (fase4-edu-ninos-deporte.md §6 #21): nada público lo lee.
     Solo lib/edu.ts (el panel) y lib/inscripciones.ts (el inscrito, 4ee) pueden tocar join_url. */
  enlaceSoloInscritos() {
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || /^apps\/web\/lib\/(edu|inscripciones)\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\bjoin_?url\b|\bjoinUrl\b/i.test(l)) falla("enlaceSoloInscritos", f, i + 1, "el enlace de la clase en línea solo lo ve el inscrito confirmado; la ficha y lo público nunca lo leen"); });
    }
  },

  /* 4ee · Dinero de las inscripciones (fase4-edu-ninos-deporte.md §3). En la app solo pasa la matrícula de un curso; se cobra solo al
     confirmar; ningún cobro fuera de sesión; el cupo nunca se pasa; lo enviado es una copia que la herramienta no cambia. */
  soloMatriculaEnLaApp() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/inscripciones[^/]*\.ts$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      t.split("\n").forEach((l, i) => { if (/pasarela\.cobrar|off_session|fueraDeSesion|cobrarGuardada/.test(l)) falla("soloMatriculaEnLaApp", f, i + 1, "una inscripción nunca se cobra fuera de sesión: solo la matrícula retenida al enviar y cobrada al confirmar"); });
      if (f.endsWith("/inscripciones.ts") && !/const mat = (x\.rubro === "fe" \? 0 : )?s\.k === "curso" && s\.mat > 0 && x\.cuenta \? s\.mat : 0;/.test(t)) falla("soloMatriculaEnLaApp", f, 0, "lo que se retiene en la app tiene que salir solo de la matrícula de un curso");
    }
  },
  matriculaInscripcion() {
    const f = "apps/web/lib/inscripciones.ts";
    if (!existsSync(f)) return;
    const L = readFileSync(f, "utf8").split("\n");
    L.forEach((l, i) => {
      if (!/cobrarOperacion\(/.test(l) || /^import /.test(l)) return;
      if (!L.slice(Math.max(0, i - 8), i).some((x) => /status = 'confirmed'/.test(x))) falla("matriculaInscripcion", f, i + 1, "la matrícula solo se cobra en el mismo paso que deja la inscripción confirmada");
    });
    if (!/async function devolverMat[\s\S]{0,400}o\.amount - \(o\.refunded \?\? 0\)/.test(L.join("\n"))) falla("matriculaInscripcion", f, 0, "la devolución de la matrícula tiene que ser exacta (todo lo cobrado menos lo ya devuelto)");
  },
  gruposSinSobreventa() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/(inscripciones[^/]*|visitas-inm)\.ts$/.test(f)) continue; // 4ie: las horas de visita y de prueba también
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/seats_booked = seats_booked \+/.test(l) && !/seats_total - seats_outside - seats_booked >= /.test(l)) falla("gruposSinSobreventa", f, i + 1, "sumar un cupo al grupo sin comprobar en la misma consulta que queda uno libre");
        if (/openings = openings - /.test(l) && !/openings >= 1/.test(l)) falla("gruposSinSobreventa", f, i + 1, "restar un cupo de la banda sin comprobar que queda uno");
      });
    }
  },
  copiaDelPrecio() {
    const f = "apps/web/lib/inscripciones.ts";
    if (!existsSync(f)) return;
    const t = readFileSync(f, "utf8");
    for (const k of ["price_cents: s.cents", "mat_cents:", "contract_m:", "cancel_fee_cents:", "cert: s.cert", "starts_on: modoFecha ? String(f.fecha) : g?.inicio"]) if (!t.includes(k)) falla("copiaDelPrecio", f, 0, `la inscripción no copia «${k}» al enviar`);
    const v = /async function vista\([\s\S]*?\n}\n/.exec(t)?.[0] ?? "";
    if (/from items|svc_attrs|insc_settings/.test(v)) falla("copiaDelPrecio", f, 0, "la vista de una inscripción lee la herramienta o el servicio de hoy en vez de lo copiado al enviar");
    // 4ie · Una visita o prueba de manejo copia al enviar lo de mudarse, el total en la puerta, el cargo del dealer y el pago de ejemplo; la vista
    // y el panel leen esa copia (copiaDe(o.det)), nunca la propiedad o el carro de hoy.
    const V = "apps/web/lib/visitas-inm.ts";
    if (existsSync(V)) {
      const x = readFileSync(V, "utf8");
      for (const k of ["move_in_cents: cp.moveIn", "otd_cents: cp.puerta?.otd", "doc_fee_cents: cp.puerta?.fee", "est_payment: cp.est", "rent_cents: cp.rent", "price_cents: cp.price"]) if (!x.includes(k)) falla("copiaDelPrecio", V, 0, `la visita no copia «${k}» al enviar`);
      const vv = /async function vista\([\s\S]*?\n}\n/.exec(x)?.[0] ?? "";
      if (!/copia: copiaDe\(o\.det\)/.test(vv) || /property_listings|vehicle_listings|dealer_settings|inm_settings/.test(vv.replace(/direccionCliente\([^)]*\)/g, ""))) falla("copiaDelPrecio", V, 0, "la vista de una visita muestra lo copiado al enviar (copiaDe), nunca los montos de hoy");
    }
  },

  /* 4ef · Niños: ninguna foto pública de un niño. La reseña de un lugar de niños no lleva fotos (el servidor la rechaza) y la foto de una
     ayuda de Niños (el recibo) es privada, como en Salud y Pro. */
  ninosSinFotoPublica() {
    const r = "apps/web/lib/resenas.ts", a = "apps/web/lib/ayuda-cita.ts", ui = "apps/web/app/(app)/cita/[num]/ayuda/AyudaCita.tsx", esc = "apps/web/app/(app)/n/[id]/resena/Escribir.tsx";
    if (existsSync(r) && !/if \(rubro === "ninos" && fotos\.length\) return no\(/.test(readFileSync(r, "utf8"))) falla("ninosSinFotoPublica", r, 0, "una reseña de un lugar de niños no puede guardar fotos");
    if (existsSync(a) && !/PRIVADA = \(r: RubroAyuda\) => [^\n]*r === "ninos"/.test(readFileSync(a, "utf8"))) falla("ninosSinFotoPublica", a, 0, "las fotos de una ayuda de Niños tienen que ser privadas");
    if (existsSync(ui) && !/rub === "ninos" \? await subirFotoPrivada/.test(readFileSync(ui, "utf8"))) falla("ninosSinFotoPublica", ui, 0, "la ayuda de Niños sube la foto como privada");
    if (existsSync(esc) && !/rub === "ninos" \? null : fotosB/.test(readFileSync(esc, "utf8"))) falla("ninosSinFotoPublica", esc, 0, "la reseña de Niños no ofrece subir fotos");
    for (const f of codigo) if (/^apps\/web\//.test(f)) readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/owner_kind\s*=\s*'(nino|child|kid)'/.test(l)) falla("ninosSinFotoPublica", f, i + 1, "no existe media de un niño"); });
  },

  /* 4ef · Cada número que tiene Ayuda (hrefAyuda: C-, M-, A-, F-, V-, N-, I-…) se reconoce también en el panel: la lista de Hoy lleva a su
     detalle y el bloque de la ayuda dice su rubro. Se cazó con la noche (N-) cayendo en «Cita» y la inscripción (I-) sin nombre. */
  prefijosAyuda() {
    const a = "apps/web/lib/ayuda-cita.ts", p = "apps/web/app/panel/Citas.tsx";
    if (!existsSync(a) || !existsSync(p)) return;
    const h = readFileSync(a, "utf8").split("\n").find((l) => /export const hrefAyuda/.test(l)) ?? "";
    const pref = [...h.matchAll(/startsWith\("([A-Z]{1,3})-"\)/g)].map((m) => m[1]); // 6i: prefijos de más de una letra (EP-)
    const P = readFileSync(p, "utf8"), tipo = P.split("\n").find((l) => /const tipo = \(n: string\)/.test(l)) ?? "", rub = P.split("\n").find((l) => /const rub = c\.citas\?\.det\?\.prof/.test(l)) ?? "";
    for (const x of pref) {
      if (!tipo.includes(`n.startsWith("${x}-")`)) falla("prefijosAyuda", p, 0, `la lista de ayudas de Hoy no reconoce los números ${x}- (llevan a «Cita»)`);
      if (!rub.includes(`numero.startsWith("${x}-")`)) falla("prefijosAyuda", p, 0, `el bloque de ayuda del panel no sabe el rubro de los números ${x}-`);
    }
  },

  /* 4eg · Una ayuda que pasa a To'Latino entra a la cola de su motivo («Cuidado de niños», «No me dejan cancelar» o Soporte): nadie
     escribe la cola a mano al insertar un help_request (se usa COLA_AYUDA_SQL de lib/colas.ts). */
  colaAyudaRuteada() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/[^/]+\.ts$/.test(f) || f.endsWith("/colas.ts")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/'(sop|cuidado|salir|estafa)',\s*'help_request'/.test(l)) falla("colaAyudaRuteada", f, i + 1, "la cola de una ayuda sale de su motivo (COLA_AYUDA_SQL), no se escribe a mano"); });
    }
    // 4if · «Me cobraron por ver», «Pidieron más para mudarme» y «Me pidieron dinero por la ayuda» (Iglesias) van a «Posible estafa».
    const C = "apps/web/lib/colas.ts";
    if (existsSync(C)) {
      const t = readFileSync(C, "utf8"), sql = t.split("\n").find((l) => /export const COLA_AYUDA_SQL/.test(l)) ?? "";
      if (!/when h\.reason in \('ver', 'mudar'\) or \(h\.reason = 'cobro' and b\.category_id = 'NEG-FE'\) then 'estafa'/.test(sql)) falla("colaAyudaRuteada", C, 0, "COLA_AYUDA_SQL tiene que mandar ver, mudar y el cobro de Iglesias a la cola «Posible estafa»");
      if (!/export const COLAS_AYUDA: Cola\[\] = \[[^\]]*"estafa"/.test(t)) falla("colaAyudaRuteada", C, 0, "«Posible estafa» muestra una ayuda: tiene que estar en COLAS_AYUDA");
    }
  },

  /* 4ia. «La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.» Iglesias no cobra nada en la app: ningún
     depósito (trigger en la base + limpiarFe lo rechaza + el guardado lo pone en 0), «gratis» es $0, el donativo y el total son > 0 y el
     total solo en funerarias; la línea fija y «si no puedes, no se cobra» están verbatim; ningún texto de Iglesias dice que se cobra; la
     semilla no siembra un depósito; y una misa o un culto nunca se queda sin horario. */
  ayudaGratisIglesia() {
    const G = "ayudaGratisIglesia", dir = "packages/db/migrations";
    if (!readdirSync(dir).some((x) => /create trigger items_fe_sin_deposito[\s\S]*category_id = 'NEG-FE'|category_id = 'NEG-FE'[\s\S]*create trigger items_fe_sin_deposito/.test(readFileSync(`${dir}/${x}`, "utf8"))))
      falla(G, dir, 0, "falta el trigger items_fe_sin_deposito: ningún ítem de NEG-FE lleva depósito");
    const sv = "apps/web/lib/servicios.ts";
    if (existsSync(sv)) {
      const s = readFileSync(sv, "utf8"), f = /export function limpiarFe[\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!f) falla(G, sv, 0, "falta limpiarFe (el servidor valida los servicios de Iglesias)");
      else {
        if (!/if \(Number\(x\.dep\) > 0\) return \{ ok: false/.test(f)) falla(G, sv, 0, "limpiarFe tiene que rechazar cualquier depósito");
        if (!/forma === "gratis"\) \{ if \(cents\) return \{ ok: false/.test(f)) falla(G, sv, 0, "«gratis» tiene que ser $0");
        if (!/forma === "don"\) \{ if \(!cents\) return \{ ok: false/.test(f)) falla(G, sv, 0, "el donativo sugerido tiene que tener monto (si no, es gratis)");
        if (!/forma === "tot"\) \{\s*if \(!funeraria\) return \{ ok: false/.test(f)) falla(G, sv, 0, "el precio total es solo de las funerarias");
        if (/deposit_cents|a\.dep\s*=/.test(f)) falla(G, sv, 0, "limpiarFe no pone depósito");
      }
    }
    const ac = "apps/web/app/panel/acciones-servicios.ts";
    if (existsSync(ac) && !/if \(rub === "fe"\) await c\.query\(`update items set deposit_cents = 0/.test(readFileSync(ac, "utf8"))) falla(G, ac, 0, "al guardar un servicio de Iglesias el depósito queda en 0");
    const co = "apps/web/lib/fe-comun.ts";
    if (existsSync(co)) {
      const s = readFileSync(co, "utf8");
      if (!s.includes("La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.")) falla(G, co, 0, "la línea fija de Iglesias (§1c) va verbatim");
      if (!/DONATIVO: Bi = \{ es: "Donativo sugerido · si no puedes, no se cobra\."/.test(s)) falla(G, co, 0, "el donativo siempre dice «si no puedes, no se cobra»");
    }
    // Ningún texto de Iglesias dice que se cobra: «cobra», «charge» solo negados.
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/fe(-comun|-publico)?\.ts|app\/panel\/(Fe\.tsx|acciones-fe\.ts)|app\/\(app\)\/n\/\[id\]\/Fe\.tsx)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        for (const m of l.matchAll(/"[^"\n]*(cobr|charg)[^"\n]*"/gi)) if (!/(no|nunca|nada)( se| lo)? cobr|no cobran|not charge|never charged|no charge|nothing is charged/i.test(m[0])) falla(G, f, i + 1, `texto de Iglesias que habla de cobrar sin negarlo: ${m[0].slice(0, 80)}`);
      });
    }
    const fe = "apps/web/lib/fe.ts";
    if (existsSync(fe) && !/if \(pideUnHorario\(h\.kind\) && !quedan\(/.test(readFileSync(fe, "utf8"))) falla(G, fe, 0, "una misa o un culto no se queda sin horario (al menos uno)");
    const sem = "infra/pruebas/semilla/0027_fe.sql";
    if (existsSync(sem)) readFileSync(sem, "utf8").split("\n").forEach((l, i) => {
      if (/insert into items/.test(l) && !/::jsonb, 0, '\{[^']*\}'::text\[\], \d+\) returning id into it;$/.test(l)) falla(G, sem, i + 1, "la semilla de Iglesias no siembra depósitos");
      if (/"dep":/.test(l)) falla(G, sem, i + 1, "la semilla de Iglesias no siembra depósitos");
    });
  },

  licenciaNoSeFinge() {
    const dir = "packages/db/migrations";
    const ult = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort().filter((x) => /function licencias_refrescar/.test(readFileSync(`${dir}/${x}`, "utf8"))).pop();
    if (!ult || !/pa_dhs_childcare/.test(readFileSync(`${dir}/${ult}`, "utf8"))) falla("licenciaNoSeFinge", `${dir}/${ult ?? ""}`, 0, "licencias_refrescar no deriva «lic» de Niños de la licencia del DHS");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
        if (/\.add\(\s*["']lic["']\s*\)|filter_values\s*\|\|\s*'\{?lic|array_append\([^)]*'lic'\)/.test(l)) falla("licenciaNoSeFinge", f, i + 1, "«lic» lo pone la base desde una licencia verificada (licencias_refrescar), nunca el código");
      });
    }
    // 4id · Los sellos de las fichas de Iglesias, Bienes Raíces y Autos salen SOLO de una licencia «valid».
    for (const f of ["apps/web/lib/fe-publico.ts", "apps/web/lib/inmuebles-publico.ts", "apps/web/lib/autos-publico.ts"]) {
      if (!existsSync(f)) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/from licenses l[^`]*`/g)) if (!/l\.status = 'valid'/.test(m[0])) falla("licenciaNoSeFinge", f, 0, "un sello público sale solo de una licencia verificada (l.status = 'valid')");
    }
    const sem = "infra/pruebas/semilla/0025_ninos.sql";
    if (existsSync(sem) && !/select licencias_refrescar\(id\) from businesses where category_id = 'NEG-NINOS'/.test(readFileSync(sem, "utf8"))) falla("licenciaNoSeFinge", sem, 0, "la semilla de Niños no rehace «lic» desde las licencias al final");
  },

  /* 4eb. Datos de menores: la app nunca guarda fecha de nacimiento, alergias, medicinas, diagnósticos, vacunas, número de Medicaid
     ni seguro social de un niño (fase4-edu-ninos-deporte.md §3). Ninguna columna ni campo con esos nombres en el esquema de
     inscripciones y niños ni en su código. */
  ninosSinDatosSensibles() {
    const MAL = /\b(birth_?date|date_of_birth|dob|fecha_?nac\w*|alergias?|allerg\w*|medicat\w*|medicinas?|diagnos\w*|vacunas?|vaccin\w*|medicaid_(id|num|number)|ssn|seguro_social)\b/i;
    const dir = "packages/db/migrations";
    const F = [...readdirSync(dir).filter((x) => x.endsWith(".sql") && x >= "0085").map((x) => `${dir}/${x}`), ...codigo.filter((f) => /^apps\/web\/lib\/(ninos|inscripciones|edu)[^/]*\.ts$|^apps\/web\/app\/panel\/(Ninos|Edu|acciones-ninos|acciones-edu)\.tsx?$/.test(f))];
    // Sin comentarios (de bloque y de línea, conservando los saltos para que el número de línea siga siendo el del archivo).
    for (const f of F) readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).split("\n").forEach((l, i) => {
      if (/^\s*(--|\/\/)/.test(l)) return;
      const sinTexto = l.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
      const m = MAL.exec(sinTexto); if (m) falla("ninosSinDatosSensibles", f, i + 1, `«${m[0]}»: la app no guarda datos médicos ni de identidad de un niño`);
    });
  },

  /* 4eb. El nombre y la nota de un niño solo se tocan en lib/ninos-privado.ts (cifrados en op_private con motivo 'nino'). */
  ninosNotaCifrada() {
    const solo = "apps/web/lib/ninos-privado.ts";
    if (!existsSync(solo)) return falla("ninosNotaCifrada", solo, 0, "falta el único módulo que toca los datos de los niños");
    if (!/cifrar\(/.test(readFileSync(solo, "utf8"))) falla("ninosNotaCifrada", solo, 0, "los datos del niño se guardan sin cifrar");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === solo) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/op_private[^;]*'nino'|reason\s*=\s*'nino'/.test(l)) falla("ninosNotaCifrada", f, i + 1, "los datos de un niño solo se tocan en lib/ninos-privado.ts"); });
    }
  },

  /* 4eb. Un SMS o una notificación se ve con el teléfono bloqueado: ningún aviso de inscripción lleva el nombre del niño ni la nota. */
  avisoNinosNeutro() {
    const dir = "packages/db/migrations";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/\('(biz_)?insc_\w+'/.test(l) && /\{(nino|nina|hijo|nota)\}/.test(l)) falla("avisoNinosNeutro", `${dir}/${x}`, i + 1, "un aviso de inscripción no lleva el nombre del niño ni la nota");
    });
    for (const f of codigo) {
      if (!/^apps\/web\/lib\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/avisar\w*\([^)]*["'](biz_)?insc_/.test(l) && /\b(nino|nota)\s*:/.test(l)) falla("avisoNinosNeutro", f, i + 1, "un aviso de inscripción no lleva el nombre del niño ni la nota"); });
    }
  },

  matriculaMenor() {
    const dir = "packages/db/migrations";
    const hay = readdirSync(dir).some((x) => /items_matricula_check[\s\S]*svc_kind is distinct from 'curso' or deposit_cents < price_cents/.test(readFileSync(`${dir}/${x}`, "utf8")));
    if (!hay) falla("matriculaMenor", dir, 0, "falta el check items_matricula_check (la matrícula de un curso < su precio)");
    for (const f of ["apps/web/lib/servicios.ts", "apps/web/lib/edu.ts"]) if (existsSync(f) && !/(dep|v) >= (cents|it\.cents)|v < it\.cents|dep >= cents/.test(readFileSync(f, "utf8"))) falla("matriculaMenor", f, 0, "el servidor no valida que la matrícula sea menos que el precio");
  },

  asientosDerivados() {
    for (const f of codigo) {
      // 4ea: también los cupos de los grupos (class_groups.seats_booked): solo el motor de inscripciones (lib/inscripciones*.ts).
      if (!/^apps\/web\//.test(f) || /^apps\/web\/lib\/(transporte|viajes|inscripciones)[^/]*\.ts$/.test(f) || f === "apps/web/lib/visitas-inm.ts") continue; // 4ie: las horas de visita y de prueba (lib/visitas-inm.ts, con su candado)
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/seats_booked\s*=(?!=)/.test(l)) falla("asientosDerivados", f, i + 1, "«seats_booked» es derivado: solo lo escriben los motores de Transporte (lib/transporte*.ts, lib/viajes*.ts) e Inscripciones (lib/inscripciones*.ts)"); });
    }
  },

  /* 4y. El panel decía «ESPERAN TU RESPUESTA 0 · Nada pendiente» con un viaje esperando: cada categoría con su propio bloque
     «… QUE ESPERAN TU RESPUESTA» (fiestas, viajes…) debe sumar en la cifra de Hoy (Pedidos.tsx, const otros). */
  esperanCuentan() {
    const ped = "apps/web/app/panel/Pedidos.tsx";
    if (!existsSync(ped)) return;
    const otros = readFileSync(ped, "utf8").split("\n").find((l) => /const otros =/.test(l)) ?? "";
    for (const f of codigo) {
      if (!/^apps\/web\/app\/panel\/[^/]+\.tsx$/.test(f) || f === ped) continue;
      const t = readFileSync(f, "utf8");
      if (!/QUE ESPERAN TU RESPUESTA/.test(t)) continue;
      const keys = [...new Set([...t.matchAll(/c\.(\w+)\?\.hoy/g)].map((m) => m[1]))];
      for (const k of keys) if (!otros.includes(`c.${k}?.hoy`)) falla("esperanCuentan", f, 0, `lo que espera en «c.${k}?.hoy» no suma en «ESPERAN TU RESPUESTA» de Hoy (Pedidos.tsx, const otros)`);
    }
  },

  /* 4y-3. Super Admin › Transacciones mostraba «Devolver» en fiestas y viajes, pero el servidor solo devolvía pedidos y citas
     («Ese pedido no existe»). Los tipos que la pantalla deja devolver (DEVUELVE) son exactamente los que devolverTx acepta. */
  /* 4ne. Una cola nueva en lib/colas.ts que la base no acepta (queue_items_queue_check) revienta al abrir el primer caso, y
     nadie lo ve hasta que pasa de verdad. Toda cola del tipo Cola está en el check de la última migración que lo redefine. */
  colasEnLaBase() {
    const f = "apps/web/lib/colas.ts";
    if (!existsSync(f)) return;
    const m = /export type Cola = ([^;]+);/.exec(readFileSync(f, "utf8"));
    if (!m) return falla("colasEnLaBase", f, 0, "no encuentro el tipo Cola");
    const colas = [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]);
    const dir = "packages/db/migrations", migs = readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
    let check = null, donde = null;
    const amplia = [];
    for (const x of migs) {
      const t = readFileSync(`${dir}/${x}`, "utf8"), c = [...t.matchAll(/add constraint queue_items_queue_check check \(([^;]+)\);/g)].pop();
      if (c) { check = c[1]; donde = x; amplia.length = 0; }
      // 9n: una migración que AMPLÍA el CHECK (pg_temp.ampliar_check, como 0141/0142) suma sus valores a los de la última lista fija.
      for (const a of t.matchAll(/ampliar_check\('queue_items', 'queue_items_queue_check', array\[([^\]]+)\]\)/g)) { amplia.push(...[...a[1].matchAll(/'(\w+)'/g)].map((y) => y[1])); donde = x; }
    }
    if (!check) return falla("colasEnLaBase", dir, 0, "ninguna migración define queue_items_queue_check");
    const base = new Set([...[...check.matchAll(/'(\w+)'/g)].map((x) => x[1]), ...amplia]);

    for (const k of colas) if (!base.has(k)) falla("colasEnLaBase", `${dir}/${donde}`, 0, `la cola «${k}» está en lib/colas.ts pero queue_items_queue_check no la acepta`);
  },

  /* 4ne. Transacciones lista un tipo de operación nuevo pero la pantalla no tiene su nombre: la fila sale «undefined N-…».
     Cada kind que lee lib/admin-tx.ts tiene su etiqueta en el título de app/admin/Transacciones.tsx. */
  txConNombre() {
    const srv = "apps/web/lib/admin-tx.ts", ui = "apps/web/app/admin/Transacciones.tsx";
    if (!existsSync(srv) || !existsSync(ui)) return;
    const m = /const DESDE = `[^`]*o\.kind in \(([^)]*)\)/.exec(readFileSync(srv, "utf8"));
    if (!m) return falla("txConNombre", srv, 0, "no encuentro la lista de tipos de DESDE");
    const t = /title: `\$\{\(\{ ([^}]*) \} as Record<string, string>\)\[x\.k\]\}/.exec(readFileSync(ui, "utf8"));
    if (!t) return falla("txConNombre", ui, 0, "no encuentro el mapa de nombres del título");
    const nombres = new Set([...t[1].matchAll(/(\w+): /g)].map((x) => x[1]));
    for (const k of [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])) if (!nombres.has(k)) falla("txConNombre", ui, 0, `Transacciones lee «${k}» pero el título no tiene su nombre`);
  },

  devolverCoincide() {
    const ui = "apps/web/app/admin/Transacciones.tsx", srv = "apps/web/app/admin/acciones-tx.ts";
    if (!existsSync(ui) || !existsSync(srv)) return;
    const m = /const DEVUELVE = new Set\(\[([^\]]*)\]\)/.exec(readFileSync(ui, "utf8"));
    if (!m) return falla("devolverCoincide", ui, 0, "falta la lista DEVUELVE de lo que se puede devolver");
    const a = new Set([...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
    const f = readFileSync(srv, "utf8"), i = f.indexOf("export async function devolverTx"), cuerpo = f.slice(i, f.indexOf("\n}", i));
    const b = new Set([...cuerpo.matchAll(/o\.kind (?:= '(\w+)'|in \(([^)]*)\))/g)].flatMap((x) => x[1] ? [x[1]] : [...x[2].matchAll(/'(\w+)'/g)].map((y) => y[1])));
    for (const k of a) if (!b.has(k)) falla("devolverCoincide", ui, 0, `la pantalla deja devolver «${k}» pero devolverTx no lo acepta`);
    for (const k of b) if (!a.has(k)) falla("devolverCoincide", srv, 0, `devolverTx acepta «${k}» pero la pantalla no muestra «Devolver»`);
    // 6d · Boletos: devolver por monto desde Transacciones dejaría boletos vivos y la existencia sin volver. Los boletos se devuelven solo por
    // lib/boletos-despues.ts (el comprador, el panel); lo de un caso de ayuda B- es dinero sin tocar los boletos (decidirSop).
    if (a.has("tickets") || b.has("tickets")) falla("devolverCoincide", srv, 0, "Transacciones no devuelve boletos por monto: se devuelven por boleto (lib/boletos-despues.ts)");
    const pe = "apps/web/app/panel/EventosPanel.tsx", ae = "apps/web/app/panel/acciones-eventos.ts";
    if (existsSync(pe) && existsSync(ae)) {
      const ui6 = readFileSync(pe, "utf8"), sv6 = readFileSync(ae, "utf8");
      if (/evtDevolver\(/.test(ui6) !== /export async function evtDevolver[\s\S]*?devolverDesdePanel\(/.test(sv6)) falla("devolverCoincide", pe, 0, "«Devolver» del panel de eventos y su acción (devolverDesdePanel) tienen que ir juntos");
      // 6e: dentro del cuerpo de cada acción (otra acción más abajo que también pide «pay» no cuenta).
      for (const fn of ["evtDevolver", "evtCancelar"]) if (/export async function evtCancelar/.test(sv6) || fn === "evtDevolver") if (!/if \(!\(await accesoPanel\(a\.negocio\.id, "pay"\)\)\) return no\(/.test(cuerpoFn(sinComent(ae), fn))) falla("devolverCoincide", ae, 0, `«${fn}» devuelve dinero: pide la parte de Cobros`);
    }
  },

  /* Barrido central (0078). Los vencimientos solo corrían al abrir una página: una retención podía quedarse sin liberar si
     nadie miraba. Todo barrido exportado (vencer*, barrer*, escalar*) de lib/ tiene que estar en lib/barrido.ts. */
  barridoCompleto() {
    const B = "apps/web/lib/barrido.ts";
    if (!existsSync(B)) return falla("barridoCompleto", B, 0, "falta el barrido central");
    const t = readFileSync(B, "utf8");
    for (const f of codigo) {
      // 7h · También lib/compa/ (las acciones que vencen, la retoma de WhatsApp/SMS).
      if (!/^apps\/web\/lib\/(compa\/|datos\/)?[^/]+\.ts$/.test(f) || f === B) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const m = /^export async function ((?:vencer|barrer|escalar)\w*)\(/.exec(l);
        if (m && !t.includes(`.${m[1]}(`)) falla("barridoCompleto", f, i + 1, `«${m[1]}» no corre en el barrido central (lib/barrido.ts): sin él, solo vence cuando alguien abre una página`);
      });
    }
  },

  /* 4z-2. /fiesta/… y /viaje/… pintaban la barra inferior de la app encima de su propia barra (no se podía tocar «Enviar»).
     Toda pantalla de detalle /X/[num] de la app va en la lista «compacto» de AppShell (sin barra inferior en el teléfono). */
  detalleSinBarra() {
    const A = "apps/web/app/(app)/AppShell.tsx";
    if (!existsSync(A)) return;
    const m = /const compacto = [^\n]*\/\^\\\/\(([^)]*)\)/.exec(readFileSync(A, "utf8"));
    if (!m) return falla("detalleSinBarra", A, 0, "no encuentro la lista «compacto»");
    const lista = m[1];
    for (const d of readdirSync("apps/web/app/(app)")) {
      if (!existsSync(`apps/web/app/(app)/${d}/[num]`)) continue;
      if (!lista.includes(`${d}\\/`)) falla("detalleSinBarra", A, 0, `/${d}/[num] no está en «compacto»: la barra inferior tapa su pantalla en el teléfono`);
    }
  },

  /* 4z-3. La pestaña «Fiestas y Transporte» de Analítica se veía pero el servidor no la tenía en su lista (TABS) y mostraba el
     Resumen. Cada pestaña de la pantalla está en la lista del servidor. */
  pestanasAnalitica() {
    const ui = "apps/web/app/admin/Analitica.tsx", pg = "apps/web/app/admin/analitica/page.tsx";
    if (!existsSync(ui) || !existsSync(pg)) return;
    const m = /type: "tabs", items: \(\[([\s\S]*?)\] as const\)/.exec(readFileSync(ui, "utf8")), t = /const TABS = new Set\(\[([^\]]*)\]\)/.exec(readFileSync(pg, "utf8"));
    if (!m || !t) return falla("pestanasAnalitica", ui, 0, "no encuentro las pestañas o la lista TABS");
    const srv = new Set([...t[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
    for (const k of [...m[1].matchAll(/\["(\w+)", "/g)].map((x) => x[1])) if (!srv.has(k)) falla("pestanasAnalitica", pg, 0, `la pestaña «${k}» se ve en la pantalla pero el servidor no la tiene en TABS`);
  },

  /* 4v. Dos clientes piden el mismo sábado: si dos funciones confirman a la vez sin el candado del día, quedan dos fiestas
     donde cabe una. Toda función que ocupa un día (insert into party_days … 'booking') toma antes el candado
     «fiesta:{negocio}:{día}». */
  candadoFiesta() {
    const f = "apps/web/lib/fiestas-reservas.ts";
    if (!existsSync(f)) return;
    for (const p of readFileSync(f, "utf8").split(/\nexport async function /).slice(1)) {
      const nombre = p.slice(0, p.indexOf("(")), i = p.search(/insert into party_days/), j = p.search(/pg_advisory_xact_lock\(hashtext\('fiesta:'/);
      if (i >= 0 && (j < 0 || j > i)) falla("candadoFiesta", f, 0, `«${nombre}» ocupa un día sin tomar antes el candado del día (fiesta:{negocio}:{día})`);
    }
  },

  /* 4v. La reparación de pagos liberaba el depósito de una solicitud con otra hora propuesta (change_proposed) mientras el
     cliente decidía: luego aceptaba y quedaba confirmada sin dinero. Una consulta que libera o cobra lo «retenido» de
     operaciones que «ya no siguen» tiene que dejar fuera las vivas: pending Y change_proposed. */
  reparaVivas() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/status = 'held'/.test(l) && /o\.status <> 'pending'/.test(l)) falla("reparaVivas", f, i + 1, "trata como muerta una solicitud con otra hora propuesta: excluye también 'change_proposed'");
      });
    }
  },

  /* 4u. «Se cobra al enviar»: el prototipo de Fiestas lo decía y Belleza y Hogar lo copiaron, pero el depósito de una
     solicitud se RETIENE al enviar y se cobra cuando confirman (citas.ts, visitas.ts). Un texto que diga que se cobra al
     enviar le miente al cliente sobre su dinero. («Se cobra al enviarlo», del envío de una tienda, sí es cierto.) */
  depositoRetenido() {
    const MAL = /se cobra al enviar(?!lo)|charged (when you send|on sending|when sending)/i;
    const ver = (f) => readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (MAL.test(l)) falla("depositoRetenido", f, i + 1, "dice que el depósito se cobra al enviar: se retiene al enviar y se cobra cuando confirman"); });
    for (const f of archivos) if ((/^apps\/web\/(app|lib)\/.*\.tsx?$/.test(f) && !/(lib\/pedir\.ts|pagar\/Pagar\.tsx)$/.test(f)) || /^docs\/ayuda\/.*\.md$/.test(f)) ver(f);
  },

  /* 4t. «Libre el 3 oct» y «Libre este sábado (26 sep)»: la página de Fiestas traía las fechas del día de la demo del
     prototipo, fijas para siempre. Un texto de la taxonomía no lleva una fecha del calendario: la fecha sale de los datos. */
  fechaFijaTaxonomia() {
    const f = "packages/taxonomy/paginas.json";
    if (!existsSync(f)) return;
    const M = "(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
    readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      if (/"(es|en)":/.test(l) && new RegExp(`\\b\\d{1,2} ${M}\\b|\\b${M} \\d{1,2}\\b`).test(l)) falla("fechaFijaTaxonomia", f, i + 1, "un texto de la taxonomía trae una fecha fija (del prototipo); la fecha tiene que salir de los datos");
    });
  },

  /* 4h-3. «LO PONE DRA.»: el primer nombre de un profesional se sacaba con split(" ")[0] y salía el título (Dra., Lcdo.).
     El nombre corto de quien atiende (equipo, «quien» de una cita o solicitud) sale de primerNombre (lib/nombre.ts). */
  nombreConTitulo() {
    for (const f of codigo) {
      if (!/^apps\/web\/app\/(\(app\)\/|panel\/Equipo\.tsx)/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(quien|\bname)\??( \?\? "")?\)?\??\.split\(" "\)\[0\]|first = \(n: string\) => n\.split/.test(l)) falla("nombreConTitulo", f, i + 1, "el nombre de un profesional puede empezar con su título (Dra., Lcdo.): usa primerNombre de lib/nombre.ts"); });
    }
  },

  /* 4h-2. La pestaña «Lo que vende» del 360 solo salía para Comida, Belleza y Profesionales: lo de Auto, Hogar y Doctores
     estaba construido pero nadie llegaba (solo escribiendo la dirección). La pestaña y su contenido salen de la misma lista
     (VENDE); ninguna rama «tab === "vende"» nombra una categoría que la lista no tenga, y la línea de pestañas no compara
     categorías a mano. */
  pestanaVende() {
    const F = "apps/web/app/admin/N360.tsx";
    if (!existsSync(F)) return;
    const src = readFileSync(F, "utf8"), L = src.split("\n");
    const lista = (n) => { const m = new RegExp(`const ${n} = \\[([^\\]]*)\\]`).exec(src); return m ? m[1].split(",").map((x) => x.trim()) : null; };
    // Cualquier sub-lista (...VENDE_SVC, ...VENDE_RET) se abre: antes solo se abría la de Salud/Pro.
    const todo = (lista("VENDE") ?? []).flatMap((x) => (x.startsWith("...") ? lista(x.slice(3)) ?? [] : [x])).map((x) => x.replace(/"/g, ""));
    if (!todo.length) { falla("pestanaVende", F, 1, "falta la lista VENDE de categorías con «Lo que vende»"); return; }
    L.forEach((l, i) => {
      if (/\["vende", "Lo que vende"\]/.test(l) && !/VENDE\.includes\(n\.cat_id\)/.test(l)) falla("pestanaVende", F, i + 1, "la pestaña «Lo que vende» tiene que salir de VENDE.includes(n.cat_id)");
      if (/tab === "vende"/.test(l)) for (const c of l.matchAll(/"(NEG-[A-Z]+)"/g)) if (!todo.includes(c[1])) falla("pestanaVende", F, i + 1, `«Lo que vende» de ${c[1]} existe pero su pestaña no sale: agrégalo a VENDE`);
    });
  },

  /* 4f-3. Dos barras fijas abajo en la misma pantalla: la pestaña Tienda trae su barra «Tu apartado» y la barra de Booking
     de la ficha la tapaba (no se podía tocar). Cada pestaña cuyo componente pinta su propia barra fija tiene que quedar fuera
     de las barras generales de la ficha (`tab !== "id"`). */
  barraDoble() {
    const F = "apps/web/app/(app)/n/[id]/Ficha.tsx";
    if (!existsSync(F)) return;
    const src = readFileSync(F, "utf8"), L = src.split("\n");
    const imp = Object.fromEntries([...src.matchAll(/import \{([^}]+)\} from "\.\/(\w+)"/g)].flatMap((m) => m[1].split(",").map((x) => [x.trim().replace(/^type /, ""), m[2]])));
    const propias = [];
    L.forEach((l, i) => { const t = /tab === "(\w+)"/.exec(l); if (!t) return; const sig = `${l}\n${L[i + 1] ?? ""}`; for (const c of sig.matchAll(/<(\w+Tab)\b/g)) { const file = imp[c[1]]; if (!file) continue; const p = `apps/web/app/(app)/n/[id]/${file}.tsx`; if (existsSync(p) && /fixed inset-x-0 bottom-0/.test(readFileSync(p, "utf8"))) propias.push(t[1]); } });
    L.forEach((l, i) => { const b = /<(\w+)Barra\b/.exec(l); if (!b || /tab === "/.test(l)) return; for (const id of new Set(propias)) if (!l.includes(`tab !== "${id}"`)) falla("barraDoble", F, i + 1, `la barra ${b[1]}Barra se pinta también en la pestaña «${id}», que tiene su propia barra fija: agrega tab !== "${id}"`); });
  },

  /* 4d. Lo mismo en los bloques del panel (packages/ui/src/panel): un «role=button» sin foco ni teclado. Los −/+ ya son
     botones de verdad; 9c (14 nov) llevó el resto a CERO: todo role="button" trae tabIndex y onKeyDown. */
  panelClicMudo() {
    const TOPE = 0, f = "packages/ui/src/panel/Bloques.tsx";
    if (!existsSync(f)) return;
    const n = readFileSync(f, "utf8").split("\n").reduce((k, l) => k + [...l.matchAll(/role="button"(?![^>]*tabIndex)/g)].length, 0);
    if (n > TOPE) falla("panelClicMudo", f, 1, `${n} «role=button» sin foco en los bloques del panel (tope ${TOPE}): usa <button type="button">`);
  },

  /* 3o-bis. Clics mudos del sistema de diseño portado: un onClick en un <div>/<span> que no es un control no lo usa ni el teclado ni un
     lector de pantalla (6 nov, 3b: día, hora, persona, opción y extra del Booking). 9c (14 nov) llevó el trinquete a CERO: cada <div>/<span>
     con onClick trae, en su misma lista de propiedades, `__ds_scope.__btn(…)` / `__key(…)` (role=button, foco, Enter y Espacio, nombre), o
     un rol con su tabIndex, o `role: 'presentation'` (zona de clic que repite a otro control, o contenedor con controles de verdad dentro).
     Se arregla en la tabla A11Y de scripts/portar-sistema.mjs, nunca a mano en packages/ui (sistemaSincronizado). */
  sistemaClicMudo() {
    const G = "sistemaClicMudo";
    const recorrer = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) recorrer(p); else if (p.endsWith(".js")) {
      const L = readFileSync(p, "utf8").split("\n");
      L.forEach((l, i) => {
        const m = /^(\s*)onClick:/.exec(l);
        if (!m) return;
        let a = i; while (a > 0 && !/createElement\(/.test(L[a])) a--;
        if (!/createElement\("(div|span)"/.test(L[a].slice(L[a].lastIndexOf("createElement(")))) return; // los componentes del sistema (Button, Chip…) ya son accesibles
        let e = i; while (e < L.length && !(L[e].match(/^\s*/)[0].length === m[1].length - 2 && /^\s*\}/.test(L[e]))) e++;
        const b = L.slice(a, e + 1).join("\n");
        if (!(/__ds_scope\.__(btn|key)\(|\.\.\.btn\(|role: 'presentation'/.test(b) || (/\brole:/.test(b) && /tabIndex/.test(b)))) falla(G, p, i + 1, "clic sin rol, foco ni teclado en un <div>/<span> del sistema portado: agrégalo a la tabla A11Y de scripts/portar-sistema.mjs");
      });
    } } };
    if (existsSync("packages/ui/src/ds")) recorrer("packages/ui/src/ds");
  },

  /* 9c · Las pantallas (apps/web) también: un <div>/<span> con onClick que no es un control de verdad lo usa el teclado y el lector de pantalla
     (14 nov: 147 clics mudos con o sin role="button" sin foco). Cada etiqueta con onClick trae `{...tec(clic)}` (lib/tec.ts: foco, Enter y
     Espacio), un tabIndex / onKeyDown propios o role="presentation" (zona de clic que repite a otro control). Quedan fuera los fondos de hojas
     (inset-0), los envoltorios que solo detienen el clic y el mapa (sus propios gestos). */
  clicConTeclado() {
    const G = "clicConTeclado";
    const llaves = (s, i) => { let d = 0; for (; i < s.length; i++) { const c = s[i];
      if (c === '"' || c === "'") { const q = c; i++; while (i < s.length && s[i] !== q) i++; }
      else if (c === "`") { i++; while (i < s.length && s[i] !== "`") { if (s[i] === "\\") i++; else if (s[i] === "$" && s[i + 1] === "{") i = llaves(s, i + 1) - 1; i++; } }
      else if (c === "{") d++;
      else if (c === "}") { d--; if (!d) return i + 1; } }
      return -1; };
    const finTag = (s, i) => { for (; i < s.length; i++) { const c = s[i];
      if (c === '"' || c === "'") { const q = c; i++; while (i < s.length && s[i] !== q) i++; }
      else if (c === "{") { i = llaves(s, i); if (i < 0) return -1; i--; }
      else if (c === ">") return i; }
      return -1; };
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      const s = readFileSync(f, "utf8");
      if (!s.includes("onClick={")) continue;
      for (const m of s.matchAll(/<([a-z][a-zA-Z0-9]*)(?=[\s/>])/g)) {
        if (["button", "a", "input", "select", "textarea", "label", "summary", "option"].includes(m[1])) continue;
        const e = finTag(s, m.index + m[0].length);
        if (e < 0) continue;
        const tag = s.slice(m.index, e + 1);
        if (!tag.includes("onClick={") || /tec\(|tabIndex|onKeyDown|role="presentation"|onPointer|inset-0|inset: 0|stopPropagation|onClick=\{(stop|parar)\}/.test(tag)) continue;
        falla(G, f, s.slice(0, m.index).split("\n").length, `<${m[1]}> con onClick sin teclado: agrega {...tec(clic)} (lib/tec.ts) y su role, o role="presentation" si repite a otro control`);
      }
    }
  },

  /* 3o. Todo interruptor (role="switch") se usa con teclado: si no es un <button>, lleva tabIndex y onKeyDown; si es un
     <span> suelto, además su nombre (aria-label). 6 nov, 2p: el de «Respuesta automática» y otros cuatro no tenían. */
  interruptorAccesible() {
    for (const f of codigo) {
      if (!/\.tsx$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        const m = l.match(/<(\w+) [^>]*role="switch"[^>]*>/);
        if (!m || m[1] === "button") return;
        if (!/tabIndex=/.test(l) || !/onKeyDown=/.test(l)) falla("interruptorAccesible", f, i + 1, "interruptor sin tabIndex u onKeyDown (no se puede usar con teclado)");
        else if (m[1] === "span" && !/aria-label/.test(l)) falla("interruptorAccesible", f, i + 1, "interruptor sin nombre (aria-label)");
      });
    }
  },

  /* 3p. Correo (6 nov, 2q): los colores del correo (hex, porque los clientes de correo no leen variables) son los mismos
     que los tokens; y el modo «pruebas» (el correo no sale) nunca puede existir en producción. */
  correo() {
    const f = "apps/web/lib/correo/colores.ts";
    if (existsSync(f)) {
      const tok = readFileSync("packages/ui/src/tokens.css", "utf8");
      for (const m of readFileSync(f, "utf8").matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)) {
        const t = tok.match(new RegExp(`--tl-${m[1]}:\\s*(#[0-9A-Fa-f]{6})`));
        if (!t || t[1].toUpperCase() !== m[2].toUpperCase()) falla("correo", f, 0, `el color «${m[1]}» del correo no es igual a --tl-${m[1]} de tokens.css`);
      }
    }
    const i = "apps/web/lib/correo/index.ts";
    if (existsSync(i) && !/if \(ENTORNO !== "produccion" && process\.env\.TOLATINO_CORREO_MODO !== "ses"\) return "pruebas";/.test(readFileSync(i, "utf8")))
      falla("correo", i, 0, "el modo pruebas del correo debe depender de ENTORNO !== \"produccion\" (nunca en producción)");
  },

  /* 4na. El cover que vio el cliente tiene que poder probarse («el cover que publicó esa noche a esa hora»): cada cambio de «Esta
     noche» deja su fila en night_posts en la misma transacción, y night_posts no se edita ni se borra. Nadie más escribe el cover,
     la edad, la lista, la fila, la música o la vestimenta de noche_settings que lib/noche.ts (guardarNoche). */
  coverConHistoria() {
    const L = "apps/web/lib/noche.ts", M = "packages/db/migrations/0081_noche_servicios.sql";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8"), i = t.indexOf("export async function guardarNoche"), g = t.slice(i, t.indexOf("\n}\n", i));
    if (i < 0 || !/insert into night_posts/.test(g)) falla("coverConHistoria", L, 0, "guardarNoche no deja su fila en night_posts");
    if (existsSync(M) && !/before update or delete on night_posts/.test(readFileSync(M, "utf8"))) falla("coverConHistoria", M, 0, "night_posts debe ser solo inserción (trigger)");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => {
        if (/(update|delete from)\s+night_posts/i.test(l)) falla("coverConHistoria", f, n + 1, "night_posts es solo inserción");
        if (f !== L && /update noche_settings set/i.test(l) && /(cover|after_|min_age|list_|line_|music|dress)/.test(l)) falla("coverConHistoria", f, n + 1, "«Esta noche» solo se cambia con guardarNoche (deja su historia en night_posts)");
      });
    }
  },

  /* 4na. «Fila ahora» solo si el local la puso hace 60 minutos o menos (Preguntas #4); después sale con su hora. El prototipo decía
     «HACE 4 MIN» fijo: ningún texto de «ahora» fuera de filaTexto (lib/noche-comun.ts), y «viva» sale de FILA_VIVA_MIN. */
  filaNoFalsa() {
    const C = "apps/web/lib/noche-comun.ts", L = "apps/web/lib/noche.ts";
    if (!existsSync(C)) return;
    const t = readFileSync(C, "utf8");
    // 5i: el valor vive en Configuración (config_keys · noche_fila_viva_min, 60 de fábrica); la base y lib/noche.ts lo leen de ahí.
    const K = "packages/db/migrations/0105_configuracion_comunidad.sql";
    if (!existsSync(K) || !/\('noche_fila_viva_min', 15, 240, 60,/.test(readFileSync(K, "utf8"))) falla("filaNoFalsa", K, 0, "la fila «ahora» vale 60 minutos de fábrica (config_keys · noche_fila_viva_min)");
    if (!/if \(f\.viva\) return f\.min \? E2\(`Fila ahora/.test(t) || !/if \(f\.viva\) return E2\(`Ahora · lo puso/.test(t) || !/f\.viva \? \(es \? "FILA AHORA"/.test(t)) falla("filaNoFalsa", C, 0, "«Fila ahora» solo dentro de if (f.viva)");
    if (existsSync(L) && !/s\.line_at > now\(\) - make_interval\(mins => \$\{cfgSql\("noche_fila_viva_min"\)\}\)/.test(readFileSync(L, "utf8"))) falla("filaNoFalsa", L, 0, "«viva» se calcula en el servidor con el valor de Configuración (noche_fila_viva_min)");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === C) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => { if (/Fila ahora|Line now|(?<!LA )FILA AHORA|LINE NOW|Ahora · lo puso|HACE \d+ MIN/.test(l)) falla("filaNoFalsa", f, n + 1, "la fila «ahora» solo la dice filaTexto (con su hora real)"); });
    }
  },

  /* 4na. La app no vende tragos, botellas ni hookah, ni cobra el cover (Mercados 0064, fase4-noche §3): Noche solo tiene estas
     formas de servicio, y el alta no le ofrece Menú, Tienda ni Pedidos. */
  alcoholNoSeVende() {
    const S = "apps/web/lib/servicios.ts", O = "apps/web/lib/onb/datos.ts";
    if (existsSync(S)) {
      const m = /export const KINDS_NOCHE = \[([^\]]*)\]/.exec(readFileSync(S, "utf8"));
      const k = m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]).sort().join(",") : "";
      if (k !== "cover,evento,fecha,lista,mesa,vip") falla("alcoholNoSeVende", S, 0, `Noche vende solo entrada, lista, mesa, VIP, noche especial y por fecha (hay: ${k || "nada"})`);
    }
    if (existsSync(O)) {
      const m = /'NEG-NOCHE': \[([^\]]*)\]/.exec(readFileSync(O, "utf8"));
      if (m && /'(menu|shop|pedidos)'/.test(m[1])) falla("alcoholNoSeVende", O, 0, "el alta de Noche no ofrece Menú, Tienda ni Pedidos (la app no vende tragos)");
    }
    // 6a · Extras de eventos (fase6 §3 y §6 #4): solo detalle · material · servicio · otro, nunca alcohol, botellas ni hookah. La misma
    // lista en lib/evt-comun.ts y en la base (evt_extras_ok, en el check de events.addons_cfg); el servidor rechaza antes de guardar;
    // el editor no sugiere botellas.
    const G = "alcoholNoSeVende", EC = "apps/web/lib/evt-comun.ts", EV = "apps/web/lib/evt.ts", M6 = "packages/db/migrations/0106_eventos_base.sql", ED = "apps/web/app/panel/EventosPanel.tsx";
    if (existsSync(EC) && existsSync(M6)) {
      const ec = sinComent(EC), m6 = readFileSync(M6, "utf8");
      const k = [.../export const EXTRA_KINDS: ExtraKind\[\] = \[([^\]]*)\]/.exec(ec)?.[1]?.matchAll(/"(\w+)"/g) ?? []].map((x) => x[1]).sort().join(",");
      if (k !== "detalle,material,otro,servicio") falla(G, EC, 0, `los extras de un evento son solo detalle, material, servicio u otro (hay: ${k || "nada"})`);
      const re = /export const ALCOHOL = \/(.+)\/;/.exec(ec)?.[1] ?? "";
      for (const w of ["botell", "bottle", "hookah", "trago", "cerveza", "licor", "vino"]) if (!re.includes(w)) falla(G, EC, 0, `ALCOHOL no reconoce «${w}»`);
      const fn = /create or replace function evt_extras_ok\(a jsonb\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m6)?.[1] ?? "";
      if (!fn.includes(`~ '${re}'`)) falla(G, M6, 0, "evt_extras_ok (base) y ALCOHOL (lib/evt-comun.ts) deben ser la misma lista");
      if (!/not in \('detalle', 'material', 'servicio', 'otro'\)/.test(fn)) falla(G, M6, 0, "evt_extras_ok debe rechazar tipos fuera de detalle · material · servicio · otro");
      if (!/addons_cfg\s+jsonb not null default '\[\]' check \(evt_extras_ok\(addons_cfg\)\)/.test(m6)) falla(G, M6, 0, "events.addons_cfg sin el check evt_extras_ok");
    }
    if (existsSync(EV)) { const b = cuerpoFn(sinComent(EV), "normalizar"), iA = b.search(/if \(extras\.some\(esAlcohol\)\) return no\(/), iR = b.search(/return \{ ok: true, d:/);
      if (iA < 0 || iR < 0 || iA > iR) falla(G, EV, 0, "normalizar debe rechazar un extra de alcohol, botellas o hookah antes de guardar"); }
    if (existsSync(ED)) sinComent(ED).split("\n").forEach((l, i) => { if (/ph: [^}]*(Botella|Bottle|[Hh]ookah|Trago|Cubeta)/.test(l)) falla(G, ED, i + 1, "el editor de eventos no sugiere botellas, tragos ni hookah"); });
  },

  /* 4nc. Noche · dinero. To'Latino nunca cobra cover ni lista (solo el depósito de la mesa): la lista va con $0 y el cover no se
     vende; el depósito solo se cobra con la mesa confirmada; el cupo se cuenta dentro del candado de esa mesa y esa noche. */
  coverNuncaEnLaApp() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8");
    if (!/const dep = lista \|\| !pro \|\| !x\.cuenta \? 0 : s\.dep;/.test(t)) falla("coverNuncaEnLaApp", L, 0, "la lista se anota con $0 (dep = 0 si es lista)");
    if (!/svc_kind in \('lista', 'mesa', 'vip'\)/.test(t)) falla("coverNuncaEnLaApp", L, 0, "solo se reservan lista, mesa y VIP: la entrada (cover) nunca se vende en la app");
    if (/svc_kind in \([^)]*'cover'/.test(t)) falla("coverNuncaEnLaApp", L, 0, "el cover no se vende en la app");
  },
  depositoNoche() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8");
    for (const m of t.matchAll(/export async function (\w+)\([\s\S]*?\n}\n/g)) {
      const cuerpo = m[0];
      if (/cobrarOperacion\(/.test(cuerpo) && !/set status = 'confirmed'/.test(cuerpo)) falla("depositoNoche", L, 0, `«${m[1]}» cobra el depósito sin confirmar la mesa`);
    }
    if (!/if \(o\.pay === "held"\) await liberarOperacion/.test(t)) falla("depositoNoche", L, 0, "cancelar libera lo retenido");
    if (!/aTiempo = lista \|\| !conf \|\| o\.nowN < Number\(o\.det\.cut \?\? 360\)/.test(t)) falla("depositoNoche", L, 0, "el corte para cancelar se mide con la hora real de esa noche (det.cut)");
  },
  mesasSinSobreventa() {
    const L = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(L)) return;
    const t = readFileSync(L, "utf8"), i = t.indexOf("export async function reservarNoche"), f = t.slice(i, t.indexOf("\n}\n", i));
    const lk = f.indexOf("pg_advisory_xact_lock(hashtext('noche:'"), cu = f.indexOf("await noches(c, x, s)");
    if (i < 0 || lk < 0 || cu < 0 || lk > cu) falla("mesasSinSobreventa", L, 0, "el cupo de mesas se cuenta DENTRO del candado noche:{negocio}:{noche}:{item}");
  },
  /* 4nc. Noche · privacidad. El código de la puerta solo lo ve quien reservó (y la mesa, ya confirmada) y el local; nunca va en un
     SMS. La app no pide fecha de nacimiento ni guarda imágenes de identificación (el 21+ lo revisa la puerta). La noche corta a las 6 AM. */
  codigoPuerta() {
    const L = "apps/web/lib/noche-reservas.ts", M = "packages/db/migrations/0082_noche_reservas.sql";
    if (existsSync(L) && !/code: o\.status === "confirmed" \? o\.code : null/.test(readFileSync(L, "utf8"))) falla("codigoPuerta", L, 0, "el código sale solo con la reserva viva y confirmada");
    if (existsSync(M) && /\{(codigo|code|door)\}/i.test(readFileSync(M, "utf8"))) falla("codigoPuerta", M, 0, "el código de la puerta nunca va en un aviso por SMS");
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === L || /^apps\/web\/app\/panel\//.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => { if (/door_code/.test(l)) falla("codigoPuerta", f, n + 1, "door_code solo lo leen lib/noche-reservas.ts y el panel"); });
    }
    // 6g: la puerta (lib/puerta*, /puerta, /api/puerta) lee y marca la lista de la noche SOLO por lib/noche-reservas.ts; la lista que le da
    // nunca trae el código, el teléfono ni lo que se paga en el local.
    for (const f of codigo) {
      if (!(/^apps\/web\/lib\/puerta[^/]*\.ts$/.test(f) || /^apps\/web\/app\/(\(puerta\)|api\/puerta)\//.test(f))) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/kind = 'night'/.test(q) && !/^`select [^`]*from operations where id = p_op/.test(q)) falla("codigoPuerta", f, 0, "la puerta lee la lista de la noche solo por lib/noche-reservas.ts");
    }
    if (existsSync(L)) {
      const t = sinComent(L), b = cuerpoFn(t, "listaEnLaPuerta");
      if (!b || /door_code as|o\.door_code\s*,|\bphone\b|_cents/.test(b.replace(/o\.door_code = \$3/, ""))) falla("codigoPuerta", L, 0, "listaEnLaPuerta: busca por el código pero nunca lo devuelve (ni teléfono ni montos)");
      if (!/marcarLlegada/.test(t)) falla("codigoPuerta", L, 0, "falta marcarLlegada (la puerta marca la lista por aquí)");
    }
    const PU = "apps/web/lib/puerta.ts";
    if (existsSync(PU) && (!/import\("\.\/noche-reservas"\)\)\.listaEnLaPuerta\(/.test(readFileSync(PU, "utf8")) || !/const \{ marcarLlegada \} = await import\("\.\/noche-reservas"\);/.test(readFileSync(PU, "utf8")))) falla("codigoPuerta", PU, 0, "la puerta usa listaEnLaPuerta / marcarLlegada de lib/noche-reservas.ts");
  },
  sinImagenDeID() {
    for (const f of [...codigo, ...archivos.filter((x) => /^packages\/db\/migrations\/00(8[1-9]|9\d)_.*\.sql$/.test(x))]) {
      if (!/noche|night/i.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, n) => {
        if (/(birth_?date|date_of_birth|\bdob\b|fecha_nac|fecha de nacimiento["'`]?\s*[:=]|id_photo|foto del id|owner_kind\s*=\s*'id')/i.test(l) && !/no pide fecha de nacimiento|nunca guarda|ni guarda|sin imagen/i.test(l))
          falla("sinImagenDeID", f, n + 1, "la app no pide fecha de nacimiento ni guarda imágenes de identificación (la puerta revisa el ID)");
      });
    }
  },
  nocheCruzaMedianoche() {
    const L = "apps/web/lib/noche.ts";
    if (existsSync(L) && !/export const NOCHE_SQL = \(ts: string, tz: string\) => `\(\(\$\{ts\} at time zone \$\{tz\}\) - interval '6 hours'\)::date`;/.test(readFileSync(L, "utf8")))
      falla("nocheCruzaMedianoche", L, 0, "la noche corta a las 6 AM: una llegada a la 1 AM es de la noche anterior (NOCHE_SQL)");
  },

  /* 4nd. Postgres pasa a minúsculas los nombres sin comillas: «as ${k}» con k = "coverOk" llegaba como «coverok» y la pantalla no
     veía «Lo que importa» (también «fechaOk», «fotosOk» de Fiestas). Un alias que se arma con ${…} dentro de SQL va entre comillas. */
  aliasConComillas() {
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/(::\w+|\)) as \$\{/.test(l)) falla("aliasConComillas", f, i + 1, "alias de SQL armado con ${…} sin comillas: Postgres lo pasa a minúsculas (usa as \"${k}\")"); });
    }
  },

  /* 4. Toda cadena visible nace en español: prohibido `lang="en` en layouts. */
  /* 4ib. Vivienda justa (Fair Housing Act y PHRA · fase4-iglesias-inmuebles-autos.md §3): ningún filtro ni campo de una clase protegida
     (niños o familia, religión, raza, origen, sexo, discapacidad, edad); la lista de frases vive SOLO en lib/vivienda-justa.ts y el
     servidor la pasa al guardar una propiedad; toda propiedad que se pinta lleva el pie de igualdad y la nota de animales de servicio. */
  viviendaJusta() {
    const G = "viviendaJusta", V = "apps/web/lib/vivienda-justa.ts", I = "apps/web/lib/inmuebles.ts", C = "apps/web/lib/inmuebles-comun.ts", dir = "packages/db/migrations";
    const PROT = /\b(familias?|ni[nñ]os?|kids|children|famil(y|ies)|religi[oó]n|religion|cristian[oa]s?|cat[oó]lic[oa]s?|raza|race|color|sexo|sex|genero|g[eé]nero|gender|nacionalidad|national|origen|origin|inmigrantes?|immigrants?|hispan[oa]s?|latin[oa]s?|discapacidad|disability|disabled|parejas?|couples?|solter[oa]s?|singles?|adultos|adults|edad|age)\b/i;
    if (!existsSync(V)) return falla(G, V, 0, "falta lib/vivienda-justa.ts (la lista de frases y revisarTexto)");
    const v = readFileSync(V, "utf8");
    if (!/export async function revisarTexto\(/.test(v)) falla(G, V, 0, "falta revisarTexto(es, en)");
    if (!/\["no niños", "es"\]/.test(v) || !/\["no kids", "en"\]/.test(v)) falla(G, V, 0, "la lista de fábrica tiene que frenar «no niños» y «no kids»");
    // La lista solo aquí: ninguna otra pieza de la app escribe esas frases (ni para mostrarlas ni para decidir).
    const MARCA = ["no niños", "sin niños", "solo adultos", "no se aceptan niños", "no kids", "no children", "adults only", "solo cristianos", "para inmigrantes", "solo hispanos", "no section 8", "no se acepta section 8"];
    for (const f of codigo) {
      if (!/^apps\/web\//.test(f) || f === V) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { for (const m of MARCA) if (l.toLowerCase().includes(m)) falla(G, f, i + 1, `la frase «${m}» vive solo en lib/vivienda-justa.ts`); });
    }
    if (existsSync(I)) {
      const s = readFileSync(I, "utf8"), der = /const DER = \[([^\]]*)\]/.exec(s)?.[1] ?? "";
      if (!der) falla(G, I, 0, "falta la lista DER de filtros derivados de Bienes Raíces");
      for (const k of der.matchAll(/"([^"]+)"/g)) if (PROT.test(k[1])) falla(G, I, 0, `filtro de una clase protegida: «${k[1]}» (los filtros son de la propiedad y de los papeles que se aceptan)`);
      s.split("\n").forEach((l, i) => { for (const m of l.matchAll(/F\.add\("([^"]+)"\)/g)) if (PROT.test(m[1]) || !der.includes(`"${m[1]}"`)) falla(G, I, i + 1, `filtro «${m[1]}» fuera de la lista permitida o de una clase protegida`); });
      const g = /export async function guardarPropiedad[\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!/await revisarTexto\(\[name\.es, desc\.es, papers\.es, lease\.es/.test(g)) falla(G, I, 0, "guardarPropiedad tiene que pasar nombre, descripción, lo que piden y contrato por revisarTexto");
      if (!/if \(fr\) \{[\s\S]*?return err\(/.test(g)) falla(G, I, 0, "si una frase salta, la propiedad no se guarda (return err antes de escribir)");
      if (g.indexOf("revisarTexto(") > g.indexOf("insert into items")) falla(G, I, 0, "revisarTexto corre ANTES de escribir la propiedad");
    }
    // Columnas de propiedades y de la herramienta: ninguna por quién vive.
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql") && y >= "0092")) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const tb of ["property_listings", "inm_settings"]) {
        const body = new RegExp(`create table if not exists ${tb} \\(([\\s\\S]*?)\\n\\);`).exec(t)?.[1] ?? "";
        body.split("\n").forEach((l) => { const col = /^\s*([a-z_0-9]+)\s+(text|boolean|smallint|integer|bigint|numeric|date|jsonb|geography|timestamptz|uuid)/.exec(l)?.[1]; if (col && col.split("_").some((p) => PROT.test(p))) falla(G, `${dir}/${x}`, 0, `columna «${col}» de ${tb}: ningún campo por una clase protegida`); });
      }
    }
    if (existsSync(C)) {
      const s = readFileSync(C, "utf8");
      if (!s.includes('export const EHO: Bi = { es: "Igualdad de oportunidad en la vivienda", en: "Equal Housing Opportunity" }')) falla(G, C, 0, "el pie «Igualdad de oportunidad en la vivienda» / «Equal Housing Opportunity» va verbatim");
      if (!s.includes('export const ANIMALES_SERVICIO: Bi = { es: "Los animales de servicio y de apoyo no son mascotas: se aceptan siempre."')) falla(G, C, 0, "la nota de los animales de servicio va verbatim");
      if (!s.includes('export const NO_PAGUES: Bi = { es: "Nunca pagues un depósito antes de ver la propiedad y firmar el contrato."')) falla(G, C, 0, "la línea contra estafas de renta va verbatim");
      if (!s.includes("Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad.")) falla(G, C, 0, "la línea fija de Bienes Raíces (§1c) va verbatim");
    }
    // Quien pinta propiedades (el panel hoy; la ficha en 4id) pone el pie de igualdad y la nota de animales de servicio.
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      const s = readFileSync(f, "utf8");
      if (!/from "@\/lib\/inmuebles-comun"/.test(s) || !/PropInm|mudarteTexto/.test(s)) continue;
      // El pie (pie()) lleva las dos frases y va detrás de cada propiedad que se pinta («Así se ve», mprev).
      const pie = /function pie\([\s\S]*?\n}\n/.exec(s)?.[0] ?? "";
      if (!/bi\(EHO, es\)/.test(pie) || !/bi\(ANIMALES_SERVICIO, es\)/.test(pie)) falla(G, f, 0, "pinta propiedades sin el pie de igualdad de oportunidad y la nota de animales de servicio (function pie)");
      if ((s.match(/type: "mprev"/g) ?? []).length > (s.match(/\.\.\.pie\(c, /g) ?? []).length) falla(G, f, 0, "cada propiedad que se pinta («Así se ve») va seguida de su pie (...pie(c, …))");
      // 4id · La ficha pública: toda función que pinta propiedades (la lista, el Resumen y la hoja) pone el pie; la hoja dice además
      // «Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.».
      if (/from "@\/lib\/inmuebles-publico"/.test(s)) {
        for (const fn of s.split(/\nexport function /).slice(1)) {
          const n = fn.slice(0, fn.indexOf("("));
          if (/mudarteTexto\(|<Lista |v\.primeros|primeros=\{/.test(fn) && !/pie\(/.test(fn)) falla(G, f, 0, `«${n}» pinta propiedades sin el pie de igualdad de oportunidad y la nota de animales de servicio`);
          if (/mudarteTexto\(/.test(fn) && !/bi\(NO_PAGUES, es\)/.test(fn)) falla(G, f, 0, `«${n}» (la hoja) no dice «Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.»`);
        }
      }
    }
  },

  /* 4id. El punto de un negocio en lo público (lista, ficha, mapa, Ciudad, relacionados) sale de PUNTO_PUBLICO (lib/punto.ts): quien trabaja desde
     casa (o renta un cuarto en su casa) sale como zona de ~500 m y su punto exacto nunca llega al navegador. Pedido, reserva y visita confirmada
     sí llevan el punto (la persona ya tiene la operación). Además, guardarPropiedad pasa a «desde casa» al negocio que renta en su dirección. */
  puntoPublico() {
    const G = "puntoPublico";
    const PUB = /^apps\/web\/lib\/([a-z-]*publico|ficha|categoria|buscar|mapa|directorio|ciudad|tarjeta)\.ts$/;
    for (const f of codigo) {
      if (!PUB.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/st_[xy]\(\s*[a-z]+\.geo\b|st_astext\(\s*[a-z]+\.geo\b|st_asgeojson\(\s*[a-z]+\.geo\b/i.test(l)) falla(G, f, i + 1, "el punto de un negocio en lo público sale de PUNTO_PUBLICO (lib/punto.ts): quien trabaja desde casa sale como zona");
      });
    }
    const P = "apps/web/lib/punto.ts";
    if (!/when \$\{x\}\.works_from_home then round\(st_y/.test(readFileSync(P, "utf8"))) falla(G, P, 0, "PUNTO_PUBLICO redondea el punto de quien trabaja desde casa");
    const I = "apps/web/lib/inmuebles.ts";
    if (existsSync(I) && !/update businesses b set works_from_home = true/.test(readFileSync(I, "utf8"))) falla(G, I, 0, "quien renta en su propia dirección (propiedad con la dirección oculta) pasa a «trabaja desde casa»");
    // 6b · El punto y la dirección de un evento en lo público: PUNTO_EVENTO (en el local de quien trabaja desde casa, la zona redondeada) y
    // DIRECCION_EVENTO (sin dirección si trabaja desde casa). lib/evt-publico.ts no lee el punto ni la dirección por su cuenta.
    const pt = readFileSync(P, "utf8");
    if (!/export const PUNTO_EVENTO = [\s\S]*?when \$\{b\}\.works_from_home then round\(st_y\(/.test(pt) || !/export const DIRECCION_EVENTO = [\s\S]*?when \$\{b\}\.works_from_home then null/.test(pt)) falla(G, P, 0, "PUNTO_EVENTO redondea y DIRECCION_EVENTO calla la casa de quien trabaja desde casa");
    const EP = "apps/web/lib/evt-publico.ts";
    if (existsSync(EP)) {
      const t = sinComent(EP);
      t.split("\n").forEach((l, i) => {
        if (/st_[xy]\(|st_astext|st_asgeojson/i.test(l)) falla(G, EP, i + 1, "el punto de un evento sale de PUNTO_EVENTO (lib/punto.ts)");
        if (/\bb\.address\b|\be\.venue_address\b/.test(l)) falla(G, EP, i + 1, "la dirección de un evento sale de DIRECCION_EVENTO (lib/punto.ts)");
      });
      if (!/\$\{PUNTO_EVENTO\("e", "b"\)\}/.test(t) || !/\$\{DIRECCION_EVENTO\("e", "b"\)\} as addr/.test(t)) falla(G, EP, 0, "la ficha del evento usa PUNTO_EVENTO y DIRECCION_EVENTO");
    }
  },
  /* 4ib. La dirección exacta de una propiedad (addr_line, geom) solo la lee lib/inmuebles.ts (el panel del negocio) y, en 4ie, lib/visitas-inm*.ts
     (al confirmar la visita). Ninguna consulta pública la ve; los cuartos y «solo la zona» muestran la zona (§3, §6 #15). */
  direccionAlConfirmar() {
    const G = "direccionAlConfirmar", OK = /^apps\/web\/lib\/(inmuebles|visitas-inm)\.ts$/; // 4ie: solo lib/visitas-inm.ts (no su -comun, que va al navegador)
    for (const f of codigo) {
      if (!/^(apps|services)\//.test(f) || OK.test(f)) continue;
      const s = readFileSync(f, "utf8");
      s.split("\n").forEach((l, i) => { if (/\baddr_line\b/.test(l)) falla(G, f, i + 1, "addr_line de una propiedad solo se lee en lib/inmuebles.ts (y al confirmar la visita, lib/visitas-inm*.ts)"); });
      // 8i · El inventario de datos NOMBRA la columna (para decir que no es personal); no la lee.
      if (f !== "apps/mobile/inventario-datos.json" && /property_listings/.test(s) && /\b(pl|property_listings)\.geom\b|\bgeom\b[^\n]*from property_listings|st_[xy]\(\s*(pl\.)?geom/.test(s)) falla(G, f, 0, "la ubicación exacta (geom) de una propiedad no se lee fuera de lib/inmuebles.ts");
      // Lo público no importa la librería del panel (trae la dirección): solo inmuebles-comun o, en 4id, inmuebles-publico.
      if (/^apps\/web\/(lib\/([a-z-]*publico|ficha|categoria|buscar|mapa|directorio|ciudad)\.ts|app\/\(app\)\/)/.test(f) && /from "(\.\/|@\/lib\/)inmuebles"/.test(s)) falla(G, f, 0, "una pantalla o consulta pública importa lib/inmuebles.ts (la del panel, con la dirección exacta)");
    }
    // 4ie · En lib/visitas-inm.ts la dirección exacta se lee en UN solo lugar (direccionCliente) y le llega al cliente solo con la visita
    // confirmada o pasada; la dirección de la casa del cliente (prueba en casa) la lee el dealer solo confirmada y cada vista se audita.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI)) {
      const t = readFileSync(VI, "utf8"), dc = /async function direccionCliente\([\s\S]*?\n}\n/.exec(t)?.[0] ?? "";
      if ((t.match(/\baddr_line\b/g) ?? []).length !== (dc.match(/\baddr_line\b/g) ?? []).length || !dc) falla(G, VI, 0, "addr_line se lee solo en direccionCliente (una sola puerta)");
      if (!/const direccion = cliente && conf \? await direccionCliente/.test(t)) falla(G, VI, 0, "la dirección exacta le llega al cliente solo con la visita confirmada o pasada");
      if (!/p\.reason = 'casa' and o\.business_id = \$2 and o\.kind = 'visit' and o\.status in \('confirmed', 'done'\)/.test(t) || !/'vis\.ver_direccion'/.test(t)) falla(G, VI, 0, "la dirección de la casa del cliente: solo con la prueba confirmada, para ese negocio, y cada vista en la auditoría");
      if (!/const enCasa[^\n]*\n[^\n]*\n[^\n]*\n[\s\S]*cifrar\(JSON\.stringify\(\{ calle, zip \}\)\)/.test(t)) falla(G, VI, 0, "la dirección de la casa del cliente se guarda cifrada (op_private 'casa')");
    }
    const C = "packages/db/migrations/0092_inmuebles_propiedades.sql";
    if (existsSync(C) && !/check \(kind not in \('cuarto', 'compartida'\) or not addr_public\)/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "los cuartos y la vivienda compartida nunca muestran la dirección exacta (check en la base)");
    const I = "apps/web/lib/inmuebles.ts";
    if (existsSync(I) && !/const zona = soloZona\(kind\) \|\| p\.soloZona === true/.test(readFileSync(I, "utf8"))) falla(G, I, 0, "guardarPropiedad fuerza «solo la zona» en cuartos");
    // 4id · La ficha pública: de cada propiedad solo la zona; un cuarto siempre «solo la zona»; la ficha de quien renta cuartos (en su casa)
    // nunca lleva la dirección ni el punto del negocio.
    const P = "apps/web/lib/inmuebles-publico.ts";
    if (existsSync(P)) {
      const t = readFileSync(P, "utf8");
      if (!/not pl\.addr_public as "soloZona"/.test(t) || !/soloZona: p\.soloZona \|\| soloZona\(p\.kind\)/.test(t)) falla(G, P, 0, "la ficha pública marca «solo la zona» con addr_public y siempre en cuartos");
      if (/\bpl\.\*|select \*/.test(t)) falla(G, P, 0, "la consulta pública de propiedades nombra cada columna (nunca select *: traería la dirección)");
    }
    const F = "apps/web/app/(app)/n/[id]/page.tsx";
    if (existsSync(F) && /inmPublica\(/.test(readFileSync(F, "utf8"))) {
      const t = readFileSync(F, "utf8");
      if (!/inm\?\.kind === "cuarto" \?/.test(t) || !/if \(sinLocal\) Object\.assign\(f, \{ direccion: null, lat: null, lng: null,/.test(t)) falla(G, F, 0, "la ficha de quien renta cuartos no lleva la dirección ni el punto del negocio (sinLocal)");
    }
  },

  /* 4ib. Toda cuota de venta (y en 4ic el pago de ejemplo) dice «estimada» / «estimated»: nunca una promesa (Regulation Z, §3). */
  cuotaEstimada() {
    const G = "cuotaEstimada", C = "apps/web/lib/inmuebles-comun.ts";
    if (existsSync(C)) {
      const f = /export function cuotaTexto[\s\S]*?\n}\n/.exec(readFileSync(C, "utf8"))?.[0] ?? "";
      if (!f.includes("`Cuota estimada ") || !f.includes("`Estimated payment ")) falla(G, C, 0, "cuotaTexto dice siempre «Cuota estimada» / «Estimated payment»");
    }
    const A = "apps/web/lib/autos-comun.ts";
    if (existsSync(A)) {
      const a = readFileSync(A, "utf8"), p = /export function pagoTexto[\s\S]*?\n}\n/.exec(a)?.[0] ?? "", b = /export function bhphTexto[\s\S]*?\n}\n/.exec(a)?.[0] ?? "";
      for (const [n, f] of [["pagoTexto", p], ["bhphTexto", b]]) if (!f.includes("APR (estimado, sujeto a aprobación)") || !f.includes("APR (estimated, subject to approval)")) falla(G, A, 0, `${n} dice siempre la tasa (APR) y «estimado, sujeto a aprobación» / «estimated, subject to approval»`);
      if (!/if \(!p \|\| p\.down == null \|\| p\.aprBp == null \|\| !p\.months \|\| !p\.pago\) return "";/.test(p)) falla(G, A, 0, "pagoTexto no escribe un pago sin enganche, tasa y meses (Regulation Z)");
      if (!/if \(!b \|\| b\.down == null \|\| !b\.week \|\| !b\.weeks \|\| b\.aprBp == null\) return "";/.test(b)) falla(G, A, 0, "bhphTexto no escribe un pago a la semana sin enganche, semanas y tasa");
    }
    // Lo que pinta carros (importa autos-comun o es de Autos): ningún pago suelto.
    const autos = new Set(codigo.filter((f) => /^apps\/web\/.*\.tsx?$/.test(f) && (/autos/i.test(f) || /from "(@\/lib\/|\.\/)autos(-comun)?"/.test(readFileSync(f, "utf8")))));
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === "apps/web/lib/inmuebles.ts" || f === "apps/web/lib/autos.ts") continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (/(usd|dinero|fp|money)\([^)]*\b(cuota|est_payment_cents|estPago)\b[^)]*\)/.test(l) && !/estimad|Estimated|cuotaTexto\(/.test(l)) falla(G, f, i + 1, "una cuota se muestra sin «estimada»: usa cuotaTexto() o dilo en la misma línea");
        if (autos.has(f) && /(usd|dinero|fp|money)\([^)]*\b(\w+\.pago|est_payment_cents|bhph_week_cents|\w+\.est\.\w+|\w+\.bhph\.week)\b[^)]*\)/.test(l) && !/pagoTexto\(|bhphTexto\(|sujeto a aprobación|subject to approval/.test(l)) falla(G, f, i + 1, "un pago de carro se muestra sin tasa, meses y enganche: usa pagoTexto() / bhphTexto()");
      });
    }
  },

  /* 4ib. Nada de datos de crédito ni de identidad en Bienes Raíces, Autos e Iglesias (§3): ninguna columna ni campo de seguro social,
     número de ITIN, ingresos, fecha de nacimiento, puntaje de crédito, cuenta de banco ni número de licencia de una persona. */
  sinDatosDeCredito() {
    const G = "sinDatosDeCredito", dir = "packages/db/migrations", MAL = "ssn|itin_number|income|dob|credit_score|bank_[a-z_]+|license_number";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql") && y >= "0091")) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/^\s*--/.test(l)) return;
      if (new RegExp(`^\\s*(${MAL})\\s+[a-z]`).test(l) || new RegExp(`add column (if not exists )?(${MAL})\\b`).test(l)) falla(G, `${dir}/${x}`, i + 1, "columna de datos de crédito o de identidad: nunca se guarda (los papeles se llevan en persona)");
    });
    for (const f of codigo) {
      // 4ie: también las pantallas de pedir visita y su estado, y el panel de Visitas.
      const area = /^apps\/web\/(lib\/(inmuebles[a-z-]*|vivienda-justa|visitas-inm[a-z-]*|autos[a-z-]*|fe[a-z-]*)\.ts|app\/panel\/(Inmuebles\.tsx|acciones-inm\.ts|Autos\.tsx|acciones-autos\.ts|Visitas\.tsx|acciones-vis\.ts)|app\/\(app\)\/(n\/\[id\]\/ver|vis\/\[num\])\/[^/]+\.tsx?)$/.test(f);
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (area && new RegExp(`(\\b(${MAL})\\??\\s*:|\\.(${MAL})\\b)`).test(l)) falla(G, f, i + 1, "campo de datos de crédito o de identidad: nunca se pide ni se guarda");
        // El número de la licencia de conducir de una persona no existe en ningún lado (4ie: solo «Sí, tengo licencia vigente»).
        if (/^(apps|packages|services)\//.test(f) && /license_number|licenseNumber|driver_?license_?(no|num)|licencia_?de_?conducir_?(no|num)/i.test(l)) falla(G, f, i + 1, "número de licencia de conducir: nunca se pide ni se guarda (solo «tengo licencia vigente»)");
      });
    }
    // La prueba de manejo solo marca que la tiene (has_license), nunca un número ni una foto.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI) && !/has_license: it\.que === "prueba" \? true : null/.test(readFileSync(VI, "utf8"))) falla(G, VI, 0, "la prueba de manejo guarda solo «tiene licencia vigente» (has_license), nada más");
  },

  /* 4ib/4ie. Ver una propiedad es gratis: el código de Bienes Raíces (y las visitas de 4ie) no toca pasarela, pagos ni retenciones (§3). */
  sinDineroEnVisitas() {
    for (const f of codigo) {
      if (!/^apps\/web\/(lib\/(inmuebles[a-z-]*|vivienda-justa|visitas-inm[a-z-]*|autos[a-z-]*)\.ts|app\/panel\/(Inmuebles\.tsx|acciones-inm\.ts|Autos\.tsx|acciones-autos\.ts|Visitas\.tsx|acciones-vis\.ts)|app\/\(app\)\/(n\/\[id\]\/ver|vis\/\[num\])\/[^/]+\.tsx?)$/.test(f)) continue; // 4ie: las pantallas y el panel de visitas también
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (/pasarela|from "[^"]*pagos|stripe|insert into payments|update payments|retener\(|cobrar\(|capturar\(/i.test(l)) falla("sinDineroEnVisitas", f, i + 1, "Bienes Raíces y Venta de Autos no mueven dinero en la app: ver y la prueba de manejo son gratis (sin pasarela, pagos ni retenciones)");
      });
    }
    // 4ie · Una visita nace con $0 y sin pago (pay_mode 'none'); Iglesias por el motor de inscripciones nunca toca la tarjeta ni la matrícula.
    const VI = "apps/web/lib/visitas-inm.ts";
    if (existsSync(VI) && !/values \(\$1, 'visit', \$2, \$3, \$4, 'pending', \$5::timestamptz, nullif\(\$6, ''\), \$7::jsonb, 1, 0, 0, 0, 'none'/.test(readFileSync(VI, "utf8"))) falla("sinDineroEnVisitas", VI, 0, "una visita se guarda con total $0, depósito $0 y sin forma de pago (pay_mode 'none')");
    const I = "apps/web/lib/inscripciones.ts";
    if (existsSync(I)) {
      const t = readFileSync(I, "utf8");
      if (!/const mat = x\.rubro === "fe" \? 0 :/.test(t) || !/const tarjeta = !!x\.cuenta && x\.plan === "pro" && x\.rubro !== "fe";/.test(t)) falla("sinDineroEnVisitas", I, 0, "Iglesias (rubro 'fe') nunca cobra en la app: ni matrícula ni tarjeta");
    }
  },

  /* 4ib. Una propiedad es un ítem 'svc' (renta | venta) pero NO es un servicio: no sale en Servicios, no se reserva como cita (con su
     depósito) ni se edita por el editor de servicios. Solo por Propiedades (lib/inmuebles.ts). */
  propiedadNoEsServicio() {
    const G = "propiedadNoEsServicio", K = "coalesce(i.svc_kind, '') not in ('renta', 'venta', 'auto')", K2 = "coalesce(svc_kind, '') not in ('renta', 'venta', 'auto')"; // 4ic suma los vehículos
    const chk = (f, re, msg) => { if (existsSync(f) && !re.test(readFileSync(f, "utf8"))) falla(G, f, 0, msg); };
    chk("apps/web/lib/citas.ts", new RegExp(`i\\.sell and i\\.status <> 'hidden' and ${K.replace(/[()]/g, "\\$&")}`), "los servicios que se reservan (citas) dejan fuera las propiedades");
    chk("apps/web/lib/servicios.ts", new RegExp(`i\\.removed_at is null and ${K.replace(/[()]/g, "\\$&")}`), "la lista de Servicios del panel deja fuera las propiedades");
    const a = "apps/web/app/panel/acciones-servicios.ts";
    if (existsSync(a)) { const n = readFileSync(a, "utf8").split(K2).length - 1; if (n < 3) falla(G, a, 0, "guardar, mostrar u ocultar y quitar un servicio no tocan una propiedad (3 consultas con el filtro)"); }
  },

  /* 4ic. El precio en la puerta (§3): todo carro con otd_cents = precio + impuesto de la ciudad + placas + cargo del dealer, calculado por
     UNA función del servidor (enLaPuerta) y comprobado por la base; el cargo nunca pasa del tope de PA (platform_config + trigger); el pago
     de ejemplo nunca sin tasa, meses y enganche juntos (Regulation Z). Se prueba también la cuenta: Civic $11,900 → $13,163 en la puerta;
     $1,500 de enganche, 48 meses al 14.9 % → $324; compre aquí pague aquí $999 + $95 × 78 = $8,409. */
  totalEnLaPuerta() {
    const G = "totalEnLaPuerta", M = "packages/db/migrations/0093_autos_inventario.sql", A = "apps/web/lib/autos.ts", C = "apps/web/lib/autos-comun.ts";
    if (!existsSync(M) || !existsSync(A) || !existsSync(C)) return falla(G, A, 0, "faltan 0093, lib/autos.ts o lib/autos-comun.ts");
    const m = readFileSync(M, "utf8"), a = readFileSync(A, "utf8");
    if (!m.includes("check (otd_cents = price_cents + tax_cents + tags_cents + doc_fee_cents)")) falla(G, M, 0, "la base no comprueba otd = precio + impuesto + placas + cargo");
    if (!m.includes("check (tax_cents = (price_cents::bigint * tax_bp + 5000) / 10000)")) falla(G, M, 0, "la base no comprueba el impuesto sobre el precio");
    if (!/check \(\(est_payment_cents is null\) = \(est_down_cents is null\) and \(est_payment_cents is null\) = \(est_apr_bp is null\)\s+and \(est_payment_cents is null\) = \(est_months is null\)/.test(m)) falla(G, M, 0, "el pago de ejemplo va con enganche, tasa y meses o no va (check todo o nada)");
    if (!/create trigger vehicle_listings_tope before insert or update on vehicle_listings/.test(m) || !/new\.doc_fee_cents > tope then\s+raise exception/.test(m)) falla(G, M, 0, "falta el candado del tope del cargo del dealer en la base");
    // Una sola fórmula, y ninguna otra pieza escribe el total ni el impuesto de un carro.
    const f = /export function enLaPuerta\([^)]*\): Puerta \{\n([\s\S]*?)\n\}/.exec(a)?.[1] ?? "";
    if (!f.includes("const tax = Math.floor((price * taxBp + 5000) / 10000);") || !f.includes("otd: price + tax + tags + fee")) falla(G, A, 0, "enLaPuerta: impuesto redondeado como la base y otd = precio + impuesto + placas + cargo");
    if (!/from tax_rules t where t\.city_id = b\.city_id and t\.category_id = 'NEG-DEALER'/.test(a)) falla(G, A, 0, "el impuesto sale de tax_rules de la ciudad, nunca escrito a mano");
    if (!/\$\{cfgSql\(TOPE_KEY\)\} as tope/.test(a) || !/const TOPE_KEY = "dealer_doc_fee_cap_cents"/.test(a)) falla(G, A, 0, "el tope del cargo sale de Configuración (cfgSql: platform_config acotado por config_keys)");
    if ((a.match(/Math\.min\(h\.fee, h\.tope\)/g) ?? []).length < 2 || !/if \(v > h\.tope\) return err\(/.test(a) || !/const fee = Math\.min\(s\.fee, h\.tope\);/.test(a)) falla(G, A, 0, "el cargo del dealer nunca pasa del tope (al cotizar, al guardar, en la herramienta y al recalcular)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      readFileSync(x, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(l)) return;
        if (x !== A && /\b(otd_cents|tax_cents)\s*=/.test(l)) falla(G, x, i + 1, "el total en la puerta y su impuesto solo los escribe lib/autos.ts");
        if (/^apps\/web\/(lib\/autos[a-z-]*\.ts|app\/panel\/(Autos\.tsx|acciones-autos\.ts))$/.test(x) && /\b0\.06\b|\* 6 \/ 100|\b(price|precio)\w* \* 6\b|\+ 150\b|15000 \+/.test(l)) falla(G, x, i + 1, "6 % o placas $150 escritos a mano: salen de tax_rules y de la herramienta");
      });
    }
    // 4id · Lo público solo LEE el total en la puerta que calculó el servidor: ningún carro sin total, ninguna suma propia, y el pago de
    // ejemplo solo con enganche, tasa y meses juntos.
    const PU = "apps/web/lib/autos-publico.ts";
    if (existsSync(PU)) {
      const t = readFileSync(PU, "utf8");
      if (!/v\.otd_cents is not null/.test(t)) falla(G, PU, 0, "la ficha pública no saca un carro sin su total en la puerta");
      if (!/est: x\.ep != null && x\.ed != null && x\.ea != null && x\.em != null \?/.test(t)) falla(G, PU, 0, "el pago de ejemplo público solo con pago, enganche, tasa y meses juntos");
      t.split("\n").forEach((l0, i) => { const l = l0.replace(/"[^"]*"|`[^`]*`/g, '""'); if (!/^\s*(\/\/|\/?\*)/.test(l) && /\b(price|tax|tags|fee|tagsC|feeC)\b\s*\+\s*\w|\+\s*x\.(tax|tagsC|feeC)\b/.test(l)) falla(G, PU, i + 1, "lo público no suma el total en la puerta: lo lee del servidor (otd_cents)"); });
    }
    const p = /export function pagoEjemplo\([\s\S]*?\n\}/.exec(a)?.[0] ?? "";
    if (!/if \(enganche == null \|\| aprBp == null \|\| meses == null/.test(p)) falla(G, A, 0, "pagoEjemplo no existe sin enganche, tasa y meses");
    // La cuenta, de verdad: se sacan las funciones del servidor sin sus tipos y se corren contra la tabla hecha a mano.
    try {
      const sinTipos = (s) => s.replace(/export /g, "").replace(/\): (Puerta|Pago \| null|Bhph \| null) \{/g, ") {").replace(/(\w+): (number \| null|number)/g, "$1").replace(/ as readonly number\[\]/g, "");
      const src = ["enLaPuerta", "pagoEjemplo", "totalBhph"].map((n) => sinTipos(new RegExp(`export function ${n}\\([\\s\\S]*?\\n\\}`).exec(a)?.[0] ?? ""));
      const T = new Function(`const MESES_PAGO = [12, 24, 36, 48, 60, 72], MESES_BHPH = [12, 18, 24, 36];\n${src.join("\n")}\nreturn { enLaPuerta, pagoEjemplo, totalBhph };`)();
      const civic = T.enLaPuerta(1190000, 600, 15000, 39900);
      if (civic.otd !== 1316300 || civic.tax !== 71400) falla(G, A, 0, `Civic $11,900 + 6 % + $150 + $399 tiene que dar $13,163 en la puerta (da ${civic.otd})`);
      const pe = T.pagoEjemplo(1316300, 150000, 1490, 48);
      if (!pe || pe.pago !== 32400 || pe.total !== 150000 + 32400 * 48) falla(G, A, 0, `$13,163 − $1,500 a 48 meses al 14.9 % tiene que dar $324 al mes (da ${pe?.pago})`);
      if (T.pagoEjemplo(1316300, null, 1490, 48) !== null || T.pagoEjemplo(1316300, 150000, null, 48) !== null || T.pagoEjemplo(1316300, 150000, 1490, null) !== null) falla(G, A, 0, "un pago de ejemplo sin enganche, tasa o meses tiene que ser null");
      const bh = T.totalBhph(766300, 99900, 9500, 18);
      if (!bh || bh.total !== 840900 || bh.weeks !== 78 || !(bh.aprBp > 0)) falla(G, A, 0, `compre aquí pague aquí $999 + $95 × 78 = $8,409 con su tasa (da ${bh?.total})`);
      if (T.totalBhph(900000, 99900, 9500, 18) !== null) falla(G, A, 0, "si los pagos no cubren el total en la puerta, no hay plan");
    } catch (e) { falla(G, A, 0, `no se pudo correr la cuenta del servidor: ${e.message}`); }
  },

  /* 4ic. El VIN (49 CFR 565): 17 caracteres sin I, O ni Q y el dígito verificador de la posición 9. La misma cuenta en el servidor
     (autos-comun vinValido, que se corre aquí contra VIN conocidos) y en la base (vin_valido en el check de vehicle_listings); la semilla
     de pruebas solo trae VIN válidos. */
  vinValido() {
    const G = "vinValido", C = "apps/web/lib/autos-comun.ts", A = "apps/web/lib/autos.ts", M = "packages/db/migrations/0093_autos_inventario.sql", S = "infra/pruebas/semilla/0029_autos.sql";
    if (!existsSync(C) || !existsSync(M)) return falla(G, C, 0, "faltan lib/autos-comun.ts o 0093");
    const c = readFileSync(C, "utf8"), m = readFileSync(M, "utf8");
    let fn = null;
    try {
      const k = ["VIN_PESOS", "VIN_LETRAS"].map((n) => new RegExp(`const ${n} = [^\\n]*`).exec(c)?.[0] ?? "").join("\n");
      const f = (/export function vinValido\(v: string\): boolean \{[\s\S]*?\n\}/.exec(c)?.[0] ?? "").replace("export function vinValido(v: string): boolean {", "function vinValido(v) {").replace(/!/g, (x, i, s) => (s[i + 1] === "." || s[i + 1] === "[" || s[i + 1] === ";" || s[i + 1] === ")" ? "" : x));
      fn = new Function(`${k}\n${f}\nreturn vinValido;`)();
    } catch (e) { falla(G, C, 0, `no se pudo correr vinValido: ${e.message}`); }
    if (fn) {
      for (const v of ["1HGCM82633A004352", "11111111111111111", "1M8GDM9AXKP042788", "5YJSA1E14FF087599"]) if (!fn(v)) falla(G, C, 0, `«${v}» es un VIN válido y vinValido lo rechaza`);
      for (const v of ["1HGCM82633A004353", "1HGCM82633A0O4352", "1HGCM82633A00435", "IHGCM82633A004352", "1hgcm82633a004352"]) if (fn(v)) falla(G, C, 0, `«${v}» no es un VIN válido y vinValido lo acepta`);
      if (existsSync(S)) for (const x of readFileSync(S, "utf8").matchAll(/insert into vehicle_listings[\s\S]*?select it, b, x\.city_id, '([^']*)'/g)) if (!fn(x[1])) falla(G, S, 0, `VIN de prueba inválido en la semilla: ${x[1]}`);
    }
    if (!/export function vinValido\(v: string\): boolean \{\n  if \(typeof v !== "string" \|\| !\/\^\[A-HJ-NPR-Z0-9\]\{17\}\$\/\.test\(v\)\) return false;/.test(c)) falla(G, C, 0, "vinValido: 17 caracteres sin I, O ni Q");
    if (!m.includes("if v !~ '^[A-HJ-NPR-Z0-9]{17}$' then return false; end if;")) falla(G, M, 0, "vin_valido de la base: 17 caracteres sin I, O ni Q");
    if (!m.includes("pesos constant int[] := array[8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];") || !m.includes("valores constant text := '12345678123457923456789';")) falla(G, M, 0, "vin_valido de la base no usa los pesos y valores del VIN");
    if (!c.includes("const VIN_PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];") || !c.includes('VIN_VALORES = "12345678123457923456789"')) falla(G, C, 0, "vinValido del servidor no usa los pesos y valores del VIN");
    if (!/vin text check \(vin is null or vin_valido\(vin\)\)/.test(m)) falla(G, M, 0, "la base no revisa el VIN de cada vehículo");
    if (existsSync(A)) {
      const g = /export async function guardarCarro[\s\S]*?\n\}\n/.exec(readFileSync(A, "utf8"))?.[0] ?? "";
      if (!/if \(vin && !vinValido\(vin\)\) return err\(/.test(g) || g.indexOf("vinValido(vin)") > g.indexOf("insert into items")) falla(G, A, 0, "guardarCarro rechaza un VIN inválido antes de escribir");
    }
  },

  /* 4ic. Un título salvage dice SIEMPRE «Título salvage: no se maneja en la calle hasta pasar la inspección de PA» (faq L55): la línea vive
     en autos-comun, notasCarro la pone primero, todo lo que pinta carros llama a notasCarro, el servidor lo marca «no va por la calle» y la
     base no deja un salvage que vaya por la calle. */
  tituloSalvage() {
    const G = "tituloSalvage", C = "apps/web/lib/autos-comun.ts", A = "apps/web/lib/autos.ts", M = "packages/db/migrations/0093_autos_inventario.sql";
    if (!existsSync(C)) return falla(G, C, 0, "falta lib/autos-comun.ts");
    const c = readFileSync(C, "utf8");
    if (!c.includes('export const SALVAGE: Bi = { es: "Título salvage: no se maneja en la calle hasta pasar la inspección de PA.')) falla(G, C, 0, "la línea del título salvage va verbatim");
    const n = /export function notasCarro\([\s\S]*?\n\}/.exec(c)?.[0] ?? "";
    if (!/if \(x\.title === "salvage"\) L\.push\(b\(SALVAGE\)\);/.test(n) || n.indexOf("b(SALVAGE)") > n.indexOf("L.push(garantiaTexto")) falla(G, C, 0, "notasCarro pone la línea del salvage primero");
    if (existsSync(M) && !readFileSync(M, "utf8").includes("check (title <> 'salvage' or not street_legal)")) falla(G, M, 0, "la base no deja un salvage que vaya por la calle");
    if (existsSync(A) && !/const street = title === "salvage" \? false :/.test(readFileSync(A, "utf8"))) falla(G, A, 0, "guardarCarro marca un salvage como «no va por la calle»");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx$/.test(f)) continue;
      const s = readFileSync(f, "utf8");
      if (!/from "@\/lib\/autos-comun"/.test(s) || !/CarroAuto|HerrAutos|CarroPub/.test(s)) continue;
      if (!/notasCarro\(/.test(s)) falla(G, f, 0, "pinta vehículos sin sus notas (notasCarro)");
      // Cada función que pinta un vehículo (su total, su vista previa) lleva la línea del salvage (notasCarro o SALVAGE).
      for (const fn of s.split(/\nexport function /).slice(1)) if (/puerta\.otd|\.puerta\b|puertaTexto\(|type: "mprev"/.test(fn) && !/notasCarro\(|bi\(SALVAGE, es\)/.test(fn)) falla(G, f, 0, `«${fn.slice(0, fn.indexOf("("))}» pinta vehículos sin la línea del título salvage`);
    }
  },

  /* 4ic. Un vehículo es un ítem 'svc' (auto) pero NO es un servicio: no sale en Servicios, no se reserva como cita (con su depósito) ni se
     edita por el editor de servicios. Solo por Inventario (lib/autos.ts). */
  carroNoEsServicio() {
    const G = "carroNoEsServicio", K = "not in ('renta', 'venta', 'auto')";
    const chk = (f, n, msg) => { if (existsSync(f) && readFileSync(f, "utf8").split(K).length - 1 < n) falla(G, f, 0, msg); };
    chk("apps/web/lib/citas.ts", 1, "los servicios que se reservan (citas) dejan fuera los vehículos");
    chk("apps/web/lib/servicios.ts", 1, "la lista de Servicios del panel deja fuera los vehículos");
    chk("apps/web/app/panel/acciones-servicios.ts", 3, "guardar, mostrar u ocultar y quitar un servicio no tocan un vehículo (3 consultas con el filtro)");
    const a = "apps/web/lib/admin-negocios.ts";
    if (existsSync(a) && !/x\.module === 'svc' && x\.k !== 'renta' && x\.k !== 'venta' && x\.k !== 'auto'/.test(readFileSync(a, "utf8"))) falla(G, a, 0, "el 360 no lista los vehículos como servicios");
  },

  /* 4id · Lo que dice una ficha de Iglesias, Bienes Raíces o Autos se puede hacer de verdad: en Free la fila no abre una hoja con un botón de
     pedir (se llama o se escribe, como 4ed antes de su inscripción); mientras «pedir en la app» no exista (booking: false hasta 4ie), ninguna
     hoja lleva a una ruta de solicitud; y nunca «AQUÍ NO SE PIDE CITA POR LA APP» (la decisión del 3 nov da a Free sus solicitudes, §6 #6). */
  freeNoPromete() {
    const G = "freeNoPromete";
    for (const f of ["apps/web/app/(app)/n/[id]/Fe.tsx", "apps/web/app/(app)/n/[id]/Inmueble.tsx", "apps/web/app/(app)/n/[id]/Dealer.tsx"]) {
      if (!existsSync(f)) continue;
      const s = readFileSync(f, "utf8");
      // 4ie: en Free la fila no abre la hoja; si se puede pedir en la app (10 al mes, §6 #6), va directo a la solicitud.
      if (!/abrir: \(id: string, ev\?: MouseEvent\) => \{ stop\(ev\); if \(pro\) setHoja\(id\);( else (if \(pide\) )?acc\.pedir\(pedirHref\(id\)\);)? \}/.test(s)) falla(G, f, 0, "en Free la fila no abre la hoja (solo Pro); si se puede pedir, va directo a la solicitud");
      if (!/const cta: Cta = !pro (\? \(fp\.negocio\.telefono \? llamarC|\|\| k === "derechos" \? llamarC|\? llamarC)/.test(s)) falla(G, f, 0, "en Free el botón es llamar o escribir");
      s.split("\n").forEach((l, i) => {
        if (/AQU[IÍ] NO SE PIDE CITA POR LA APP|NO IN-APP BOOKING HERE/i.test(l)) falla(G, f, i + 1, "Free sí pedirá en la app (§6 #6): no se escribe que aquí no se pide cita");
        if (/router\.push\(/.test(l)) falla(G, f, i + 1, "la ficha pide por acc.pedir (la ruta de la solicitud), nunca con router.push suelto");
      });
    }
    for (const f of ["apps/web/lib/fe-publico.ts", "apps/web/lib/inmuebles-publico.ts", "apps/web/lib/autos-publico.ts"]) if (existsSync(f) && !/booking: true/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "4ie: pedir en la app ya existe (booking: true)");
    for (const r of ["apps/web/app/(app)/n/[id]/ver/page.tsx", "apps/web/app/(app)/vis/[num]/page.tsx", "apps/web/app/(app)/n/[id]/inscribirme/page.tsx"]) if (!existsSync(r)) falla(G, r, 0, "un botón de la ficha lleva a una ruta que no existe");
  },

  /* 4ie · La nota de una visita, una prueba de manejo o una fecha de Iglesias nunca guarda un seguro social o ITIN (9 cifras) ni un número de
     tarjeta o cuenta (13 a 19): el servidor los tapa ANTES de guardar (taparNumeros) y la base lo vuelve a comprobar. Se prueba de verdad:
     las expresiones del archivo se ejecutan contra ejemplos (lo que debe taparse y lo que no). */
  notaSinNumeros() {
    const G = "notaSinNumeros", C = "apps/web/lib/visitas-inm-comun.ts";
    if (!existsSync(C)) return falla(G, C, 0, "falta el filtro de la nota (taparNumeros)");
    const t = readFileSync(C, "utf8");
    const rx = (n) => { const m = new RegExp(`export const ${n} = /(.+)/g;`).exec(t); try { return m ? new RegExp(m[1], "g") : null; } catch { return null; } };
    const T = rx("NUM_TARJETA"), S = rx("NUM_SSN");
    if (!T || !S) return falla(G, C, 0, "NUM_TARJETA y NUM_SSN tienen que ser expresiones con /g");
    const tapa = (x) => x.replace(T, "••••").replace(S, (_m, pre) => `${pre}•••-••-••••`);
    const DEBE = ["mi seguro es 123-45-6789", "ITIN 912 70 1234 ok", "123456789", "tarjeta 4111 1111 1111 1111", "cuenta 4111-1111-1111-1111", "5500000000000004", "IBAN 1234567890123456789"];
    const NO = ["llego a las 5:30", "mi carro es 2015 con 88400 millas", "tengo 2 niños y 1 perro", "apartamento 3B"];
    for (const x of DEBE) if (/\d{3}[ -]?\d{2}[ -]?\d{4}(?!\d)|(\d[ -]?){12,18}\d/.test(tapa(x).replace(/(\d)(?=•)/g, "$1 "))) falla(G, C, 0, `el filtro deja pasar «${x}»`);
    for (const x of NO) if (tapa(x) !== x) falla(G, C, 0, `el filtro tapa algo que no es un número privado: «${x}»`);
    for (const [f, re] of [["apps/web/lib/visitas-inm.ts", /const nota = taparNumeros\(limpio\(f\.nota, 200\)\)\.texto;/], ["apps/web/lib/inscripciones.ts", /const nota = taparNumeros\(limpio\(f\.nota, 200\)\)\.texto;/]])
      if (existsSync(f) && !re.test(readFileSync(f, "utf8"))) falla(G, f, 0, "la nota pasa por taparNumeros antes de guardarse");
    const M = "packages/db/migrations/0094_visitas_ver.sql";
    if (existsSync(M) && !/customer_note !~ '\(\^\|\[\^0-9\]\)\[0-9\]\{3\}\[ -\]\?\[0-9\]\{2\}\[ -\]\?\[0-9\]\{4\}\(\[\^0-9\]\|\$\)' and customer_note !~ '\(\[0-9\]\[ -\]\?\)\{12,18\}\[0-9\]'/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "la base comprueba la nota (check operations_nota_sin_numeros)");
    // La pantalla avisa (el texto del diseño, verbatim).
    if (!/No escribas tu seguro social ni números de cuenta aquí\./.test(readFileSync("apps/web/lib/inmuebles-comun.ts", "utf8"))) falla(G, "apps/web/lib/inmuebles-comun.ts", 0, "falta el aviso «No escribas tu seguro social ni números de cuenta aquí.»");
    for (const f of ["apps/web/app/(app)/n/[id]/ver/Visita.tsx", "apps/web/app/(app)/n/[id]/inscribirme/Inscribirme.tsx"]) if (existsSync(f) && !/AVISO_NOTA/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "la nota muestra el aviso de números (AVISO_NOTA)");
  },

  /* 4ie · Ir a consejería, a una capellanía, pedir oración o ir a recuperación son datos sensibles: los avisos de esas fechas (insc_fen_*) no
     dicen el lugar, el servicio, el motivo ni la nota (como privacidadSalud), y el motor los manda cuando el servicio o el lugar es de esos. */
  avisoFeNeutro() {
    const G = "avisoFeNeutro", dir = "packages/db/migrations";
    let n = 0;
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (!/\('insc_fen_\w+'/.test(l)) return;
      n++;
      if (/\{(negocio|servicio|svc|cliente|motivo|nota|item|nino)\}/.test(l)) falla(G, `${dir}/${x}`, i + 1, "un aviso de consejería, capellanía u oración es neutro: sin {negocio}, {servicio}, {motivo} ni {nota}");
    });
    if (n < 9) falla(G, dir, 0, "faltan avisos neutros insc_fen_* (ok, alt, no, exp, cx, biz_cx, grupo_cx, empieza, done)");
    const I = "apps/web/lib/inscripciones.ts";
    if (existsSync(I)) {
      const t = readFileSync(I, "utf8");
      if (!/export const tplFe = \(tpl: string, neutro: boolean\) => \(FE_TPL\.includes\(tpl\) \? `\$\{neutro \? "insc_fen_" : "insc_fe_"\}/.test(t)) falla(G, I, 0, "Iglesias manda insc_fen_* (neutros) cuando la fecha es de consejería u oración");
      if (!/kf === "consejo" \|\| kf === "oracion"/.test(t) || !/const NEUTRO_FE = \/consejer\|counsel\|capell\|chaplain\|oraci\[oó\]n\|prayer\|recuperaci\|recovery/.test(t)) falla(G, I, 0, "consejería, capellanía, oración y recuperación cuentan como neutras (por el lugar o por el servicio)");
      if (!/guardarNotaFe\(c, op, nota\)/.test(t)) falla(G, I, 0, "la nota de consejería va cifrada (guardarNotaFe), nunca en operations");
    }
  },

  /* 4if · En Iglesias, Bienes Raíces y Autos NADA se cobra en la app, así que ninguna ayuda de esas tres puede terminar en una devolución
     por la app («Que me devuelvan» lo hace el negocio fuera de la app y la persona confirma «Me lo devolvieron»; si no, To'Latino decide una
     sanción, nunca un reembolso). Toda búsqueda del pago de una ayuda (depositoDe) pasa por SIN_DINERO; lib/ayuda-estafa.ts y las decisiones
     de «Posible estafa» no tocan cobros ni la pasarela. */
  sinDineroEnAyuda() {
    const G = "sinDineroEnAyuda", A = "apps/web/lib/ayuda-cita.ts", E = "apps/web/lib/ayuda-estafa.ts", K = "apps/web/app/admin/acciones-colas.ts";
    if (existsSync(A)) {
      const t = readFileSync(A, "utf8");
      const sd = t.split("\n").find((l) => /export const SIN_DINERO = new Set<RubroAyuda>\(/.test(l)) ?? "";
      for (const r of ["fe", "inm", "dealer"]) if (!sd.includes(`"${r}"`)) falla(G, A, 0, `SIN_DINERO tiene que incluir ${r}`);
      t.split("\n").forEach((l, i) => { if (/await depositoDe\(/.test(l) && !/SIN_DINERO\.has\(/.test(l)) falla(G, A, i + 1, "buscar el pago de una ayuda pasa por SIN_DINERO (Iglesias, Bienes Raíces y Autos no tienen nada que devolver por la app)"); });
      if (!/if \(sinDinero\) \{[\s\S]{0,400}?outside_refund = 'pending'/.test(t)) falla(G, A, 0, "aceptar una propuesta sin dinero en la app deja «Me lo devolvieron» pendiente, nunca un reembolso");
    }
    if (existsSync(E) && /from "\.\/(cobros|pasarela|stripe)"|import\("\.\/(cobros|pasarela|stripe)"\)|devolverPago|insert into payments/.test(readFileSync(E, "utf8"))) falla(G, E, 0, "la pausa por posible estafa no toca cobros ni la pasarela");
    if (existsSync(K)) {
      const t = readFileSync(K, "utf8"), i = t.indexOf("export async function decidirEstafa"), j = t.indexOf("export async function", i + 10);
      const cuerpo = i < 0 ? "" : t.slice(i, j < 0 ? undefined : j), cuerpo2 = t.slice(t.indexOf("export async function pausaEstafa"));
      if (i < 0) falla(G, K, 0, "falta decidirEstafa");
      if (/devolverPago|cobros|pasarela|refunded_cents/.test(cuerpo) || /devolverPago|cobros|pasarela|refunded_cents/.test(cuerpo2.slice(0, 2500))) falla(G, K, 0, "«Posible estafa» nunca devuelve dinero: no pasó por la app");
    }
  },

  /* 4if · Iglesias: la reseña no lleva fotos (nadie sale en una foto sin saberlo en un lugar de culto, una despensa o un funeral): el servidor
     la rechaza y la pantalla no ofrece subirlas. Y a la persona, los avisos de una ayuda de Iglesias son neutros (puede ser consejería). */
  feSinFotoPublica() {
    const G = "feSinFotoPublica", r = "apps/web/lib/resenas.ts", esc = "apps/web/app/(app)/n/[id]/resena/Escribir.tsx", a = "apps/web/lib/ayuda-cita.ts", dir = "packages/db/migrations";
    if (existsSync(r) && !/if \(rubro === "fe" && fotos\.length\) return no\(/.test(readFileSync(r, "utf8"))) falla(G, r, 0, "una reseña de Iglesias no puede guardar fotos");
    if (existsSync(esc) && !/rub === "fe" \? null : rub === "ninos" \? null : fotosB/.test(readFileSync(esc, "utf8"))) falla(G, esc, 0, "la reseña de Iglesias no ofrece subir fotos");
    if (existsSync(a) && !/h\.cat === "NEG-FE" && \(tpl === "help_reply" \|\| tpl === "help_done"\)\) \{ await avisar\(h\.uid, tpl === "help_reply" \? "fe_help_reply" : "fe_help_done"/.test(readFileSync(a, "utf8"))) falla(G, a, 0, "a la persona, la ayuda de Iglesias le avisa con fe_help_* (neutros)");
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) readFileSync(`${dir}/${x}`, "utf8").split("\n").forEach((l, i) => {
      if (/\('(fe_help_\w+|help_directo)'/.test(l) && /\{(negocio|servicio|svc|motivo|nota|item)\}/.test(l)) falla(G, `${dir}/${x}`, i + 1, "un aviso de ayuda de Iglesias (o el directo a To'Latino) es neutro: sin {negocio} ni {servicio}");
    });
  },

  /* 4if · El aviso de «To'Latino resolvió tu solicitud» enlaza a la pantalla de SU operación: solo la ayuda de un pedido de comida usa
     avisarAyuda (/pedido/…); todas las demás (citas, mercado, apartados, fiestas, viajes, noche, inscripciones y visitas) avisarAyudaCita.
     Se cazó: fiestas, viajes, noche e inscripciones resueltas por To'Latino llevaban a /pedido/{num}. */
  avisoAyudaPorTipo() {
    const K = "apps/web/app/admin/acciones-colas.ts";
    if (!existsSync(K)) return;
    const t = readFileSync(K, "utf8");
    if (/o\?\.k === "appointment"\) await \(await import\("@\/lib\/ayuda-cita"\)\)/.test(t) || !/if \(o\?\.k === "order"\) await \(await import\("@\/lib\/ayuda"\)\)\.avisarAyuda\(o\.num, "help_done"\);\s*else if \(o\) await \(await import\("@\/lib\/ayuda-cita"\)\)\.avisarAyudaCita\(o\.num, "help_done"\)/.test(t))
      falla("avisoAyudaPorTipo", K, 0, "al resolver una ayuda, solo la de un pedido de comida usa avisarAyuda; las demás avisan con avisarAyudaCita");
  },

  /* 4ig. Una cola nueva sin su vista caía en la rama por defecto de Colas («Recomendado por un vecino»): la tarjeta y el caso decían otra
     cosa. Toda cola de lib/colas.ts tiene su título en la lista (lib/admin-colas.ts `x.queue === "k"`) y su detalle en app/admin/Colas.tsx
     (`k.queue === "k"`). */
  colaConVista() {
    const f = "apps/web/lib/colas.ts", L = "apps/web/lib/admin-colas.ts", U = "apps/web/app/admin/Colas.tsx";
    if (!existsSync(f) || !existsSync(L) || !existsSync(U)) return;
    const m = /export type Cola = ([^;]+);/.exec(readFileSync(f, "utf8"));
    if (!m) return falla("colaConVista", f, 0, "no encuentro el tipo Cola");
    // 5d: los casos de la Comunidad (rep de publicaciones y comentarios, repUsr, apel, fotos) se pintan en ColasComunidad.tsx.
    const CC = "apps/web/app/admin/ColasComunidad.tsx", CE = "apps/web/app/admin/ColasEventos.tsx";
    // 6a: los eventos a revisar se pintan en ColasEventos.tsx.
    // Sin comentarios: un comentario que nombra la cola no es su vista (6a: lo cazó la prueba al revés).
    const tl = sinComent(L), tu = sinComent(U) + (existsSync(CC) ? sinComent(CC) : "") + (existsSync(CE) ? sinComent(CE) : "");
    for (const k of [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1])) {
      if (!tl.includes(`x.queue === "${k}"`)) falla("colaConVista", L, 0, `la cola «${k}» no tiene su título en la lista (sale como otra cola)`);
      if (!tu.includes(`k.queue === "${k}"`)) falla("colaConVista", U, 0, `la cola «${k}» no tiene su detalle en Colas`);
    }
    // 6a: el plazo de una cola que lo toma de Configuración (slaCfg) se calcula siempre con ella: la lista, el contador, «Tomar siguiente» y
    // la Analítica usan slaCase(cfgSql); nadie arma el plazo con COLAS[…].sla a mano; la clave existe en ClaveConfig.
    const tc = readFileSync(f, "utf8"), cfg = existsSync("apps/web/lib/config.ts") ? readFileSync("apps/web/lib/config.ts", "utf8") : "";
    for (const m of tc.matchAll(/\n  (\w+): \{[^\n]*slaCfg: "([a-z0-9_]+)"/g)) if (!cfg.includes(`"${m[2]}"`)) falla("colaConVista", f, 0, `la cola «${m[1]}» toma su plazo de «${m[2]}», que no está en ClaveConfig`);
    if (/slaCfg:/.test(tc)) {
      if (!/export const SLA_SQL = slaCase\(cfgSql\);/.test(sinComent(L))) falla("colaConVista", L, 0, "el plazo de las colas se arma con slaCase(cfgSql) (Configuración)");
      if (!/espera\(x\.opened_at, x\.sla_h\)/.test(sinComent(L))) falla("colaConVista", L, 0, "la lista mide la espera con el plazo de la base (sla_h), no con COLAS[…].sla");
      for (const x of codigo) if (/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) && x !== f && /`case q\.queue \$\{Object\.entries\(COLAS\)/.test(sinComent(x))) falla("colaConVista", x, 0, "plazo de las colas armado a mano: usa SLA_SQL / slaCase(cfgSql)");
    }
    // 8f · La cola «ticket» (Soporte) muestra cada ORIGEN de un caso con su nombre (un origen nuevo sin nombre salía en crudo, «reporte_app»), y el
    // caso de «Reportar un problema» trae a la ficha del equipo su registro técnico (lib/reportar registroDelCaso → SoporteAdmin k.registro).
    const SA = "apps/web/app/admin/SoporteAdmin.tsx", SE = "apps/web/lib/soporte-equipo.ts";
    if (existsSync(SA)) {
      let ori = "";
      for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) {
        const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
        for (const m of t.matchAll(/origin\s+text not null default 'form' check \(origin in \(([^)]*)\)\)|support_cases_origin_check check \(origin in \(([^)]*)\)\)/g)) ori = m[1] ?? m[2];
      }
      const mapa = /const ORIGEN: Record<string, string> = \{([^}]*)\}/.exec(sinComent(SA))?.[1] ?? "";
      for (const o of [...ori.matchAll(/'(\w+)'/g)].map((x) => x[1])) if (!new RegExp(`\\b${o}:\\s*"`).test(mapa)) falla("colaConVista", SA, 0, `el origen «${o}» de un caso no tiene su nombre en la ficha de Soporte (ORIGEN)`);
      if (/'reporte_app'/.test(ori) && (!/k\.registro\b/.test(sinComent(SA)) || !existsSync(SE) || !/registroDelCaso\(c\.id\)/.test(sinComent(SE)))) falla("colaConVista", SA, 0, "un caso «Reportar un problema» muestra su registro técnico en la ficha del equipo");
    }
  },

  /* 4ig. Un aviso con una clave que no está en notif_templates no sale (avisar() no encuentra la plantilla y calla). Toda clave escrita a
     mano en avisar / avisarNegocio / avisar… existe en una migración, con su texto en español e inglés. */
  avisoConPlantilla() {
    const dir = "packages/db/migrations", tpl = new Map();
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      if (!/notif_templates/.test(t)) continue;
      for (const m of t.matchAll(/\(\s*'([a-z0-9_]+)',\s*'(?:crit|tx|mod|biz|mkt)',[^\n]*'\{[^\n]*/g)) tpl.set(m[1], m[0]);
    }
    for (const [k, l] of tpl) if (!/"es"\s*:/.test(l) || !/"en"\s*:/.test(l)) falla("avisoConPlantilla", dir, 0, `la plantilla «${k}» no trae español e inglés en la misma línea`);
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.+\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        // 5d: avisarOculto / avisarSancion / avisarDecision eligen su plantilla adentro (su segundo argumento es lo oculto, no una plantilla).
        for (const m of l.matchAll(/\bavisar(?!Oculto|Sancion|Decision)\w*\([^()]*?,\s*"([a-z]+_[a-z0-9_]+)"/g)) if (!tpl.has(m[1])) falla("avisoConPlantilla", f, i + 1, `el aviso «${m[1]}» no existe en notif_templates`);
      });
    }
    // 5d: lib/apelaciones.ts elige la plantilla adentro (const tpl = …): toda clave de moderación escrita ahí existe.
    const AP = "apps/web/lib/apelaciones.ts";
    if (existsSync(AP)) for (const l of sinComent(AP).split("\n").filter((x) => /const tpl = |avisar\(/.test(x))) for (const m of l.matchAll(/"([a-z]+_[a-z0-9_]+)"/g)) if (!/^(com_post|com_comment|dm_message)$/.test(m[1]) && !tpl.has(m[1])) falla("avisoConPlantilla", AP, 0, `el aviso «${m[1]}» no existe en notif_templates`);
    // 9l · Ampliado: (1) el SMS del único camino (enviarSms({ … tpl: "…" })) usa una plantilla que existe; (2) cada plantilla de CORREO que el código
    // puede encolar (type Tpl de lib/correo) la acepta la base (email_outbox_tpl_check: las listas de las migraciones, también las que se amplían).
    for (const f of codigo) if (/^apps\/web\/(lib|app)\/.+\.tsx?$/.test(f)) for (const l of sinComent(f).split("\n").filter((x) => /enviarSms\(\{/.test(x))) for (const m of l.matchAll(/tpl: "([a-z]+_[a-z0-9_]+)"/g)) if (!tpl.has(m[1])) falla("avisoConPlantilla", f, 0, `el SMS «${m[1]}» no existe en notif_templates`);
    const CI = "apps/web/lib/correo/index.ts";
    if (existsSync(CI)) {
      const ok = new Set();
      for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql"))) {
        const t = readFileSync(`${dir}/${x}`, "utf8");
        for (const m of t.matchAll(/email_outbox_tpl_check check \(tpl in \(([^)]*)\)\)|tpl\s+text not null check \(tpl in \(([^)]*)\)\)|ampliar_check\('email_outbox', 'email_outbox_tpl_check', array\[([^\]]*)\]\)/g)) for (const v of (m[1] ?? m[2] ?? m[3] ?? "").matchAll(/'([a-z_]+)'/g)) ok.add(v[1]);
        // El patrón de 0139/0141 (pg_get_constraintdef + replace): «replace(d, 'ARRAY[', 'ARRAY[''valor''::text, ')» sobre email_outbox_tpl_check.
        for (const m of t.matchAll(/add constraint email_outbox_tpl_check ' \|\| replace\(d, 'ARRAY\[', 'ARRAY\[''([a-z_]+)''::text, '\)/g)) ok.add(m[1]);
      }
      const u = /type Tpl = ([^;]+);/.exec(sinComent(CI))?.[1] ?? "";
      for (const v of u.matchAll(/"([a-z_]+)"/g)) if (!ok.has(v[1])) falla("avisoConPlantilla", CI, 0, `el correo «${v[1]}» no lo acepta la base (email_outbox_tpl_check)`);
    }
  },

  /* 4ig. Analítica muestra cifras, nunca personas por lo que creen ni datos de crédito: lib/admin-analitica.ts y la pantalla no leen la
     denominación (subcategorías de Iglesias) ni nada de crédito, seguro social, ingresos o fecha de nacimiento. */
  analiticaSinCreencias() {
    for (const f of ["apps/web/lib/admin-analitica.ts", "apps/web/app/admin/Analitica.tsx"]) {
      if (!existsSync(f)) continue;
      const t = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
      t.split("\n").forEach((l, i) => {
        const m = /subcategory_ids|cat[oó]lic|cristian|evang[eé]l|bautist|pentecost|jud[ií]|musulm|budist|religi|denominac|credit|cr[eé]dito|\bssn\b|seguro social|income|ingresos|birth|nacimiento/i.exec(l);
        if (m) falla("analiticaSinCreencias", f, i + 1, `Analítica no lee «${m[0]}»: nunca personas por religión ni datos de crédito`);
      });
    }
  },

  /* ── Fase 5 · Comunidad (5a) ── Utilidades: archivos de la Comunidad y su texto sin comentarios. */
  /* 5a. Teléfonos, correos y números privados nunca se guardan en lo que escribe un vecino: el filtro (lib/comunidad-filtro.ts) los
     revisa con PII y TEL, publicar/editar lo corren antes de escribir, y la base lo impone con com_sin_datos() en publicaciones,
     comentarios y bio (un insert directo también falla). Nadie fuera de lib/comunidad*.ts inserta publicaciones ni comentarios. */
  comunidadSinTelefonos() {
    const F = "apps/web/lib/comunidad-filtro.ts", L = "apps/web/lib/comunidad.ts", M = "packages/db/migrations/0097_comunidad_base.sql";
    if (!existsSync(F) || !existsSync(L) || !existsSync(M)) return;
    const f = sinComent(F), l = sinComent(L), m = readFileSync(M, "utf8");
    const rt = cuerpoFn(f, "revisarTexto"); // 5c: revisarMensaje también usa TEL; la regla vive en revisarTexto.
    if (!/TEL\.test\(t\)/.test(rt) || !/PII\.test\(t\)/.test(rt) || !/const TEL = \/\(\\d\[\\s\(\)\.-\]\*\)\{10\}/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarTexto debe probar TEL (10 dígitos) y PII antes de dejar pasar un texto");
    if (!/export function revisarPublicacion[\s\S]*?revisarTexto\(t\)/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarPublicacion no pasa el texto por revisarTexto");
    for (const fn of ["publicar", "editar"]) {
      const c = cuerpoFn(l, fn);
      const iF = c.search(/revisarPublicacion\(/), iW = c.search(/insert into com_posts|update com_posts set body/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", L, 0, `«${fn}» escribe sin pasar antes por revisarPublicacion()`);
    }
    // 5b: los comentarios y respuestas pasan por revisarComentario() (que corre revisarTexto) antes de guardarse.
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (!/export function revisarComentario[\s\S]*?revisarTexto\(t\)/.test(f)) falla("comunidadSinTelefonos", F, 0, "revisarComentario no pasa el texto por revisarTexto");
    if (existsSync(H)) { const c = cuerpoFn(sinComent(H), "comentar"), iF = c.search(/revisarComentario\(/), iW = c.search(/insert into com_comments/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", H, 0, "«comentar» escribe sin pasar antes por revisarComentario()"); }
    if (!/t ~ '\(\\d\[\\s\(\)\.-\]\*\)\{10\}'/.test(m)) falla("comunidadSinTelefonos", M, 0, "com_sin_datos() no frena teléfonos de 10 dígitos");
    for (const [tabla, col] of [["com_posts", "body"], ["com_comments", "body"], ["community_profiles", "bio"]])
      if (!new RegExp(`alter table ${tabla} add constraint \\w+ check \\(com_sin_datos\\(${col}\\)`).test(m)) falla("comunidadSinTelefonos", M, 0, `${tabla}.${col} sin la restricción com_sin_datos()`);
    // 5e: la cuenta oficial (lib/oficial.ts) también escribe en com_posts, y también pasa antes por revisarPublicacion().
    const O = "apps/web/lib/oficial.ts";
    if (existsSync(O)) { const c = cuerpoFn(sinComent(O), "publicarOficial"), iF = c.search(/revisarPublicacion\(/), iW = c.search(/insert into com_posts/);
      if (iF < 0 || iW < 0 || iF > iW) falla("comunidadSinTelefonos", O, 0, "«publicarOficial» escribe sin pasar antes por revisarPublicacion()"); }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || /^apps\/web\/lib\/comunidad[^/]*\.ts$/.test(x) || x === O) continue;
      readFileSync(x, "utf8").split("\n").forEach((t, i) => { if (/insert into com_(posts|comments)\b/i.test(t)) falla("comunidadSinTelefonos", x, i + 1, "solo lib/comunidad*.ts y lib/oficial.ts escriben publicaciones y comentarios (con el filtro)"); });
    }
  },

  /* 5a. La ubicación de una publicación es el centro del barrio (o de la ciudad): la pone la base al insertar y nadie la cambia; ninguna
     consulta de la Comunidad devuelve el punto (solo la distancia redondeada) ni lee dónde está la persona (viewing_center, GPS). */
  ubicacionDeBarrio() {
    const M = "packages/db/migrations/0097_comunidad_base.sql";
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/new\.geom := coalesce\(\(select z\.center from zones z[^;]*\), c\.center\)/.test(m)) falla("ubicacionDeBarrio", M, 0, "com_posts_antes debe poner geom = centro del barrio o de la ciudad");
      if (!/raise exception 'la ubicación de una publicación la pone la base/.test(m)) falla("ubicacionDeBarrio", M, 0, "com_posts_antes debe impedir cambiar geom a mano");
    }
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/comunidad[^/]*\.ts|app\/\(app\)\/comunidad\/.*\.tsx?|app\/admin\/acciones-comunidad\.ts)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => {
        const sinCalc = t.replace(/st_(distance|dwithin)\(p\.geom,/g, "");
        if (/\bgeom\b|viewing_center|\bst_[xy]\(|users?\.geo\b|\bgps\b/i.test(sinCalc)) falla("ubicacionDeBarrio", x, i + 1, "la Comunidad no devuelve puntos ni lee la ubicación de la persona: solo st_distance/st_dwithin redondeados contra el barrio");
      });
    }
  },

  /* 5a. Bloquear es mutuo e invisible: toda función de lib/comunidad*.ts que lee publicaciones o comentarios para alguien (recibe
     `viewer`) pasa por sinBloqueos(); sinBloqueos cubre las dos direcciones y los silenciados. */
  bloqueoMutuo() {
    for (const x of codigo) {
      if (!/^apps\/web\/lib\/comunidad[^/]*\.ts$/.test(x)) continue;
      const t = sinComent(x);
      if (/export const sinBloqueos/.test(t) && !/ub\.user_id = \$\{viewer\} and ub\.target_user_id = \$\{autor\}[\s\S]{0,120}ub\.kind = 'block' and ub\.user_id = \$\{autor\} and ub\.target_user_id = \$\{viewer\}/.test(t))
        falla("bloqueoMutuo", x, 0, "sinBloqueos debe excluir en los dos sentidos (lo que yo bloqueé o silencié y quien me bloqueó)");
      for (const m of t.matchAll(/\n(?:export )?async function (\w+)\(([^)]*)\)/g)) {
        if (!/\bviewer\b/.test(m[2])) continue;
        const c = cuerpoFn(t, m[1]), filtroW = /w: string\[\] = \[[^\]]*sinBloqueos\(/.test(c);
        // Cada consulta que lee publicaciones o comentarios lleva sinBloqueos (o las condiciones `w` que lo traen).
        for (const q of c.match(/`[^`]*`/g) ?? []) if (/from com_(posts|comments)\b/.test(q) && !/sinBloqueos\(/.test(q) && !(filtroW && /\$\{w\.join\(/.test(q)))
          falla("bloqueoMutuo", x, 0, `«${m[1]}» lista contenido para una persona sin sinBloqueos()`);
      }
    }
  },

  /* 5a. El muro pagina por cursor (hot, id) o (publish_at, id), sin offset, con los índices parciales que sirven a esa consulta. */
  feedConCursor() {
    const L = "apps/web/lib/comunidad.ts", M = "packages/db/migrations/0097_comunidad_base.sql";
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/comunidad[^/]*\.ts|app\/\(app\)\/comunidad\/.*\.tsx?)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => { if (/\boffset\b/i.test(t)) falla("feedConCursor", x, i + 1, "la Comunidad no pagina con offset: usa el cursor"); });
    }
    if (!existsSync(L)) return;
    const c = cuerpoFn(sinComent(L), "muro");
    if (!/\(p\.hot, p\.id\) < \(/.test(c) || !/\(p\.publish_at, p\.id\) < \(/.test(c) || !/limit \$\{POR_PAGINA \+ 1\}/.test(c)) falla("feedConCursor", L, 0, "muro() debe seguir con cursor (hot, id) / (publish_at, id) y pedir una de más");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/on com_posts \(city_id, hot desc, id desc\) where status = 'visible'/.test(m) || !/on com_posts \(city_id, publish_at desc, id desc\) where status = 'visible'/.test(m)) falla("feedConCursor", M, 0, "faltan los índices del muro (city_id, hot|publish_at desc, id desc)");
    }
  },

  /* 5a. La Comunidad pide cuenta (salvo Hoy en el barrio, 5e): cada pantalla de /comunidad entra por conCuenta() (que manda a /entrar) o,
     el muro, muestra el muro de registro antes de leer nada de vecinos; las acciones piden sesión; el muro de registro no lee textos ni nombres. */
  comunidadSoloConCuenta() {
    const S = "apps/web/app/(app)/comunidad/sesion.ts", L = "apps/web/lib/comunidad.ts";
    if (existsSync(S) && !/if \(!u\?\.first_name\) redirect\(`\/entrar\?volver=/.test(readFileSync(S, "utf8"))) falla("comunidadSoloConCuenta", S, 0, "conCuenta() debe mandar a /entrar sin sesión");
    for (const x of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/comunidad\/(.*\/)?page\.tsx$/.test(x)) continue;
      const t = sinComent(x), iDatos = t.search(/\b(muro|publicacion|paraEditar|hilo|respuestas)\(/), iCuenta = t.search(/await conCuenta\(/), iInv = t.search(/if \(!u\) \{[\s\S]*?return <Invitado/);
      if (iDatos >= 0 && (iCuenta < 0 || iCuenta > iDatos)) falla("comunidadSoloConCuenta", x, 0, "lee contenido de vecinos antes de pedir la cuenta (conCuenta)");
      if (iCuenta < 0 && iInv < 0) falla("comunidadSoloConCuenta", x, 0, "pantalla de la Comunidad sin conCuenta() ni muro de registro");
      if (/Invitado/.test(t) && iInv > iCuenta && iCuenta >= 0) falla("comunidadSoloConCuenta", x, 0, "el muro de registro va antes de conCuenta()");
    }
    const A = "apps/web/app/(app)/comunidad/acciones.ts";
    if (existsSync(A)) for (const p of readFileSync(A, "utf8").split(/\nexport async function /).slice(1)) if (!/await quien\(\)/.test(p.slice(0, 400))) falla("comunidadSoloConCuenta", A, 0, `«${p.slice(0, p.indexOf("("))}» no pide sesión (quien())`);
    if (existsSync(L)) { const c = cuerpoFn(sinComent(L), "resumenInvitado"); if (/p\.body|first_name|last_name|author_user_id|photo_url/.test(c)) falla("comunidadSoloConCuenta", L, 0, "resumenInvitado no puede leer textos ni nombres de vecinos"); }
  },

  /* 5a. Nadie se recomienda a sí mismo: publicar revisa, antes de guardar una recomendación, que el autor no sea dueño ni del equipo del
     negocio («Tu negocio publica en sus Novedades»). */
  noTePromuevas() {
    const L = "apps/web/lib/comunidad.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), c = cuerpoFn(t, "publicar"), s = cuerpoFn(t, "esSuNegocio");
    const iS = c.search(/\n\s*if \(await esSuNegocio\(c, userId, b\.id\)\) return no\(/), iW = c.search(/insert into com_posts/);
    if (iS < 0 || iW < 0 || iS > iW) falla("noTePromuevas", L, 0, "publicar guarda una recomendación sin revisar esSuNegocio() antes");
    if (!/owner_user_id = \$1/.test(s) || !/business_members m where m\.business_id = b\.id and m\.user_id = \$1 and m\.status = 'active'/.test(s)) falla("noTePromuevas", L, 0, "esSuNegocio debe mirar al dueño y al equipo activo del negocio");
    // 5b: recomendar un negocio en un comentario también pasa por esSuNegocio() antes de guardar.
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (existsSync(H)) { const h = cuerpoFn(sinComent(H), "comentar"), iS = h.search(/\n\s*if \(await esSuNegocio\(c, userId, b\.id\)\) return no\(/), iW = h.search(/insert into com_comments/);
      if (iS < 0 || iW < 0 || iS > iW) falla("noTePromuevas", H, 0, "comentar guarda un negocio recomendado sin revisar esSuNegocio() antes"); }
  },

  /* ── Fase 5 · Comunidad (5b) ── */
  /* 5b. Un voto por persona y nada más: la llave (destino, persona) en com_votes y (encuesta, persona) en com_poll_votes; lo propio no se
     vota (la base lo rechaza y votar() lo revisa antes); dos cuentas del mismo dispositivo no suman (counted lo pone la base y los
     contadores solo cuentan los que cuentan); la app solo escribe votos con com_votar() desde lib/comunidad-hilo.ts. */
  votoUnico() {
    const M0 = "packages/db/migrations/0097_comunidad_base.sql", H = "apps/web/lib/comunidad-hilo.ts";
    if (!existsSync(M0)) return;
    const m0 = readFileSync(M0, "utf8");
    if (!/create table if not exists com_votes \([\s\S]*?primary key \(target_kind, target_id, user_id\)/.test(m0)) falla("votoUnico", M0, 0, "com_votes sin la llave (target_kind, target_id, user_id): una persona podría votar dos veces");
    if (!/create table if not exists com_poll_votes \([\s\S]*?primary key \(post_id, user_id\)/.test(m0)) falla("votoUnico", M0, 0, "com_poll_votes sin la llave (post_id, user_id)");
    const antes = ultimaFn("com_votes_antes"), despues = ultimaFn("com_votes_despues");
    if (!antes) return falla("votoUnico", "packages/db/migrations", 0, "falta com_votes_antes (lo propio y el mismo dispositivo los decide la base)");
    if (!/if autor = new\.user_id then raise exception 'lo propio no se vota'/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_antes debe rechazar el voto a lo propio");
    if (!/new\.counted := not exists \(select 1 from com_votes o where [^;]*o\.device = new\.device and o\.user_id <> new\.user_id\)/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_antes debe callar el voto de otra cuenta del mismo dispositivo (counted)");
    if (!/new\.counted := old\.counted/.test(antes)) falla("votoUnico", "packages/db/migrations", 0, "cambiar de signo no puede volver a contar un voto callado");
    if (!/old\.counted/.test(despues) || !/new\.counted/.test(despues)) falla("votoUnico", "packages/db/migrations", 0, "com_votes_despues debe sumar solo los votos que cuentan");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      sinComent(x).split("\n").forEach((t, i) => {
        if (/\b(insert into|update|delete from) com_votes\b/i.test(t)) falla("votoUnico", x, i + 1, "los votos solo se escriben con com_votar() (candado, mismo toque quita, otro signo cambia)");
        if (/com_votar\(/.test(t) && x !== H) falla("votoUnico", x, i + 1, "solo lib/comunidad-hilo.ts llama a com_votar() (después de revisar bloqueos y lo propio)");
      });
    }
    if (existsSync(H)) {
      const c = cuerpoFn(sinComent(H), "votar"), iP = c.search(/if \(t\.autor === userId\) return no\(/), iV = c.search(/com_votar\(/);
      if (iP < 0 || iV < 0 || iP > iV) falla("votoUnico", H, 0, "votar() debe rechazar lo propio antes de llamar a com_votar()");
      // 5f: los puntos del voto salen después de com_votar (con el voto que quedó y el dispositivo del toque).
      const iPts = c.search(/await puntosDelVoto\(c, \{ kind, id, voter: userId, device, mio \}\)/);
      if (iPts < 0 || iPts < iV) falla("votoUnico", H, 0, "votar() debe asentar los puntos con puntosDelVoto() después de com_votar() (con el dispositivo del toque)");
    }
    // 5f · Sin puntos entre cuentas del mismo dispositivo: un voto callado (counted = false) o de una cuenta que comparte dispositivo con
    // quien escribió no da puntos (y revierte lo que había dado); «Me sirvió» tampoco entre cuentas del mismo dispositivo.
    const PU = "apps/web/lib/puntos.ts";
    if (existsSync(PU)) {
      const t = sinComent(PU), v = cuerpoFn(t, "puntosDelVoto"), ms = cuerpoFn(t, "puntosMejorRespuesta"), pr = cuerpoFn(t, "primeraRecomendacion");
      const iG = v.search(/if \(o\.mio !== 1 \|\| !v\?\.counted \|\| \(await mismoDispositivo\(c, o\.voter, t\.autor, o\.device\)\)\) \{ await revertir\(c, t\.autor, ref, "voto"\); return null; \}/), iS = v.search(/await sumar\(/);
      if (iG < 0 || iS < 0 || iG > iS) falla("votoUnico", PU, 0, "puntosDelVoto: solo un voto + que cuenta y de otro dispositivo da puntos (si no, revierte) antes de sumar()");
      const iM = ms.search(/if \(await mismoDispositivo\(c, o\.asker, o\.autor, null\)\) return null;/), iMs = ms.search(/sumar\(/);
      if (iM < 0 || iMs < 0 || iM > iMs) falla("votoUnico", PU, 0, "«Me sirvió» no da puntos entre cuentas del mismo dispositivo");
      if (!/v\.counted and not pts_mismo_dispositivo\(v\.user_id, \$3::uuid, v\.device\)/.test(pr)) falla("votoUnico", PU, 0, "la primera recomendación cuenta solo votos que cuentan y de otro dispositivo");
      const md = ultimaFn("pts_mismo_dispositivo");
      if (!/from sessions s1 join sessions s2 on s2\.device = s1\.device where s1\.user_id = a and s2\.user_id = b/.test(md)) falla("votoUnico", "packages/db/migrations", 0, "pts_mismo_dispositivo debe cruzar las sesiones (dispositivos) de las dos cuentas");
    }
  },

  /* 5b. Los contadores, score, hot, los recomendados del hilo y los del perfil son derivados: solo los escriben sus triggers y funciones en
     la base. Ninguna línea de la app los asigna ni enciende la marca tl.derivados; la base rechaza el cambio a mano (y com_thread_recs
     solo lo escribe com_recs_recalcular). */
  saldoDerivado() {
    const COLS = /\b(up_n|down_n|score|hot|comments_n|replies_n|poll_counts|votes_n|recs_n|top_comment_id|followers_n|following_n|posts_n|answers_best_n|points_total|points_today|points_day|points_month|points_month_key|rank_level|rank_floor|coins)\s*=(?!=)/;
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`|"[^"\n]*"/g) ?? []) {
        const u = /\bupdate\s+(com_posts|com_comments|community_profiles|com_thread_recs)\b[\s\S]*?\bset\b([\s\S]*?)(\bwhere\b|$)/i.exec(q);
        if (u && COLS.test(u[2])) falla("saldoDerivado", x, 0, `«${COLS.exec(u[2])[1]}» de ${u[1]} es derivado: solo lo escribe la base (triggers)`);
        if (/\binsert into com_thread_recs\b/i.test(q)) falla("saldoDerivado", x, 0, "com_thread_recs es derivado: solo lo escribe com_recs_recalcular()");
        // 5f: la Tabla del Barrio y el rango son derivados: la app solo llama a tabla_* y pts_* (excluir, cerrar, recalcular).
        if (/\b(insert into|update|delete from) (monthly_boards|board_closures)\b/i.test(q) && !(x === "apps/web/lib/tabla.ts" && /^`insert into board_closures \(city_id, month\)/.test(q))) falla("saldoDerivado", x, 0, "la Tabla del Barrio es derivada: solo la escriben el libro y tabla_excluir / tabla_cerrar");
        if (/\bpts_rango\(/.test(q) && x !== "apps/web/lib/puntos.ts") falla("saldoDerivado", x, 0, "el rango solo lo recalcula recalcularRango() (lib/puntos.ts)");
        if (/\bpts_piso\(/.test(q) && x !== "apps/web/app/admin/acciones-gam.ts") falla("saldoDerivado", x, 0, "el piso del rango solo lo cambia un Admin (acciones-gam.ts)");
        // 5g: el saldo de monedas solo se mueve con el libro: la bienvenida (lib/monedas.ts), el ajuste del equipo (acciones-gam.ts) y los
        // cupones (lib/cupones.ts → cup_*). Gastar y devolver viven dentro de cup_canjear / cup_vencer_uno: la app no los llama.
        if (/\bmon_bienvenida\(/.test(q) && x !== "apps/web/lib/monedas.ts") falla("saldoDerivado", x, 0, "la bienvenida en monedas solo la acredita acreditar() (lib/monedas.ts)");
        if (/\bmon_ajustar\(/.test(q) && x !== "apps/web/app/admin/acciones-gam.ts") falla("saldoDerivado", x, 0, "el ajuste de monedas solo lo hace el equipo (acciones-gam.ts)");
        if (/\bmon_(gastar|devolver|asentar|premios_mes)\(/.test(q)) falla("saldoDerivado", x, 0, "gastar, devolver y el premio del mes viven en la base (cup_canjear, cup_vencer_uno, cierre de la Tabla): la app no los llama");
      }
      if (/tl\.derivados|com_derivados_(on|entrar)\(/.test(t)) falla("saldoDerivado", x, 0, "la app no enciende la marca de derivados: los contadores son de la base");
    }
    const guardas = [["com_posts_antes", "los contadores de una publicación son derivados"], ["com_comments_antes", "los contadores de un comentario son derivados"],
      ["community_profiles_antes", "los contadores del perfil son derivados"], ["com_thread_recs_guardia", "com_thread_recs es derivado"],
      ["community_profiles_antes", "los puntos y el rango son derivados"], ["monthly_boards_guardia", "la Tabla del Barrio es derivada"]];
    for (const [fn, msg] of guardas) {
      const b = ultimaFn(fn);
      if (!b || !b.includes(`raise exception '${msg}`) || !/com_derivados_ok\(\)/.test(b)) falla("saldoDerivado", "packages/db/migrations", 0, `${fn} debe rechazar el cambio a mano («${msg}»)`);
    }
    const c = ultimaFn("com_posts_antes");
    if (c && !/new\.hot := com_hot\(new\.score, new\.publish_at\)/.test(c)) falla("saldoDerivado", "packages/db/migrations", 0, "hot debe recalcularse en la base con cada cambio de score");
    // 5f · rank_level lo escribe solo pts_rango (y la semilla de pruebas); los puntos del perfil, solo el libro (points_entries_despues).
    const R = ultimaFn("pts_rango"), D = ultimaFn("points_entries_despues");
    if (R && !/update community_profiles set rank_floor = fl, rank_level = nivel where user_id = uid/.test(R)) falla("saldoDerivado", "packages/db/migrations", 0, "pts_rango debe ser quien escribe rank_level");
    if (D && !/points_total = points_total \+ new\.delta/.test(D)) falla("saldoDerivado", "packages/db/migrations", 0, "points_total sale de sumar los asientos del libro");
    // 5g · el saldo de monedas (community_profiles.coins) es derivado: lo escribe solo el libro, nunca queda negativo y gastar bloquea el perfil.
    const CA = ultimaFn("community_profiles_antes"), CD = ultimaFn("coin_entries_despues"), MG = ultimaFn("mon_gastar"), M5 = "packages/db/migrations/0103_monedas_cupones.sql";
    if (existsSync(M5)) {
      if (!CA.includes("raise exception 'las monedas son derivadas") || !/new\.coins is distinct from old\.coins/.test(CA)) falla("saldoDerivado", M5, 0, "community_profiles_antes debe rechazar las monedas escritas a mano");
      if (!/update community_profiles set coins = coins \+ new\.delta where user_id = new\.user_id/.test(CD)) falla("saldoDerivado", M5, 0, "el saldo de monedas sale de sumar los asientos del libro (coin_entries_despues)");
      if (!/add constraint community_profiles_monedas check \(coins >= 0\)/.test(readFileSync(M5, "utf8"))) falla("saldoDerivado", M5, 0, "el saldo de monedas nunca es negativo (check coins >= 0)");
      if (!/pg_advisory_xact_lock\(hashtextextended\('mon:' \|\| uid::text, 0\)\);\s*select coins into saldo from community_profiles where user_id = uid for update;\s*if coalesce\(saldo, 0\) < n then raise exception/.test(MG)) falla("saldoDerivado", M5, 0, "mon_gastar: candado por persona, el perfil «for update» y el saldo revisado antes de gastar");
    }
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql") && y >= "0102")) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8").replace(/create or replace function pts_rango\([\s\S]*?\$\$[\s\S]*?\$\$/g, "");
      if (/\brank_level\s*=\s*(?!.*least\(rank_level)/.test(t.replace(/--.*$/gm, "").replace(/rank_level\s*=\s*r\.level|cp\.rank_level\s*=/g, ""))) falla("saldoDerivado", `packages/db/migrations/${x}`, 0, "rank_level solo lo escribe pts_rango");
    }
  },

  /* 5f. Tope del día: nadie gana más de pts_tope() (100 de fábrica) puntos «regla» en un día local de su ciudad. Lo impone la base antes de
     insertar (101 en un día → se rechaza) y pts_sumar guarda solo lo que cabe (lo que pasa del tope no se guarda); el tope vive en
     platform_config y la app no cuenta puntos por su cuenta. */
  topeDiario() {
    const G = "topeDiario", A = ultimaFn("points_entries_antes"), S = ultimaFn("pts_sumar"), T = ultimaFn("pts_tope");
    if (!A || !S) return falla(G, "packages/db/migrations", 0, "falta el libro de puntos (points_entries_antes / pts_sumar)");
    if (!/if new\.motive = 'regla' then[\s\S]*?select coalesce\(sum\(delta\), 0\) into hoy from points_entries where user_id = new\.user_id and local_day = new\.local_day and motive = 'regla' and delta > 0;[\s\S]*?if hoy \+ new\.delta > pts_tope\(\) then raise exception 'tope diario/.test(A)) falla(G, "packages/db/migrations", 0, "points_entries_antes debe rechazar lo que pasa del tope del día");
    if (!/d := least\(r\.points, pts_tope\(\) - hoy\);\s*if d <= 0 then return 0; end if;/.test(S)) falla(G, "packages/db/migrations", 0, "pts_sumar debe guardar solo lo que cabe en el tope del día");
    if (!/dia := \(now\(\) at time zone tz\)::date;/.test(S)) falla(G, "packages/db/migrations", 0, "el día del tope es el día local de la ciudad de la persona");
    if (!/pg_advisory_xact_lock\(hashtextextended\('pts:' \|\| uid::text, 0\)\)/.test(S)) falla(G, "packages/db/migrations", 0, "pts_sumar sin candado por persona (dos a la vez se pasarían del tope)");
    if (!/key = 'pts_tope_dia'|cfg_int\('pts_tope_dia'\)/.test(T)) falla(G, "packages/db/migrations", 0, "el tope vive en Configuración (pts_tope_dia)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      if (/points_today\s*[+-]|pts_tope_dia'\s*,\s*'\d/.test(sinComent(x))) falla(G, x, 0, "la app no cuenta los puntos del día por su cuenta (lo hace la base)");
    }
  },

  /* 5b. Con un bloqueo de por medio no se toca ni se avisa: comentar, votar, «Me sirvió», la encuesta y guardar pasan antes por tocable() o
     comentarioTocable() (que llevan sinBloqueos); a quién se avisa de un comentario (autor, contestado, «@Nombre») sale de una consulta con
     sinBloqueos en los dos sentidos, y solo a esas personas se les avisa; el resultado de una encuesta tampoco llega a quien tiene un bloqueo con su autor. */
  bloqueoAlEscribir() {
    const H = "apps/web/lib/comunidad-hilo.ts";
    if (!existsSync(H)) return;
    const t = sinComent(H);
    for (const fn of ["postPara", "comentarioTocable"]) if (!/sinBloqueos\(/.test(cuerpoFn(t, fn))) falla("bloqueoAlEscribir", H, 0, `${fn}() debe filtrar con sinBloqueos()`);
    const escrituras = [["comentar", /insert into com_comments/], ["votar", /com_votar\(/], ["meSirvio", /update com_posts set best_comment_id/], ["votarEncuesta", /insert into com_poll_votes/], ["guardar", /insert into com_saves/]];
    for (const [fn, w] of escrituras) {
      const c = cuerpoFn(t, fn), iT = c.search(/await (tocable|comentarioTocable)\(/), iW = c.search(w);
      if (iW < 0 || iT < 0 || iT > iW) falla("bloqueoAlEscribir", H, 0, `«${fn}» escribe sin pasar antes por tocable()/comentarioTocable() (bloqueos)`);
    }
    const a = cuerpoFn(t, "aQuienAvisar");
    if (!/sinBloqueos\("u\.id", "\$1"\)/.test(a) || !/sinBloqueos\("\$1", "u\.id"\)/.test(a)) falla("bloqueoAlEscribir", H, 0, "aQuienAvisar debe excluir bloqueos y silencios en los dos sentidos");
    const cm = cuerpoFn(t, "comentar");
    if (!/aQuienAvisar\(/.test(cm)) falla("bloqueoAlEscribir", H, 0, "comentar() debe sacar a quién avisar de aQuienAvisar()");
    for (const m of cm.matchAll(/\bavisar\((\w+(?:\.\w+)?)/g)) if (m[1] !== "a.id") falla("bloqueoAlEscribir", H, 0, `comentar() avisa a «${m[1]}» sin pasar por aQuienAvisar()`);
    const b = cuerpoFn(t, "barrerEncuestas");
    if (/from com_poll_votes/.test(b) && !/from com_poll_votes v where [^`]*sinBloqueos\(/.test(b)) falla("bloqueoAlEscribir", H, 0, "el resultado de una encuesta no se avisa a quien tiene un bloqueo con su autor");
  },

  /* 5b. Ningún aviso de la Comunidad sale por SMS (§3): toda plantilla com_* de notif_templates va con sms = false. */
  avisoComunidadSinSms() {
    const dir = "packages/db/migrations";
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const m of t.matchAll(/\(\s*'((?:com|gam|dm)_[a-z0-9_]+)',\s*'[a-z]+',\s*(?:null|'[a-z]+'),\s*(true|false)\s*,/g)) if (m[2] !== "false") falla("avisoComunidadSinSms", `${dir}/${x}`, 0, `la plantilla «${m[1]}» de la Comunidad no puede ir por SMS`);
    }
  },

  /* ── Fase 5 · Comunidad (5c) ── */
  /* 5c. Bloquear es mutuo e invisible en TODAS las superficies, en los dos sentidos: el fragmento de personas (sinBloqueo) cubre las dos
     direcciones; el perfil, las listas, las sugerencias y los mensajes lo usan; la bandeja esconde los avisos de alguien con un
     bloqueo y todo aviso de la Comunidad dice quién lo provocó (actor); la base cierra la conversación, deja de seguir y rechaza
     seguir o escribir con un bloqueo de por medio. */
  bloqueoTodasLasSuperficies() {
    const G = "bloqueoTodasLasSuperficies", C = "apps/web/lib/comunidad.ts", V = "apps/web/lib/vecinos.ts", MV = "apps/web/lib/mensajes-vecinos.ts", AV = "apps/web/lib/avisos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(V) || !existsSync(MV)) return;
    const c = sinComent(C), v = sinComent(V), mv = sinComent(MV), av = sinComent(AV), m = readFileSync(M, "utf8");
    // El fragmento de personas: de ida y vuelta, solo bloqueos vivos.
    if (!/export const sinBloqueo = \(persona: string, viewer: string\) =>[\s\S]{0,200}ub\.kind = 'block' and \(\(ub\.user_id = \$\{viewer\} and ub\.target_user_id = \$\{persona\}\)\s*or \(ub\.user_id = \$\{persona\} and ub\.target_user_id = \$\{viewer\}\)\)/.test(c))
      falla(G, C, 0, "sinBloqueo debe excluir a la persona en los dos sentidos (yo la bloqueé · me bloqueó)");
    // Perfil, listas y sugerencias: toda persona pasa por VISIBLE (que lleva sinBloqueo).
    if (!/const VISIBLE = [\s\S]{0,400}\$\{sinBloqueo\(`\$\{u\}\.id`, viewer\)\}/.test(v)) falla(G, V, 0, "VISIBLE (persona que se puede ver) debe llevar sinBloqueo");
    for (const fn of ["perfilVecino", "siguiendo", "seguidores", "sugeridos", "personaVisible"]) if (!/\$\{VISIBLE\("u", "\$1"\)\}/.test(cuerpoFn(v, fn))) falla(G, V, 0, `«${fn}» devuelve personas sin VISIBLE() (bloqueos)`);
    if (!/sinBloqueos\("p\.author_user_id", "\$1"\)/.test(cuerpoFn(v, "publicacionesDe"))) falla(G, V, 0, "publicacionesDe (lo que publicó en su perfil) sin sinBloqueos");
    // Mensajes: la lista excluye a quien tiene un bloqueo; abrir, leer y escribir pasan antes por otraPersona() (que lleva sinBloqueo).
    if (!/\$\{sinBloqueo\("u\.id", "\$1"\)\}/.test(cuerpoFn(mv, "otraPersona"))) falla(G, MV, 0, "otraPersona() debe filtrar con sinBloqueo");
    if (!/t\.closed_at is null and \$\{sinBloqueo\(`t\.\$\{otro\}_user_id`, "\$1"\)\}/.test(cuerpoFn(mv, "misConversaciones"))) falla(G, MV, 0, "misConversaciones muestra conversaciones cerradas o con un bloqueo");
    for (const [fn, w] of [["conversacion", /dm_messages|MSJS\(/], ["nuevos", /MSJS\(/], ["enviar", /insert into dm_messages/]]) {
      const b = cuerpoFn(mv, fn), iO = b.search(/await otraPersona\(/), iW = b.search(w);
      if (iO < 0 || iW < 0 || iO > iW) falla(G, MV, 0, `«${fn}» lee o escribe mensajes sin pasar antes por otraPersona() (bloqueos)`);
    }
    // Avisos: la bandeja esconde los de alguien con un bloqueo (los dos sentidos) y todo aviso de la Comunidad dice quién lo provocó.
    if (!/const SIN_BLOQUEO_AVISO = `\(n\.actor_user_id is null or not exists \(select 1 from user_blocks ub where ub\.removed_at is null and ub\.kind = 'block'\s*and \(\(ub\.user_id = n\.user_id and ub\.target_user_id = n\.actor_user_id\) or \(ub\.user_id = n\.actor_user_id and ub\.target_user_id = n\.user_id\)\)\)\)`/.test(av))
      falla(G, AV, 0, "SIN_BLOQUEO_AVISO debe esconder los avisos de alguien con un bloqueo, en los dos sentidos");
    for (const fn of ["misAvisos", "noLeidos"]) if (!/\$\{SIN_BLOQUEO_AVISO\}/.test(cuerpoFn(av, fn))) falla(G, AV, 0, `«${fn}» muestra avisos sin SIN_BLOQUEO_AVISO`);
    for (const f of [V, MV, "apps/web/lib/comunidad-hilo.ts"]) {
      const t = sinComent(f);
      for (const x of t.matchAll(/\bavisar(?:Muchos)?\(([^;]*?)\);/g)) if (!/actor:/.test(x[1]) && !/com_votes_10/.test(x[1])) falla(G, f, 0, `un aviso de la Comunidad sin actor (la bandeja no podría esconderlo con un bloqueo): «${x[1].slice(0, 60)}»`);
    }
    // La base: seguir y escribir con un bloqueo se rechaza; bloquear deja de seguir en los dos sentidos y cierra la conversación.
    if (!/create or replace function follows_antes\(\)[\s\S]*?if com_bloqueados\(new\.follower_user_id, new\.target_id::uuid\) then raise exception/.test(m)) falla(G, M, 0, "follows_antes debe rechazar seguir con un bloqueo de por medio");
    if (!/create or replace function dm_messages_antes\(\)[\s\S]*?if com_bloqueados\(new\.sender_user_id, otro\) then raise exception/.test(m)) falla(G, M, 0, "dm_messages_antes debe rechazar un mensaje con un bloqueo de por medio");
    if (!/delete from follows where follower_user_id = new\.user_id[\s\S]{0,300}delete from follows where follower_user_id = new\.target_user_id[\s\S]{0,300}update dm_threads set closed_at = now\(\)/.test(m)) falla(G, M, 0, "user_blocks_despues: bloquear debe dejar de seguir en los dos sentidos y cerrar la conversación");
    if (!/select exists \(select 1 from user_blocks b where b\.kind = 'block' and b\.removed_at is null\s*and \(\(b\.user_id = x and b\.target_user_id = y\) or \(b\.user_id = y and b\.target_user_id = x\)\)\)/.test(m)) falla(G, M, 0, "com_bloqueados debe mirar los dos sentidos");
  },

  /* 5c. Toda función de la Comunidad que lee para una persona (recibe `viewer`) usa el fragmento compartido de bloqueos (sinBloqueos,
     sinBloqueo o VISIBLE) o pasa por una que lo usa (otraPersona, personaVisible). Las excepciones se nombran con su razón. */
  consultaConBloqueos() {
    const EXENTAS = {
      armar: "arma filas que ya pasaron por sinBloqueos", bloqueadosYSilenciados: "lista lo que la persona misma bloqueó o silenció (con Deshacer)",
      bloqueoMio: "solo responde a quien bloqueó (nunca a la persona bloqueada)", reportarConversacion: "se puede reportar la conversación propia aunque ya hayas bloqueado a la otra persona",
    };
    for (const x of codigo) {
      if (!/^apps\/web\/lib\/(comunidad[^/]*|vecinos|mensajes-vecinos)\.ts$/.test(x)) continue;
      const t = sinComent(x);
      for (const mm of t.matchAll(/\nexport async function (\w+)\(([^)]*)\)/g)) {
        if (!/\bviewer\b/.test(mm[2]) || EXENTAS[mm[1]]) continue;
        const b = cuerpoFn(t, mm[1]);
        if (!/db\(\)|tx\(|c\.query/.test(b)) continue;
        if (!/sinBloqueos?\(|VISIBLE\(|await otraPersona\(|personaVisible\(|await (postPara|tocable|comentarioTocable)\(/.test(b)) falla("consultaConBloqueos", x, 0, `«${mm[1]}» lee para una persona sin el fragmento de bloqueos (sinBloqueos / sinBloqueo / VISIBLE)`);
      }
    }
  },

  /* 5c. Los mensajes entre vecinos no los lee el equipo salvo con un reporte abierto (regla de `chat`): fuera de lib/mensajes-vecinos.ts
     (la persona, en sus conversaciones) y lib/admin-dm.ts, ninguna línea toca dm_messages; en admin-dm.ts cada consulta lleva
     CON_REPORTE, que exige el caso abierto de la cola y un reporte abierto de esa conversación. */
  dmSoloConReporte() {
    const A = "apps/web/lib/admin-dm.ts", MV = "apps/web/lib/mensajes-vecinos.ts";
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === A || x === MV) continue;
      sinComent(x).split("\n").forEach((t, i) => { if (/\bdm_messages\b/.test(t)) falla("dmSoloConReporte", x, i + 1, "solo lib/admin-dm.ts (con reporte abierto) y lib/mensajes-vecinos.ts tocan dm_messages"); });
    }
    if (!existsSync(A)) return;
    const a = sinComent(A);
    if (!/const CON_REPORTE = \(t: string\) => `exists \(select 1 from queue_items q where q\.queue = 'chat' and q\.subject_kind = 'dm_thread' and q\.subject_id = \$\{t\}::text and q\.status = 'open'\)\s*and exists \(select 1 from content_reports cr where cr\.target_kind = 'dm' and cr\.target_id = \$\{t\}::text and cr\.status = 'open'\)`/.test(a))
      falla("dmSoloConReporte", A, 0, "CON_REPORTE debe exigir el caso abierto (chat · dm_thread) y un reporte abierto ('dm')");
    // 5d: la otra llave es CON_APELACION (solo ESE mensaje y solo con su apelación abierta), para decidir y levantar la apelación.
    if (/CON_APELACION/.test(a) && !/const CON_APELACION = \(m: string\) => `exists \(select 1 from appeals ap where ap\.target_kind = 'dm_message' and ap\.target_id = \$\{m\}::text and ap\.status = 'open'\)`/.test(a))
      falla("dmSoloConReporte", A, 0, "CON_APELACION debe exigir una apelación abierta de ese mismo mensaje");
    for (const q of a.match(/`[^`]*`/g) ?? []) if ((/\b(from|update) dm_messages\b/.test(q) || /\blast_text\b/.test(q)) && !/\$\{CON_REPORTE\(/.test(q) && !/\$\{CON_APELACION\("m\.id"\)\}/.test(q)) falla("dmSoloConReporte", A, 0, `una consulta de mensajes sin CON_REPORTE ni CON_APELACION: «${q.slice(0, 70)}»`);
    const C = sinComent("apps/web/lib/admin-colas.ts");
    if (!/q\.status === "open" \? await \(await import\("\.\/admin-dm"\)\)\.dmReportado\(q\.subject_id\) : null/.test(C)) falla("dmSoloConReporte", "apps/web/lib/admin-colas.ts", 0, "el caso de mensajes entre vecinos solo se lee con el caso abierto");
  },

  /* 5c. Mensajes y perfil sin teléfonos ni datos: enviar() pasa el texto por revisarMensaje (que usa revisarTexto) antes de guardar;
     editarPerfil por revisarPerfil; la base lo impone con com_sin_datos(body) en dm_messages; solo lib/mensajes-vecinos.ts inserta mensajes. */
  mensajesSinTelefonos() {
    const F = "apps/web/lib/comunidad-filtro.ts", MV = "apps/web/lib/mensajes-vecinos.ts", V = "apps/web/lib/vecinos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(MV)) return;
    const f = sinComent(F);
    if (!/export function revisarMensaje[\s\S]*?const f = revisarTexto\(t\);/.test(f)) falla("mensajesSinTelefonos", F, 0, "revisarMensaje debe pasar el texto por revisarTexto (teléfonos, correos, números privados, direcciones)");
    if (!/export function revisarPerfil[\s\S]*?revisarTexto\(bio\)[\s\S]*?revisarTexto\(apodo\)/.test(f)) falla("mensajesSinTelefonos", F, 0, "revisarPerfil debe revisar la presentación y el apodo");
    const e = cuerpoFn(sinComent(MV), "enviar"), iF = e.search(/revisarMensaje\(/), iW = e.search(/insert into dm_messages/);
    if (iF < 0 || iW < 0 || iF > iW) falla("mensajesSinTelefonos", MV, 0, "enviar() guarda un mensaje sin pasar antes por revisarMensaje()");
    const p = cuerpoFn(sinComent(V), "editarPerfil"), iP = p.search(/revisarPerfil\(/), iU = p.search(/update community_profiles set bio/);
    if (iP < 0 || iU < 0 || iP > iU) falla("mensajesSinTelefonos", V, 0, "editarPerfil guarda la presentación sin pasar antes por revisarPerfil()");
    if (!/alter table dm_messages add constraint dm_messages_body_datos check \(com_sin_datos\(body\)\)/.test(readFileSync(M, "utf8"))) falla("mensajesSinTelefonos", M, 0, "dm_messages.body sin la restricción com_sin_datos()");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === MV) continue;
      readFileSync(x, "utf8").split("\n").forEach((t, i) => { if (/insert into dm_(messages|threads)\b/i.test(t)) falla("mensajesSinTelefonos", x, i + 1, "solo lib/mensajes-vecinos.ts escribe mensajes (con el filtro y los límites)"); });
    }
  },

  /* 5c. Mensaje nuevo solo a quien te sigue (o a quien ya te escribió) y 10 conversaciones nuevas al día: enviar() lo revisa antes de
     crear la conversación y la base lo impone (dm_messages_antes). Los no leídos y el último texto son derivados (solo triggers y
     dm_leido). */
  mensajeSoloAQuienTeSigue() {
    const MV = "apps/web/lib/mensajes-vecinos.ts", M = "packages/db/migrations/0099_vecinos_mensajes.sql";
    if (!existsSync(MV)) return;
    const e = cuerpoFn(sinComent(MV), "enviar"), m = readFileSync(M, "utf8");
    // 5d: el límite de conversaciones nuevas vive en lib/moderacion.ts limiteDia (Configuración; de fábrica 10).
    const iS = e.search(/if \(!o\.me_sigue && !t\?\.me_escribio\) return/), iL = e.search(/const lim = await limiteDia\(c, viewer, "conversaciones"\);\s*if \(!lim\.ok\) return lim;/), iT = e.search(/insert into dm_threads/);
    if (iS < 0 || iT < 0 || iS > iT) falla("mensajeSoloAQuienTeSigue", MV, 0, "enviar() crea la conversación sin revisar antes que la otra persona te sigue");
    if (iL < 0 || iT < 0 || iL > iT) falla("mensajeSoloAQuienTeSigue", MV, 0, "enviar() crea la conversación sin el límite de conversaciones nuevas al día");
    const K5 = "packages/db/migrations/0105_configuracion_comunidad.sql";
    if (!/conversaciones: \{ key: "com_lim_conversaciones",/.test(readFileSync("apps/web/lib/moderacion-comun.ts", "utf8")) || !existsSync(K5) || !/\('com_lim_conversaciones', 1, 100, 10,/.test(readFileSync(K5, "utf8")))
      falla("mensajeSoloAQuienTeSigue", K5, 0, "el límite de fábrica es 10 conversaciones nuevas al día (§4 5c; config_keys)");
    if (!/if not exists \(select 1 from follows f where f\.follower_user_id = otro and f\.target_kind = 'user' and f\.target_id = new\.sender_user_id::text\)\s*and not exists \(select 1 from dm_messages m where m\.thread_id = new\.thread_id and m\.sender_user_id = otro\) then\s*raise exception 'solo le escribes a quien te sigue'/.test(m))
      falla("mensajeSoloAQuienTeSigue", M, 0, "dm_messages_antes debe rechazar el mensaje a quien no te sigue (ni te escribió)");
    if (!/raise exception 'los contadores de una conversación son derivados'/.test(m)) falla("mensajeSoloAQuienTeSigue", M, 0, "dm_threads_antes debe rechazar el cambio a mano de los derivados");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\bupdate dm_threads\b[\s\S]*?\bset\b[\s\S]*?\b(a_unread|b_unread|last_text|last_at|last_from)\s*=/.test(q)) falla("mensajeSoloAQuienTeSigue", x, 0, "los no leídos y el último texto de una conversación son derivados (dm_leido y triggers)");
    }
  },

  /* 5c. 18 años o más es una declaración (sí/no + cuándo), nunca una fecha de nacimiento: ninguna migración ni pantalla guarda o pide
     una fecha de nacimiento; la bienvenida exige la declaración explícita y quien declara ser menor no entra (enComunidad). */
  sinFechaDeNacimiento() {
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
      // Columnas (nombre seguido de un tipo), no textos de catálogo («Fiestas de cumpleaños»).
      t.split("\n").forEach((l, i) => { if (/\b(birth_?date|birthday|dob|date_of_birth|fecha_nac\w*|nacimiento|edad|age)\s+(date|timestamptz?|smallint|integer|int|text)\b/i.test(l) && !/^\s*--/.test(l)) falla("sinFechaDeNacimiento", `packages/db/migrations/${x}`, i + 1, "no se guarda fecha de nacimiento ni edad: 18+ es una declaración"); });
    }
    const V = "apps/web/lib/vecinos.ts", C = "apps/web/lib/comunidad.ts";
    if (!existsSync(V)) return;
    if (!/if \(p\.adulto !== true && p\.adulto !== false\) return no\(/.test(sinComent(V))) falla("sinFechaDeNacimiento", V, 0, "la bienvenida debe exigir la declaración explícita de 18 años o más");
    if (!/if \(r\?\.adult === false\) return \{ ok: false, menor: true/.test(sinComent(C)) || !/const ok = !!r && r\.adult === true && r\.welcome && r\.rules;/.test(sinComent(C))) falla("sinFechaDeNacimiento", C, 0, "enComunidad: solo entra quien declaró 18+ y aceptó las reglas");
    for (const x of codigo) if (/^apps\/web\/(app\/(entrar|\(app\)\/comunidad)\/|lib\/(vecinos|comunidad[^/]*)\.ts)/.test(x) && /type="date"|autoComplete="bday|\bbirth_?date\b|\bdob\b|fecha_nac/i.test(sinComent(x))) falla("sinFechaDeNacimiento", x, 0, "la bienvenida no pide fecha de nacimiento");
  },

  /* 5c (clase cazada en la prueba): content_reports tiene una llave única (destino, quien reporta); todo insert lo dice con on conflict
     (no hacer nada en una reseña; volver a abrir en una conversación que sigue en el tiempo), o el segundo reporte revienta. */
  reporteConLlave() {
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\binsert into content_reports\b/i.test(q) && !/on conflict \(target_kind, target_id, reporter_user_id\)/.test(q)) falla("reporteConLlave", x, 0, "insert into content_reports sin on conflict (target_kind, target_id, reporter_user_id): el segundo reporte de la misma persona revienta");
    }
  },

  /* 5d. Toda acción que oculta algo de la Comunidad o sanciona a una persona avisa con el motivo y lleva a «Apelar»: la función que
     oculta (publicación, comentario, mensaje entre vecinos, foto de la Comunidad) o inserta una sanción a una persona llama en su cuerpo a
     avisarOculto() / avisarSancion(); si es un ayudante que corre dentro de una transacción (autoOcultar, ocultarDm, aplicarSancion), lo
     hace cada función que lo llama. Los avisos llevan el motivo y la ruta de la apelación; la pantalla de apelar existe. */
  ocultarAvisaYApela() {
    const G = "ocultarAvisaYApela", AP = "apps/web/lib/apelaciones.ts";
    if (!existsSync(AP)) return;
    const HELPERS = ["autoOcultar", "ocultarDm", "aplicarSancion"];
    const OCULTA = [/update (com_posts|com_comments|\$\{tabla\}) set status = ('hidden'|\$2)/, /update dm_messages m set hidden_at = now\(\)/, /insert into sanctions \([^)]*\) values \('user'/];
    const FOTO = /update media set status = 'removed', removed_reason = 'admin'/;
    const AVISA = /\bavisar(Oculto|Sancion)\(/;
    for (const x of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const mm of t.matchAll(/\n(?:export )?async function (\w+)\(/g)) {
        const b = cuerpoFn(t, mm[1]);
        const oculta = OCULTA.some((re) => re.test(b)) || (FOTO.test(b) && /["']com_post["']/.test(b));
        if (oculta && !HELPERS.includes(mm[1]) && !AVISA.test(b)) falla(G, x, 0, `«${mm[1]}» oculta o sanciona sin avisar con el motivo y la apelación (avisarOculto / avisarSancion)`);
        for (const h of HELPERS) if (mm[1] !== h && new RegExp(`\\b${h}\\(`).test(b) && !AVISA.test(b)) falla(G, x, 0, `«${mm[1]}» llama a ${h}() y no avisa después con avisarOculto / avisarSancion`);
      }
      // Una sola forma de sancionar a una persona (con su referencia y el aviso).
      if (x !== AP && /insert into sanctions \([^)]*\) values \('user'/.test(t)) falla(G, x, 0, "una sanción a una persona se aplica solo con aplicarSancion() (lib/apelaciones.ts)");
    }
    const a = sinComent(AP);
    if (!/export const RUTA_AVISO = \(k: Apelable, id: string\) => `\/cuenta\/moderacion\?k=\$\{k\}&id=/.test(a)) falla(G, AP, 0, "RUTA_AVISO debe llevar a la pantalla de apelar (/cuenta/moderacion?k=…&id=…)");
    for (const fn of ["avisarOculto", "avisarSancion"]) { const b = cuerpoFn(a, fn); if (!/motivo/.test(b) || !/href: RUTA_AVISO\(/.test(b)) falla(G, AP, 0, `${fn} debe avisar con el motivo y la ruta de la apelación`); }
    if (!existsSync("apps/web/app/(app)/cuenta/moderacion/page.tsx") || !/apelar\(/.test(sinComent("apps/web/app/(app)/cuenta/moderacion/acciones.ts"))) falla(G, "apps/web/app/(app)/cuenta/moderacion", 0, "falta la pantalla de apelar (Mi cuenta › Avisos de moderación)");
    // 6a · Eventos: ocultar un evento o bloquear a un organizador avisa al negocio con el motivo y la ruta para apelar (avisarEvtOculto /
    // avisarOrgBloqueado, después de guardar); los dos se pueden apelar (APELABLE, el check de appeals y appeals_antes) y levantar la
    // apelación lo deshace (decidirApelacion).
    const ER = "apps/web/lib/evt-revision.ts";
    if (existsSync(ER)) {
      for (const x of codigo) {
        if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) || x === AP) continue;
        const t = sinComent(x);
        for (const mm of t.matchAll(/\n(?:export )?async function (\w+)\(/g)) {
          const b = cuerpoFn(t, mm[1]);
          if (/update events set hidden_at = now\(\)/.test(b) && !/\bavisarEvtOculto\(/.test(b)) falla(G, x, 0, `«${mm[1]}» oculta un evento sin avisar con el motivo y la apelación (avisarEvtOculto)`);
          if (/update event_organizers set blocked_at = now\(\)/.test(b) && !/\bavisarOrgBloqueado\(/.test(b)) falla(G, x, 0, `«${mm[1]}» bloquea a un organizador sin avisar con el motivo y la apelación (avisarOrgBloqueado)`);
        }
      }
      const er = sinComent(ER);
      for (const [fn, k] of [["avisarEvtOculto", "event"], ["avisarOrgBloqueado", "evt_org"]]) { const b = cuerpoFn(er, fn); if (!/motivo/.test(b) || !new RegExp(`href: RUTA_AVISO\\("${k}"`).test(b)) falla(G, ER, 0, `${fn} debe avisar con el motivo y la ruta de la apelación (RUTA_AVISO("${k}", …))`); }
      const mc = sinComent("apps/web/lib/moderacion-comun.ts");
      if (!/"event"/.test(/export type Apelable = [^;]+;/.exec(mc)?.[0] ?? "") || !/"evt_org"/.test(/export type Apelable = [^;]+;/.exec(mc)?.[0] ?? "")) falla(G, "apps/web/lib/moderacion-comun.ts", 0, "un evento oculto y un bloqueo de organizador se pueden apelar (Apelable: event, evt_org)");
      const ant = ultimaFn("appeals_antes");
      if (!/new\.target_kind = 'event'/.test(ant) || !/new\.target_kind = 'evt_org'/.test(ant)) falla(G, "packages/db/migrations", 0, "appeals_antes debe aceptar apelaciones de eventos y de organizadores (sanctioned_by desde la fuente)");
      const da = cuerpoFn(sinComent(AP), "decidirApelacion");
      if (!/a\.k === "event"/.test(da) || !/a\.k === "evt_org"/.test(da)) falla(G, AP, 0, "decidirApelacion debe deshacer lo de un evento o un organizador al levantar la apelación");
    }
  },

  /* 6a. Ningún evento sale al público sin revisión (fase6 §3 «Guardianes nuevos»; PLAN fila 6, decisión #3). En la base: `live` exige
     approved_at (check); pasar a live sin persona que apruebe (approved_by null) solo con el organizador verificado y un organizador
     bloqueado no envía ni publica (trigger events_antes); `listable` de una fecha lo calcula solo la base (evt_listable: publicado,
     aprobado, sin ocultar) y nadie lo escribe a mano. En la app: solo tres lugares ponen un evento en vivo y los tres ponen approved_at
     en la misma sentencia (enviarEn con el organizador verificado, decidirEvento al aprobar y la apelación levantada). Al revés: quitar
     una de estas revisiones → falla. */
  revisionAntesDePublicar() {
    const G = "revisionAntesDePublicar", M6 = "packages/db/migrations/0106_eventos_base.sql";
    if (!existsSync(M6)) return;
    const m = readFileSync(M6, "utf8");
    if (!/check \(status not in \('live', 'paused', 'done'\) or approved_at is not null\)/.test(m)) falla(G, M6, 0, "events debe exigir approved_at para estar en vivo (check)");
    const ea = ultimaFn("events_antes");
    if (!/if new\.approved_at is null then raise exception/.test(ea)) falla(G, M6, 0, "events_antes debe impedir publicar sin aprobar");
    if (!/if new\.approved_by is null and o\.verified_at is null then raise exception/.test(ea)) falla(G, M6, 0, "events_antes: sin revisión solo publica un organizador verificado");
    if ([...ea.matchAll(/o\.blocked_at is not null then\s*raise exception 'el organizador está bloqueado/g)].length < 2) falla(G, M6, 0, "events_antes: un organizador bloqueado no envía a revisión, no publica ni manda un cambio");
    if (!/create trigger events_antes before insert or update or delete on events/.test(m)) falla(G, M6, 0, "falta el trigger events_antes");
    const ls = ultimaFn("evt_listable");
    if (!/e\.status in \('live', 'paused'\)/.test(ls) || !/e\.approved_at is not null/.test(ls) || !/e\.hidden_at is null/.test(ls)) falla(G, M6, 0, "evt_listable: solo publicado, aprobado y sin ocultar");
    if (!/new\.listable := evt_listable\(e, new\.status\);/.test(ultimaFn("event_dates_antes"))) falla(G, M6, 0, "listable de una fecha lo pone solo la base (event_dates_antes)");
    const OK = new Set(["apps/web/lib/evt.ts", "apps/web/lib/evt-revision.ts", "apps/web/lib/apelaciones.ts"]);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\bevent_dates\b/.test(q) && /\blistable\s*=/.test(q) && /\b(update|insert)\b/.test(q)) falla(G, x, 0, "listable de una fecha no se escribe desde la app (lo decide la base)");
        // 6e · Reanudar la venta (lib/evt-cambios.ts) solo vuelve a 'live' un evento PAUSADO y ya aprobado: nunca publica algo sin revisión.
        // Lo que se ASIGNA (antes del where): «… where status = 'live'» no pone nada en vivo.
        const pone = /update events set[^`]*status = 'live'/.test(q.split(/\bwhere\b/)[0] ?? "");
        if (pone && x === "apps/web/lib/evt-cambios.ts" && /where id = \$1::bigint and status = 'paused' and approved_at is not null/.test(q)) continue;
        if (pone) {
          if (!OK.has(x)) falla(G, x, 0, "solo lib/evt.ts, lib/evt-revision.ts y la apelación ponen un evento en vivo");
          if (!/approved_at = now\(\)/.test(q)) falla(G, x, 0, "poner un evento en vivo pone approved_at en la misma sentencia");
        }
      }
    }
    const ev = existsSync("apps/web/lib/evt.ts") ? cuerpoFn(sinComent("apps/web/lib/evt.ts"), "enviarEn") : "";
    if (ev) { const iV = ev.search(/if \(verificado\) \{/), iL = ev.search(/status = 'live'/); if (iV < 0 || iL < 0 || iV > iL || !/approved_by = null/.test(ev)) falla(G, "apps/web/lib/evt.ts", 0, "enviarEn publica sin revisión solo con el organizador verificado (approved_by null)"); }
    const dr = existsSync("apps/web/lib/evt-revision.ts") ? cuerpoFn(sinComent("apps/web/lib/evt-revision.ts"), "decidirEvento") : "";
    if (dr && !/status = 'live', approved_at = now\(\), approved_by = \$2/.test(dr)) falla(G, "apps/web/lib/evt-revision.ts", 0, "aprobar pone approved_by = quien decide");
    // El libro de la revisión es de solo inserción y nadie lo cambia.
    if (!/create trigger event_review_log_no_cambia before update or delete on event_review_log/.test(m)) falla(G, M6, 0, "event_review_log sin el trigger de solo inserción");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && /\b(update|delete from) event_review_log\b/.test(sinComent(x))) falla(G, x, 0, "event_review_log es solo de inserción");
  },

  /* 6b. Lo público de Eventos sale solo de lo `listable` (lo decide la base): evt_listable suma el módulo del negocio (encendido, sin pausa
     de To'Latino, categoría que lo admite, negocio activo) y el organizador sin bloquear; la base vuelve a calcularlo cuando eso cambia
     (triggers en businesses, event_organizers y categories); y toda lectura de fechas en lib/evt-publico.ts (salvo ultimosRsvp, que es del
     panel y del admin) pasa por VIVO / listable. Al revés: quitar una condición, un trigger o el filtro de una consulta → falla. */
  eventosSoloListables() {
    const G = "eventosSoloListables", M = "packages/db/migrations/0107_eventos_publico.sql", L = "apps/web/lib/evt-publico.ts";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), ls = ultimaFn("evt_listable"), np = ultimaFn("evt_negocio_publico");
    if (!/evt_negocio_publico\(e\.business_id\)/.test(ls)) falla(G, M, 0, "evt_listable debe exigir el módulo Eventos del negocio (evt_negocio_publico)");
    for (const [re, que] of [[/b\.status = 'active'/, "negocio activo"], [/'eventos' = any\(b\.modules_on\)/, "módulo encendido por el negocio"], [/not \(coalesce\(b\.modules_off, '\{\}'::jsonb\) \? 'eventos'\)/, "sin pausa de To'Latino"],
      [/allowed_modules, '\[\]'::jsonb\) \? 'eventos'/, "categoría que admite Eventos"], [/o\.blocked_at is not null/, "organizador sin bloquear"]])
      if (!re.test(np)) falla(G, M, 0, `evt_negocio_publico sin «${que}»`);
    for (const t of ["businesses_evt_relistar after update on businesses", "event_organizers_relistar after insert or update on event_organizers", "categories_evt_relistar after update on categories"])
      if (!m.includes(`create trigger ${t}`)) falla(G, M, 0, `falta el trigger «${t.split(" ")[0]}» que vuelve a calcular listable`);
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/evt-publico.ts");
    const t = sinComent(L);
    if (!/const VIVO = `d\.listable and /.test(t)) falla(G, L, 0, "VIVO debe empezar por d.listable");
    for (const fn of [...t.matchAll(/\n(?:export )?async function (\w+)\(/g)].map((x) => x[1])) {
      if (fn === "ultimosRsvp" || fn === "diasCiudad" || fn === "generosFiltro") continue;
      const b = cuerpoFn(t, fn);
      if (/event_dates|DESDE_T/.test(b) && !/\$\{VIVO\}|VIVO, |\bd\.listable\b/.test(b)) falla(G, L, 0, `«${fn}» lee fechas de eventos sin VIVO / listable`);
    }
    // Lo demás que muestra eventos al público también pide listable (Noche, novedades, Mi cuenta, Hoy por post_en_vivo).
    for (const [f, re] of [["apps/web/lib/noche-publico.ts", /d\.listable and d\.ends_at > now\(\)/], ["apps/web/lib/novedades.ts", /where e\.id = p\.event_id and d\.listable/], ["apps/web/lib/rsvp.ts", /f\.kind = 'event' and d\.listable/]])
      if (existsSync(f) && !re.test(sinComent(f))) falla(G, f, 0, "muestra un evento al público sin pedir listable");
  },

  /* 6b. Eventos pagina con cursor (starts_at, id), 20 por página y una de más, sin offset, sobre el índice (city_id, starts_at, id) where
     listable. Al revés: offset, sin cursor o sin el índice → falla. */
  eventosConCursor() {
    const G = "eventosConCursor", L = "apps/web/lib/evt-publico.ts", M = "packages/db/migrations/0106_eventos_base.sql";
    for (const x of codigo) {
      if (!/^apps\/web\/(lib\/(evt-publico|rsvp)\.ts|app\/\(app\)\/eventos\/.*\.tsx?)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/\boffset\b/i.test(l)) falla(G, x, i + 1, "Eventos no pagina con offset: usa el cursor (starts_at, id)"); });
    }
    if (!existsSync(L)) return;
    const b = cuerpoFn(sinComent(L), "eventosCiudad");
    // 9b-3: elige sus fechas por ventanas en orden (starts_at, id) desde el cursor y junta una de más (ids.length <= POR_PAGINA_EVT).
    if (!/\(d\.starts_at, d\.id\) > \(\$\$\{vv\.length - 1\}::timestamptz, \$\$\{vv\.length\}::bigint\)/.test(b) || !/order by d\.starts_at, d\.id limit \$\{K\}/.test(b) || !/ids\.length <= POR_PAGINA_EVT/.test(b)) falla(G, L, 0, "eventosCiudad debe seguir con cursor (starts_at, id), en ese orden, y pedir una de más");
    if (!/export const POR_PAGINA_EVT = 20;/.test(readFileSync(L, "utf8"))) falla(G, L, 0, "20 eventos por página");
    if (existsSync(M) && !/create index if not exists event_dates_lista_idx on event_dates \(city_id, starts_at, id\) where listable;/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "falta el índice (city_id, starts_at, id) where listable");
  },

  /* 6b. El cupo del RSVP lo cuenta la base, sin sobreventa con personas a la vez: rsvps_antes bloquea la fila de la fecha (for update) ANTES
     de contar y compara con el cupo; rsvps_despues lleva el contador y vuelve a mirar el cupo; los derivados de una fecha solo los escribe
     un trigger con la marca tl.evt_derivado (la app no la enciende ni escribe rsvp_n / going_n); solo lib/rsvp.ts escribe rsvps; el cupo
     no baja de lo guardado. Al revés: quitar el bloqueo, un control o escribir el contador desde la app → falla. */
  rsvpConCupo() {
    const G = "rsvpConCupo", M = "packages/db/migrations/0107_eventos_publico.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), a = ultimaFn("rsvps_antes"), d = ultimaFn("rsvps_despues"), ed = ultimaFn("event_dates_antes");
    const iL = a.search(/select \* into d from event_dates where id = new\.event_date_id for update;/), iC = a.search(/if e\.rsvp_capacity > 0 and d\.rsvp_n - antes \+ new\.party > e\.rsvp_capacity then raise exception 'evt_cupo_lleno/);
    if (iL < 0 || iC < 0 || iL > iC) falla(G, M, 0, "rsvps_antes: bloquear la fila de la fecha (for update) antes de contar el cupo");
    if (!/select \* into e from events where id = d\.event_id for share;/.test(a)) falla(G, M, 0, "rsvps_antes: el cupo del evento se lee con «for share»");
    if (!/if new\.party > e\.party_max then raise exception/.test(a) || !/if not d\.listable then raise exception/.test(a)) falla(G, M, 0, "rsvps_antes: personas por RSVP y solo fechas que salen al público");
    if (!/if dh > 0 and cap > 0 and n > cap then raise exception 'evt_cupo_lleno/.test(d)) falla(G, M, 0, "rsvps_despues: último control del cupo después de sumar");
    if (!/coalesce\(current_setting\('tl\.evt_derivado', true\), ''\) <> 'si' then\s*raise exception/.test(ed)) falla(G, M, 0, "event_dates_antes: los derivados solo con la marca de sus triggers");
    if (!/create unique index if not exists rsvps_vivo on rsvps \(event_date_id, user_id\) where status = 'going';/.test(m)) falla(G, M, 0, "un RSVP vivo por persona y fecha");
    if (!/create trigger rsvps_antes before insert or update or delete on rsvps/.test(m) || !/create trigger rsvps_despues after insert or update on rsvps/.test(m) || !/create trigger events_cupo before update of rsvp_capacity on events/.test(m)) falla(G, M, 0, "faltan los triggers del RSVP o del cupo");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/tl\.evt_derivado/.test(t)) falla(G, x, 0, "la app no enciende la marca de los derivados de una fecha");
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/update event_dates[^`]*\b(rsvp_n|going_n|sold_n|inside_n|entered_n)\s*=/.test(q)) falla(G, x, 0, "los contadores de una fecha los lleva la base");
        if (/\b(insert into|update|delete from) rsvps\b/.test(q) && x !== "apps/web/lib/rsvp.ts") falla(G, x, 0, "solo lib/rsvp.ts escribe RSVP");
      }
    }
  },

  /* 5d. La apelación la decide otra persona: la base pone quién ocultó o sancionó (sanctioned_by, de la fuente) y rechaza que esa persona
     o quien apela la decida (trigger y check); decidirApelacion lo dice antes de tocar nada; solo lib/apelaciones.ts escribe appeals y
     nunca escribe sanctioned_by a mano. */
  apelacionOtraPersona() {
    const G = "apelacionOtraPersona", M = "packages/db/migrations/0100_moderacion_apelaciones.sql", AP = "apps/web/lib/apelaciones.ts";
    if (!existsSync(M) || !existsSync(AP)) return;
    const m = readFileSync(M, "utf8");
    if (!/if old\.sanctioned_by is not null and new\.decided_by = old\.sanctioned_by then raise exception/.test(m)) falla(G, M, 0, "appeals_antes debe rechazar que decida quien sancionó");
    if (!/if new\.decided_by = old\.user_id then raise exception/.test(m)) falla(G, M, 0, "appeals_antes debe rechazar que decida quien apela");
    if (!/new\.sanctioned_by := x\.por;/.test(m)) falla(G, M, 0, "appeals_antes debe poner sanctioned_by desde la fuente (no la app)");
    if (!/check \(decided_by is null or sanctioned_by is null or decided_by <> sanctioned_by\)/.test(m)) falla(G, M, 0, "appeals sin el check decided_by <> sanctioned_by");
    const b = cuerpoFn(sinComent(AP), "decidirApelacion"), iC = b.search(/if \(a\.por === staffId\) return \{ err:/), iU = b.search(/update appeals set status/);
    if (iC < 0 || iU < 0 || iC > iU) falla(G, AP, 0, "decidirApelacion debe rechazar a quien sancionó antes de decidir");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\b(insert into|update|delete from) appeals\b/.test(q) && x !== AP) falla(G, x, 0, "solo lib/apelaciones.ts escribe apelaciones");
        if (/\binsert into appeals\b/.test(q) && /sanctioned_by|decided_by/.test(q)) falla(G, x, 0, "una apelación nueva no trae sanctioned_by ni decided_by (los pone la base)");
      }
    }
  },

  /* 5d. Libros de solo inserción: mod_flags (lo que marcó cada regla) y com_edits no se cambian ni se borran (trigger); una apelación no se
     borra y, decidida, no cambia; un término no se borra (se apaga). Y ningún código lo intenta. */
  libroSoloInsercion() {
    const G = "libroSoloInsercion", M = "packages/db/migrations/0100_moderacion_apelaciones.sql";
    if (!existsSync(M)) return;
    // 8g · Wallet: pass_log es de solo inserción; un pase, un teléfono o un registro no se borran (estados). La app no cambia ni borra el libro.
    const MW = "packages/db/migrations/0129_pases_wallet.sql";
    if (existsSync(MW)) {
      const mw = readFileSync(MW, "utf8");
      if (!/create trigger pass_log_no_cambia before update or delete on pass_log/.test(mw) || !/raise exception 'pass_log es solo de inserción'/.test(mw)) falla(G, MW, 0, "pass_log es de solo inserción (trigger)");
      for (const [fn, msg] of [["ticket_passes_antes", "un pase no se borra"], ["pass_devices_antes", "un teléfono de Wallet no se borra"], ["pass_registrations_antes", "un registro de Wallet no se borra"]])
        if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, MW, 0, `${msg} (estados)`);
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) pass_log\b|\bdelete from (ticket_passes|pass_devices|pass_registrations)\b/.test(q)) falla(G, x, 0, `el libro de los pases no se cambia y nada de Wallet se borra: «${q.slice(0, 60)}»`);
    }
    // 8d · Las llaves: passkey_log es de solo inserción; una llave no se borra (se quita o se revoca) ni vuelve.
    const ML = "packages/db/migrations/0130_llaves_acceso.sql";
    if (existsSync(ML)) {
      const ml = readFileSync(ML, "utf8");
      if (!/create trigger passkey_log_no_cambia before update or delete on passkey_log/.test(ml) || !/raise exception 'passkey_log es solo de inserción'/.test(ml)) falla(G, ML, 0, "passkey_log es de solo inserción (trigger)");
      if (!/raise exception 'una llave de acceso no se borra/.test(ultimaFn("passkeys_antes")) || !/una llave quitada no vuelve ni se usa/.test(ultimaFn("passkeys_antes"))) falla(G, ML, 0, "una llave no se borra ni vuelve (estados)");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) passkey_log\b|\bdelete from passkeys\b/.test(q)) falla(G, x, 0, `el libro de las llaves no se cambia y una llave no se borra: «${q.slice(0, 60)}»`);
    }
    // 8h · La tubería: ci_oidc_log y store_submissions son de solo inserción; un pedido de build no se borra. La app no los cambia ni los borra.
    const MT = "packages/db/migrations/0131_tiendas_tuberia.sql";
    if (existsSync(MT)) {
      if (!/raise exception 'ci_oidc_log es solo de inserción'/.test(ultimaFn("ci_oidc_log_antes"))) falla(G, MT, 0, "ci_oidc_log es de solo inserción (trigger)");
      if (!/raise exception 'store_submissions es solo de inserción'/.test(ultimaFn("store_submissions_antes"))) falla(G, MT, 0, "store_submissions es de solo inserción (trigger)");
      if (!/raise exception 'un pedido de build no se borra'/.test(ultimaFn("build_requests_antes"))) falla(G, MT, 0, "un pedido de build no se borra");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (ci_oidc_log|store_submissions)\b|\bdelete from (build_requests|app_builds)\b/.test(q)) falla(G, x, 0, "los libros de la tubería no se cambian y un pedido o un build no se borran");
    }
    // 9e · Lo legal: legal_acceptances y legal_page_log son de solo inserción; una página legal no se borra (se retira) y su texto no cambia;
    // aceptar queda anotado UNA vez por persona, negocio y versión (índice único). Solo lib/legal.ts escribe aceptaciones; nadie las cambia.
    const MLG = "packages/db/migrations/0135_legal.sql";
    if (existsSync(MLG)) {
      const mlg = readFileSync(MLG, "utf8");
      if (!/if tg_op <> 'INSERT' then raise exception 'legal_acceptances es solo de inserción'/.test(ultimaFn("legal_acceptances_antes")) || !/create trigger legal_acceptances_antes before insert or update or delete on legal_acceptances/.test(mlg)) falla(G, MLG, 0, "legal_acceptances es de solo inserción (trigger)");
      if (!/create trigger legal_page_log_no_cambia before update or delete on legal_page_log for each row execute function legal_solo_insercion\(\)/.test(mlg)) falla(G, MLG, 0, "legal_page_log es de solo inserción (trigger)");
      if (!/raise exception 'una página legal no se borra/.test(ultimaFn("legal_pages_antes")) || !/raise exception 'el texto de una versión legal no cambia/.test(ultimaFn("legal_pages_antes"))) falla(G, MLG, 0, "una página legal no se borra y el texto de una versión no cambia");
      if (!/create unique index if not exists legal_acceptances_una_vez on legal_acceptances \(user_id, coalesce\(business_id, ''\), page_key, jurisdiction, version\)/.test(mlg)) falla(G, MLG, 0, "aceptar queda anotado una vez por persona, negocio y versión (índice único)");
      for (const x of codigo) {
        if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
        for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
          if (/\b(update|delete from) (legal_acceptances|legal_page_log)\b|\bdelete from legal_pages\b/.test(q)) falla(G, x, 0, `lo legal no se cambia ni se borra: «${q.slice(0, 60)}»`);
          if (/\binsert into (legal_acceptances|legal_page_log)\b|\bupdate legal_pages\b/.test(q) && x !== "apps/web/lib/legal.ts") falla(G, x, 0, "solo lib/legal.ts escribe lo legal (aceptaciones, libro y estados)");
        }
      }
    }
    const m = readFileSync(M, "utf8");
    if (!/create trigger mod_flags_no_cambia before update or delete on mod_flags for each row execute function mod_flags_inmutable\(\)/.test(m) || !/raise exception 'mod_flags es solo de inserción'/.test(m)) falla(G, M, 0, "mod_flags sin el trigger de solo inserción");
    if (!/if tg_op = 'DELETE' then raise exception 'una apelación no se borra'/.test(m) || !/if old\.status <> 'open' then raise exception 'una apelación decidida no cambia'/.test(m)) falla(G, M, 0, "appeals: no se borra y, decidida, no cambia");
    if (!/create trigger mod_terms_no_borra before delete on mod_terms/.test(m)) falla(G, M, 0, "mod_terms: un término no se borra");
    if (!/create trigger com_edits_no_cambia before update or delete on com_edits/.test(readFileSync("packages/db/migrations/0097_comunidad_base.sql", "utf8"))) falla(G, "packages/db/migrations/0097_comunidad_base.sql", 0, "com_edits sin el trigger de solo inserción");
    // 6g · La puerta: ticket_scans (auditoría de check-ins) y door_searches son de solo inserción; un portero, una sesión, una incidencia o
    // un número de mesa no se borran (estados); la app no cambia ni borra escaneos, entradas, contadores ni búsquedas.
    const MP = "packages/db/migrations/0112_puerta.sql";
    if (existsSync(MP)) {
      const mp = readFileSync(MP, "utf8");
      if (!/create trigger ticket_scans_antes before insert or update or delete on ticket_scans/.test(mp) || !/raise exception 'ticket_scans es solo de inserción'/.test(ultimaFn("ticket_scans_antes"))) falla(G, MP, 0, "ticket_scans es de solo inserción (trigger)");
      if (!/create trigger door_searches_no_cambia before update or delete on door_searches/.test(mp)) falla(G, MP, 0, "door_searches es de solo inserción (trigger)");
      for (const [fn, msg] of [["door_staff_antes", "un portero no se borra"], ["door_sessions_antes", "una sesión de puerta no se borra"], ["door_incidents_antes", "una incidencia no se borra"], ["door_table_numbers_antes", "un número de mesa no se borra"], ["ticket_entries_antes", "una entrada no se borra"]])
        if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, MP, 0, `${msg} (estados)`);
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (ticket_scans|door_searches|ticket_entries|door_counts)\b|\bdelete from (door_staff|door_sessions|door_incidents|door_table_numbers)\b/.test(q)) falla(G, x, 0, `la auditoría de la puerta no se cambia ni se borra: «${q.slice(0, 60)}»`);
    }
    // 6j · Los avisos automáticos de Eventos que ya salieron y los ajustes de cupo del Super Admin son de solo inserción.
    const MJ = "packages/db/migrations/0115_eventos_admin_config.sql";
    if (existsSync(MJ)) {
      const mj = readFileSync(MJ, "utf8");
      if (!/create trigger evt_avisos_enviados_no_cambia before update or delete on evt_avisos_enviados/.test(mj)) falla(G, MJ, 0, "evt_avisos_enviados es de solo inserción (trigger)");
      if (!/create trigger event_stock_overrides_no_cambia before update or delete on event_stock_overrides/.test(mj)) falla(G, MJ, 0, "event_stock_overrides es de solo inserción (trigger)");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (evt_avisos_enviados|event_stock_overrides)\b/.test(q)) falla(G, x, 0, "un aviso ya mandado o un ajuste de cupo no se cambian ni se borran");
    }
    // 6i · Evento privado: las propuestas, las aceptaciones y los cambios pedidos son de solo inserción (el estado de una propuesta se deriva).
    for (const [fn, msg] of [["private_event_quotes_antes", "private_event_quotes es solo de inserción"], ["private_event_acceptances_antes", "private_event_acceptances es solo de inserción"], ["private_event_asks_antes", "private_event_asks es solo de inserción"]])
      if (!new RegExp(`if tg_op <> 'INSERT' then raise exception '${msg}'`).test(ultimaFn(fn))) falla(G, "packages/db/migrations/0114_evento_privado.sql", 0, `${msg} (trigger)`);
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) private_event_(quotes|acceptances|asks)\b/.test(q)) falla(G, x, 0, "una propuesta, una aceptación o un cambio pedido no se cambian ni se borran");
    // 7c · El Compa: los mensajes, el libro de uso y los pasos a una persona son de solo inserción; una conversación, una acción, una reserva
    // del tope, una pausa o un modelo no se borran (estados); una acción se decide una sola vez.
    const MC = "packages/db/migrations/0118_compa_base.sql";
    if (existsSync(MC)) {
      if (!/raise exception 'compa_messages es solo de inserción'/.test(ultimaFn("compa_messages_antes")) || !/create trigger compa_messages_antes before insert or update or delete on compa_messages/.test(readFileSync(MC, "utf8"))) falla(G, MC, 0, "compa_messages es de solo inserción (trigger)");
      if (!/raise exception 'compa_handoffs es solo de inserción'/.test(ultimaFn("compa_handoffs_antes"))) falla(G, MC, 0, "compa_handoffs es de solo inserción (trigger)");
      if (!/create trigger compa_usage_solo_insercion before update or delete on compa_usage/.test(readFileSync(MC, "utf8"))) falla(G, MC, 0, "compa_usage es de solo inserción (trigger)");
      for (const [fn, msg] of [["compa_conversations_antes", "una conversación de El Compa no se borra"], ["compa_actions_antes", "una acción de El Compa no se borra"], ["compa_reservations_antes", "una reserva del tope no se borra"], ["compa_pauses_antes", "una pausa de El Compa no se borra"], ["compa_models_no_borra", "un modelo no se borra"]])
        if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, MC, 0, `${msg} (estados)`);
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (compa_messages|compa_usage|compa_handoffs)\b|\bdelete from (compa_conversations|compa_actions|compa_reservations|compa_pauses|compa_models|compa_spend_month)\b/.test(q)) falla(G, x, 0, `un libro de El Compa no se cambia ni se borra: «${q.slice(0, 60)}»`);
    }
    // 7i · Las marcas («Marcar respuesta incorrecta») y «Lo que El Compa no supo» no se borran (se quitan / avanzan); la purga por retención
    // y D5 solo VACÍA el texto, UNA vez, sin tocar nada más (la base, en cada tabla de solo inserción), y solo la hace compa_purgar.
    const M7I = "packages/db/migrations/0124_compa_admin_config.sql";
    if (existsSync(M7I)) {
      if (!/raise exception 'una marca de El Compa no se borra/.test(ultimaFn("compa_reviews_antes")) || !/raise exception 'compa_reviews: de una marca solo se quita la marca, una vez/.test(ultimaFn("compa_reviews_antes"))) falla(G, M7I, 0, "compa_reviews: no se borra y solo se quita la marca, una vez");
      if (!/raise exception 'lo que El Compa no supo no se borra/.test(ultimaFn("compa_unknowns_antes")) || !/raise exception 'compa_unknowns: el estado solo avanza/.test(ultimaFn("compa_unknowns_antes"))) falla(G, M7I, 0, "compa_unknowns: no se borra y el estado solo avanza");
      for (const [fn, campos] of [["compa_messages_antes", ["text"]], ["compa_handoffs_antes", ["summary"]], ["support_messages_antes", ["body"]], ["compa_drafts_antes", ["summary", "draft", "next_step"]], ["compa_reviews_antes", ["note"]], ["compa_unknowns_antes", ["query_tapada", "note"]]]) {
        const f = ultimaFn(fn), lista = [...campos, "purged_at"].map((x) => `'${x}'`).join(", ");
        const una = /old\.purged_at is null and new\.purged_at is not null/.test(f) && campos.every((c) => new RegExp(`new\\.${c} is null`).test(f));
        const nadaMas = f.includes(`(to_jsonb(new) - array[${lista}]) = (to_jsonb(old) - array[${lista}])`);
        if (!una || !nadaMas) falla(G, M7I, 0, `${fn}: la purga vacía ${campos.join(", ")} UNA vez y no cambia nada más`);
      }
      if (!/compa_purgar_conversaciones\(a\)/.test(ultimaFn("compa_purgar")) || !/soporte_purgar_casos\(k\)/.test(ultimaFn("compa_purgar"))) falla(G, M7I, 0, "compa_purgar: retención de El Compa y cuentas borradas (D5)");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\bdelete from (compa_reviews|compa_unknowns)\b/.test(q)) falla(G, x, 0, "una marca o «lo que El Compa no supo» no se borra");
        if (/\bupdate (support_messages|support_cases|compa_\w+) set [^`]*(\b(body|summary|draft|query_tapada) = null\b|\bpurged_at\b)/.test(q)) falla(G, x, 0, "la purga la hace la base (compa_purgar), no la app");
      }
    } else falla(G, M7I, 0, "falta la migración 0124 (marcas, «no supo» y la purga)");
    // 7d · Las lecturas del equipo (compa_reads) son de solo inserción: quién abrió qué conversación queda para siempre.
    const MD7 = "packages/db/migrations/0119_compa_vecinos.sql";
    if (existsSync(MD7)) {
      if (!/create trigger compa_reads_antes before insert or update or delete on compa_reads/.test(readFileSync(MD7, "utf8")) || !/raise exception 'compa_reads es solo de inserción'/.test(ultimaFn("compa_reads_antes"))) falla(G, MD7, 0, "compa_reads es de solo inserción (trigger)");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) compa_reads\b/.test(q)) falla(G, x, 0, "una lectura del equipo no se cambia ni se borra");
    }
    // 7g · Los borradores del copiloto (compa_drafts) son de solo inserción: lo único que se anota, una vez, es si se usaron (y el mensaje que salió).
    const MD8 = "packages/db/migrations/0122_compa_copiloto.sql";
    if (existsSync(MD8)) {
      const f = ultimaFn("compa_drafts_antes");
      if (!/create trigger compa_drafts_antes before insert or update or delete on compa_drafts/.test(readFileSync(MD8, "utf8")) || !/raise exception 'compa_drafts es solo de inserción/.test(f) || !/if old\.used is not null then raise exception 'compa_borrador_usado/.test(f)) falla(G, MD8, 0, "compa_drafts es de solo inserción (se anota una vez si se usó)");
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\bdelete from compa_drafts\b|\bupdate compa_drafts set (?!used = )/.test(q)) falla(G, x, 0, "de un borrador del copiloto solo se anota si se usó");
    }
    // 7h · WhatsApp y SMS: la entrada (compa_inbound) y la salida (compa_outbound) son de solo inserción salvo su estado (que solo avanza) y la
    // purga; las bajas y altas (compa_canal_consent) de solo inserción; un enlace de un uso se anota usado una vez; un número se retira.
    const MH = "packages/db/migrations/0123_compa_canales.sql";
    if (existsSync(MH)) {
      const mh = readFileSync(MH, "utf8");
      for (const [t, fn, msg] of [["compa_inbound", "compa_inbound_antes", "if tg_op = 'DELETE' then raise exception 'compa_inbound es solo de inserción'; end if;"], ["compa_outbound", "compa_outbound_antes", "if tg_op = 'DELETE' then raise exception 'compa_outbound es solo de inserción'; end if;"],
        ["compa_canal_consent", "compa_canal_consent_antes", "if tg_op <> 'INSERT' then raise exception 'compa_canal_consent es solo de inserción'; end if;"], ["compa_links", "compa_links_antes", "if tg_op = 'DELETE' then raise exception 'un enlace de El Compa no se borra'; end if;"]])
        if (!new RegExp(`create trigger ${fn} before insert or update or delete on ${t}`).test(mh) || !ultimaFn(fn).includes(msg)) falla(G, MH, 0, `${t}: no se borra ni se cambia fuera de su regla (trigger)`);
      if (!/raise exception 'compa_enlace_usado: ese enlace ya se usó'/.test(ultimaFn("compa_links_antes"))) falla(G, MH, 0, "un enlace de un uso se anota usado una sola vez");
      if (!/raise exception 'compa_inbound: el procesamiento solo avanza'/.test(ultimaFn("compa_inbound_antes"))) falla(G, MH, 0, "el procesamiento de una entrada solo avanza");
      if (!/raise exception 'un número de El Compa no se borra: se retira'/.test(ultimaFn("compa_channel_numbers_antes"))) falla(G, MH, 0, "un número de El Compa no se borra: se retira");
      // Sobre el archivo entero (no por plantilla: una plantilla con ${…} anidado corre el emparejado de las comillas).
      for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) { const q = sinComent(x);
        if (/\bdelete from (compa_inbound|compa_outbound|compa_canal_consent|compa_links|compa_channel_numbers|compa_canal_rechazos)\b|\bupdate compa_canal_consent\b/.test(q)) falla(G, x, 0, "un registro de WhatsApp/SMS no se borra");
        if (/\bupdate compa_links set (?!used_at = now\(\), used_result = )/.test(q)) falla(G, x, 0, "de un enlace de un uso solo se anota que se usó");
      }
    } else falla(G, MD8, 0, "falta la migración del copiloto (compa_drafts)");
    // 7a · El libro de la ayuda (help_article_log): pausar, volver a usar, desplegar y retirar quedan para siempre.
    const MA = "packages/db/migrations/0116_ayuda_base.sql";
    if (existsSync(MA) && (!/create trigger help_article_log_no_cambia before update or delete on help_article_log/.test(readFileSync(MA, "utf8")) || !/raise exception 'help_article_log es solo de inserción'/.test(ultimaFn("help_article_log_inmutable")))) falla(G, MA, 0, "help_article_log es de solo inserción (trigger)");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) help_article_log\b/.test(q)) falla(G, x, 0, "el libro de la ayuda no se cambia ni se borra");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\b(update|delete from) (mod_flags|com_edits)\b|\bdelete from (appeals|mod_terms)\b/.test(q)) falla(G, x, 0, `un libro de solo inserción se cambia o se borra: «${q.slice(0, 60)}»`);
        // 5f: el libro de puntos no se cambia, no se borra y la app ni siquiera inserta: solo sus funciones (pts_*).
        if (/\b(insert into|update|delete from) points_entries\b/.test(q)) falla(G, x, 0, "points_entries solo lo escriben las funciones pts_* de la base (solo inserción)");
        // 5g: el libro de monedas y los canjes: la app no los inserta, no los cambia y no los borra (solo mon_* y cup_* en la base); un cupón no se borra.
        if (/\b(insert into|update|delete from) (coin_entries|coupon_redemptions)\b/.test(q)) falla(G, x, 0, "coin_entries y coupon_redemptions solo los escriben las funciones mon_* / cup_* de la base");
        if (/\bdelete from coupons\b/.test(q)) falla(G, x, 0, "un cupón no se borra: se termina (estado)");
      }
      if (/tl\.puntos|pts_entrar\(/.test(t)) falla(G, x, 0, "la app no enciende la marca del libro de puntos");
      if (/tl\.(monedas|cupones)|(mon|cup)_entrar\(/.test(t)) falla(G, x, 0, "la app no enciende la marca del libro de monedas ni la de los canjes");
    }
    // 5f · points_entries: trigger de solo inserción, y antes de insertar exige la marca de sus funciones.
    const M2 = "packages/db/migrations/0102_puntos_rangos_tabla.sql";
    if (existsSync(M2)) {
      const m2 = readFileSync(M2, "utf8");
      if (!/create trigger points_entries_no_cambia before update or delete on points_entries for each row execute function points_entries_inmutable\(\)/.test(m2) || !/raise exception 'points_entries es solo de inserción'/.test(m2)) falla(G, M2, 0, "points_entries sin el trigger de solo inserción");
      if (!/if coalesce\(current_setting\('tl\.puntos', true\), ''\) <> 'si' then raise exception 'el libro de puntos solo lo escriben sus funciones/.test(ultimaFn("points_entries_antes"))) falla(G, M2, 0, "points_entries: solo sus funciones insertan (marca tl.puntos)");
      if (!/create unique index if not exists points_entries_unico on points_entries \(user_id, rule_key, ref_kind, ref_id\) where reverses_id is null/.test(m2) || !/points_entries_reverso on points_entries \(reverses_id\) where reverses_id is not null/.test(m2)) falla(G, M2, 0, "points_entries: idempotente por (persona, regla, referencia) y cada asiento se revierte una vez");
      if (!/if tg_op = 'DELETE' then raise exception 'un cierre de la Tabla no se borra'/.test(m2) || !/if tg_op = 'UPDATE' and old\.closed_at is not null then raise exception 'un mes cerrado no cambia'/.test(m2)) falla(G, M2, 0, "board_closures: un cierre no se borra y un mes cerrado no cambia");
    }
    // 5g · coin_entries: trigger de solo inserción, solo sus funciones insertan (marca tl.monedas), idempotente y cada canje se devuelve una vez.
    const M3 = "packages/db/migrations/0103_monedas_cupones.sql";
    if (existsSync(M3)) {
      const m3 = readFileSync(M3, "utf8");
      if (!/create trigger coin_entries_no_cambia before update or delete on coin_entries for each row execute function coin_entries_inmutable\(\)/.test(m3) || !/raise exception 'coin_entries es solo de inserción'/.test(m3)) falla(G, M3, 0, "coin_entries sin el trigger de solo inserción");
      if (!/if coalesce\(current_setting\('tl\.monedas', true\), ''\) <> 'si' then raise exception 'el libro de monedas solo lo escriben sus funciones/.test(ultimaFn("coin_entries_antes"))) falla(G, M3, 0, "coin_entries: solo sus funciones insertan (marca tl.monedas)");
      if (!/create unique index if not exists coin_entries_unico on coin_entries \(user_id, reason_key, ref_kind, ref_id\) where reverses_id is null/.test(m3) || !/coin_entries_reverso on coin_entries \(reverses_id\) where reverses_id is not null/.test(m3)) falla(G, M3, 0, "coin_entries: idempotente por (persona, motivo, referencia) y cada canje se devuelve una vez");
      const cg = ultimaFn("coupon_redemptions_guardia");
      if (!/if tg_op = 'DELETE' then raise exception 'un canje no se borra'/.test(cg) || !/if coalesce\(current_setting\('tl\.cupones', true\), ''\) <> 'si' then raise exception/.test(cg)) falla(G, M3, 0, "coupon_redemptions: no se borra y solo cup_* la escriben (marca tl.cupones)");
      if (!/create trigger coupon_redemptions_guardia before insert or update or delete on coupon_redemptions/.test(m3)) falla(G, M3, 0, "coupon_redemptions sin su trigger de guardia");
    }
  },

  /* 5d. Los límites del día los pone el servidor: publicar, comentar, votar, empezar una conversación y reportar piden limiteDia() antes de
     escribir; limiteDia cuenta el día local de la ciudad, con la mitad el primer día de la cuenta y con candado por persona (dos a la vez
     no se pasan); los cinco topes existen en platform_config. Ningún conteo propio de «24 horas» queda en esas funciones. */
  limitesEnServidor() {
    const G = "limitesEnServidor", MO = "apps/web/lib/moderacion.ts", M = "packages/db/migrations/0100_moderacion_apelaciones.sql";
    if (!existsSync(MO)) return;
    const CASOS = [["apps/web/lib/comunidad.ts", "publicar", "publicaciones", /insert into com_posts/], ["apps/web/lib/comunidad-hilo.ts", "comentar", "comentarios", /insert into com_comments/],
      ["apps/web/lib/comunidad-hilo.ts", "votar", "votos", /select com_votar\(/], ["apps/web/lib/mensajes-vecinos.ts", "enviar", "conversaciones", /insert into dm_threads/],
      ["apps/web/lib/mensajes-vecinos.ts", "reportarConversacion", "reportes", /insert into content_reports/], [MO, "reportar", "reportes", /insert into content_reports/]];
    for (const [f, fn, que, w] of CASOS) {
      const b = cuerpoFn(sinComent(f), fn), iL = b.search(new RegExp(`await limiteDia\\(c, \\w+, "${que}"\\)`)), iW = b.search(w);
      if (iL < 0 || iW < 0 || iL > iW) falla(G, f, 0, `«${fn}» escribe sin pedir antes limiteDia(…, "${que}")`);
      if (/created_at > now\(\) - interval '24 hours'/.test(b) && fn !== "votar") falla(G, f, 0, `«${fn}» cuenta su propio límite de 24 horas (usa limiteDia: día local)`);
    }
    const l = cuerpoFn(sinComent(MO), "limiteDia");
    if (!/pg_advisory_xact_lock\(hashtextextended\(\$1, 0\)\)`, \[`lim:\$\{que\}:\$\{userId\}`\]/.test(l)) falla(G, MO, 0, "limiteDia sin candado por persona y tipo");
    if (!/date_trunc\('day', now\(\) at time zone z\.tz\) at time zone z\.tz/.test(l)) falla(G, MO, 0, "limiteDia debe contar el día local de la ciudad");
    if (!/u\.nueva \? Math\.max\(1, Math\.floor\(u\.tope \/ 2\)\)/.test(l)) falla(G, MO, 0, "limiteDia: la mitad el primer día de la cuenta (§6 #21)");
    const m = readFileSync(M, "utf8");
    for (const k of ["com_lim_publicaciones", "com_lim_comentarios", "com_lim_votos", "com_lim_conversaciones", "com_lim_reportes"]) if (!m.includes(`('${k}', '`)) falla(G, M, 0, `falta el límite ${k} en platform_config`);
  },

  /* 5d (clase: reportes en manada para esconder a alguien). Auto-ocultar cuenta PERSONAS: las cuentas que comparten algún dispositivo (sus
     sesiones o el del reporte) cuentan como una, las cuentas nuevas (edad_h) no cuentan, y el dispositivo del reporte sale de la cookie del
     servidor (nunca del cliente). Nada se oculta solo por otra vía. */
  reportesSinManada() {
    const G = "reportesSinManada", MO = "apps/web/lib/moderacion.ts", AC = "apps/web/app/(app)/comunidad/acciones.ts";
    if (!existsSync(MO)) return;
    const b = cuerpoFn(sinComent(MO), "autoOcultar");
    if (!/array\(select distinct s\.device::text from sessions s where s\.user_id = cr\.reporter_user_id and s\.device is not null\) as devs/.test(b)) falla(G, MO, 0, "autoOcultar debe mirar los dispositivos de cada cuenta que reporta (sesiones)");
    if (!/u\.created_at <= now\(\) - make_interval\(hours => \$3\) as vieja/.test(b) || !/\.filter\(\(x\) => x\.vieja\)/.test(b)) falla(G, MO, 0, "autoOcultar no debe contar cuentas nuevas (edad_h)");
    if (!/padre\[raiz\(i\)\] = raiz\(j\)/.test(b) || !/const peso = \[\.\.\.grupos\.values\(\)\]\.reduce/.test(b) || !/if \(peso < umbral\) return null;/.test(b)) falla(G, MO, 0, "autoOcultar debe unir las cuentas que comparten dispositivo y contar grupos, no reportes");
    const ac = cuerpoFn(sinComent(AC), "comReportar");
    if (!/await dispositivo\(false\)\);/.test(ac)) falla(G, AC, 0, "el dispositivo del reporte sale de la cookie del servidor (dispositivo()), nunca del cliente");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === MO) continue;
      if (/\bset\b[^`;]*hidden_by = 'auto'/.test(sinComent(x))) falla(G, x, 0, "solo autoOcultar (lib/moderacion.ts) oculta «auto»");
    }
  },

  /* ── Fase 5 · Comunidad (5e) ── */
  /* 5e. La cuenta oficial «To'Latino {Ciudad}» no es una persona: la base exige author_user_id null cuando el autor es oficial; solo
     lib/oficial.ts la escribe (insert con 'official', null y el staff_id de quien la escribe, después de revisar rol Admin/Ciudad y su
     ciudad) y nunca crea una fila en users; el muro la arma sin id (no se sigue, no se le escribe, no abre perfil) y con el sello; y
     todo lo que reparta puntos o arme la Tabla (5f) filtra author_kind (nunca gana puntos ni sale en rankings). */
  oficialNoEsPersona() {
    const G = "oficialNoEsPersona", M = "packages/db/migrations/0097_comunidad_base.sql", O = "apps/web/lib/oficial.ts", C = "apps/web/lib/comunidad.ts";
    if (!existsSync(M)) return;
    if (!/check \(\(author_kind = 'official'\) = \(author_user_id is null\)\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "com_posts debe exigir author_user_id null para la cuenta oficial (y solo para ella)");
    if (!existsSync(O)) return falla(G, O, 0, "falta lib/oficial.ts (la cuenta oficial la escribe el equipo)");
    const t = sinComent(O), b = cuerpoFn(t, "publicarOficial"), iP = b.search(/if \(!puedeOficial\(s, ciudad\)\) return no\(/), iW = b.search(/insert into com_posts/);
    if (iP < 0 || iW < 0 || iP > iW) falla(G, O, 0, "publicarOficial escribe sin revisar antes puedeOficial(s, ciudad)");
    if (!/values \(\$1, 'official', null, \$2,/.test(b)) falla(G, O, 0, "la cuenta oficial se escribe con author_kind 'official', author_user_id null y staff_id = quien la escribe");
    if (!/ROLES_OFICIAL = \["admin", "ciudad"\]/.test(t)) falla(G, O, 0, "solo Admin y Ciudad manager escriben como la cuenta oficial");
    if (!/ROLES_OFICIAL\.includes\(s\.role\) && s\.puede\("cont", "editar"\) && \(!ciudad \|\| !s\.cities\.length \|\| s\.cities\.includes\(ciudad\)\)/.test(t)) falla(G, O, 0, "puedeOficial debe mirar el rol, el permiso de Contenido y la ciudad");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const u = sinComent(x);
      if (x === O && /\binsert into users\b/i.test(u)) falla(G, x, 0, "la cuenta oficial nunca crea una fila en users");
      if (x !== O && /insert into com_posts[\s\S]{0,400}'official'/.test(u)) falla(G, x, 0, "solo lib/oficial.ts escribe como la cuenta oficial");
      // 5f: lo que lee el libro de puntos o arma la Tabla va siempre unido a users (la cuenta oficial no tiene fila en users: nunca sale).
      for (const q of u.match(/`[^`]*`/g) ?? []) if (/\bfrom (points_entries|monthly_boards)\b/.test(q) && !/\bjoin users\b/.test(q) && !/^`select 1 from points_entries where rule_key = 'primera_rec'/.test(q)) falla(G, x, 0, "lo que lee el libro de puntos o arma la Tabla debe ir unido a users (la cuenta oficial nunca sale)");
    }
    // 5f · La cuenta oficial nunca gana puntos: el libro y la Tabla piden una persona (users); pts_sumar rechaza sin persona; el voto a lo
    // oficial (sin autor) no llega a sumar.
    const M2 = "packages/db/migrations/0102_puntos_rangos_tabla.sql", PU = "apps/web/lib/puntos.ts";
    if (existsSync(M2)) {
      const m2 = readFileSync(M2, "utf8");
      if (!/create table if not exists points_entries \(\s*id[^\n]*\n\s*user_id\s+uuid not null references users \(id\)/.test(m2)) falla(G, M2, 0, "points_entries.user_id debe ser una persona (not null, users)");
      if (!/create table if not exists monthly_boards \([\s\S]*?user_id\s+uuid not null references users \(id\)/.test(m2)) falla(G, M2, 0, "monthly_boards.user_id debe ser una persona (not null, users)");
      if (!/if uid is null then raise exception 'los puntos son de una persona/.test(ultimaFn("pts_sumar"))) falla(G, M2, 0, "pts_sumar debe rechazar sumar sin persona (la cuenta oficial)");
    }
    if (existsSync(PU)) {
      const v = cuerpoFn(sinComent(PU), "puntosDelVoto"), iA = v.search(/if \(!t\?\.autor\) return null;/), iS = v.search(/sumar\(/);
      if (iA < 0 || iS < 0 || iA > iS) falla(G, PU, 0, "puntosDelVoto: lo de la cuenta oficial (sin autor) no da puntos a nadie");
      if (/staff_id/.test(sinComent(PU))) falla(G, PU, 0, "los puntos nunca van a quien escribió como la cuenta oficial (staff_id)");
    }
    if (existsSync(C)) {
      const a = cuerpoFn(sinComent(C), "armar");
      if (!/oficial \? \{ id: null, nombre: [^}]*foto: SELLO_OFICIAL, rango: 0, oficial: true \}/.test(a)) falla(G, C, 0, "armar(): la cuenta oficial sale sin id (no se sigue ni se le escribe), con el sello y sin rango");
    }
    const MU = "apps/web/app/(app)/comunidad/Muro.tsx";
    if (existsSync(MU) && !/onAuthor=\{p\.autor\.id && !p\.autor\.oficial \?/.test(sinComent(MU))) falla(G, MU, 0, "tocar a la cuenta oficial no abre un perfil de persona");
  },

  /* 5e. Hoy en el barrio solo muestra lo que está en vivo: la regla vive en la base (post_en_hoy = post_en_vivo + para todos + < 24 h + no
     retirada de Hoy; post_en_vivo = live, no oculta, ya publicada, sin vencer, negocio activo Pro con Novedades encendido y sin pausa) y
     toda consulta de Hoy (lib/hoy.ts, el Super Admin) la usa. Al revés: quitar post_en_hoy de una consulta o una condición de la regla →
     falla. */
  hoySoloEnVivo() {
    const G = "hoySoloEnVivo", H = "apps/web/lib/hoy.ts";
    const vivo = ultimaFn("post_en_vivo"), hoy = ultimaFn("post_en_hoy");
    if (!hoy) return falla(G, "packages/db/migrations", 0, "falta post_en_hoy (la regla de Hoy en el barrio vive en la base)");
    for (const [re, que] of [[/post_en_vivo\(p\)/, "en vivo"], [/p\.audience = 'all'/, "para todos (no «solo seguidores»)"], [/p\.hoy_off_at is null/, "no retirada de Hoy"], [/p\.publish_at > now\(\) - interval '24 hours'/, "menos de 24 h"]])
      if (!re.test(hoy)) falla(G, "packages/db/migrations", 0, `post_en_hoy sin «${que}»`);
    for (const [re, que] of [[/p\.status = 'live'/, "no detenida"], [/p\.hidden_at is null/, "no oculta"], [/p\.publish_at <= now\(\)/, "ya publicada"], [/p\.ends_at is null or p\.ends_at > now\(\)/, "sin vencer"],
      [/s\.plan = 'pro'/, "negocio Pro (no Free)"], [/b\.status = 'active'/, "negocio activo"], [/'nov' = any\(b\.modules_on\) and not \(b\.modules_off \? 'nov'\)/, "Novedades encendido y sin pausa de To'Latino"],
      // 6b: la novedad con enlace a un evento sale solo con el evento en vivo (una fecha listable que no terminó, del mismo negocio).
      [/p\.link_kind <> 'event' or exists \(select 1 from event_dates d join events e on e\.id = d\.event_id\s+where d\.event_id = p\.event_id and e\.business_id = p\.business_id and d\.listable and d\.ends_at > now\(\)\)/, "evento en vivo (link_kind 'event')"]])
      if (!re.test(vivo)) falla(G, "packages/db/migrations", 0, `post_en_vivo sin «${que}»`);
    if (!existsSync(H)) return falla(G, H, 0, "falta lib/hoy.ts");
    const t = sinComent(H);
    for (const fn of ["hoyEnElBarrio", "quedanEnHoy", "avisarHoyGuardados"]) {
      const b = cuerpoFn(t, fn);
      if (!b) { falla(G, H, 0, `falta ${fn}()`); continue; }
      for (const q of b.match(/`[^`]*`/g) ?? []) if (/from business_posts\b/.test(q) && !/post_en_hoy\(/.test(q)) falla(G, H, 0, `«${fn}» lee novedades para Hoy sin post_en_hoy()`);
    }
    const A = "apps/web/lib/admin-contenido.ts";
    if (existsSync(A)) { const h = cuerpoFn(sinComent(A), "hoyAdmin"); if (!/post_en_hoy\(p\) as "enHoy"/.test(h) || !/\n\s*where [\s\S]*\(post_en_hoy\(p\) or p\.hoy_off_at is not null\)/.test(h)) falla(G, A, 0, "«hoyAdmin» debe usar post_en_hoy() para decir qué está en Hoy (y para filtrar)"); }
    // Nadie más arma Hoy por su cuenta: una consulta que mira hoy_off_at también usa post_en_hoy().
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === H) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/hoy_off_at is null/.test(q) && !/post_en_hoy\(/.test(q)) falla(G, x, 0, "consulta de Hoy en el barrio sin post_en_hoy()");
    }
  },

  /* 5e. Buscar › Vecinos solo con cuenta: buscarVecinos() no lee nada sin quien mira y pasa por sinBloqueos(); quien la llama lo hace con
     la sesión (u.id, después de revisar que hay sesión); la búsqueda en vivo (/api/buscar) nunca lee publicaciones de vecinos; la
     pestaña «vec» no existe sin sesión. */
  buscarVecinosConSesion() {
    const G = "buscarVecinosConSesion", L = "apps/web/lib/comunidad-portada.ts", P = "apps/web/app/(app)/buscar/page.tsx";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/comunidad-portada.ts");
    const b = cuerpoFn(sinComent(L), "buscarVecinos");
    if (!/export async function buscarVecinos\(viewer: string,[^\n]*\n\s*if \(!viewer \|\| !consulta\) return \{ items: \[\], mas: null, total: 0 \};/.test(b)) falla(G, L, 0, "buscarVecinos debe empezar devolviendo nada sin quien mira");
    if (!/w: string\[\] = \[[^\]]*sinBloqueos\("p\.author_user_id", "\$1"\)/.test(b)) falla(G, L, 0, "buscarVecinos sin sinBloqueos()");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === L) continue;
      const t = sinComent(x);
      if (/^apps\/web\/app\/api\/buscar\//.test(x) && /buscarVecinos|comunidad-portada|lib\/comunidad|from com_posts|com_comments/.test(t)) falla(G, x, 0, "la búsqueda en vivo no lee publicaciones de vecinos");
      for (const m of t.matchAll(/buscarVecinos\(([^,]*),/g)) {
        if (m[1].trim() !== "u.id") falla(G, x, 0, "buscarVecinos se llama con la sesión (u.id)");
        const antes = t.slice(Math.max(0, m.index - 400), m.index);
        if (!/\bu && [^\n]*$/.test(antes) && !/if \(!u\) return/.test(antes)) falla(G, x, 0, "buscarVecinos sin revisar antes que hay sesión");
      }
    }
    if (existsSync(P) && !/sp\.tab === "vec" && u \? "vec"/.test(sinComent(P))) falla(G, P, 0, "la pestaña Vecinos no existe sin sesión");
  },

  /* 5g. Las monedas no son dinero (§3, §6 #3): no se compran, no se venden, no se transfieren entre personas, no se cambian por dinero ni
     por saldo y no vencen. En el código de las monedas y los cupones no hay pagos, pasarela, Stripe, monedero, centavos, precio, compra
     de monedas, transferencias ni retiros; el libro no tiene columnas de dinero ni motivos de compra o transferencia; los dos libros
     (puntos y monedas) no se mezclan; y la pantalla del vecino y el Super Admin dicen «Sin valor en dinero». */
  monedasSinDinero() {
    const G = "monedasSinDinero", M = "packages/db/migrations/0103_monedas_cupones.sql";
    if (!existsSync(M)) return;
    const ARCH = ["apps/web/lib/monedas.ts", "apps/web/lib/monedas-comun.ts", "apps/web/lib/cupones.ts", "apps/web/app/panel/acciones-cupones.ts", "apps/web/app/panel/CuponesPanel.tsx",
      "apps/web/app/(app)/comunidad/monedas/Monedas.tsx", "apps/web/app/(app)/comunidad/monedas/page.tsx"];
    const DINERO = /\b(payments?|pasarela|stripe|wallet\w*|monedero|\w*_cents|cents|precio|price|pagar|pago|cobro|comprar monedas|buy coins|compra de monedas|transferir|transfer\w*|cash ?out|retirar|retiro|withdraw\w*|venta de monedas|sell coins)\b/i;
    for (const f of ARCH) {
      if (!existsSync(f)) { falla(G, f, 0, "falta el archivo de monedas o cupones"); continue; }
      sinComent(f).split("\n").forEach((l, i) => { const m = DINERO.exec(l); if (m) falla(G, f, i + 1, `«${m[0]}» junto a las monedas: no tienen valor en dinero (ni pagos, ni compra, ni transferencia, ni retiro)`); });
      if (/points_entries|pts_sumar|pts_ajustar/.test(sinComent(f))) falla(G, f, 0, "puntos y monedas son dos libros que nunca se mezclan");
    }
    const sql = readFileSync(M, "utf8").replace(/--.*$/gm, "");
    { const m = DINERO.exec(sql); if (m) falla(G, M, 0, `«${m[0]}» en la migración de monedas: las monedas no tienen valor en dinero`); }
    const tabla = /create table if not exists coin_entries \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
    if (!tabla) falla(G, M, 0, "falta el libro coin_entries");
    if (/amount|money|cents|payment|wallet|to_user|from_user|recipient|destino/i.test(tabla)) falla(G, M, 0, "el libro de monedas no tiene columnas de dinero ni de otra persona (no se transfieren)");
    if (!/reason_key\s+text not null check \(reason_key in \('welcome', 'premio_mes', 'canje', 'devolucion', 'ajuste'\)\)/.test(tabla)) falla(G, M, 0, "los motivos del libro son solo bienvenida, premio del mes, canje, devolución y ajuste (sin compra, venta ni transferencia)");
    if (/create or replace function mon_(transferir|enviar|regalar|comprar|vender|cambiar|retirar)/i.test(sql)) falla(G, M, 0, "no hay funciones para transferir, comprar, vender o retirar monedas");
    if (/references (payments|wallet_entries)/.test(sql)) falla(G, M, 0, "monedas y cupones no se enlazan con pagos ni con el monedero");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/coin_entries/.test(t) && /\b(payments|wallet_entries)\b/.test(t) && !/^apps\/web\/(app\/admin|lib\/admin)/.test(x)) falla(G, x, 0, "un mismo archivo toca monedas y dinero: las monedas no se cambian por dinero ni por saldo");
      if (/comprar monedas|buy coins|monedas en venta|coins for sale/i.test(t)) falla(G, x, 0, "las monedas nunca se compran");
    }
    // La pantalla del vecino y el Super Admin lo dicen siempre.
    const C = "apps/web/lib/monedas-comun.ts", V = "apps/web/app/(app)/comunidad/monedas/Monedas.tsx", A = "apps/web/app/admin/Gamificacion.tsx";
    if (existsSync(C) && !/export const SIN_VALOR: Bi = \{ es: "Sin valor en dinero", en: "No cash value" \}/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "SIN_VALOR dice «Sin valor en dinero» / «No cash value»");
    if (existsSync(V) && !/\{t\(SIN_VALOR\)\.toUpperCase\(\)\}/.test(sinComent(V))) falla(G, V, 0, "la pantalla de monedas muestra «Sin valor en dinero» junto al saldo");
    if (existsSync(A) && !/v: SIN_VALOR\.es, s: "no se compran ni se cambian"/.test(sinComent(A))) falla(G, A, 0, "el Super Admin › Monedas muestra VALOR «Sin valor en dinero»");
  },

  /* 5g. Un código se usa una sola vez y la última unidad no se vende dos veces: cup_canjear bloquea el cupón antes de contar el cupo del
     mes, revisa «uno por persona» y gasta antes de crear el código (misma transacción); un índice único impide dos códigos vivos de la
     misma persona y cupón; cup_validar bloquea el código y solo pasa de emitido a usado una vez; el trigger no deja que un código usado o
     vencido cambie; solo lib/cupones.ts llama a cup_*; el costo en monedas solo lo escribe el equipo (acciones-gam.ts), nunca el negocio. */
  cuponUnaVez() {
    const G = "cuponUnaVez", M = "packages/db/migrations/0103_monedas_cupones.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8"), K = ultimaFn("cup_canjear"), V = ultimaFn("cup_validar"), U = ultimaFn("cup_vencer_uno"), GR = ultimaFn("coupon_redemptions_guardia");
    const iL = K.search(/where c\.id = cid for update of c;/), iC = K.search(/select count\(\*\) into usados from coupon_redemptions/), iS = K.search(/if usados >= cp\.monthly_stock then raise exception/),
      iU = K.search(/r\.status in \('issued', 'used'\)\) then raise exception 'cupon ya canjeado'/), iG = K.search(/e := mon_gastar\(uid, cp\.cost_coins/), iI = K.search(/insert into coupon_redemptions/);
    if (iL < 0 || iC < 0 || iL > iC) falla(G, M, 0, "cup_canjear debe bloquear el cupón («for update») antes de contar el cupo del mes");
    if (iS < 0 || iS < iC) falla(G, M, 0, "cup_canjear: con el cupo del mes lleno no se canjea");
    if (iU < 0 || iU > iG) falla(G, M, 0, "cup_canjear: uno por persona (vivo o usado) antes de gastar");
    if (iG < 0 || iI < 0 || iG > iI) falla(G, M, 0, "cup_canjear: gastar las monedas antes de crear el código, en la misma transacción");
    if (!/create unique index if not exists coupon_redemptions_uno on coupon_redemptions \(coupon_id, user_id\) where status in \('issued', 'used'\)/.test(m)) falla(G, M, 0, "falta el índice único: una persona no tiene dos códigos vivos del mismo cupón");
    if (!/code\s+text not null unique check \(code ~ '\^TL-CQ-\[2-9A-HJ-NP-Z\]\{4,6\}\$'\)/.test(m)) falla(G, M, 0, "el código TL-CQ-xxxx es único y sin 0/O/1/I");
    if (!/select \* into r from coupon_redemptions where code = upper\(btrim\(cod\)\) for update;/.test(V) || !/if r\.id is null or r\.business_id <> negocio then/.test(V)) falla(G, M, 0, "cup_validar: el código bloqueado y solo del negocio del cupón");
    const iUs = V.search(/if r\.status = 'used' then/), iUp = V.search(/update coupon_redemptions set status = 'used'[^;]*where id = r\.id and status = 'issued'/);
    if (iUs < 0 || iUp < 0 || iUs > iUp) falla(G, M, 0, "cup_validar: un código usado no se usa otra vez (y solo pasa de emitido a usado)");
    if (!/if old\.status <> 'issued' then raise exception 'un código usado o vencido no cambia'/.test(GR)) falla(G, M, 0, "el trigger no deja que un código usado o vencido cambie");
    if (!/if r\.id is null or r\.status <> 'issued' or r\.expires_at > now\(\) then return 0; end if;/.test(U) || !/n := mon_devolver\(r\.coin_entry_id, 'vencido'\);/.test(U)) falla(G, M, 0, "cup_vencer_uno: solo un código emitido y vencido, y las monedas vuelven");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\bcup_(canjear|validar|vencer)\(/.test(q) && x !== "apps/web/lib/cupones.ts") falla(G, x, 0, "canjear, validar y vencer cupones pasan solo por lib/cupones.ts");
        if ((/\bupdate coupons\b[\s\S]*\bcost_coins\s*=/.test(q) || /\binsert into coupons\b[^)]*cost_coins/.test(q)) && x !== "apps/web/app/admin/acciones-gam.ts") falla(G, x, 0, "el costo en monedas de un cupón lo fija solo To'Latino (acciones-gam.ts)");
      }
    }
    const P = "apps/web/app/panel/acciones-cupones.ts";
    if (existsSync(P) && /\b(costo|cost|cost_coins)\b/.test(sinComent(P).replace(/"[^"\n]*"/g, ""))) falla(G, P, 0, "el panel del negocio no recibe ni escribe el costo en monedas");
  },

  /* 5h. El texto de los vecinos nunca sale de nuestros servidores (§3 «Traducción», D3): ningún traductor de terceros (Google, DeepL,
     Microsoft, Yandex, MyMemory, el LibreTranslate público) en ningún código ni dependencia; ningún modelo de lenguaje externo en un
     archivo que traduce; la única dirección de traducción es TRADUCTOR_URL, que lee solo lib/traductor.ts (sin direcciones escritas a
     mano y sin otro fetch que el de esa base) y que el compose apunta al servicio interno (http://traductor:5000). */
  traduccionPropia() {
    const G = "traduccionPropia", TD = "apps/web/lib/traductor.ts", TR = "apps/web/lib/traduccion.ts", C = "infra/pruebas/docker-compose.yml";
    if (!existsSync(TD)) return;
    const TERCEROS = /translat(e|ion)\.googleapis\.com|translate\.google\.[a-z.]+\/(translate_a|m\?)|api(-free)?\.deepl\.com|microsofttranslator\.com|translator\.azure|translate\.yandex|mymemory\.translated\.net|libretranslate\.(com|de|org)|translate\.argosopentech\.com|api\.reverso\.net|papago\.naver/i;
    const LLM = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.cohere\.(ai|com)/i;
    const PAQ = /"(@google-cloud\/translate|deepl-node|deepl|@vitalets\/google-translate-api|google-translate-api[\w-]*|translate|bing-translate-api|@iamtraction\/google-translate|libretranslate)"\s*:/;
    for (const f of archivos) {
      if (f.startsWith("guardianes/") || f.startsWith("pruebas/alreves/") || f.startsWith("docs/") || !/\.(tsx?|jsx?|mjs|cjs|sh|ya?ml|json|py|conf)$/.test(f)) continue;
      const t = readFileSync(f, "utf8");
      t.split("\n").forEach((l, i) => { const m = TERCEROS.exec(l); if (m) falla(G, f, i + 1, `«${m[0]}»: un traductor de terceros; el texto de los vecinos no sale de nuestros servidores`); });
      if (/traduc|translat/i.test(t) && LLM.test(t)) falla(G, f, 0, `«${LLM.exec(t)[0]}» en un archivo que traduce: la traducción es propia (un modelo pago es decisión del fundador, §6 #15)`);
      if (/(^|\/)package\.json$/.test(f) && PAQ.test(t)) falla(G, f, 0, `dependencia de traducción de terceros (${PAQ.exec(t)[1]})`);
    }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/TRADUCTOR_URL/.test(t) && x !== TD) falla(G, x, 0, "TRADUCTOR_URL solo la lee lib/traductor.ts");
      if (x !== TD && /fetch\([^)]*["'`/](translate|detect)\b/.test(t)) falla(G, x, 0, "solo lib/traductor.ts le habla al traductor");
    }
    const d = sinComent(TD);
    if (!/const base = \(\) => \(process\.env\.TRADUCTOR_URL \?\? ""\)/.test(d)) falla(G, TD, 0, "la dirección del traductor sale solo de TRADUCTOR_URL");
    if (/https?:\/\//.test(d)) falla(G, TD, 0, "lib/traductor.ts no lleva direcciones escritas a mano");
    for (const m of d.matchAll(/fetch\(([^,)]*)/g)) if (!/^b \+ /.test(m[1])) falla(G, TD, 0, `fetch(${m[1]}) no usa la base de TRADUCTOR_URL`);
    if (existsSync(TR) && (/fetch\(/.test(sinComent(TR)) || !/from "\.\/traductor"/.test(sinComent(TR)))) falla(G, TR, 0, "lib/traduccion.ts traduce solo con lib/traductor.ts (sin fetch propio)");
    if (existsSync(C) && !/\n      TRADUCTOR_URL: http:\/\/traductor:5000\n/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "la app apunta TRADUCTOR_URL al servicio interno (http://traductor:5000)");
  },

  /* 5h. El traductor va en su propio perfil del compose y deploy.sh lo enciende APARTE con `|| true` (lección de 5d: un servicio que no
     se puede bajar o construir no frena el despliegue de la app). Imagen con versión exacta, solo español e inglés, sin actualizar
     modelos solo, memoria acotada, sin puertos hacia afuera y solo en la red interna (sin salida a internet). */
  traductorEnPerfil() {
    const G = "traductorEnPerfil", C = "infra/pruebas/docker-compose.yml", D = "infra/pruebas/deploy.sh";
    if (!existsSync(C) || !existsSync(D)) return;
    const c = readFileSync(C, "utf8").replace(/^\s*#.*$/gm, ""), d = readFileSync(D, "utf8");
    const bloque = (n) => { const i = c.search(new RegExp(`\\n  ${n}:\\n`)); if (i < 0) return ""; const r = c.slice(i + 1); const j = r.slice(3).search(/\n  [a-z][\w-]*:\n|\n[a-z]/); return j < 0 ? r : r.slice(0, j + 3); };
    const T = bloque("traductor"), M = bloque("traductor-modelos");
    if (!T) { falla(G, C, 0, "falta el servicio «traductor»"); return; }
    for (const [b, n] of [[T, "traductor"], [M, "traductor-modelos"]]) {
      if (!b) { falla(G, C, 0, `falta el servicio «${n}»`); continue; }
      if (!/\n    profiles: \["traductor"\]\n/.test(b)) falla(G, C, 0, `«${n}» va en su perfil propio (profiles: ["traductor"])`);
      if (!/\n    image: libretranslate\/libretranslate:v\d+\.\d+\.\d+\n/.test(b)) falla(G, C, 0, `«${n}»: imagen con versión exacta (nunca latest ni sin etiqueta)`);
      if (/\n    ports:/.test(b)) falla(G, C, 0, `«${n}» no publica puertos: solo la app le habla`);
      if (!/\n    mem_limit: \d+[mg]\n/.test(b)) falla(G, C, 0, `«${n}» con memoria acotada (mem_limit)`);
      if (/\n    build:/.test(b)) falla(G, C, 0, `«${n}» usa la imagen publicada, sin construir`);
    }
    const img = (b) => /\n    image: (\S+)\n/.exec(b)?.[1];
    if (M && img(M) !== img(T)) falla(G, C, 0, "los modelos se bajan con la misma imagen del traductor");
    if (!/\n    networks: \[interna\]\n/.test(T)) falla(G, C, 0, "el traductor vive solo en la red «interna»");
    if (!/\n  interna:\n    internal: true\n/.test(c)) falla(G, C, 0, "la red «interna» es internal: true (sin salida a internet)");
    if (!/\n      LT_LOAD_ONLY: es,en\n/.test(T) || !/\n      LT_UPDATE_MODELS: "false"\n/.test(T)) falla(G, C, 0, "solo los modelos español e inglés, sin actualizarlos solo (LT_LOAD_ONLY: es,en · LT_UPDATE_MODELS: \"false\")");
    if (!/--load_only_lang_codes es,en/.test(M)) falla(G, C, 0, "traductor-modelos baja solo español e inglés");
    if (!/\n      - traductor-modelos:\/home\/libretranslate\/\.local\n/.test(T)) falla(G, C, 0, "los modelos viven en un volumen (un reinicio no los vuelve a bajar)");
    const web = bloque("web");
    if (!/\n    networks: \[default, interna\]\n/.test(web)) falla(G, C, 0, "la app está en «default» y en «interna» (para hablarle al traductor)");
    if (/\n      traductor:/.test(web)) falla(G, C, 0, "la app no espera al traductor para arrancar (sin depends_on)");
    if (!/COMPOSE_TRAD=\(docker compose [^)]*--profile traductor\)/.test(d)) falla(G, D, 0, "deploy.sh enciende el traductor con su perfil (COMPOSE_TRAD … --profile traductor)");
    if (!/\n  systemd-run --unit tolatino-traductor --collect [^\n]*traductor-modelos && [^\n]*up -d traductor[^\n]*\|\| true\n/.test(d)) falla(G, D, 0, "deploy.sh baja los modelos y enciende el traductor APARTE (systemd-run … || true)");
    for (const l of d.split("\n")) if (/(^docker compose |COMPOSE\[@\]\}"? ).*up -d --build/.test(l) && /--profile/.test(l)) falla(G, D, 0, "el despliegue de la app no enciende perfiles: cada uno va aparte");
  },

  /* 5h. El Super Admin ve siempre el original (§4 5h): nada del Super Admin traduce ni lee la caché de traducciones; lo que ve es el texto
     tal como lo escribió la persona (para moderar, decidir y auditar). Solo puede ver si el traductor responde y su tope. */
  adminVeOriginal() {
    const G = "adminVeOriginal";
    if (!existsSync("apps/web/lib/traduccion.ts")) return;
    for (const x of codigo) {
      if (!/^apps\/web\/(app\/admin\/|lib\/admin[^/]*\.ts$)/.test(x)) continue;
      const t = sinComent(x), m = /useTraducir|verTraduccion|LineaTr|acciones-traducir|Traducir"|traduccion"|ugc_translations|\btraducir\(|traducirTexto/.exec(t);
      if (m) falla(G, x, 0, `«${m[0]}» en el Super Admin: el equipo ve siempre el original`);
    }
    // Y al revés: las pantallas de la Comunidad y de reseñas sí lo ofrecen (lo de los vecinos, en su idioma con «Ver traducción»).
    for (const [f, re] of [["apps/web/app/(app)/comunidad/Tarjeta.tsx", /translate=\{t\.translate\}/], ["apps/web/app/(app)/comunidad/p/[id]/Hilo.tsx", /translate: t\.translate/], ["apps/web/app/(app)/n/[id]/Resenas.tsx", /translate: tb\.translate/], ["apps/web/app/(app)/n/[id]/Novedades.tsx", /<LineaTr t=\{t\.translate\}/]])
      if (existsSync(f) && !re.test(sinComent(f))) falla(G, f, 0, "esta pantalla de vecinos ofrece «Ver traducción»");
  },

  /* 5h. Nunca la red dentro de una transacción: detectar el idioma o traducir se llama ANTES de abrir tx() (publicar no retiene la base
     esperando al traductor), y todo lo que publica texto de una persona guarda su idioma detectado (para «Ver traducción»). */
  traductorFueraDeTx() {
    const G = "traductorFueraDeTx";
    if (!existsSync("apps/web/lib/traductor.ts")) return;
    for (const x of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(x) || x === "apps/web/lib/traductor.ts") continue;
      const t = sinComent(x);
      if (!/detectarIdioma\(|traducirTexto\(/.test(t)) continue;
      for (const p of t.split(/\n(?=(?:export )?(?:async )?function )/)) {
        const iT = p.search(/\btx\(/), iD = p.search(/detectarIdioma\(|traducirTexto\(/);
        if (iD >= 0 && iT >= 0 && iD > iT) falla(G, x, 0, `«${p.slice(0, p.indexOf("(")).replace(/^(export )?(async )?function /, "")}» llama al traductor dentro de una transacción`);
      }
    }
    for (const [f, fns] of [["apps/web/lib/comunidad.ts", ["publicar", "editar"]], ["apps/web/lib/comunidad-hilo.ts", ["comentar"]], ["apps/web/lib/resenas.ts", ["guardarResena", "responderResena"]], ["apps/web/lib/novedades.ts", ["comentarPost"]]]) {
      if (!existsSync(f)) continue;
      const t = sinComent(f);
      for (const fn of fns) if (!/detectarIdioma\(/.test(cuerpoFn(t, fn))) falla(G, f, 0, `«${fn}» guarda texto sin detectar su idioma (detectarIdioma)`);
    }
  },

  /* ── Fase 5 · 5i ── Configuración: un solo lugar, con límites; analítica sin personas; el lote nunca toca la cuenta oficial. */
  /* 5i (clase: un plazo copiado en dos lugares que se desincronizan; un valor leído sin límites). Las claves del catálogo (config_keys de
     0105) se leen SOLO con lib/config.ts (valor/valores/cfgSql → cfg_int de la base) y se escriben SOLO con cambiarConfig: ninguna consulta
     fuera de lib/config.ts toca platform_config con una clave del catálogo, una clave en variable ($n, any(...)) o una clave armada; el
     tipo ClaveConfig es exactamente el catálogo; y el código de la Comunidad no guarda copias de esos valores (30 min de editar, 14 días
     de apelar, 60 traducciones, 7 PM del resumen, 1·3·7 días de encuesta, 30 días del cupón, límites del día). Al revés: devolver una
     constante o leer platform_config directo → falla. */
  configDesdeUnLugar() {
    const G = "configDesdeUnLugar", K = "packages/db/migrations/0105_configuracion_comunidad.sql", CF = "apps/web/lib/config.ts";
    if (!existsSync(K)) return;
    // 6a: el catálogo crece en migraciones nuevas (0106 · Eventos): se leen todas las que insertan en config_keys.
    const claves = catalogoConfig().map((x) => x.k);
    if (claves.length < 10) return falla(G, K, 0, "no encuentro el catálogo config_keys");
    if (!existsSync(CF)) return falla(G, CF, 0, "falta lib/config.ts (el único lector de la configuración)");
    const tipo = /export type ClaveConfig =([\s\S]*?);/.exec(sinComent(CF))?.[1] ?? "", enTipo = new Set([...tipo.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]));
    for (const k of claves) if (!enTipo.has(k)) falla(G, CF, 0, `ClaveConfig no tiene «${k}» del catálogo`);
    for (const k of enTipo) if (!claves.includes(k)) falla(G, CF, 0, `ClaveConfig tiene «${k}», que no está en config_keys`);
    const CAT = new RegExp(`'(${claves.join("|")})'`);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === CF) continue;
      const t = sinComent(x);
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (!/platform_config/.test(q)) continue;
        if (CAT.test(q) || /key = (\$\d|any\()|key = '\$\{/.test(q)) falla(G, x, 0, "lee o escribe platform_config para una clave de Configuración: usa valor()/cfgSql()/cambiarConfig() de lib/config.ts");
      }
    }
    const COM = (x) => /^apps\/web\/lib\/(comunidad[^/]*|moderacion[^/]*|apelaciones|traduccion|cupones|oficial|evt-publico|rsvp)\.ts$/.test(x) || /^apps\/web\/app\/\(puerta\)\//.test(x) || x === "apps/web/app/panel/EventosPuerta.tsx" || /^apps\/web\/app\/\(app\)\/eventos\/(?!publicar\/)/.test(x) || /^apps\/web\/app\/\(app\)\/(comunidad|cuenta\/avisos|cuenta\/moderacion)\//.test(x)
      || /^apps\/web\/app\/admin\/(ColasComunidad|Confianza|AutoModeracion|HoyAdmin|Contenido|Notificaciones)\.tsx$/.test(x) || x === "apps/web/app/panel/CuponesPanel.tsx";
    const COPIAS = [[/\b30 min(utos|utes)?\b/i, "los minutos para editar (com_editar_min)"], [/(apela[rn]?|apelaci[oó]n|appeal)[^"`\n]{0,24}\b14 (d[ií]as|days)/i, "los días para apelar (com_apelar_dias)"],
      [/\b60 (traducciones|translations)\b|de f[aá]brica: 60\b/i, "las traducciones por hora (com_traduccion_hora)"], [/A LAS 7 PM|AT 7 PM/, "la hora del resumen (com_resumen_hora)"],
      [/\bDIAS_ENCUESTA\b|\[1, 3, 7\]\.map|\bEDITAR_MIN\b|\bFILA_VIVA_MIN\b/, "una constante de un plazo de Configuración"], [/dias: 30\b|diasDef \?\? 30\b/, "los días del cupón (cup_dias_def)"],
      [/\bdef: \d+/, "el valor de fábrica de un límite (vive en config_keys)"],
      // 6j · la ventana de la puerta (puerta_ventana_h), el apartado (evt_apartado_min) y el recordatorio (evt_recordatorio_hora) que dice un texto.
      [/(modo puerta|door mode)[^"`\n]{0,40}\b\d+ (horas?|hours?)\b/i, "las horas de la ventana de la puerta (puerta_ventana_h)"], [/\bpor \d+ minutos mientras pagas|for \d+ minutes while you pay/i, "los minutos del apartado (evt_apartado_min)"],
      [/DESDE LAS \d+ (AM|PM)|desde las 10 AM/, "la hora del recordatorio (evt_recordatorio_hora)"], [/\b(10|100|500|20) (publicaciones|comentarios|votos|reportes) al d[ií]a/i, "un límite del día (com_lim_*)"]];
    for (const x of codigo) {
      if (!COM(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { for (const [re, que] of COPIAS) if (re.test(l)) falla(G, x, i + 1, `copia de ${que}: léelo de Configuración (lib/config.ts)`); });
    }
  },

  /* 5i. Cada valor de Configuración tiene límites y el servidor rechaza lo que se sale: el catálogo pide min < max y el de fábrica dentro;
     la base rechaza en platform_config un valor fuera de [min, max] o no entero (trigger); cambiarConfig revisa clave, que se cambie ahí,
     entero y límites ANTES de escribir, y deja la auditoría antes → después en la misma transacción; solo un Admin cambia desde
     Configuración. Al revés: quitar una revisión o poner un de fábrica fuera de sus límites → falla. */
  configConLimites() {
    const G = "configConLimites", K = "packages/db/migrations/0105_configuracion_comunidad.sql", CF = "apps/web/lib/config.ts", AC = "apps/web/app/admin/acciones-config.ts";
    if (!existsSync(K)) return;
    const m = readFileSync(K, "utf8");
    if (!/min\s+numeric not null,\s*\n\s*max\s+numeric not null,\s*\n\s*def\s+numeric not null,/.test(m) || !/check \(min < max\),\s*\n\s*check \(def >= min and def <= max\)/.test(m)) falla(G, K, 0, "config_keys debe exigir min, max y def con min < max y def dentro");
    for (const x of catalogoConfig()) if (!(x.a < x.b && x.d >= x.a && x.d <= x.b)) falla(G, x.f, 0, `«${x.k}»: de fábrica ${x.d} fuera de ${x.a}–${x.b}`);
    const tr = /create or replace function platform_config_limites\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/if v < c\.min or v > c\.max then raise exception/.test(tr) || !/v <> trunc\(v\) then raise exception/.test(tr) || !/create trigger platform_config_limites before insert or update on platform_config/.test(m))
      falla(G, K, 0, "la base debe rechazar en platform_config un valor fuera de sus límites o no entero (trigger platform_config_limites)");
    if (!/greatest\(c\.min, least\(c\.max, coalesce\(v, c\.def\)\)\)/.test(ultimaFn("cfg_int"))) falla(G, K, 0, "cfg_int debe acotar el valor a [min, max] y usar el de fábrica si no hay fila");
    if (!existsSync(CF)) return;
    const b = cuerpoFn(sinComent(CF), "cambiarConfig"), iW = b.search(/insert into platform_config/);
    for (const [re, que] of [[/if \(!x\.editable\) return/, "que se pueda cambiar aquí"], [/if \(x\.edit_in && o\.desde !== x\.edit_in\) return/, "que se cambie en su pantalla"],
      [/!Number\.isInteger\(v\)\) return/, "que sea un entero"], [/if \(v < x\.min \|\| v > x\.max\) return/, "los límites"]]) {
      const i = b.search(re);
      if (i < 0 || iW < 0 || i > iW) falla(G, CF, 0, `cambiarConfig escribe sin revisar antes ${que}`);
    }
    const iA = b.search(/await auditar\(c, \{ actor, action: "config\.cambiar"/);
    if (iA < 0 || iA < iW || !/before: \{ \[x\.label\.es\]: conUnidad\(k, x\.antes, x\.unit\) \}, after: \{ \[x\.label\.es\]: conUnidad\(k, v, x\.unit\) \}/.test(b)) falla(G, CF, 0, "cambiarConfig debe dejar la auditoría con antes → después en la misma transacción");
    if (existsSync(AC)) {
      const a = cuerpoFn(sinComent(AC), "configCambiar"), i1 = a.search(/s\.role !== "admin"/), i2 = a.search(/cambiarConfig\(/);
      if (i1 < 0 || i2 < 0 || i1 > i2) falla(G, AC, 0, "solo un Admin cambia la configuración (revisar el rol antes de cambiarConfig)");
    }
  },

  /* 5i. Analítica › Comunidad nunca muestra personas: comunidadAnalitica solo lee las vistas por ciudad y día de 0105, cuántos por rango
     (com_activos_por_rango) y nombres de ciudades, rangos y negocios; ninguna columna de una persona. Las vistas no sacan columnas de
     personas. Al revés: unir users o pedir author_user_id → falla. */
  analiticaSinPersonas() {
    const G = "analiticaSinPersonas", A = "apps/web/lib/admin-analitica.ts", K = "packages/db/migrations/0105_configuracion_comunidad.sql", UI = "apps/web/app/admin/Analitica.tsx";
    if (!existsSync(A) || !existsSync(K)) return;
    const b = cuerpoFn(sinComent(A), "comunidadAnalitica");
    if (!b) return falla(G, A, 0, "falta comunidadAnalitica");
    const OK = new Set(["com_analitica_dia", "com_analitica_dia_cache", "com_activos_cache", "com_canjes_negocio_dia", "com_activos_por_rango", "cities", "ranks"]); // 9b-3: el derivado por ciudad y día (0133)
    for (const [, t] of b.matchAll(/\b(?:from|join)\s+([a-z_]+)/g)) if (!OK.has(t)) falla(G, A, 0, `comunidadAnalitica lee «${t}»: solo las vistas sin personas de 0105`);
    const P = /\b(user_id|author_user_id|reporter_user_id|promoter_user_id|first_name|last_name|phone|nick|photo_url|email)\b/;
    if (P.test(b)) falla(G, A, 0, `comunidadAnalitica pide «${P.exec(b)[0]}»: nunca personas`);
    const m = readFileSync(K, "utf8"), v = /create or replace view com_canjes_negocio_dia as([\s\S]*?);/.exec(m)?.[1] ?? "", d = /\nselect d\.city_id, d\.dia,([\s\S]*?)\n  from d /.exec(m)?.[1] ?? "";
    if (!v || !d) falla(G, K, 0, "no encuentro las vistas de la analítica de la Comunidad");
    if (P.test(v) || P.test(d)) falla(G, K, 0, "una vista de la analítica de la Comunidad saca una columna de una persona");
    if (!/returns table \(rango smallint, activos integer\)/.test(m)) falla(G, K, 0, "com_activos_por_rango devuelve solo rango y cuántos");
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), i = u.indexOf('d.tab === "com"'), j = u.indexOf("} else if", i + 10); if (i >= 0 && /admin\/usuarios|\.uid\b/.test(u.slice(i, j))) falla(G, UI, 0, "Analítica › Comunidad no lleva a personas"); }
    // 6j · Analítica › Eventos: solo las vistas de 0115 (por ciudad, día local y formato), nombres de formatos y ciudades; un organizador es un
    // negocio (evt_ventas_negocio_dia). Las vistas no sacan columnas de personas (evt_senales sí: es de Confianza y no se lee aquí).
    const E = cuerpoFn(sinComent(A), "eventosAnalitica"), KE = "packages/db/migrations/0115_eventos_admin_config.sql";
    if (!E) return falla(G, A, 0, "falta eventosAnalitica");
    // 9g · Lee las tablas que rehace el barrido (0137: *_cache, las mismas columnas que las vistas), nunca las vistas que agregan toda la historia.
    const OKE = new Set(["evt_analitica_dia_cache", "evt_asistencia_dia_cache", "evt_ventas_negocio_dia_cache", "evp_analitica_dia_cache", "event_formats", "cities"]);
    for (const [, t] of E.matchAll(/\b(?:from|join)\s+([a-z_]+)/g)) if (!OKE.has(t)) falla(G, A, 0, `eventosAnalitica lee «${t}»: solo las tablas sin personas que rehace el barrido (0115 → 0137)`);
    if (P.test(E) || /\bholder_user_id\b|\bcomp_name\b|\buid\b/.test(E)) falla(G, A, 0, "eventosAnalitica pide una columna de una persona");
    if (existsSync(KE)) {
      const me = readFileSync(KE, "utf8");
      for (const v of ["evt_analitica_dia", "evt_asistencia_dia", "evt_ventas_negocio_dia", "evp_analitica_dia"]) {
        const b = new RegExp(`create or replace view ${v} as([\\s\\S]*?);\\n`).exec(me)?.[1] ?? "";
        if (!b) { falla(G, KE, 0, `no encuentro la vista ${v}`); continue; }
        const sel = b.slice(b.search(/\nselect /)), cols = sel.slice(0, sel.search(/\n\s*from /));
        if (P.test(cols) || /\bholder_user_id\b|\bcomp_name\b/.test(cols)) falla(G, KE, 0, `la vista ${v} saca una columna de una persona`);
      }
    }
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), i = u.indexOf('d.tab === "evt"'), j = u.indexOf("} else if", i + 10); if (i < 0) falla(G, UI, 0, "falta Analítica › Eventos"); else if (/admin\/usuarios|\.uid\b/.test(u.slice(i, j))) falla(G, UI, 0, "Analítica › Eventos no lleva a personas"); }
    // 7i · Analítica › El Compa y Soporte: solo compa_analitica_dia y soporte_analitica_dia (0124) y las ciudades; las vistas no sacan columnas de
    // personas (ni user_id, staff_id, assigned_staff_id, contact_phone_*, ni el texto: text, query_tapada, summary, body); la pantalla no lleva a nadie.
    const CP = cuerpoFn(sinComent(A), "compaSoporteAnalitica"), K7 = "packages/db/migrations/0124_compa_admin_config.sql";
    if (!CP) return falla(G, A, 0, "falta compaSoporteAnalitica (Analítica › El Compa y Soporte)");
    const OK7 = new Set(["compa_analitica_dia_cache", "soporte_analitica_dia_cache", "cities"]);
    for (const [, t] of CP.matchAll(/\b(?:from|join)\s+([a-z_]+)/g)) if (!OK7.has(t)) falla(G, A, 0, `compaSoporteAnalitica lee «${t}»: solo las tablas sin personas que rehace el barrido (0124 → 0137)`);
    const P7 = /\b(user_id|staff_id|assigned_staff_id|decided_by|contact_phone_\w+|first_name|last_name|phone|email|query_tapada|summary|body)\b|\b(?:cv|g|c)\.text\b/;
    if (P.test(CP) || P7.test(CP)) falla(G, A, 0, "compaSoporteAnalitica pide una columna de una persona o un texto");
    if (existsSync(K7)) {
      const m7 = readFileSync(K7, "utf8");
      for (const v of ["compa_analitica_dia", "soporte_analitica_dia"]) {
        const b = new RegExp(`create or replace view ${v} as([\\s\\S]*?);\\n`).exec(m7)?.[1] ?? "";
        if (!b) { falla(G, K7, 0, `no encuentro la vista ${v}`); continue; }
        // Las columnas que SALEN de la vista (el último select): nada de una persona ni un texto.
        const sel = b.slice(b.lastIndexOf("\nselect ")), cols = sel.slice(0, sel.search(/\n\s*from /));
        if (P.test(cols) || P7.test(cols)) falla(G, K7, 0, `la vista ${v} saca una columna de una persona o un texto`);
      }
    } else falla(G, K7, 0, "falta la migración 0124 (vistas de la analítica de El Compa y Soporte)");
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), i = u.indexOf('d.tab === "cpa"'), j = u.indexOf("} else if", i + 10); if (i < 0) falla(G, UI, 0, "falta Analítica › El Compa y Soporte"); else if (/admin\/usuarios|admin\/compa\?cp|\.uid\b|\.num\b/.test(u.slice(i, j))) falla(G, UI, 0, "Analítica › El Compa y Soporte no lleva a personas ni a conversaciones"); }
    // 9g · Dinero, retención, embudos, búsquedas sin resultado, contactos desde semillas, vistas, Hogar y Auto y ciudad viva: lo que SALE de cada consulta
    // (las llaves del tipo de query<{…}>) nunca es de una persona (ni nombre, teléfono, correo, ni el id de una cuenta). Una búsqueda solo sale si la
    // buscaron 2 o más personas distintas (having … >= 2).
    const PS = /\b(user_id|uid|first_name|last_name|phone|telefono|email|correo|nick|author_user_id|staff_id|by_user_id)\??:/;
    for (const fn of ["dinero", "retencionCohortes", "embudos", "busquedasSinResultado", "contactosYVistas", "hogarAuto", "ciudadViva"]) {
      const b9 = cuerpoFn(sinComent(A), fn);
      if (!b9) { falla(G, A, 0, `falta ${fn} (9g)`); continue; }
      for (const [, ty] of b9.matchAll(/query<\{([^}]*)\}>/g)) if (PS.test(ty)) falla(G, A, 0, `${fn} devuelve «${PS.exec(ty)[1]}»: Analítica nunca devuelve a una persona`);
    }
    if (!/having count\(distinct x\.user_id\) \+ \(count\(\*\) filter \(where x\.user_id is null\) > 0\)::int >= 2/.test(cuerpoFn(sinComent(A), "busquedasSinResultado"))) falla(G, A, 0, "busquedasSinResultado: solo lo que buscaron 2 o más personas (una búsqueda de una sola persona puede ser un nombre)");
    // 9g · También en los correos: el reporte programado sale SOLO de las funciones de Analítica (cifrasReporte no consulta la base) y el reporte diario
    // no lee personas (nada de nombres, teléfonos ni correos de vecinos en armarReporte).
    const RP = "apps/web/lib/reportes.ts", RD = "apps/web/lib/reporte-diario.ts";
    if (!existsSync(RP) || !existsSync(RD)) falla(G, RP, 0, "faltan los reportes de 9g (lib/reportes.ts, lib/reporte-diario.ts)");
    else {
      const cr = cuerpoFn(sinComent(RP), "cifrasReporte");
      if (!cr) falla(G, RP, 0, "falta cifrasReporte");
      else if (/\.query\(|\bdb\(\)|dbAnalisis\(\)/.test(cr)) falla(G, RP, 0, "cifrasReporte consulta la base: el correo sale de las mismas funciones de lib/admin-analitica.ts (sin personas)");
      const ar = cuerpoFn(sinComent(RD), "armarReporte");
      if (!ar) falla(G, RD, 0, "falta armarReporte");
      else if (/\b(first_name|last_name|phone|email|nick|from users|join users)\b/.test(ar)) falla(G, RD, 0, "armarReporte lee una persona: el reporte diario lleva cifras, nombres de negocios y los pasos del fundador");
      for (const [, ty] of ar.matchAll(/query<\{([^}]*)\}>/g)) if (PS.test(ty)) falla(G, RD, 0, `armarReporte devuelve «${PS.exec(ty)[1]}»: nunca una persona`);
    }
  },

  /* 9g · derivadoNoEditable (fase9-apertura.md §4 9g): los derivados de Analítica (metricas_dinero_dia, metricas_pro_dia, metricas_retencion y las seis
     tablas *_cache de Eventos, El Compa y Soporte) los escribe SOLO el barrido: la base lo impone (trigger derivado_no_editable, que pide tl.metricas_barrido y
     solo metricas_resumir lo enciende y lo apaga al terminar); ningún otro archivo los escribe ni enciende tl.metricas_barrido; el barrido llama a metricas_al_dia
     (lib/analitica-derivados.ts) y Analítica lee las tablas, no las vistas que agregan toda la historia. Al revés: alreves9g. */
  derivadoNoEditable() {
    const G = "derivadoNoEditable", M = "packages/db/migrations/0137_analitica.sql", D = "apps/web/lib/analitica-derivados.ts", B = "apps/web/lib/barrido.ts", A = "apps/web/lib/admin-analitica.ts";
    const T9 = ["metricas_dinero_dia", "metricas_pro_dia", "metricas_retencion", "evt_analitica_dia_cache", "evt_asistencia_dia_cache", "evt_ventas_negocio_dia_cache", "evp_analitica_dia_cache", "compa_analitica_dia_cache", "soporte_analitica_dia_cache"];
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0137 (los derivados de Analítica)");
    const m = readFileSync(M, "utf8").replace(/--.*$/gm, "");
    const arr = /foreach t in array array\[([\s\S]*?)\] loop\s*execute format\('drop trigger if exists %I on %I', t \|\| '_no_editable', t\);\s*execute format\('create trigger %I before insert or update or delete on %I for each row execute function derivado_no_editable\(\)'/.exec(m);
    if (!arr) falla(G, M, 0, "cada derivado lleva el trigger derivado_no_editable (antes de insertar, cambiar o borrar)");
    else for (const t of T9) if (!arr[1].includes(`'${t}'`)) falla(G, M, 0, `${t} no lleva el trigger derivado_no_editable: se podría escribir a mano`);
    if (!/if coalesce\(current_setting\('tl\.metricas_barrido', true\), ''\) <> 'on' then\s*raise exception 'derivado_no_editable/.test(m)) falla(G, M, 0, "derivado_no_editable rechaza lo que no viene del barrido (tl.metricas_barrido)");
    const fr = /create or replace function metricas_resumir\(desde date\)[\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(m)?.[1] ?? "";
    if (!/perform set_config\('tl\.metricas_barrido', 'on', true\);/.test(fr) || !/perform set_config\('tl\.metricas_barrido', 'off', true\);\s*return n;/.test(fr)) falla(G, M, 0, "metricas_resumir enciende tl.metricas_barrido al empezar y lo apaga al terminar (dentro de la misma transacción)");
    if ((m.match(/set_config\('tl\.metricas_barrido', 'on'/g) ?? []).length !== 1) falla(G, M, 0, "solo metricas_resumir enciende tl.metricas_barrido");
    const ESC = new RegExp(`\\b(insert into|update|delete from|truncate)\\s+(${T9.join("|")})\\b`, "i");
    for (const f of archivos) {
      if (f === M || !/^(apps|packages|scripts|services|infra|pruebas)\/.*\.(tsx?|mjs|cjs|js|sql|sh)$/.test(f) || !existsSync(f)) continue;
      const t = readFileSync(f, "utf8");
      if (ESC.test(t)) falla(G, f, 0, `escribe ${ESC.exec(t)[2]}: los derivados de Analítica solo los escribe el barrido (metricas_resumir)`);
      if (/tl\.metricas_barrido/.test(t)) falla(G, f, 0, "enciende tl.metricas_barrido: solo metricas_resumir (0137) escribe los derivados");
    }
    if (!existsSync(D) || !/select metricas_al_dia\(\) as n/.test(cuerpoFn(sinComent(D), "barrerAnalitica"))) falla(G, D, 0, "barrerAnalitica llama a metricas_al_dia (lib/analitica-derivados.ts)");
    if (!/\["metricas", async \(\) => \(await import\("\.\/analitica-derivados"\)\)\.barrerAnalitica\(\)\]/.test(sinComent(B))) falla(G, B, 0, "el barrido central no corre barrerAnalitica: los derivados se quedan viejos");
    const a = sinComent(A);
    for (const v of ["evt_analitica_dia", "evt_asistencia_dia", "evt_ventas_negocio_dia", "evp_analitica_dia", "compa_analitica_dia", "soporte_analitica_dia"])
      if (new RegExp(`\\b(from|join) ${v}\\b(?!_cache)`).test(a)) falla(G, A, 0, `Analítica lee la vista ${v}: lee ${v}_cache (la tabla que rehace el barrido), no la vista que agrupa toda la historia`);
  },

  /* 9g · analisisPorReplica (HERRAMIENTAS #33, PLAN §3.2): Analítica lee por la base de análisis (lib/db-analisis.ts: DATABASE_URL_ANALISIS, la réplica de
     lectura en producción; en el sandbox, la misma base) y nunca frena a la app: lib/admin-analitica.ts no usa db(); la pantalla de Analítica no abre la
     base; los reportes (programados y diario) leen las cifras por dbAnalisis y solo escriben (o deciden) por la principal; cada conexión de análisis es
     de solo lectura; el compose del sandbox pasa la variable. Al revés: alreves9g. */
  analisisPorReplica() {
    const G = "analisisPorReplica", L = "apps/web/lib/db-analisis.ts", A = "apps/web/lib/admin-analitica.ts", P = "apps/web/app/admin/analitica/page.tsx", C = "infra/pruebas/docker-compose.yml";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/db-analisis.ts (la conexión de análisis)");
    const l = sinComent(L);
    if (!/process\.env\.DATABASE_URL_ANALISIS/.test(l) || !/if \(!url\) return db\(\);/.test(l)) falla(G, L, 0, "dbAnalisis usa DATABASE_URL_ANALISIS y, sin ella (sandbox), la misma base");
    if (!/set default_transaction_read_only = on/.test(l)) falla(G, L, 0, "la conexión de análisis es de solo lectura (default_transaction_read_only)");
    const a = sinComent(A);
    if (/\bdb\(\)|from "\.\/db"/.test(a)) falla(G, A, 0, "lib/admin-analitica.ts usa la base principal: Analítica lee por dbAnalisis()");
    if (!/import \{ dbAnalisis \} from "\.\/db-analisis"/.test(a)) falla(G, A, 0, "lib/admin-analitica.ts no importa dbAnalisis");
    if (existsSync(P) && /@\/lib\/db"|\bdb\(\)/.test(sinComent(P))) falla(G, P, 0, "la pantalla de Analítica abre la base: todo pasa por lib/admin-analitica.ts");
    const LEE = /\b(metricas_\w+|\w+_cache|app_events|search_logs|payments|operations|business_views_daily|contact_taps|seed_listings|subscription_events)\b/;
    for (const f of ["apps/web/lib/reportes.ts", "apps/web/lib/reporte-diario.ts"]) {
      if (!existsSync(f)) { falla(G, f, 0, "falta"); continue; }
      const t = sinComent(f);
      if (!/dbAnalisis\(\)\.query/.test(t)) falla(G, f, 0, "los reportes leen las cifras por dbAnalisis()");
      for (const m of t.matchAll(/\bdb\(\)\.query(?:<[^>]*>)?\(\s*`([^`]*)`/g)) if (LEE.test(m[1]) && !/^\s*(insert|update)\b/i.test(m[1])) falla(G, f, t.slice(0, m.index).split("\n").length, `lee ${LEE.exec(m[1])[1]} por la base principal: las cifras de Analítica se leen por dbAnalisis()`);
    }
    if (!existsSync(C) || !/DATABASE_URL_ANALISIS: \$\{DATABASE_URL_ANALISIS:-\}/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "el compose pasa DATABASE_URL_ANALISIS a la app (vacía en el sandbox)");
  },

  /* 9g · reporteDiarioSale (PLAN §5 «Reporte diario», HERRAMIENTAS #31): el reporte al fundador sale cada día a las 7:30 AM de Hazleton por correo y push
     con «lo que necesita de ti» (los pasos pendientes de «Lo que te toca»), uno por día y de solo inserción; si a las 8:00 no salió (o salió tarde), queda
     la alerta del día, se avisa a los Admins y la tarea del barrido queda con error. Estático (la hora, la alerta, el registro en el barrido, las plantillas
     y la tabla); lo comprueba de verdad ana9g. Al revés: alreves9g. */
  reporteDiarioSale() {
    const G = "reporteDiarioSale", R = "apps/web/lib/reporte-diario.ts", B = "apps/web/lib/barrido.ts", M = "packages/db/migrations/0137_analitica.sql";
    if (!existsSync(R)) return falla(G, R, 0, "falta lib/reporte-diario.ts");
    const r = sinComent(R);
    if (!/export const HORA_REPORTE = \{ h: 7, m: 30 \};/.test(r)) falla(G, R, 0, "el reporte sale a las 7:30 AM de Hazleton (HORA_REPORTE)");
    if (!/export const HORA_ALERTA = \{ h: 8, m: 0 \};/.test(r)) falla(G, R, 0, "la alerta es a las 8:00 (HORA_ALERTA)");
    const br = cuerpoFn(r, "barrerReporteDiario");
    if (!/at time zone 'America\/New_York'/.test(br)) falla(G, R, 0, "barrerReporteDiario mide la hora de Hazleton");
    if (!/if \(f\.min >= MIN\(HORA_ALERTA\) && \(!hecho \|\| [^\n]*>= MIN\(HORA_ALERTA\)\)\) await alertar\(/.test(br)) falla(G, R, 0, "si a las 8:00 no salió (o salió tarde), barrerReporteDiario deja la alerta");
    if (!/if \(!hecho\) throw new Error\(/.test(br)) falla(G, R, 0, "si no salió, la tarea del barrido queda con error (system_jobs)");
    const al = cuerpoFn(r, "alertar");
    if (!/insert into founder_reports \(dia, kind, cifras\) values \(\$1::date, 'alerta'/.test(al) || !/avisar\(a\.id, "reporte_no_salio"/.test(al)) falla(G, R, 0, "la alerta queda en founder_reports (una por día) y avisa a los Admins (reporte_no_salio)");
    const en = cuerpoFn(r, "enviarReporteDiario");
    if (!/tpl: "founder_daily"/.test(en) || !/avisar\(a\.id, "reporte_diario"/.test(en)) falla(G, R, 0, "el reporte sale por correo (founder_daily) y push (reporte_diario)");
    if (!/loQueTeToca\(\)/.test(cuerpoFn(r, "armarReporte")) || !/t\.pend\.join/.test(cuerpoFn(r, "correoReporte"))) falla(G, R, 0, "el reporte lleva «lo que necesita de ti» (los pasos pendientes de Sistema › Apps › «Lo que te toca»)");
    if (!/\["reporteDiario", async \(\) => \(await import\("\.\/reporte-diario"\)\)\.barrerReporteDiario\(\)\]/.test(sinComent(B))) falla(G, B, 0, "el barrido central no corre barrerReporteDiario: el reporte no sale");
    const m = existsSync(M) ? readFileSync(M, "utf8") : "";
    if (!/create trigger founder_reports_no_cambia before update or delete on founder_reports/.test(m) || !/unique \(kind, dia\)/.test(m)) falla(G, M, 0, "founder_reports es de solo inserción y lleva uno por día y tipo");
    for (const k of ["reporte_diario", "reporte_no_salio"]) if (!new RegExp(`\\('${k}', 'mod', null, false,`).test(m)) falla(G, M, 0, `falta la plantilla de aviso ${k} (sin SMS)`);
    if (!/values \('reporte\.diario', true,/.test(m)) falla(G, M, 0, "el interruptor reporte.diario nace encendido");
    if (!/'founder_daily'/.test(m)) falla(G, M, 0, "email_outbox acepta la plantilla founder_daily");
  },


  /* 5i (MEM 651). «Ocultar los N reportados» nunca oculta la cuenta oficial: el lote pasa por loteOcultarUno, que lee author_kind y se
     niega ANTES de ocultar; la pantalla manda cada uno a esa acción (nunca a pubOcultar). Al revés: quitar la revisión → falla. */
  loteNoTocaOficial() {
    const G = "loteNoTocaOficial", A = "apps/web/app/admin/acciones-contenido.ts", UI = "apps/web/app/admin/Contenido.tsx";
    if (!existsSync(A)) return falla(G, A, 0, "falta la acción del lote (acciones-contenido.ts)");
    const b = cuerpoFn(sinComent(A), "loteOcultarUno"), iO = b.search(/if \(x\.oficial \|\| !x\.autor\) return/), iH = b.search(/set status = 'hidden'/);
    if (!/t\.author_kind = 'official'/.test(b) || iO < 0 || iH < 0 || iO > iH) falla(G, A, 0, "loteOcultarUno debe negarse con la cuenta oficial antes de ocultar");
    if (!/where t\.id = \$1::bigint and \(cardinality\(\$2::text\[\]\) = 0 or t\.city_id = any\(\$2::text\[\]\)\) for update/.test(b)) falla(G, A, 0, "loteOcultarUno: ciudad de quien actúa y fila bloqueada");
    if (existsSync(UI)) { const u = readFileSync(UI, "utf8"), e = /const enLote = \(\) => setConf\(\{([\s\S]*?)\n  \}\);/.exec(u)?.[1] ?? "";
      if (!/loteOcultarUno\(x\.k, x\.id, motivo\)/.test(e) || /pubOcultar|cmComOcultar/.test(e)) falla(G, UI, 0, "el lote manda cada uno a loteOcultarUno (nunca a pubOcultar)"); }
  },

  /* 6c. Boletos sin sobreventa (fase6 §3): la base trae el check (sold_n + held_n <= quantity) en ticket_stock y table_stock (y en extras y
     códigos); apartar sube held_n SOLO con el update condicional (… where sold_n + held_n + q <= quantity) dentro de lib/boletos.ts; nadie más
     escribe existencias, usos de códigos ni boletos. Al revés: quitar el check, la condición o escribir held_n / sold_n desde otro archivo → falla. */
  boletosSinSobreventa() {
    const G = "boletosSinSobreventa", M = "packages/db/migrations/0108_boletos_venta.sql", L = "apps/web/lib/boletos.ts";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    for (const tb of ["ticket_stock", "table_stock"]) {
      const def = new RegExp(`create table if not exists ${tb} \\(([\\s\\S]*?)\\n\\);`).exec(m)?.[1] ?? "";
      if (!/check \(sold_n \+ held_n <= quantity\)/.test(def)) falla(G, M, 0, `${tb} sin el check (sold_n + held_n <= quantity)`);
    }
    if (!/check \(quantity is null or sold_n \+ held_n <= quantity\)/.test(m)) falla(G, M, 0, "event_addons sin el check de su cantidad");
    if (!/check \(used_n \+ held_n <= uses_max\)/.test(m)) falla(G, M, 0, "discount_codes sin el check del tope de usos");
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/boletos.ts");
    const a = cuerpoFn(sinComent(L), "apartar");
    if (!/set held_n = s\.held_n \+ \$3[\s\S]*?and s\.sold_n \+ s\.held_n \+ \$3 <= s\.quantity/.test(a)) falla(G, L, 0, "apartar: los boletos se apartan con el update condicional (sold_n + held_n + q <= quantity)");
    if (!/set held_n = s\.held_n \+ 1[\s\S]*?and s\.sold_n \+ s\.held_n \+ 1 <= s\.quantity/.test(a)) falla(G, L, 0, "apartar: la mesa se aparta con el update condicional");
    if (!/used_n \+ held_n < uses_max returning kind, value/.test(a)) falla(G, L, 0, "apartar: el uso del código se aparta con la condición del tope");
    if (!/sort\(\(x, y\) => Number\(x\.id\) - Number\(y\.id\)\)/.test(a)) falla(G, L, 0, "apartar: las filas se toman siempre en el mismo orden (por id)");
    // 6d · Después de comprar: la lista de espera (lib/espera.ts) aparta y las cortesías (lib/boletos-despues.ts) toman existencia; las dos solo
    // con el MISMO update condicional (sold_n + held_n + q <= quantity). Los boletos nuevos fuera de lib/boletos.ts: solo una cortesía (kind
    // 'comp', sin dinero) o la copia de un boleto que se recibe (insert … select … from tickets). Bajar existencias fuera de la venta: nunca
    // (al devolver, la suelta la base: trigger tickets_libera).
    const D6 = new Set(["apps/web/lib/boletos-despues.ts", "apps/web/lib/espera.ts"]);
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === L) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        const escribe = /\bupdate (ticket_stock|table_stock|event_addons|discount_codes)\b[^`]*\b(held_n|sold_n|used_n)\s*=/.test(q);
        if (escribe && !(D6.has(x) && /\bupdate ticket_stock set (held_n = held_n|sold_n = sold_n) \+ \$\d\b[^`]*and sold_n \+ held_n \+ \$\d <= quantity/.test(q)))
          falla(G, x, 0, D6.has(x) ? "la lista de espera y las cortesías solo suben existencias con el update condicional (sold_n + held_n + q <= quantity)" : "las existencias y los usos los escribe solo lib/boletos.ts");
        if (/\binsert into tickets\b/.test(q) && !(x === "apps/web/lib/boletos-despues.ts" && (/'comp', 0, 0, 0/.test(q) || /\bselect event_date_id, event_id, city_id, valid_days, ticket_type_id[^`]*from tickets where id = \$1::bigint/.test(q))))
          falla(G, x, 0, "los boletos los emite solo lib/boletos.ts (en 6d: una cortesía sin dinero o la copia de un boleto que se recibe)");
      }
    }
    const DB = "packages/db/migrations/0109_boletos_comprador.sql";
    if (existsSync(DB) && !/create trigger tickets_libera after update of status on tickets/.test(readFileSync(DB, "utf8"))) falla(G, DB, 0, "al devolver un boleto la existencia la suelta la base (trigger tickets_libera)");
  },

  /* 6c. El apartado lo lleva el servidor: vence a now() + evt_apartado_min (Configuración) y lo suelta el barrido (vencerApartados) o la lectura;
     soltar por vencido exige que de verdad haya vencido (expires_at <= now()); la pantalla solo cuenta hacia atrás, nunca suelta ni vence por su
     cuenta, y ningún texto del cliente escribe los minutos a mano. Al revés: vencer desde el teléfono, sin la clave o sin el barrido → falla. */
  apartadoLoLlevaElServidor() {
    const G = "apartadoLoLlevaElServidor", L = "apps/web/lib/boletos.ts", B = "apps/web/lib/barrido.ts", P = "apps/web/app/(app)/eventos/pagar/[apartado]/Pagar.tsx";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    if (!/expires_at\)\s*\n?\s*values \([^`]*now\(\) \+ make_interval\(mins => \$13::int\)/.test(cuerpoFn(t, "apartar")) || !/cfg\.evt_apartado_min\]\)\)\.rows\[0\]!\.id/.test(cuerpoFn(t, "apartar"))) falla(G, L, 0, "apartar: expires_at = now() + evt_apartado_min de Configuración");
    if (!/\$\{estado === "expired" \? "and expires_at <= now\(\)" : ""\}/.test(cuerpoFn(t, "soltarEn"))) falla(G, L, 0, "soltarEn: vencer solo lo que de verdad venció (expires_at <= now())");
    if (!existsSync(B) || !/bol\.vencerApartados\(\)/.test(readFileSync(B, "utf8"))) falla(G, B, 0, "el barrido central vence los apartados (vencerApartados)");
    if (!/await vencerApartados\(\{ fecha \}\)/.test(cuerpoFn(t, "pantallaBoletos")) || !/await vencerApartados\(\{ fecha \}\)/.test(cuerpoFn(t, "ventaFicha"))) falla(G, L, 0, "una lectura nunca cuenta un apartado vencido (vencerApartados al leer)");
    if (existsSync(P)) {
      const p = sinComent(P), iv = /setInterval\(([^\n]*)\)/.exec(p)?.[1] ?? "";
      if (/evt(Soltar|Pagar|Apartar)|router\./.test(iv)) falla(G, P, 0, "el contador de la pantalla de pago es solo pantalla: no suelta ni vence nada");
    }
    for (const x of codigo) {
      if (!/^apps\/web\/app\/\(app\)\/(eventos|cuenta\/boletos)\/.*\.tsx?$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/\b8 (min|minutos|minutes)\b/.test(l)) falla(G, x, i + 1, "los minutos del apartado salen de Configuración (evt_apartado_min), no se escriben a mano"); });
    }
  },

  /* 6c. Nada se cobra sin boleto (y ningún boleto sin cobro): pagarBoletos autoriza, crea la orden y los boletos en la transacción, confirma y
     SOLO entonces captura; si la captura falla, anula los boletos y libera; si algo falla antes, libera la autorización. Solo lib/boletos.ts
     captura un cobro de la plataforma. Al revés: capturar antes de crear los boletos, o no liberar → falla. */
  nadaSeCobraSinBoleto() {
    const G = "nadaSeCobraSinBoleto", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const b = cuerpoFn(sinComent(L), "pagarBoletos");
    const iR = b.search(/pasarela\.retenerPlataforma\(/), iT = b.search(/insert into tickets/), iC = b.search(/await c\.query\("commit"\);\s*\n\s*convertido = true;/), iK = b.search(/pasarela\.capturarPlataforma\(/);
    if (iR < 0 || iT < 0 || iC < 0 || iK < 0 || !(iR < iT && iT < iC && iC < iK)) falla(G, L, 0, "pagarBoletos: autorizar → boletos en la transacción → commit → capturar, en ese orden");
    if (!/if \(!cap\.ok\) \{\s*\n\s*await anularPorCobro\(op, pi,/.test(b)) falla(G, L, 0, "pagarBoletos: si la captura falla, se anulan los boletos y se libera");
    if (!/if \(!convertido\) \{[\s\S]*?if \(pi\) await pasarela\.liberar\(pi\)/.test(b)) falla(G, L, 0, "pagarBoletos: si algo falla antes de convertir, se libera la autorización");
    if (!/update tickets set status = 'void'/.test(cuerpoFn(sinComent(L), "anularPorCobro")) || !/pasarela\.liberar\(pi\)/.test(cuerpoFn(sinComent(L), "anularPorCobro"))) falla(G, L, 0, "anularPorCobro: anula los boletos y libera la tarjeta");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== L && x !== "apps/web/lib/pagos/pasarela.ts" && /capturarPlataforma\(|retenerPlataforma\(/.test(sinComent(x))) falla(G, x, 0, "solo lib/boletos.ts cobra boletos");
    if (!/'tickets'\) limit 20/.test(readFileSync("apps/web/lib/cobros.ts", "utf8"))) falla(G, "apps/web/lib/cobros.ts", 0, "repararPagos no toca boletos (los repara repararBoletos, que captura sin comisión de destino)");
  },

  /* 6c. El precio que ves es el que pagas (§6 #1): lo cobrado = lo apartado (suma de precios − descuento, calculado en el servidor) y la
     comisión sale de fee_rules «bol» y de lo del organizador; ninguna pantalla suma un «cargo de servicio» al total (dice «Incluidos»). Al revés:
     sumar la comisión al total o mostrar un cargo con monto → falla. */
  precioConCargos() {
    const G = "precioConCargos", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), a = cuerpoFn(t, "apartar"), p = cuerpoFn(t, "pagarBoletos");
    if (!/const sub = lineas\.reduce\(\(s, l\) => s \+ l\.unit \* l\.q, 0\), total = sub - desc;/.test(a)) falla(G, L, 0, "apartar: total = suma de precios − descuento (sin cargos encima)");
    if (!/retenerPlataforma\(\{ centavos: h\.total,/.test(p) || !/capturarPlataforma\(pi, h\.total\)/.test(p)) falla(G, L, 0, "pagarBoletos cobra exactamente el total del apartado");
    if (!/comision\(c, "bol", pagado, 1\)/.test(p)) falla(G, L, 0, "la comisión de cada boleto sale de fee_rules «bol» sobre el precio pagado");
    if (/total[^\n]*\+ fee\b|h\.total \+/.test(p)) falla(G, L, 0, "la comisión no se suma al total: sale de lo del organizador");
    for (const x of codigo) {
      if (!/^apps\/web\/(app\/\(app\)\/(eventos|cuenta\/boletos)\/.*\.tsx?|lib\/correo\/recibos\.ts)$/.test(x)) continue;
      sinComent(x).split("\n").forEach((l, i) => { if (/(Cargos? de servicio|Service fees?)/.test(l) && !/Incluidos|Included/.test(l)) falla(G, x, i + 1, "«Cargos de servicio» se muestran «Incluidos», nunca como un monto que se suma"); });
    }
  },

  /* 6c. El QR lo firma solo el servidor con Ed25519 (§3, §6 #10): la llave privada sale del entorno (QR_LLAVE_PRIVADA), la lee solo
     lib/boletos-qr.ts, nunca va a la base (qr_keys guarda la pública), a un log, a una semilla ni al navegador; en producción sin la llave no se
     firma; verificar usa la llave pública de la base. Nada de HMAC compartido con la puerta. Al revés: leer la llave en otro archivo, guardarla
     en la base o firmar con HMAC → falla. */
  qrFirmado() {
    const G = "qrFirmado", Q = "apps/web/lib/boletos-qr.ts", M = "packages/db/migrations/0108_boletos_venta.sql";
    if (!existsSync(Q)) return falla(G, Q, 0, "falta lib/boletos-qr.ts");
    const q = sinComent(Q);
    if (!/sign\(null, Buffer\.from\(msg\), k\.priv\)/.test(q)) falla(G, Q, 0, "el QR se firma con Ed25519 (sign(null, …, llave privada))");
    if (!/if \(ENTORNO === "produccion"\) throw new Error\("Falta QR_LLAVE_PRIVADA/.test(q)) falla(G, Q, 0, "en producción, sin QR_LLAVE_PRIVADA no se firma nada");
    if (!/verify\(null, Buffer\.from\(msg\), pub,/.test(q) || !/from qr_keys where kid = \$1 and retired_at is null/.test(q)) falla(G, Q, 0, "verificar usa la llave pública publicada en qr_keys");
    if (/createHmac\([^)]*\)\.update\(msg|hmac[^\n]*firma/i.test(q)) falla(G, Q, 0, "el QR no se firma con HMAC (la puerta podría fabricar boletos)");
    if (existsSync(M)) { const def = /create table if not exists qr_keys \(([\s\S]*?)\n\);/.exec(readFileSync(M, "utf8"))?.[1] ?? ""; if (!/public_key/.test(def) || /priv/i.test(def)) falla(G, M, 0, "qr_keys guarda solo la llave pública"); }
    for (const x of archivos) {
      if (/\.(png|jpe?g|gif|webp|svg|woff2?|ico|lock)$/.test(x) || x.startsWith("docs/diseno/")) continue;
      const t = readFileSync(x, "utf8");
      // 9a · pruebas/alreves inyecta una llave FALSA a propósito (alreves6c); pruebaSinSecretos vigila que en pruebas/ no haya una de verdad.
      if (!x.startsWith("pruebas/alreves/") && /MC4CAQAwBQYDK2VwBCIEI[A-Za-z0-9+/]{20,}/.test(t)) falla(G, x, 0, "una llave privada Ed25519 escrita en el repo");
      if (x !== Q && x !== "infra/pruebas/deploy.sh" && x !== "infra/pruebas/docker-compose.yml" && !/^(infra\/comun\/(lib|recuperacion)\.sh|infra\/comun\/secretos\.json|infra\/produccion\/(deploy\.sh|compose-app\.yml)|pruebas\/infra\/sellado\.test\.sh)$/.test(x) && x !== "pruebas/servir/servir.sh" && x !== "pruebas/lib/g6-comun.cjs" && !x.startsWith("pruebas/alreves/") && !x.startsWith("guardianes/") && !x.startsWith("docs/") && !x.endsWith(".sql") && /QR_LLAVE_PRIVADA/.test(t)) falla(G, x, 0, "solo lib/boletos-qr.ts lee QR_LLAVE_PRIVADA");
    }
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== Q && x !== "apps/web/lib/boletos.ts" && /\bfirmarQR\(/.test(sinComent(x))) falla(G, x, 0, "solo lib/boletos.ts pide firmar un QR (servidor)");
  },

  /* 6c. El QR no lleva datos personales: solo kid, id del boleto, id de la fecha, versión y entradas (+ la firma). Al revés: meter el nombre o
     el teléfono en el texto firmado → falla. */
  qrSinDatosPersonales() {
    const G = "qrSinDatosPersonales", Q = "apps/web/lib/boletos-qr.ts";
    if (!existsSync(Q)) return;
    const q = sinComent(Q);
    if (!/const k = cargar\(\), msg = `TL1\.\$\{k\.kid\}\.\$\{t\.id\}\.\$\{t\.fecha\}\.\$\{t\.ver\}\.\$\{t\.admits\}`;/.test(q)) falla(G, Q, 0, "el texto del QR es TL1.kid.id.fecha.versión.entradas, nada más");
    if (!/export type DatosQR = \{ id: string; fecha: string; ver: number; admits: number \};/.test(q)) falla(G, Q, 0, "DatosQR trae solo id, fecha, versión y entradas");
  },

  /* 6c. Nadie ve los boletos de otro (IDOR): cada lectura o acción del cliente en lib/boletos.ts filtra por la persona; el panel, por su
     negocio. Al revés: quitar el filtro de una función → falla. */
  boletosSoloSuyos() {
    const G = "boletosSoloSuyos", L = "apps/web/lib/boletos.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    for (const [fn, re] of [["ordenBoletos", /o\.kind = 'tickets' and o\.user_id = \$2/], ["misBoletos", /where t\.holder_user_id = \$1/], ["miBoleto", /where t\.code = \$1 and t\.holder_user_id = \$2/],
      ["pantallaPago", /where h\.id = \$1::uuid and h\.user_id = \$2/], ["pagarBoletos", /where h\.id = \$1::uuid and h\.user_id = \$2/], ["soltarApartado", /where id = \$1::uuid and user_id = \$2/],
      ["ventasPanel", /where id = \$1::bigint and business_id = \$2 and entry = 'tickets'/], ["reenviarDesdePanel", /kind = 'tickets' and business_id = \$2/]])
      if (!re.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» no filtra por la persona o el negocio`);
    const V = /select [^`]*\bphone\b/;
    for (const fn of ["ventasPanel", "ordenBoletos", "misBoletos", "miBoleto"]) if (V.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» no saca teléfonos`);
  },

  /* 6c. Libros de los boletos (solo inserción): ticket_log y discount_attempts; un boleto, un apartado y un código no se borran (estados). */
  libroBoletos() {
    const G = "libroBoletos", M = "packages/db/migrations/0108_boletos_venta.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    if (!/create trigger ticket_log_no_cambia before update or delete on ticket_log/.test(m) || !/create trigger discount_attempts_no_cambia before update or delete on discount_attempts/.test(m)) falla(G, M, 0, "ticket_log y discount_attempts son de solo inserción (trigger)");
    if (!/raise exception 'un boleto no se borra/.test(ultimaFn("tickets_antes")) || !/raise exception 'lo comprado en un boleto no cambia'/.test(ultimaFn("tickets_antes"))) falla(G, M, 0, "un boleto no se borra y lo comprado no cambia");
    if (!/raise exception 'un apartado no se borra/.test(ultimaFn("ticket_holds_antes")) || !/raise exception 'lo apartado y su precio no cambian'/.test(ultimaFn("ticket_holds_antes"))) falla(G, M, 0, "un apartado no se borra y su precio no cambia");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (ticket_log|discount_attempts|ticket_refund_lines)\b|\bdelete from (tickets|ticket_holds|discount_codes|ticket_transfers|waitlist|refunds)\b/.test(q)) falla(G, x, 0, "un libro de boletos no se cambia y nada de los boletos se borra");
    // 6d · ticket_refund_lines es de solo inserción; una transferencia y un lugar en la lista de espera no se borran (estados).
    const M6 = "packages/db/migrations/0109_boletos_comprador.sql";
    if (existsSync(M6)) {
      const t = readFileSync(M6, "utf8");
      if (!/create trigger ticket_refund_lines_no_cambia before update or delete on ticket_refund_lines/.test(t)) falla(G, M6, 0, "ticket_refund_lines es de solo inserción (trigger)");
      if (!/raise exception 'una transferencia no se borra/.test(ultimaFn("ticket_transfers_antes")) || !/raise exception 'la lista de espera no se borra/.test(ultimaFn("waitlist_antes"))) falla(G, M6, 0, "una transferencia y la lista de espera no se borran (estados)");
    }
  },

  /* 6d. «EL QR ANTERIOR QUEDA ANULADO»: transferir (y deshacer o vencer) sube qr_ver; mientras la transferencia está pendiente NINGÚN QR de ese
     boleto se firma (vistaBoleto) ni entra (bol_vigente); al recibirlo el original queda 'replaced' y nace otro boleto; la verificación del
     Super Admin (y la puerta, 6g/6h) usa la versión y bol_vigente. Lo recibe solo la cuenta con ESE teléfono (huella), nunca quien lo mandó,
     una sola vez y antes de vencer (la base también). Al revés: sin subir la versión, firmando con la transferencia pendiente, sin la
     huella del teléfono o sin el check de quien lo manda → falla. */
  qrViejoNoEntra() {
    const G = "qrViejoNoEntra", D = "apps/web/lib/boletos-despues.ts", B = "apps/web/lib/boletos.ts", A = "apps/web/lib/boletos-admin.ts", M = "packages/db/migrations/0109_boletos_comprador.sql";
    if (!existsSync(D)) return falla(G, D, 0, "falta lib/boletos-despues.ts");
    const d = sinComent(D);
    for (const fn of ["transferir", "cancelarTransferencia"]) if (!/update tickets set qr_ver = qr_ver \+ 1 where id = \$1::bigint/.test(cuerpoFn(d, fn))) falla(G, D, 0, `«${fn}» tiene que subir qr_ver (el QR anterior queda anulado)`);
    if (!/update tickets set qr_ver = qr_ver \+ 1/.test(cuerpoFn(d, "vencerTransferencias"))) falla(G, D, 0, "lo que vence vuelve con un QR nuevo (qr_ver + 1)");
    const rc = cuerpoFn(d, "reclamar");
    if (!/set status = 'replaced', replaced_by = \$2::bigint/.test(rc)) falla(G, D, 0, "al recibirlo, el original queda 'replaced' (nace otro boleto)");
    if (!/if \(huella\(yo\.phone\) !== x\.ph\) throw no\(/.test(rc)) falla(G, D, 0, "solo lo recibe la cuenta con el teléfono al que se mandó (huella)");
    if (!/if \(x\.from === userId\) throw no\(/.test(rc)) falla(G, D, 0, "quien lo mandó no lo puede recibir");
    if (!/for update/.test(rc) || !/x\.st !== "pending" \|\| x\.vence/.test(rc)) falla(G, D, 0, "se recibe una sola vez y antes de vencer, con la fila bloqueada");
    if (!/claim_hash = \$1/.test(rc) || /claim_hash = \$1/.test(cuerpoFn(d, "transferir")) && !/sha\(token\)/.test(cuerpoFn(d, "transferir"))) falla(G, D, 0, "del token solo se guarda la huella (sha256)");
    if (/to_phone_enc|descifrar/.test(cuerpoFn(d, "verTransferencia"))) falla(G, D, 0, "la pantalla de recibir nunca saca el teléfono");
    if (existsSync(B) && !/conQR && vale && !b\.envio/.test(cuerpoFn(sinComent(B), "vistaBoleto"))) falla(G, B, 0, "con una transferencia pendiente no se firma ningún QR del boleto");
    if (existsSync(A)) { const q = cuerpoFn(sinComent(A), "buscarBoletosAdmin"); if (!/bol_vigente\(t\.id\) as vig,/.test(q) || !/b\.ver === v\.d\.ver && b\.fid === v\.d\.fecha && b\.admits === v\.d\.admits && b\.vig;/.test(q)) falla(G, A, 0, "la verificación del QR pregunta la versión y bol_vigente (válido y sin transferencia pendiente)"); }
    // 6h · Sin conexión igual: el teléfono rechaza la versión vieja y el «se está transfiriendo» con su paquete, y al subir la base lo
    // vuelve a decidir (un QR viejo o en transferencia que entró sin señal queda rejected con incidencia).
    const LO = "apps/web/app/(puerta)/puerta/sin-conexion/local.ts", M13 = "packages/db/migrations/0113_puerta_sin_conexion.sql";
    if (existsSync(LO)) { const d6 = cuerpoFn(sinComent(LO), "decidir"); if (!/if \(st === "replaced" \|\| \(x\.ver != null && x\.ver !== fila\[1\]\)\) return vista\("replaced"\);/.test(d6) || !/if \(st === "pending"\) return vista\("pending_transfer"\);/.test(d6)) falla(G, LO, 0, "sin conexión: la versión vieja → QR ANULADO y en transferencia → no entra"); }
    if (existsSync(M13)) {
      if (!/elsif t\.status = 'replaced' or \(p_ver is not null and p_ver <> t\.qr_ver\) then r := 'replaced';/.test(ultimaFn("puerta_offline")) || !/z\.status = 'pending' and z\.kind = 'transfer'\) then r := 'pending_transfer';/.test(ultimaFn("puerta_offline"))) falla(G, M13, 0, "al subir la cola, la versión vieja y la transferencia pendiente no entran");
      if (!/z\.status = 'pending' and z\.kind = 'transfer'\) then 'pending' else t\.status end/.test(ultimaFn("puerta_paquete_filas"))) falla(G, M13, 0, "el paquete marca el boleto en transferencia");
    }
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/create or replace function bol_vigente[\s\S]*?status = 'valid' and not exists \(select 1 from ticket_transfers x where x\.ticket_id = t\.id and x\.status = 'pending'/.test(m)) falla(G, M, 0, "bol_vigente: válido y sin transferencia pendiente");
      if (!/check \(claimed_by is null or claimed_by <> from_user_id\)/.test(m)) falla(G, M, 0, "la base no deja que quien lo manda lo reciba");
      if (!/create unique index if not exists ticket_transfers_vivo_idx on ticket_transfers \(ticket_id\) where status = 'pending'/.test(m)) falla(G, M, 0, "una sola transferencia pendiente por boleto");
      if (!/old\.status <> 'pending' then raise exception 'esa transferencia ya terminó'/.test(ultimaFn("ticket_transfers_antes")) || !/old\.expires_at <= now\(\) then raise exception 'esa transferencia ya venció'/.test(ultimaFn("ticket_transfers_antes"))) falla(G, M, 0, "la base no deja recibir dos veces ni después de vencer");
    }
  },

  /* 6d. Una cortesía no es dinero: precio, comisión y descuento en 0 (check), va en una orden sin cobro (pay_mode 'none', la base lo exige),
     nunca se devuelve (trigger) ni entra a una devolución; el panel la da con tope por fecha (Configuración, con la fecha bloqueada) y toma
     existencia con el update condicional. Al revés: una cortesía con precio, en una orden cobrada, devuelta o sin tope → falla. */
  cortesiaSinDinero() {
    const G = "cortesiaSinDinero", D = "apps/web/lib/boletos-despues.ts", M = "packages/db/migrations/0109_boletos_comprador.sql";
    if (!existsSync(M) || !existsSync(D)) return falla(G, M, 0, "faltan la migración 0109 o lib/boletos-despues.ts");
    const m = readFileSync(M, "utf8");
    if (!/add constraint tickets_cortesia_sin_dinero check \(kind <> 'comp' or \(price_cents = 0 and fee_cents = 0 and discount_cents = 0\)\)/.test(m)) falla(G, M, 0, "check: una cortesía tiene precio, comisión y descuento en 0");
    const ta = ultimaFn("tickets_antes");
    if (!/new\.kind = 'comp' and pm is distinct from 'none' then raise exception/.test(ta)) falla(G, M, 0, "una cortesía solo va en una orden sin cobro (pay_mode 'none')");
    if (!/new\.status = 'refunded' and old\.kind = 'comp' then raise exception/.test(ta)) falla(G, M, 0, "una cortesía no se devuelve (se anula)");
    if (!/raise exception 'cortesia_sin_dinero: una cortesía no se devuelve'/.test(ultimaFn("ticket_refund_lines_antes"))) falla(G, M, 0, "una cortesía no entra a una devolución");
    const dc = cuerpoFn(sinComent(D), "darCortesia");
    if (/pasarela|comision\(|payments/.test(dc)) falla(G, D, 0, "darCortesia no cobra ni calcula comisión");
    if (!/'comp', 0, 0, 0/.test(dc) || !/0, 0, 'none'/.test(dc)) falla(G, D, 0, "darCortesia: boletos 'comp' en $0 y una orden sin cobro (pay_mode 'none')");
    if (!/cfgSql\("evt_cortesias_max"\)/.test(dc) || !/if \(ya \+ q > k0\.max\) throw no\(/.test(dc) || !/from event_dates where id = \$1::bigint for update/.test(dc)) falla(G, D, 0, "darCortesia: tope por fecha de Configuración (lo lee la base) con la fecha bloqueada");
    for (const fn of ["cancelarBoletos", "devolverDesdePanel"]) if (!/b\.kind !== "paid"/.test(cuerpoFn(sinComent(D), fn))) falla(G, D, 0, `«${fn}» solo devuelve boletos pagados`);
  },

  /* 6d. Lista de espera en orden: la fila es por created_at (la base no deja cambiarlo), una oferta = un apartado a nombre de esa persona con
     el update condicional, con un candado por fecha (nadie se salta ni se ofrece dos veces), y lo que se libera es primero para la fila (antes
     de apartar y de mostrar); una oferta vencida no se vuelve a apartar (pasa a la siguiente) y el barrido la cierra. Al revés: sin orden,
     sin candado, apartar sin mirar la fila o pagar una oferta vencida → falla. */
  listaDeEsperaEnOrden() {
    const G = "listaDeEsperaEnOrden", E = "apps/web/lib/espera.ts", B = "apps/web/lib/boletos.ts", M = "packages/db/migrations/0109_boletos_comprador.sql", R = "apps/web/lib/barrido.ts";
    if (!existsSync(E)) return falla(G, E, 0, "falta lib/espera.ts");
    const of = cuerpoFn(sinComent(E), "ofrecer");
    if (!/status = 'waiting' order by created_at, (?:waitlist\.)?id\b/.test(of)) falla(G, E, 0, "ofrecer: en orden de llegada (created_at, id)");
    if (!/pg_advisory_xact_lock\(hashtext\('espera:' \|\| \$1\)\)/.test(of)) falla(G, E, 0, "ofrecer: un candado por fecha");
    if (!/sold_n \+ held_n \+ \$3 <= quantity/.test(of) || !/waitlist_id\)/.test(of)) falla(G, E, 0, "ofrecer: la oferta es un apartado (update condicional) con waitlist_id");
    if (existsSync(M)) { const w = ultimaFn("waitlist_antes"); if (!/new\.created_at\) is distinct from \(old\.event_date_id, old\.event_id, old\.city_id, old\.user_id, old\.party, old\.created_at\)/.test(w) && !/old\.created_at\) then\s*raise exception 'el lugar en la lista de espera no cambia'/.test(w)) falla(G, M, 0, "la base no deja cambiar el lugar en la fila (created_at)"); }
    if (existsSync(B)) {
      const b = sinComent(B);
      for (const fn of ["apartar", "pantallaBoletos", "ventaFicha"]) if (!/await primeroLaFila\(fecha\)/.test(cuerpoFn(b, fn))) falla(G, B, 0, `«${fn}»: lo que se libera es primero para la lista de espera`);
      if (!/if \(h\.wl && \(h\.st === "expired" \|\| !h\.vivo\)\) throw/.test(cuerpoFn(b, "pagarBoletos"))) falla(G, B, 0, "una oferta vencida no se vuelve a apartar al pagar");
      if (!/update waitlist set status = 'converted'/.test(cuerpoFn(b, "pagarBoletos"))) falla(G, B, 0, "al pagar la oferta, la persona sale de la fila (converted)");
    }
    if (existsSync(R) && !/espera\.barrerEspera\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las ofertas que vencen las cierra el barrido de cada minuto");
  },

  /* 6d. Una devolución de boletos se hace una vez y nunca de más: el servidor calcula de lo guardado (precio y cargo de cada boleto), en dos
     pasos (boletos 'refunded' + devolución 'pending' en una transacción; Stripe con la llave; 'done' una sola vez); la base no deja que lo
     pendiente + lo hecho pase de lo cobrado (trigger con el pago bloqueado) ni que un boleto se devuelva dos veces (índice único); el
     simulador devuelve una vez por llave; el barrido reintenta con la misma llave. Al revés: sin el tope, sin el índice, marcar 'done' sin
     la condición, o el simulador sin la llave → falla. */
  devolucionUnaVez() {
    const G = "devolucionUnaVez", D = "apps/web/lib/boletos-despues.ts", P = "apps/web/lib/pagos/pasarela.ts", M = "packages/db/migrations/0109_boletos_comprador.sql", R = "apps/web/lib/barrido.ts";
    if (!existsSync(D) || !existsSync(M)) return falla(G, M, 0, "faltan la migración 0109 o lib/boletos-despues.ts");
    const m = readFileSync(M, "utf8");
    if (!/create unique index if not exists ticket_refund_lines_boleto_idx on ticket_refund_lines \(ticket_id\) where ticket_id is not null/.test(m)) falla(G, M, 0, "un boleto se devuelve una sola vez (índice único)");
    const tp = ultimaFn("refunds_tope");
    if (!/from payments where id = new\.payment_id for update/.test(tp) || !/status in \('pending', 'done'\)/.test(tp) || !/ya \+ new\.amount_cents > p\.amount_cents then raise exception/.test(tp)) falla(G, M, 0, "la base no deja que lo pendiente + lo hecho pase de lo cobrado");
    const d = sinComent(D);
    if (!/'pending', \$6, 'platform'/.test(cuerpoFn(d, "anotarDevolucion")) || !/update tickets set status = 'refunded' where id = any\(\$1::bigint\[\]\) and status = 'valid'/.test(cuerpoFn(d, "anotarDevolucion"))) falla(G, D, 0, "paso 1: los boletos devueltos y la devolución pendiente en la misma transacción");
    const ej = cuerpoFn(d, "ejecutarDevolucion");
    if (!/set status = 'done'[^`]*where id = \$1::bigint and status = 'pending'`/.test(ej) || !/if \(!u\.rowCount\) return;/.test(ej) || ej.indexOf("status = 'done'") > ej.indexOf("update payments set refunded_cents")) falla(G, D, 0, "paso 2: 'done' una sola vez (where status = 'pending') antes de sumar a lo devuelto");
    if (!/pasarela\.devolver\(r\.pi, r\.amt, r\.idem/.test(ej)) falla(G, D, 0, "paso 2: Stripe con la llave guardada de la devolución (la misma en cada reintento)");
    const ca = cuerpoFn(d, "calcular");
    if (!/b\.precio - b\.cargo/.test(ca) || /monto\s*[:=]\s*x\./.test(ca)) falla(G, D, 0, "lo que vuelve se calcula de lo guardado (precio − cargo), nunca de lo que manda la pantalla");
    for (const fn of ["cancelarBoletos"]) if (!/cfgSql\("bol_cancelar_h"\)/.test(cuerpoFn(d, fn))) falla(G, D, 0, "cancelar con devolución hasta bol_cancelar_h (Configuración), lo decide la base");
    if (existsSync(P)) { const p = readFileSync(P, "utf8"), i = p.indexOf("insert into sim_refunds"), j = p.indexOf("update sim_intents set refunded_cents"); if (i < 0 || j < 0 || i > j || !/insert into sim_refunds[^`]*on conflict \(id\) do nothing/.test(p)) falla(G, P, 0, "el simulador devuelve una sola vez por llave (sim_refunds antes del saldo)"); }
    if (existsSync(R) && !/desp\.barrerDevolucionesBoletos\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las devoluciones pendientes las reintenta el barrido");
  },

  /* 6e (y la falla del CI de 6d). Todo script de scripts/ e infra/ que corre en el CI o a mano se puede leer: `node --check` en cada .cjs y .mjs.
     La prueba de contrato de Stripe tenía la misma variable declarada dos veces y no corrió nunca (nadie la ejecutó en local). Al revés:
     una declaración repetida o una llave sin cerrar → falla. */
  scriptsSeLeen() {
    const G = "scriptsSeLeen";
    for (const f of codigo.filter((x) => /^(scripts|infra)\/.*\.(cjs|mjs)$/.test(x))) {
      try { execSync(`node --check ${JSON.stringify(f)}`, { stdio: ["ignore", "ignore", "pipe"] }); }
      catch (e) { falla(G, f, 0, `no se puede leer (node --check): ${String(e.stderr ?? e.message).split("\n").find((l) => /Error/.test(l)) ?? "error de sintaxis"}`); }
    }
  },

  /* En un pedido (kind 'order') la hora de listo (ready_at) y la de respuesta (respond_by) pueden venir vacías: un pedido viejo o de la
     semilla sin ellas tumbaba con un 500 la página del pedido del cliente y TODA la pantalla Hoy del panel (hm2m(null)). Cada columna que
     sale de esas dos horas en lib/pedir.ts y lib/pedidos.ts tiene que estar tipada `string | null`, así el compilador obliga a manejar el
     vacío. Al revés: volver a tipar `listo: string` en la fila de pedidoDe → falla. */
  pedidoHorasOpcionales() {
    const G = "pedidoHorasOpcionales";
    for (const f of ["apps/web/lib/pedir.ts", "apps/web/lib/pedidos.ts"]) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/to_char\(\s*(?:\w+\.)?(ready_at|respond_by)\b[^)]*\)\s+as\s+(\w+)/g)) {
        // El tipo de la fila es el `query<{ … }>(` justo antes del SQL donde sale la columna.
        const n = m[2], ini = t.lastIndexOf("query<{", m.index), fin = t.indexOf("}>(", ini);
        // Si el SQL vive en una constante compartida (lib/pedidos.ts: COLS), la fila es el tipo con nombre que tiene las columnas de ese SQL
        // (FilaDb), no otro tipo que por casualidad tenga un campo con el mismo nombre (la vista ya formateada).
        const sql = t.slice(t.lastIndexOf("`", m.index), t.indexOf("`", m.index + 1));
        const alias = [...sql.matchAll(/\bas\s+(\w+)/g)].map((x) => x[1]);
        const conNombre = [...t.matchAll(/\btype \w+ = \{[\s\S]*?\};/g)].map((x) => x[0])
          .map((b) => [alias.filter((a) => new RegExp(`[{;,]\\s*${a}\\s*:`).test(b)).length, b]).sort((x, y) => y[0] - x[0])[0]?.[1] ?? "";
        const fila = ini >= 0 && fin > ini && fin < m.index && !t.slice(fin, m.index).includes(");") ? t.slice(ini, fin) : conNombre;
        const tipos = [...fila.matchAll(new RegExp(`[{;,]\\s*${n}\\s*:\\s*([^;,}]+)`, "g"))].map((x) => x[1].trim());
        if (!tipos.length || tipos.some((x) => !/\|\s*null\b/.test(x))) falla(G, f, t.slice(0, m.index).split("\n").length, `«${n}» sale de ${m[1]}, que puede venir vacía: típarla «string | null» y mostrar el pedido sin esa hora`);
      }
    }
    // 9a · Tipar no basta: «antes de las ${x.responde}» con la hora vacía se leía «antes de las null» en el panel (pednull lo cazó). En una
    // pantalla de pedidos, la hora de respuesta o de listo nunca se interpola tal cual: o con «??», o desde una variable que un «? :» ya revisó.
    for (const f of codigo.filter((x) => /^apps\/web\/app\/(panel\/Pedidos|\(app\)\/pedido\/)/.test(x) && x.endsWith(".tsx"))) {
      sinComent(f).split("\n").forEach((l, i) => { for (const m of l.matchAll(/\$\{\s*(\w+(?:\??\.\w+)*\??\.(responde|listo))\s*\}/g)) if (!new RegExp(`${m[1].replace(/[.?]/g, "\\$&")}\\s*\\?(?![?.])`).test(l.slice(0, m.index))) falla(G, f, i + 1, `«${m[0]}» puede decir «null»: la hora de ${m[2] === "responde" ? "respuesta" : "listo"} puede venir vacía (con «??» o solo dentro de un «${m[1]} ? … : …»)`); });
    }
  },

  /* El sistema de diseño portado (packages/ui/src/ds y los tokens puntuales) es lo que produce scripts/portar-sistema.mjs, nada más.
     6c encontró que correr el script deshacía arreglos de accesibilidad hechos a mano en community/PostCard.js y Thread.js: el arreglo
     tiene que vivir en el script (como un parche) o se pierde la próxima vez. Aquí se corre el script en una carpeta temporal y cada
     archivo tiene que ser idéntico al del repo. Al revés: editar a mano un componente portado, o quitar un parche del script → falla. */
  sistemaSincronizado() {
    const G = "sistemaSincronizado";
    const tmp = execSync("mktemp -d", { encoding: "utf8" }).trim();
    try {
      execSync("node scripts/portar-sistema.mjs", { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, PORTAR_DESTINO: join(tmp, "ds"), PORTAR_TOKENS: join(tmp, "tokens.css") } });
      const lista = (d, base = d) => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? lista(join(d, n), base) : [join(d, n).slice(base.length + 1)]);
      const repo = new Set(lista("packages/ui/src/ds")), gen = new Set(lista(join(tmp, "ds")));
      for (const f of gen) {
        if (!repo.has(f)) falla(G, `packages/ui/src/ds/${f}`, 0, "el script lo genera pero no está en el repo: correr scripts/portar-sistema.mjs");
        else if (readFileSync(join(tmp, "ds", f), "utf8") !== readFileSync(`packages/ui/src/ds/${f}`, "utf8"))
          falla(G, `packages/ui/src/ds/${f}`, 0, "distinto de lo que produce scripts/portar-sistema.mjs: un arreglo a mano va como parche en el script");
      }
      for (const f of repo) if (!gen.has(f)) falla(G, `packages/ui/src/ds/${f}`, 0, "está en el repo pero el script no lo produce");
      if (readFileSync(join(tmp, "tokens.css"), "utf8") !== readFileSync("packages/ui/src/tokens.css", "utf8"))
        falla(G, "packages/ui/src/tokens.css", 0, "los tokens puntuales no son los que produce scripts/portar-sistema.mjs");
    } catch (e) {
      falla(G, "scripts/portar-sistema.mjs", 0, `el script falló: ${String(e.stderr ?? e.message).split("\n").find((l) => /Error/.test(l)) ?? "error"}`);
    } finally { execSync(`rm -rf ${JSON.stringify(tmp)}`); }
  },

  /* 6e. Cada llamada a Stripe de la pasarela está en la prueba de contrato (scripts/contrato-stripe/prueba.cjs corre contra stripe-mock en
     el CI): un método de `pasarela` que llama a stripe() y que la prueba no usa, nunca se validó contra la API. Al revés: quitar de la
     prueba transferir o revertirTransferencia → falla. */
  contratoCubreLaPasarela() {
    const G = "contratoCubreLaPasarela", P = "apps/web/lib/pagos/pasarela.ts", T = "scripts/contrato-stripe/prueba.cjs";
    if (!existsSync(P) || !existsSync(T)) return falla(G, T, 0, "falta la pasarela o su prueba de contrato");
    const p = sinComent(P), t = readFileSync(T, "utf8"), i = p.indexOf("export const pasarela = {");
    const cuerpo = p.slice(i);
    const metodos = [...cuerpo.matchAll(/\n  (?:async )?(\w+)\(/g)].map((m) => m[1]);
    // 9k (L817): «cliente» lee la base antes de llamar a Stripe; el contrato le da un doble de la base (correr.sh) y la prueba. Nada queda sin contrato.
    const SIN_CONTRATO = new Set([]);
    const CO = "scripts/contrato-stripe/correr.sh";
    if (existsSync(CO) && !/const clientes = new Map<string, string \| null>\(\);/.test(readFileSync(CO, "utf8"))) falla(G, CO, 0, "el contrato corre la pasarela con un doble de la base (el cliente de Stripe de una persona)");
    for (let k = 0; k < metodos.length; k++) {
      const desde = cuerpo.search(new RegExp(`\\n  (?:async )?${metodos[k]}\\(`)), hasta = k + 1 < metodos.length ? cuerpo.search(new RegExp(`\\n  (?:async )?${metodos[k + 1]}\\(`)) : cuerpo.length;
      if (!SIN_CONTRATO.has(metodos[k]) && /\bstripe(Archivo)?\s*(<|\()/.test(cuerpo.slice(desde, hasta)) && !new RegExp(`pasarela\\.${metodos[k]}\\(`).test(t)) falla(G, T, 0, `«pasarela.${metodos[k]}» llama a Stripe y la prueba de contrato no lo prueba`);
    }
  },

  /* 6e. Cancelar (el organizador o To'Latino) devuelve el 100 % de cada orden: boletos (también los usados), mesa y extras, la comisión no
     se cobra; idempotente por orden (`evtcx-<cancelación>-<orden>`) y por boleto (la base), nunca más de lo que queda del cobro, con la
     devolución en dos pasos de 6d (la misma llave en cada reintento) y reanudable: el barrido sigue las cancelaciones a medias. Una orden
     con el cobro a medias espera. Al revés: devolver como comprador (menos el cargo), sin la llave por orden, sin el tope, sin el barrido
     o sin esperar el cobro a medias → falla. */
  devolucionTotalAlCancelar() {
    const G = "devolucionTotalAlCancelar", C = "apps/web/lib/evt-cambios.ts", D = "apps/web/lib/boletos-despues.ts", R = "apps/web/lib/barrido.ts", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql";
    if (!existsSync(C) || !existsSync(D) || !existsSync(M)) return falla(G, C, 0, "faltan lib/evt-cambios.ts, lib/boletos-despues.ts o la migración 0110");
    const c = sinComent(C), d = sinComent(D), m = readFileSync(M, "utf8");
    const pc = cuerpoFn(c, "procesarCancelacion");
    if (!/anotarDevolucionTotal\(c, \{ op, por: "event_cancelled",[\s\S]*?idem: `evtcx-\$\{cx\.id\}-\$\{op\}`[\s\S]*?usados: true \}\)/.test(pc)) falla(G, C, 0, "procesarCancelacion: devolución total con la llave por orden (evtcx-<cancelación>-<orden>), también los boletos usados");
    if (!/and not exists \(select 1 from payments p where p\.operation_id = o\.id and p\.status = 'held'\)/.test(pc) || !/await tx\(/.test(pc) || !/ejecutarDevolucion\(r\.rf\)/.test(pc)) falla(G, C, 0, "procesarCancelacion: una orden por transacción, espera el cobro a medias y hace la devolución con su llave");
    if (!/procesarCancelacion\(cx, \{ ordenes: lote/.test(cuerpoFn(c, "cancelarEvento"))) falla(G, C, 0, "cancelarEvento: las devoluciones salen en el acto (evt_cancelar_lote) y el resto en el barrido");
    const at = cuerpoFn(d, "anotarDevolucionTotal");
    if (!/calcular\(c, o\.id, o\.fee, sel, "business"\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: 100 % (calcular como el organizador: la comisión no se cobra)");
    if (!/const resto = Math\.max\(0, o\.amt - o\.ya\)/.test(at) || !/k\.total = Math\.min\(k\.total, resto\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: nunca más de lo que queda del cobro");
    if (!/select amount_cents as amt from refunds where idem_key = \$1/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: la misma llave = la misma devolución");
    if (!/d\.status in \('needs_response', 'under_review', 'lost', 'accepted'\)/.test(at)) falla(G, D, 0, "anotarDevolucionTotal: un cobro en disputa no se devuelve otra vez (el banco ya lo lleva)");
    if (existsSync(R) && !/cxs\.barrerCancelaciones\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "las cancelaciones a medias las sigue el barrido de cada minuto");
    if (!/create unique index if not exists event_cancellations_una_idx/.test(m)) falla(G, M, 0, "una cancelación por fecha (o por evento): índice único");
    if (!/check \(initiated_by in \([^)]*'event_cancelled'/.test(m)) falla(G, M, 0, "refunds.initiated_by admite 'event_cancelled'");
  },

  /* 6e. Al organizador se le paga después de la fecha y solo lo que dice el libro: la base calcula los montos al pasar a 'paying'
     (evt_liq_calc + evt_liq_deuda) y solo deja pasar una fecha terminada, con su martes llegado, sin disputas abiertas, sin devoluciones
     pendientes, sin la retención del organizador nuevo y con la cuenta habilitada; una vez en camino, nada cambia. Una transferencia por
     fecha (llave única); solo pagarUna transfiere, con el monto y la llave guardados. Al revés: quitar una de esas reglas, mandar otra llave
     o un monto de otro lado, o que la app escriba los montos → falla. */
  pagoDespuesDelEvento() {
    const G = "pagoDespuesDelEvento", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql", L = "apps/web/lib/evt-liquidacion.ts", R = "apps/web/lib/barrido.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, M, 0, "faltan la migración 0110 o lib/evt-liquidacion.ts");
    const t = ultimaFn("event_settlements_antes");
    const reglas = [
      [/if d\.ends_at > now\(\) then raise exception 'evt_liq_antes/, "la fecha tiene que haber terminado"],
      [/\(now\(\) at time zone tz\)::date < old\.pay_on then raise exception 'evt_liq_antes/, "no antes de su martes"],
      [/if k\.abiertas > 0 then raise exception 'evt_liq_disputa/, "sin disputas abiertas"],
      [/if k\.pendientes > 0 then raise exception 'evt_liq_devolucion/, "sin devoluciones pendientes"],
      [/if k\.vivos_cx > 0 then raise exception/, "una fecha cancelada, solo con todo devuelto"],
      [/if evt_liq_retener_nuevo\(new\.event_id, new\.business_id\) then raise exception 'evt_liq_nuevo/, "la retención del organizador nuevo"],
      [/a\.payouts_paused then raise exception 'evt_liq_cuenta/, "la cuenta de cobro habilitada y sin retener"],
      [/new\.base_cents := k\.base;/, "los montos los pone la base (evt_liq_calc)"],
      [/deuda := evt_liq_deuda\(new\.business_id, new\.id\);/, "la deuda de ajustes la calcula la base"],
      [/raise exception 'evt_liq_fija: lo que se transfiere ya quedó fijo'/, "en camino o pagada, lo calculado no cambia"],
      [/pg_advisory_xact_lock\(hashtext\('evt-liq:' \|\| new\.business_id\)\)/, "candado por negocio al descontar la deuda"],
    ];
    for (const [re, que] of reglas) if (!re.test(t)) falla(G, M, 0, `event_settlements_antes: ${que}`);
    const m = readFileSync(M, "utf8");
    if (!/idem_key       text not null unique check \(idem_key ~ '\^evt-liq-\\d\{1,18\}\$'\)/.test(m) || !/new\.idem_key := 'evt-liq-' \|\| new\.event_date_id;/.test(t)) falla(G, M, 0, "una llave por fecha (evt-liq-<fecha>, única), la pone la base");
    if (!/event_date_id  bigint not null unique references event_dates/.test(m)) falla(G, M, 0, "una liquidación por fecha");
    const l = sinComent(L), pu = cuerpoFn(l, "pagarUna");
    if (!/pasarela\.transferir\(\{ centavos: s\.net, destino: s\.dest, grupo: `evt-\$\{s\.eid\}`, idem: s\.idem,/.test(pu)) falla(G, L, 0, "pagarUna: el monto, el destino y la llave guardados por la base");
    if (!/if \(!s \|\| s\.st !== "paying"\) return/.test(pu) || !/set status = 'paid'[^`]*where id = \$1::bigint and status = 'paying'`/.test(pu)) falla(G, L, 0, "pagarUna: solo desde 'paying' y 'paid' una vez");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const tx = sinComent(x);
      if (x !== L && x !== "apps/web/lib/pagos/pasarela.ts" && /pasarela\.transferir\(|revertirTransferencia\(/.test(tx)) falla(G, x, 0, "solo lib/evt-liquidacion.ts transfiere al organizador");
      for (const q of tx.match(/`[^`]*`/g) ?? []) if (/update event_settlements set[^`]*\b(gross_cents|fee_cents|refunded_cents|disputed_cents|base_cents|carry_cents|net_cents|destination)\s*=/.test(q)) falla(G, x, 0, "los montos de una liquidación los pone la base, nunca la app");
    }
    if (existsSync(R) && !/liq\.liquidar\(\)/.test(readFileSync(R, "utf8"))) falla(G, R, 0, "la liquidación del martes corre en el barrido");
  },

  /* 6e (§6 #7). Los avisos de Eventos con SMS son SOLO los críticos de la plataforma: cancelación, cambio de fecha u hora, el boleto que te
     mandan, la cortesía, el lugar de la lista de espera (y el sí / no de la revisión al negocio, 6a). Los avisos del organizador van por
     push y en la app. Al revés: una plantilla evt_/bol_/rsvp_/puerta_/evp_/espera_ con SMS fuera de la lista → falla. */
  avisoEventoSmsSoloCritico() {
    const G = "avisoEventoSmsSoloCritico", dir = "packages/db/migrations";
    // 6g: puerta_invitado lleva el código para entrar a la puerta (§2 0112, como el Repartidor): sin él, el portero no entra.
    const OK = new Set(["evt_aprobado", "evt_rechazado", "bol_transfer_in", "bol_cortesia", "espera_lugar", "evt_cancelado", "evt_fecha_cancelada", "evt_movido", "evt_hora_cambio", "puerta_invitado",
      // 6i: evento privado (§2 0114): la solicitud nueva al restaurante (si no responde a tiempo, vence), la propuesta (vence en evp_propuesta_h),
      // la confirmación con el depósito cobrado y la cancelación del restaurante (dinero que vuelve).
      "evp_nueva", "evp_propuesta", "evp_ok", "evp_cancelado_negocio"]);
    for (const x of readdirSync(dir).filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`${dir}/${x}`, "utf8");
      for (const mm of t.matchAll(/\('((?:evt|bol|rsvp|puerta|evp|espera)_[a-z0-9_]+)', '[a-z]+', (?:null|'[a-z]+'), (true|false),/g)) if (mm[2] === "true" && !OK.has(mm[1])) falla(G, `${dir}/${x}`, 0, `la plantilla «${mm[1]}» manda SMS y no es crítica (§6 #7)`);
    }
    const C = "apps/web/lib/evt-cambios.ts";
    if (existsSync(C) && !/avisarMuchos\(r\.L, "evt_aviso"/.test(cuerpoFn(sinComent(C), "avisarAsistentes"))) falla(G, C, 0, "los avisos del organizador van con evt_aviso (sin SMS)");
  },

  /* 6e. Libros de los cambios del evento: event_changes, event_notices, ticket_choices son de solo inserción y una liquidación, una
     cancelación o una reversión no se borran (estados). Al revés: sin su trigger o con un update / delete desde la app → falla. */
  libroCambiosEvento() {
    const G = "libroCambiosEvento", M = "packages/db/migrations/0110_eventos_cambios_dinero.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0110");
    const m = readFileSync(M, "utf8");
    if (!/create trigger event_changes_no_cambia before update or delete on event_changes/.test(m) || !/create trigger ticket_choices_no_cambia before update or delete on ticket_choices/.test(m)) falla(G, M, 0, "event_changes y ticket_choices son de solo inserción (trigger)");
    if (!/if tg_op <> 'INSERT' then raise exception 'event_notices es solo de inserción'/.test(ultimaFn("event_notices_antes"))) falla(G, M, 0, "event_notices es de solo inserción");
    for (const [fn, msg] of [["event_settlements_antes", "una liquidación no se borra"], ["event_cancellations_antes", "una cancelación no se borra"], ["event_settlement_reversals_antes", "una reversión no se borra"]]) if (!new RegExp(`raise exception '${msg}`).test(ultimaFn(fn))) falla(G, M, 0, `${msg} (estados)`);
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\b(update|delete from) (event_changes|event_notices|ticket_choices)\b|\bdelete from (event_settlements|event_cancellations|event_settlement_reversals)\b/.test(q)) falla(G, x, 0, "un libro de los cambios del evento no se cambia y el dinero no se borra");
  },

  /* 6e. Dinero que no se desborda: en SQL, centavos × centavos (p. ej. la comisión × lo que queda del cobro) pasa de integer con un cobro
     de $2,250 (11 750 × 225 000 > 2 147 483 647) y la página se cae. Se multiplica en bigint (::bigint). Al revés: quitar el cast → falla. */
  dineroSinDesbordar() {
    const G = "dineroSinDesbordar";
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) for (const m of q.matchAll(/\b[\w.]*_cents(::\w+)?\s*\*\s*\(?\s*[\w.]*_cents/g)) if (!/::(bigint|numeric|int8|float8)/.test(m[0])) falla(G, x, 0, `«${m[0].slice(0, 60)}»: centavos × centavos en integer se desborda; multiplica en bigint`);
    }
  },

  /* 6f. Las fechas de una serie y de un evento de varios días las genera la base (evt_generar_fechas): la app nunca inserta ni borra
     fechas; el generador lee los topes de Configuración en el momento (cfg_int evt_fechas_max y evt_dias_adelante) y NUNCA salta ni mueve una
     fecha con gente (cada «skipped» y cada cambio de hora del generador va con «not evt_fecha_con_gente»); una fecha movida a mano no vuelve
     a su hora (moved_at); el barrido extiende las series (evtSeries); saltar desde el panel (lib/evt-series.ts) rechaza una fecha con gente.
     Al revés: insertar una fecha desde la app, quitar un control de gente o un tope, o sacar evtSeries del barrido → falla. */
  fechasLasGeneraLaBase() {
    const G = "fechasLasGeneraLaBase", M = "packages/db/migrations/0111_series_y_dias.sql", S6 = "apps/web/lib/evt-series.ts", BA = "apps/web/lib/barrido.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0111 (series y varios días)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        if (/\binsert into event_dates\b/.test(q)) falla(G, x, 0, "las fechas de un evento las crea solo la base (evt_generar_fechas), nunca la app");
        if (/\bdelete from event_dates\b/.test(q)) falla(G, x, 0, "una fecha no se borra: se salta o se cancela (estados)");
      }
    }
    const g = ultimaFn("evt_generar_fechas");
    if (!/cfg_int\('evt_fechas_max'\)/.test(g) || !/cfg_int\('evt_dias_adelante'\)/.test(g)) falla(G, M, 0, "evt_generar_fechas debe leer los topes de Configuración en el momento (evt_fechas_max, evt_dias_adelante)");
    // Cada sentencia que salta una fecha (con su «if … then» delante) mira si tiene gente.
    const sent = g.split(";");
    sent.forEach((l) => {
      if (/set status = 'skipped'/.test(l) && !/not evt_fecha_con_gente\(/.test(l)) falla(G, M, 0, `evt_generar_fechas salta una fecha sin mirar si tiene gente: «${l.trim().slice(0, 90)}»`);
    });
    if (!/d\.moved_at is null and d\.starts_at > now\(\) and not evt_fecha_con_gente\(d\.id\)/.test(g)) falla(G, M, 0, "evt_generar_fechas: una fecha movida a mano o con gente no vuelve a la hora de la regla");
    if (/\bdelete from event_dates\b/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "una fecha no se borra");
    if (!/sold_n > 0 or d\.rsvp_n > 0/.test(ultimaFn("evt_fecha_con_gente")) || !/ticket_holds h where h\.event_date_id = fid and h\.status = 'held'/.test(ultimaFn("evt_fecha_con_gente"))) falla(G, M, 0, "evt_fecha_con_gente: boletos vivos, RSVP y apartados cuentan como gente");
    if (!existsSync(S6)) return falla(G, S6, 0, "falta lib/evt-series.ts");
    const sf = cuerpoFn(sinComent(S6), "saltarFecha");
    if (!/if \(d\.gente\) throw/.test(sf) || !/business_id = \$2 for update/.test(sf)) falla(G, S6, 0, "saltarFecha: solo una fecha sin gente, del evento de ESE negocio (IDOR)");
    if (!existsSync(BA) || !/\["evtSeries", \(\) => ser\.extenderSeries\(\)\]/.test(readFileSync(BA, "utf8"))) falla(G, BA, 0, "el barrido extiende las series (evtSeries)");
  },

  /* 6f. Varios días: el aforo de cada día lo cuenta la base (event_day_stock con check capacity = 0 or sold_n + held_n <= capacity, sumado por el
     trigger ticket_stock_dia desde la existencia del ancla: el pase en todos los días, el boleto de un día en el suyo); los días que vale un
     boleto los pone la base al emitirlo (tickets_dias) y la puerta (6g/6h) los lee con bol_fechas_validas; un boleto de un día se vende hasta el
     corte de su día (bol_tipo_hasta en apartar). Al revés: quitar el check, el trigger, el corte o el mensaje del aforo → falla. */
  aforoPorDia() {
    const G = "aforoPorDia", M = "packages/db/migrations/0111_series_y_dias.sql", L = "apps/web/lib/boletos.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0111");
    const m = readFileSync(M, "utf8");
    if (!/constraint event_day_stock_cupo check \(capacity = 0 or sold_n \+ held_n <= capacity\)/.test(m)) falla(G, M, 0, "event_day_stock sin el check del aforo por día");
    if (!/create trigger ticket_stock_dia after update of held_n, sold_n on ticket_stock for each row execute function ticket_stock_dia\(\);/.test(m)) falla(G, M, 0, "el aforo por día se suma con el trigger ticket_stock_dia (toda ruta que aparte o venda)");
    const t = ultimaFn("ticket_stock_dia");
    if (!/set held_n = s\.held_n \+ dh, sold_n = s\.sold_n \+ ds/.test(t) || !/t\.valid_day is null or d\.day_index = t\.valid_day/.test(t)) falla(G, M, 0, "ticket_stock_dia: el pase cuenta en todos los días; el boleto de un día, en el suyo");
    if (!/create trigger tickets_dias before insert on tickets/.test(m) || !/new\.valid_days := case when vd is null then array\(select generate_series\(0, n - 1\)\)::smallint\[\] else array\[vd\] end;/.test(ultimaFn("tickets_dias"))) falla(G, M, 0, "los días que vale un boleto los pone la base al emitirlo (tickets_dias)");
    if (!/d\.day_index = any\(t\.valid_days\)/.test(ultimaFn("bol_fechas_validas"))) falla(G, M, 0, "bol_fechas_validas (gancho de la puerta) sale de valid_days");
    if (!/kind <> 'span' or d\.id = ancla/.test(ultimaFn("evt_sincronizar_venta"))) falla(G, M, 0, "la existencia de un evento de varios días vive solo en su ancla");
    if (!existsSync(L)) return;
    const a = cuerpoFn(sinComent(L), "apartar");
    if (!/and bol_tipo_hasta\(t\.id\) > now\(\)/.test(a)) falla(G, L, 0, "apartar: un boleto de un día se vende hasta el corte de su día (bol_tipo_hasta)");
    if (!/constraint === "event_day_stock_cupo"/.test(a)) falla(G, L, 0, "apartar: el aforo de un día lleno se dice con palabras (event_day_stock_cupo)");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) if (/\bupdate event_day_stock\b/.test(q) || /\binsert into event_day_stock\b/.test(q)) falla(G, x, 0, "el aforo por día lo lleva solo la base");
    }
  },

  /* 6f. Una serie (o un evento de varios días) sale UNA vez en cada lista pública: su primera fecha viva dentro del mismo filtro (PRIMERA), con
     el cursor (starts_at, id) de siempre; cada lista de lib/evt-publico.ts que lee fechas lo usa. Al revés: quitar PRIMERA de una lista → falla. */
  serieUnaVezEnLista() {
    const G = "serieUnaVezEnLista", L = "apps/web/lib/evt-publico.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    if (!/\(p\.starts_at, p\.id\) < \(d\.starts_at, d\.id\)/.test(t)) falla(G, L, 0, "PRIMERA: la primera fecha viva de cada evento por (starts_at, id)");
    for (const fn of ["eventosCiudad", "estaNoche", "destacado", "eventosSemana", "eventosDelOrganizador", "buscarEventos", "relacionados"]) {
      if (!/PRIMERA\(/.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}»: una serie sale una vez (PRIMERA)`);
    }
  },

  /* 6g. D1 · La puerta SOLO escanea (fase6 §3 «La puerta»): nada de /puerta, lib/puerta*, /api/puerta ni del modo puerta del panel importa
     la pasarela, los cobros, la compra de boletos, los códigos, la lista de espera ni la liquidación; no crea órdenes, boletos, pagos ni
     devoluciones; no lee montos. Los eventos no tienen entrada «door» y ninguna cadena de Eventos dice «pagar en la puerta» (el cover de
     Noche sí se paga en el local: es otra cosa y no está aquí). Al revés: un import de lib/cobros, un «insert into operations» o un
     «price_cents» en la puerta, o «pay at the door» en Eventos → falla. */
  sinVentaEnLaPuerta() {
    const G = "sinVentaEnLaPuerta";
    const PUERTA = (f) => /^apps\/web\/lib\/puerta[^/]*\.ts$/.test(f) || /^apps\/web\/app\/\(puerta\)\//.test(f) || /^apps\/web\/app\/api\/puerta\//.test(f) || /^apps\/web\/app\/panel\/(EventosPuerta\.tsx|acciones-puerta\.ts)$/.test(f);
    const PROHIBIDO = /(?:from\s+|import\()\s*["'](?:@\/lib\/|\.\.?\/(?:\.\.\/)*(?:lib\/)?)(pagos(\/[^"']*)?|cobros|boletos|boletos-despues|codigos-evt|espera|evt-liquidacion|tarjetas?|suscripcion|planes|apartados|pedir)["']/;
    let n = 0;
    for (const f of codigo) {
      if (!PUERTA(f) || !/\.tsx?$/.test(f)) continue;
      n++;
      const t = sinComent(f);
      t.split("\n").forEach((l, i) => { if (PROHIBIDO.test(l)) falla(G, f, i + 1, "la puerta no importa cobros, pagos ni la compra de boletos (D1: solo escanea)"); });
      for (const q of t.match(/`[^`]*`/g) ?? []) {
        if (/\b(insert into|update|delete from)\s+(operations|tickets|payments|refunds|ticket_holds|ticket_stock|table_stock|discount_codes)\b/.test(q)) falla(G, f, 0, `la puerta no crea ni cambia órdenes, boletos ni pagos: «${q.slice(0, 70)}»`);
        if (/\b(price_cents|fee_cents|total_cents|amount_cents|subtotal_cents|deposit_cents|discount_cents|cash_collected|refunded_cents|door_cents|cover_cents)\b/.test(q)) falla(G, f, 0, "la puerta no lee montos");
      }
    }
    if (!n) falla(G, "apps/web/lib/puerta.ts", 0, "no encuentro la puerta (lib/puerta*.ts, app/(puerta))");
    const M = "packages/db/migrations/0112_puerta.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la puerta");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche", "puerta_registrar"]) {
      const b = ultimaFn(fn);
      if (!b) falla(G, M, 0, `falta ${fn}`);
      if (/\b(insert into|update)\s+(operations|payments|refunds|ticket_holds|ticket_stock|table_stock)\b|insert into tickets\b|price_cents|total_cents|amount_cents/.test(b)) falla(G, M, 0, `${fn}: la puerta no vende ni toca dinero`);
    }
    if (!/entry\s+text not null check \(entry in \('free', 'rsvp', 'tickets'\)\)/.test(readFileSync("packages/db/migrations/0106_eventos_base.sql", "utf8"))) falla(G, "packages/db/migrations/0106_eventos_base.sql", 0, "events.entry sin «door» (D1)");
    const EVT = (f) => /^apps\/web\/lib\/(evt[^/]*|boletos[^/]*|puerta[^/]*|codigos-evt|espera|rsvp)\.ts$/.test(f) || /^apps\/web\/app\/(\(app\)\/eventos|\(puerta\)|api\/puerta)\//.test(f) || /^apps\/web\/app\/panel\/(Eventos[^/]*|acciones-(eventos|puerta))\.tsx?$/.test(f) || /^apps\/web\/app\/admin\/(EventosAdmin|BoletoAdmin|PuertaAdmin|ColasEventos)\.tsx$/.test(f);
    for (const f of codigo) {
      if (!EVT(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/pag(ar|a|as|an|o)\s+en\s+la\s+puerta|pay(ing)?\s+at\s+the\s+door|venta\s+en\s+(la\s+)?puerta|(se\s+)?vend(e|en)\s+en\s+la\s+puerta(?!\s*:)|cobr(ar|a|amos)\s+en\s+la\s+puerta|door\s+sales?\b|sell(s|ing)?\s+at\s+the\s+door/i.test(l) && !/no se vend|no se venden|is not sold|are not sold|no tickets are sold|nadie vende|no vende|en la puerta no|no selling|EN LA PUERTA NO SE VENDE|NO SE VENDE/i.test(l)) falla(G, f, i + 1, "D1: en la puerta no se vende ni se paga (ninguna cadena de «pagar en la puerta»)"); });
    }
  },

  /* 6g. Un portero solo ve y toca SU evento ese día (fase6 §3 «Porteros»): toda acción de /puerta pasa por accesoPuerta(persona, sesión) →
     puerta_acceso() de la base (sesión abierta + portero activo con ESE evento, o miembro con «evt» + negocio activo + ventana del día de
     Configuración) antes de leer o escribir; las funciones de la base vuelven a preguntar (puerta_sesion); toda lectura filtra por el
     evento y la fecha de la sesión; ningún DTO de la puerta trae teléfono, correo ni montos. Al revés: una acción sin accesoPuerta, la
     ventana o el alcance quitados de la base, una consulta sin el evento, o un «u.phone» en un select → falla. */
  porteroSoloSuEvento() {
    const G = "porteroSoloSuEvento", A = "apps/web/app/(puerta)/puerta/acciones.ts", R = "apps/web/app/api/puerta/escanear/route.ts", V = "apps/web/app/api/puerta/vivo/route.ts", P = "apps/web/app/(puerta)/puerta/s/[sesion]/page.tsx", L = "apps/web/lib/puerta.ts", M = "packages/db/migrations/0112_puerta.sql";
    for (const f of [A, R, V, P, L, M]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta");
    const a = sinComent(A);
    if (!/async function puerta\(sesion: unknown\)[^\n]*accesoPuerta\(u\.id, String\(sesion \?\? ""\)\)/.test(a)) falla(G, A, 0, "las acciones de una puerta preguntan accesoPuerta(persona, sesión)");
    for (const p of a.split(/\nexport async function /).slice(1)) {
      const nombre = p.slice(0, p.indexOf("(")), cuerpo = p.slice(0, p.indexOf("\n}"));
      if (/\(sesion: string/.test(p.slice(0, 120)) && !/const c = await puerta\(sesion\);\s*if \(!c\) return CERRADA;/.test(cuerpo)) falla(G, A, 0, `«${nombre}» no revisa el acceso a la puerta antes de actuar`);
      if (!/await (puerta|quien)\(/.test(cuerpo)) falla(G, A, 0, `«${nombre}» no revisa quién es (cuenta y mismo origen)`);
    }
    const r = sinComent(R);
    if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const ctx = await accesoPuerta\(u\.id, String\(b\.sesion \?\? ""\)\);\s*if \(!ctx\) return NO\(/.test(r)) falla(G, R, 0, "el escaneo pregunta mismo origen y accesoPuerta antes de todo");
    const v = sinComent(V);
    if (!/const ctx = await accesoPuerta\(u\.id, sesion\);\s*if \(!ctx\)/.test(v) || !/sigue = async \(\) => !!\(await accesoPuerta\(u\.id, sesion\)\)/.test(v) || !/accesoPanel\(negocio, "evt"\)/.test(v) || !/e\.business_id = \$2/.test(v)) falla(G, V, 0, "el SSE revisa el acceso al abrir y en cada cambio (puerta) o «evt» y la fecha de SU negocio (panel)");
    if (!/const ctx = await accesoPuerta\(u\.id, sesion\);\s*if \(!ctx\) return <PuertaCerrada/.test(sinComent(P))) falla(G, P, 0, "la pantalla de la puerta pregunta accesoPuerta en cada carga");
    const l = sinComent(L);
    if (!/where s\.id = \$1::bigint and s\.user_id = \$2 and puerta_acceso\(s\.id, \$2\)/.test(cuerpoFn(l, "accesoPuerta"))) falla(G, L, 0, "accesoPuerta decide con puerta_acceso() de la base");
    for (const [fn, re] of [["infoBoleto", /where t\.id = \$1::bigint and t\.event_id = \$2::bigint/], ["filas", /where t\.event_id = \$1::bigint/], ["filas", /where v\.event_id = \$1::bigint and v\.event_date_id = \$2::bigint/], ["darMesa", /event_id = \$2::bigint and event_date_id = \$3::bigint/], ["pregunta", /t\.event_id = \$2::bigint/]])
      if (!re.test(cuerpoFn(l, fn))) falla(G, L, 0, `«${fn}» no filtra por el evento o la fecha de la sesión`);
    const DTO = ["apps/web/lib/puerta.ts", "apps/web/lib/puerta-admin.ts", "apps/web/lib/puerta-comun.ts", "apps/web/app/api/puerta/escanear/route.ts"].concat(codigo.filter((f) => /^apps\/web\/app\/\(puerta\)\//.test(f)));
    for (const f of DTO) {
      if (!existsSync(f)) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) {
        if (!/\bselect\b[\s\S]*\bfrom\b|\bupdate\b[\s\S]*\bset\b|\binsert into\b/i.test(q)) continue; // solo SQL
        const sinWhere = q.replace(/right\(u\.phone, 4\) = \$\{?\w*\}?/g, "");
        if (/\bphone\b|\bemail\b|phone_enc|phone_hash/.test(sinWhere)) falla(G, f, 0, `la puerta no saca teléfonos ni correos (solo compara los últimos 4): «${q.slice(0, 70)}»`);
      }
    }
    const m = readFileSync(M, "utf8"), acc = ultimaFn("puerta_puede");
    if (!/now\(\) between d\.doors_at - make_interval\(hours => cfg_int\('puerta_ventana_h'\)\) and d\.ends_at \+ make_interval\(hours => cfg_int\('puerta_ventana_h'\)\)/.test(acc)) falla(G, M, 0, "puerta_puede: solo el día (ventana de Configuración)");
    if (!/f\.user_id = uid and f\.status = 'active' and f\.business_id = e\.business_id\s*and \(f\.scope = 'all' or e\.id = any\(f\.event_ids\)\)/.test(acc)) falla(G, M, 0, "puerta_puede: portero activo, de ese negocio y con ese evento");
    if (!/m\.status = 'active'\s*and \(m\.kind = 'owner' or m\.panel_access && array\['all', 'evt'\]::text\[\]\)/.test(acc)) falla(G, M, 0, "puerta_puede: el miembro del negocio con «evt»");
    if (!/s\.user_id = uid and s\.ended_at is null\s*and puerta_puede\(s\.event_date_id, uid, s\.door_staff_id\)/.test(ultimaFn("puerta_acceso"))) falla(G, M, 0, "puerta_acceso: la sesión abierta de esa persona y puerta_puede");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche"]) if (!/s := puerta_sesion\(p_session, p_user\);/.test(ultimaFn(fn))) falla(G, M, 0, `${fn}: la base vuelve a revisar la sesión y el acceso`);
    if (!/if not puerta_acceso\(p_session, p_user\) then raise exception 'puerta_sin_acceso/.test(ultimaFn("puerta_sesion"))) falla(G, M, 0, "puerta_sesion: sin acceso = excepción");
    if (!/if t\.event_id <> d\.event_id then r := 'wrong_event';/.test(ultimaFn("puerta_entrada"))) falla(G, M, 0, "puerta_entrada: un boleto de otro evento no entra");
    if (!/update door_sessions set ended_at = now\(\), ended_by = 'removed' where door_staff_id = new\.id and ended_at is null;/.test(m)) falla(G, M, 0, "quitar a un portero cierra sus sesiones en el acto");
    if (!/raise exception 'puerta_evento_ajeno/.test(ultimaFn("door_staff_antes"))) falla(G, M, 0, "un portero solo escanea eventos de su negocio");
  },

  /* 6g. Un escaneo cuenta una sola vez (fase6 §3): el id lo genera el teléfono (uuid, llave primaria de ticket_scans); cada función de la
     puerta primero toma el candado de ese id y devuelve lo que ya se decidió (puerta_repetido) ANTES de mirar la sesión o el boleto; solo
     puerta_registrar escribe en ticket_scans (marca tl.puerta) y la fila del boleto se bloquea (for update) antes de decidir; la entrada
     no pasa de las entradas del boleto (check). Al revés: sin el candado, el id generado en el servidor, la fila sin bloquear o el
     check quitado → falla. */
  escaneoIdempotente() {
    const G = "escaneoIdempotente", M = "packages/db/migrations/0112_puerta.sql", L = "apps/web/lib/puerta.ts", E = "apps/web/app/(puerta)/puerta/Escanear.tsx";
    for (const f of [M, L, E]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta");
    const m = readFileSync(M, "utf8");
    if (!/id\s+uuid primary key,\s+-- lo genera el teléfono/.test(m)) falla(G, M, 0, "ticket_scans.id es el uuid del teléfono (llave primaria)");
    if (!/perform pg_advisory_xact_lock\(hashtextextended\('puerta:' \|\| p_scan::text, 0\)\);\s*select \* into sc from ticket_scans where id = p_scan;/.test(ultimaFn("puerta_repetido"))) falla(G, M, 0, "puerta_repetido: candado del id y lo que ya se decidió");
    for (const fn of ["puerta_entrada", "puerta_rsvp", "puerta_contar", "puerta_noche"]) {
      const b = ultimaFn(fn), i = b.indexOf("sc := puerta_repetido(p_scan);\n  if sc.id is not null then return sc; end if;"), j = b.indexOf("puerta_sesion(");
      if (i < 0 || j < 0 || i > j) falla(G, M, 0, `${fn}: primero el escaneo repetido (mismo id), después todo lo demás`);
    }
    // 6h · La cola sin conexión: el mismo id del teléfono (lo de la cola sube con su id: repetirla no cuenta dos veces); un id de OTRA
    // puerta no devuelve nada; el teléfono solo saca de la cola lo que el servidor contestó.
    const o = ultimaFn("puerta_offline"), oi = o.indexOf("sc := puerta_repetido(p_scan);"), oj = o.indexOf("puerta_sesion_cola(");
    if (oi < 0 || oj < 0 || oi > oj || !/if sc\.session_id <> p_session then raise exception 'puerta_id_ajeno/.test(o)) falla(G, "packages/db/migrations/0113_puerta_sin_conexion.sql", 0, "puerta_offline: primero el escaneo repetido (y de ESTA puerta), después todo lo demás");
    const HL = "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts";
    if (existsSync(HL)) { const h = sinComent(HL); if (!/const e = est\.current, id = String\(c\.id \?\? ""\)/.test(h) || (h.match(/L\.encolar\(sesion, \{/g) ?? []).length !== (h.match(/L\.encolar\(sesion, \{ id, at,/g) ?? []).length || !/await L\.quitarDeCola\(lote\.map\(\(x, i\) => \(hechos\[i\] \? x\.id : ""\)\)/.test(h)) falla(G, HL, 0, "la cola guarda el id del escaneo del teléfono y solo saca lo que el servidor contestó"); }
    if (!/select \* into t from tickets where id = p_ticket for update;/.test(ultimaFn("puerta_entrada")) || !/select \* into x from ticket_entries where ticket_id = t\.id and event_date_id = d\.id for update;/.test(ultimaFn("puerta_entrada"))) falla(G, M, 0, "puerta_entrada: la fila del boleto y la de su entrada del día se bloquean antes de decidir");
    if (!/select \* into v from rsvps where id = p_rsvp for update;/.test(ultimaFn("puerta_rsvp"))) falla(G, M, 0, "puerta_rsvp: la fila del RSVP se bloquea");
    if (!/constraint ticket_entries_una_vez check \(entered_n between 0 and admits\)/.test(m)) falla(G, M, 0, "ticket_entries: nadie entra más veces que las entradas del boleto (check)");
    if (!/if tg_op <> 'INSERT' then raise exception 'ticket_scans es solo de inserción'; end if;\s*if coalesce\(current_setting\('tl\.puerta', true\), ''\) <> 'si' then raise exception/.test(ultimaFn("ticket_scans_antes"))) falla(G, M, 0, "ticket_scans: solo inserción y solo desde puerta_registrar (marca)");
    const l = sinComent(L);
    if (!/const UUID = \/\^\[0-9a-f\]\{8\}-/.test(l) || !/if \(!UUID\.test\(id\)\) return null;/.test(cuerpoFn(l, "limpiarIn"))) falla(G, L, 0, "cada escaneo trae su id uuid (sin id no hay escaneo)");
    if (!/select \(puerta_repetido\(\$1::uuid\)\)\.id::text as id/.test(cuerpoFn(l, "llegadaNoche"))) falla(G, L, 0, "la lista de la noche toma el candado del id antes de marcar");
    if (!/id: uuid\(\)/.test(sinComent(E)) || !/id: q\.p\.id/.test(sinComent(E))) falla(G, E, 0, "el teléfono genera el id del escaneo (y la confirmación reusa el de la pregunta)");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) { const t = sinComent(x); if (/tl\.puerta/.test(t)) falla(G, x, 0, "la app no enciende la marca de la puerta"); for (const q of t.match(/`[^`]*`/g) ?? []) if (/\binsert into (ticket_scans|ticket_entries|door_counts)\b/.test(q)) falla(G, x, 0, "solo la base escribe escaneos, entradas y contadores"); }
  },

  /* 6h. El paquete sin conexión de la puerta trae SOLO lo que la validación necesita y nunca queda legible fuera de su sesión (fase6 §3 «Sin
     conexión»): la base arma las filas (puerta_paquete_filas: id, versión, entradas, estado, nombre + inicial, últimos 4 y huella del código,
     días, tipo, banderas, entraron / adentro / última puerta y hora; por RSVP id, personas, estado, nombre, llegaron) sin teléfonos, correos,
     montos ni pagos; el servidor lo firma (Ed25519, firmarPaquete) y lo cifra con la llave derivada de ESA sesión (AES-256-GCM) solo para
     una puerta abierta (accesoPuerta + door_packages exige puerta_acceso) y el teléfono que la abrió; el teléfono verifica la firma antes de
     usarlo, lo guarda cifrado con una llave NO exportable, lo borra al vencer, al cerrarse o revocarse la sesión y al salir de la cuenta; el
     paquete vence (expires_at = fin + puerta_paquete_h) y el barrido lo revoca. Al revés: un «phone» o un monto en las filas, la llave
     exportable, guardar sin cifrar, no verificar la firma, servir el paquete sin accesoPuerta o sin revocar al cerrar → falla. */
  paqueteMinimo() {
    const G = "paqueteMinimo", M = "packages/db/migrations/0113_puerta_sin_conexion.sql", L = "apps/web/lib/puerta-paquete.ts", R = "apps/web/app/api/puerta/paquete/route.ts",
      C = "apps/web/app/(puerta)/puerta/sin-conexion/local.ts", H = "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts", BR = "apps/web/lib/barrido.ts";
    for (const f of [M, L, R, C, H, BR]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta sin conexión");
    const m = readFileSync(M, "utf8"), filas = ultimaFn("puerta_paquete_filas");
    const cols = /create or replace function puerta_paquete_filas\([^)]*\)\s*returns table \(([\s\S]*?)\)\s*language/.exec(m)?.[1]?.replace(/\s+/g, " ").trim();
    if (cols !== "k text, id bigint, v integer, a smallint, st text, nom text, c4 text, ch text, dias smallint[], tipo jsonb, mesa boolean, comp boolean, tr boolean, e smallint, i smallint, ud text, uh text, cambio timestamptz")
      falla(G, M, 0, `puerta_paquete_filas devuelve otras columnas (solo las de §3): «${cols?.slice(0, 80)}»`);
    if (/\bphone|email|_cents\b|price|amount|payment|stripe|card|door_code|first_name as|last_name as/.test(filas.replace(/puerta_nombre\(u\.first_name, u\.last_name\)/g, ""))) falla(G, M, 0, "el paquete no trae teléfonos, correos, montos, pagos ni el código de la lista (solo nombre + inicial)");
    if (!/new\.expires_at := d\.ends_at \+ make_interval\(hours => cfg_int\('puerta_paquete_h'\)\);/.test(ultimaFn("door_packages_antes")) || !/not puerta_acceso\(s\.id, s\.user_id\) then raise exception 'puerta_cerrada/.test(ultimaFn("door_packages_antes"))) falla(G, M, 0, "el paquete solo sale para una puerta abierta con acceso y vence al final de la fecha + puerta_paquete_h");
    if (!/update door_packages set revoked_at = now\(\), revoked_reason = new\.ended_by where session_id = new\.id and revoked_at is null;/.test(ultimaFn("door_sessions_despues"))) falla(G, M, 0, "al cerrarse la sesión, su paquete queda revocado");
    const l = sinComent(L);
    if (!/from puerta_paquete_filas\(\$1::bigint/.test(l) || (l.match(/`[^`]*`/g) ?? []).some((q) => /\bselect\b[\s\S]*\bfrom\b/i.test(q) && /\b(phone|email|price_cents|fee_cents|total_cents|amount_cents|stripe)\b/.test(q))) falla(G, L, 0, "lib/puerta-paquete.ts arma las filas solo con puerta_paquete_filas y no lee teléfonos ni montos");
    if (!/\{ kid, firma \} = await firmarPaquete\(j\);/.test(l) || !/createCipheriv\("aes-256-gcm", llave, iv\)/.test(l) || !/llaveDerivada\("puerta-paquete", `\$\{sesion\}\|\$\{userId\}\|\$\{device \?\? "-"\}`\)/.test(l)) falla(G, L, 0, "el paquete se firma (Ed25519) y se cifra (AES-256-GCM) con la llave de ESA sesión, persona y teléfono");
    if (!/s\.user_id = \$2 and s\.ended_at is null/.test(cuerpoFn(l, "armarPaquete")) || !/device\.toLowerCase\(\) !== s\.device\.toLowerCase\(\)/.test(cuerpoFn(l, "armarPaquete"))) falla(G, L, 0, "el paquete solo para la sesión abierta de esa persona y el teléfono que la abrió");
    const r = sinComent(R);
    if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const ctx = await accesoPuerta\(u\.id, String\(b\?\.sesion \?\? ""\)\);\s*if \(!ctx\) return NO\(/.test(r) || !/no-store/.test(r)) falla(G, R, 0, "/api/puerta/paquete: mismo origen, accesoPuerta y sin caché");
    const c = sinComent(C);
    // 8a · La llave pasa por lib/nativo/almacen.ts (IndexedDB en la web, TLLocal en la app): allí se importa NO exportable.
    const AL = "apps/web/lib/nativo/almacen.ts";
    if (!/return ALM\.guardarLlave\("llaves", s, b64\(raw\)\);/.test(c) || !existsSync(AL) || !/importKey\("raw", raw, \{ name: "AES-GCM" \}, false, \["encrypt", "decrypt"\]\)/.test(readFileSync(AL, "utf8"))) falla(G, C, 0, "la llave de la sesión en el teléfono es NO exportable (importKey …, false, …)");
    if (!/datos: await cifrar\(k, e\)/.test(cuerpoFn(c, "guardarEstado")) || !/datos: await cifrar\(k, x\)/.test(cuerpoFn(c, "encolar"))) falla(G, C, 0, "el paquete y la cola se guardan cifrados");
    if (!/throw new Error\("paquete_firma"\)/.test(cuerpoFn(c, "abrirSobre")) || !/verificarEd\(pub, new TextEncoder\(\)\.encode\(`TLPK1\\n\$\{sobre\.j\}`\)/.test(cuerpoFn(c, "abrirSobre"))) falla(G, C, 0, "el teléfono verifica la firma del paquete antes de usarlo");
    if (!/if \(Date\.parse\(f\.vence\) < Date\.now\(\)\) \{ await borrarSesion\(s\); return null; \}/.test(cuerpoFn(c, "leerEstado"))) falla(G, C, 0, "un paquete vencido se borra del teléfono");
    for (const q of c.match(/put\(\{[^}]*\}\)/g) ?? []) if (!/datos|k\b|v\b/.test(q)) falla(G, C, 0, `algo se guarda sin cifrar: «${q.slice(0, 60)}»`);
    const h = sinComent(H);
    if ((h.match(/r\.j\.cerrada\) (\{ )?await olvidar\(/g) ?? []).length < 3 || !/await L\.borrarSesion\(sesion\)/.test(cuerpoFn(h, "usePuertaLocal"))) falla(G, H, 0, "cerrada, revocada o vencida (al bajar el paquete, al subir la cola y al bajar los cambios): el teléfono borra todo de esa puerta");
    if (!/\["puertaPaquetes", \(\) => paq\.vencerPaquetes\(\)\]/.test(readFileSync(BR, "utf8"))) falla(G, BR, 0, "el barrido vence los paquetes");
  },

  /* 6h. Los choques entre porteros sin conexión se resuelven igual en cualquier orden de subida (fase6 §3 pasos 1–5): la hora que cuenta es
     la del teléfono corregida con el desfase medido en esa subida (acotada a la sesión y nunca en el futuro); puerta_rehacer vuelve a decidir
     TODOS los escaneos que dejaron entrar a ese boleto en esa fecha ordenados por (hora que cuenta, llegada al servidor, id), con la fila del
     boleto y la de su entrada bloqueadas; lo que cambia queda como corrección de solo inserción (ticket_scan_fixes, el escaneo original no se
     toca) y la resolución vigente sale de ticket_scans_ef; el que pierde es «duplicate» con incidencia; lo que ya no valía al subir es
     rejected con incidencia. Las lecturas de la puerta, el panel y el Super Admin usan la resolución vigente. Al revés: ordenar por la
     llegada, no bloquear el boleto, corregir con un update, leer ticket_scans para resultados o no corregir el reloj → falla. */
  choqueDePuertaDeterminista() {
    const G = "choqueDePuertaDeterminista", M = "packages/db/migrations/0113_puerta_sin_conexion.sql", Y = "apps/web/lib/puerta-sync.ts";
    for (const f of [M, Y]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo de la puerta sin conexión");
    const m = readFileSync(M, "utf8"), rh = ultimaFn("puerta_rehacer"), of = ultimaFn("puerta_offline");
    if (!/\) q order by q\.eff, q\.srv, q\.id/.test(rh)) falla(G, M, 0, "puerta_rehacer decide por (hora que cuenta, llegada al servidor, id)");
    if (!/\(not ef\.offline and ef\.orig_resolution = 'accepted'\) or \(ef\.offline and ef\.local_in/.test(rh)) falla(G, M, 0, "puerta_rehacer vuelve a decidir todos los que dejaron entrar (en línea aceptados y sin conexión que el teléfono dejó pasar)");
    if (!/select \* into x from ticket_entries where ticket_id = t\.id and event_date_id = d\.id for update;/.test(rh) || !/select \* into t from tickets where id = p_ticket for update;/.test(of)) falla(G, M, 0, "el boleto y su entrada del día se bloquean antes de volver a decidir");
    if (!/insert into ticket_scan_fixes/.test(rh) || /\bupdate ticket_scans\b/.test(m)) falla(G, M, 0, "lo que cambia queda como corrección (ticket_scan_fixes); ticket_scans no se toca");
    if (!/if tg_op <> 'INSERT' then raise exception 'ticket_scan_fixes es solo de inserción'/.test(ultimaFn("ticket_scan_fixes_antes"))) falla(G, M, 0, "ticket_scan_fixes es de solo inserción");
    if (!/order by x\.id desc limit 1\) f on true/.test(m)) falla(G, M, 0, "ticket_scans_ef: la resolución vigente es la última corrección");
    if (!/insert into door_incidents [^;]*'duplicado'[^;]*on conflict \(scan_id, kind\) where auto do nothing/.test(rh)) falla(G, M, 0, "un duplicado abre su incidencia (una por escaneo)");
    if (!/'sin_valor'/.test(of)) falla(G, M, 0, "lo que ya no valía al subir abre su incidencia");
    if (!/eff := p_at_device \+ make_interval\(secs => coalesce\(p_offset_ms, 0\) \/ 1000\.0\);/.test(of) || !/eff := least\(greatest\(coalesce\(eff, now\(\)\), s\.started_at\), coalesce\(s\.ended_at, now\(\)\), now\(\)\);/.test(of)) falla(G, M, 0, "la hora que cuenta: la del teléfono + su desfase, dentro de la sesión y nunca en el futuro");
    if (!/new\.at_eff := case when new\.offline and new\.at_eff is not null then least\(new\.at_eff, new\.at_server\) else new\.at_server end;/.test(ultimaFn("ticket_scans_antes"))) falla(G, M, 0, "en línea la hora que cuenta es la del servidor");
    const y = sinComent(Y);
    if (!/desfase = [^;]*Math\.round\(Date\.now\(\) - tel\)/.test(y)) falla(G, Y, 0, "el desfase se mide en cada subida (hora del servidor − hora del teléfono)");
    for (const f of ["apps/web/lib/puerta.ts", "apps/web/lib/puerta-admin.ts", "apps/web/lib/puerta-equipo.ts", "apps/web/lib/puerta-sync.ts"]) {
      if (!existsSync(f)) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/\bfrom ticket_scans\b(?!_ef)[^`]*\b(resolution|first_n|result)\b|\b(resolution|first_n)\b[^`]*\bfrom ticket_scans\b(?!_ef)/.test(q)) falla(G, f, 0, `los resultados de la puerta se leen con la resolución vigente (ticket_scans_ef): «${q.slice(0, 70)}»`);
    }
  },

  /* 6h. El service worker de la Puerta y el de Mis boletos guardan solo su cáscara estática y archivos con huella: nunca /api/ ni el HTML de
     una puerta o de un boleto (traen datos de la cuenta); las cáscaras son páginas estáticas sin cuenta. El QR del cliente se guarda cifrado
     con la llave de la sesión (cookie tl_bk), sin precio, y salir de la cuenta borra la base y la cookie. Al revés: guardar /api/ o el HTML
     de la navegación, una cáscara que lee la cuenta, guardar el boleto sin cifrar o no borrar al salir → falla. */
  sinConexionSinDatosAjenos() {
    const G = "sinConexionSinDatosAjenos", W = ["apps/web/public/puerta/sw.js", "apps/web/public/sw-boletos.js"], K = ["apps/web/app/(puerta)/puerta/sin-conexion/page.tsx", "apps/web/app/(sin-senal)/cuenta/boletos/sin-conexion/page.tsx"];
    const BS = "apps/web/lib/boletos-sin-conexion.ts", CU = "apps/web/lib/cuenta.ts";
    for (const f of [...W, ...K, BS, CU]) if (!existsSync(f)) return falla(G, f, 0, "falta un archivo del modo sin conexión");
    for (const f of W) {
      const t = sinComent(f);
      try { execSync(`node --check ${JSON.stringify(f)}`, { stdio: ["ignore", "ignore", "pipe"] }); } catch { falla(G, f, 0, "el service worker no se puede leer (node --check)"); }
      if (!/if \(url\.pathname\.indexOf\("\/api\/"\) === 0\) return;/.test(t)) falla(G, f, 0, "el service worker no toca /api/");
      const nav = /if \(req\.mode === "navigate"\) \{([\s\S]*?)\n  \}\n/.exec(t)?.[1] ?? "";
      if (!nav || /\.put\(|cache\.add|caches\.open/.test(nav)) falla(G, f, 0, "una navegación nunca se guarda (el HTML de una puerta o de un boleto trae datos de la cuenta)");
      if (!/var ESTATICO = \/\^\\\/\(_next\\\/static\\\/\|fuentes\\\/\)\/;/.test(t)) falla(G, f, 0, "solo se guardan archivos con huella (/_next/static) y fuentes");
      for (const m of t.matchAll(/c\.put\(([^,]+),/g)) if (!/^(u|CASCARA|req)$/.test(m[1].trim())) falla(G, f, 0, `se guarda algo que no es la cáscara ni un archivo estático: «${m[1]}»`);
    }
    for (const f of K) { const t = sinComent(f); if (!/export const dynamic = "force-static";/.test(t) || /\byo\(|cookies\(|headers\(|@\/lib\/(cuenta|db|boletos|puerta)\b/.test(t)) falla(G, f, 0, "la cáscara es estática y no lee la cuenta"); }
    const b = sinComent(BS);
    if (!/crypto\.subtle\.encrypt\(\{ name: "AES-GCM", iv \}, k,/.test(cuerpoFn(b, "guardarBoleto")) || /precio|price/.test(b)) falla(G, BS, 0, "el boleto se guarda cifrado y sin precio");
    // 8a · El almacén (lib/nativo/almacen.ts) reemplazó a IndexedDB directo: la regla es la misma (sin llave de sesión se vacía; lo de otra cuenta se borra).
    if (!/if \(!v\) \{ await ALM\.vaciar\("b"\); return; \}/.test(cuerpoFn(b, "guardarBoleto")) || !/x\.kid !== kid/.test(cuerpoFn(b, "leerBoletos"))) falla(G, BS, 0, "sin la llave de la sesión no se guarda nada y lo de otra cuenta se borra");
    // 8a · En la app, la copia de la llave de la sesión en el llavero del teléfono se cambia (y se vacía lo guardado) si la cookie cambió o ya no está.
    if (!/if \(c !== m\) \{ await ALM\.vaciar\("b"\);/.test(cuerpoFn(b, "llaveSesion"))) falla(G, BS, 0, "en la app, otra cuenta (otra cookie) vacía lo guardado de la anterior");
    if (!/jar\.delete\(\{ name: COOKIE_BOLETOS, path: "\/cuenta\/boletos" \}\);/.test(cuerpoFn(sinComent(CU), "salir"))) falla(G, CU, 0, "salir de la cuenta borra la llave de los boletos sin señal");
    for (const x of codigo) { if (!/^apps\/web\/app\/.*\.tsx$/.test(x)) continue; const t = sinComent(x); if (/fetch\("\/api\/cuenta\/salir"/.test(t) && !/await olvidarSinConexion\(\); await fetch\("\/api\/cuenta\/salir"/.test(t)) falla(G, x, 0, "al salir de la cuenta, primero se borra lo guardado sin conexión (olvidarSinConexion)"); }
  },

  /* 6i. Evento privado: el depósito sale SOLO de la propuesta guardada (la base calcula líneas, subtotal, impuesto, total y depósito en el
     trigger de private_event_quotes), ninguna acción del cliente ni el formulario traen un monto, y aceptar va en orden: retener → aceptación
     (la base revisa última versión, vigencia y estado; una por solicitud) → commit → cobrar; si algo falla antes, se libera. Al revés: un monto
     desde el teléfono, la base sin calcular, la aceptación sin revisar vencida o reemplazada, o cobrar antes de registrar → falla. */
  depositoDeLaPropuesta() {
    const G = "depositoDeLaPropuesta", M = "packages/db/migrations/0114_evento_privado.sql", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, L, 0, "faltan 0114 o lib/evento-privado.ts");
    const q = ultimaFn("private_event_quotes_antes"), a = ultimaFn("private_event_acceptances_antes");
    if (!/new\.subtotal_cents := sub;/.test(q) || !/new\.total_cents := new\.subtotal_cents \+ new\.tax_cents;/.test(q) || !/from tax_rules t where t\.city_id = o\.city_id and t\.category_id = 'NEG-FOOD'/.test(q)) falla(G, M, 0, "la base calcula subtotal, impuesto de la ciudad y total de cada propuesta");
    if (!/new\.deposit_cents := greatest\(100, round\(new\.total_cents \* new\.deposit_pct \/ 100\.0\)\);/.test(q) || !/new\.deposit_cents := paid;/.test(q)) falla(G, M, 0, "la base calcula el depósito (el % del negocio; en un cambio, lo ya pagado)");
    if (!/raise exception 'evp: esa propuesta ya fue reemplazada'/.test(a) || !/raise exception 'evp: esa propuesta ya venció'/.test(a) || !/raise exception 'evp: solo acepta quien pidió'/.test(a)) falla(G, M, 0, "aceptar: solo la última versión, vigente y de quien pidió (en la base)");
    if (!/create unique index if not exists private_event_acceptances_deposito_uq on private_event_acceptances \(operation_id\) where kind <> 'change'/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "una sola aceptación con depósito por solicitud (índice único)");
    const t = sinComent(L), b = cuerpoFn(t, "aceptarEvp");
    const iR = b.search(/pasarela\.retener\(\{ centavos: dep,/), iA = b.search(/insert into private_event_acceptances/), iC = b.search(/await c\.query\("commit"\);\s*\n\s*retenido = null;/), iK = b.search(/await cobrarOperacion\(opId\);/);
    if (iR < 0 || iA < 0 || iC < 0 || iK < 0 || !(iR < iA && iA < iC && iC < iK)) falla(G, L, 0, "aceptarEvp: retener → aceptación en la transacción → commit → cobrar, en ese orden");
    if (iC > 0 && /cobrarOperacion\(|pasarela\.cobrar\(/.test(b.slice(0, iC))) falla(G, L, 0, "aceptarEvp: nada se cobra antes de registrar la aceptación y hacer commit");
    if (!/const dep = q\.dep,/.test(b) || !/const Q = await propuestas\(c, o\.id\), q = Q\[Q\.length - 1\];/.test(b)) falla(G, L, 0, "aceptarEvp: el depósito sale de la última propuesta guardada");
    if (!/if \(retenido\) await pasarela\.liberar\(retenido\)/.test(b)) falla(G, L, 0, "aceptarEvp: si algo falla antes del commit, se libera la tarjeta");
    for (const m of t.matchAll(/export type (EvpIn|CambioIn) = \{([^}]*)\}/g)) if (/\b(cents|price|precio|total|tax|impuesto|subtotal|deposit|dep|monto)\w*\??:/i.test(m[2])) falla(G, L, 0, `«${m[1]}» trae un monto desde el teléfono`);
    if (/\b(total|deposit|dep|subtotal|tax)\w*\??:/i.test(/export type PropuestaIn = \{([^\n]*)\};/.exec(t)?.[1] ?? "x")) falla(G, L, 0, "PropuestaIn: el panel manda líneas (cantidad × precio), nunca un total ni un depósito");
    for (const A of ["apps/web/app/(app)/privado/[num]/acciones.ts", "apps/web/app/(app)/n/[id]/evento-privado/acciones.ts", "apps/web/app/panel/acciones-evento-privado.ts"])
      if (existsSync(A)) for (const m of readFileSync(A, "utf8").matchAll(/export async function (\w+)\(([^)]*)\)/g)) if (/\b(cents|price|precio|total|monto|deposit|dep|devuelve|refund)\w*\s*:/i.test(m[2])) falla(G, A, 0, `«${m[1]}» recibe un monto`);
  },

  /* 6i. Devolver un depósito de evento privado: lo calcula el servidor con la regla (a tiempo = todo lo cobrado; tarde = nada; el restaurante
     cancela = todo), nunca más de lo cobrado menos lo devuelto, con una llave fija por solicitud (una sola devolución aunque se reintente) y el
     barrido reintenta lo que Stripe no hizo. Al revés: sin tope, llave al azar, plazo leído del momento (no del acuerdo) o sin reintento → falla. */
  devolucionEvpAcotada() {
    const G = "devolucionEvpAcotada", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L), m = cuerpoFn(t, "moverDinero"), cx = cuerpoFn(t, "cancelarEvp"), bx = cuerpoFn(t, "cancelarEvpNegocio"), v = cuerpoFn(t, "vencerEvp");
    if (!/const cap = Math\.max\(0, \(o\.amount \?\? 0\) - \(o\.refunded \?\? 0\)\);/.test(m) || !/const n = Math\.min\(dev, cap\);/.test(m)) falla(G, L, 0, "moverDinero: nunca más de lo cobrado menos lo devuelto");
    if (!/if \(yaHecha\) return;/.test(m) || !/\^evp\(bx\|cx\)-EP-/.test(m)) falla(G, L, 0, "moverDinero: una sola devolución por su llave fija");
    if (!/devIdem: `evpcx-\$\{numero\}`/.test(cx) || !/devIdem: `evpbx-\$\{numero\}`/.test(bx)) falla(G, L, 0, "la llave de la devolución es fija por solicitud (evpcx- / evpbx-)");
    if (!/const ac = acuerdoDe\(await propuestas\(c, o\.id\)\), plazo = ac\?\.cancelH \?\? 72, aTiempo = o\.h_left >= plazo;/.test(cx) || !/const dev = aTiempo \? cobrado : 0/.test(cx)) falla(G, L, 0, "cancelar: el plazo es el de la propuesta aceptada y a tiempo se devuelve lo cobrado; tarde, nada");
    if (!/const dev = o\.pst === "captured" \|\| o\.pst === "partially_refunded" \? Math\.max\(0, \(o\.amount \?\? 0\) - \(o\.refunded \?\? 0\)\) : 0;/.test(bx)) falla(G, L, 0, "el restaurante cancela: se devuelve todo lo cobrado");
    if (!/for \(const v of debe\) await moverDinero\(v\.num\)/.test(v)) falla(G, L, 0, "el barrido reintenta las devoluciones que quedaron a medias");
  },

  /* 6i. Sin teléfonos entre las partes: el panel ve nombre + inicial (nunca users.phone), y la nota, el cambio, la propuesta y los motivos no
     admiten un teléfono; hablar es por Mensajes (2p). Al revés: leer el teléfono del cliente o quitar el filtro → falla. */
  evpSinTelefonos() {
    const G = "evpSinTelefonos", L = "apps/web/lib/evento-privado.ts";
    if (!existsSync(L)) return;
    const t = sinComent(L);
    for (const fn of ["evpHoy", "evpPanel", "leer"]) if (/u\.phone|users\.phone/.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» lee el teléfono del cliente`);
    if (!/const SEL = `[^`]*left\(nullif\(u\.last_name, ''\), 1\)/.test(t)) falla(G, L, 0, "el restaurante ve nombre + inicial del cliente");
    for (const [fn, re] of [["pedirEvp", /if \(TEL\.test\(nota\)\)/], ["pedirCambioEvp", /if \(TEL\.test\(nota\)\)/], ["proponerEvp", /if \(TEL\.test\(incluye\) \|\| TEL\.test\(nota\)\)/], ["noPuedoEvp", /if \(TEL\.test\(mot\)\)/], ["cancelarEvpNegocio", /if \(TEL\.test\(mot\)\)/]])
      if (!re.test(cuerpoFn(t, fn))) falla(G, L, 0, `«${fn}» acepta un teléfono en el texto`);
    const P = "apps/web/app/panel/EventoPrivado.tsx";
    if (existsSync(P) && /tel:|phone|telefono/.test(sinComent(P))) falla(G, P, 0, "el panel del evento privado no muestra ni llama al teléfono del cliente");
  },

  /* 6j (clase cazada en el cierre de la Fase 6). Un aviso con variables en el TÍTULO («Tus boletos para {evento}», «Mensaje de {negocio}»)
     llegaba con la llave escrita: avisar() y avisarMuchos() llenaban el cuerpo pero no el título. Los dos pasan el título por llenar().
     Al revés: volver a guardar el título tal cual → falla. */
  avisoTituloLleno() {
    const G = "avisoTituloLleno", A = "apps/web/lib/avisos.ts";
    if (!existsSync(A)) return falla(G, A, 0, "falta lib/avisos.ts");
    const t = sinComent(A), a = cuerpoFn(t, "avisar"), m = cuerpoFn(t, "avisarMuchos");
    if (!/title = llenar\(es \? r\.title\.es : r\.title\.en, v\)/.test(a)) falla(G, A, 0, "avisar(): el título debe pasar por llenar() (las variables del título)");
    if (!/llenar\(t\.title\.es, v\.es\)/.test(m) || !/llenar\(t\.title\.en, v\.en\)/.test(m)) falla(G, A, 0, "avisarMuchos(): el título debe pasar por llenar() en los dos idiomas");
  },

  /* 6j · Mi cuenta › Avisos › Eventos (fase6 §2 0115): lo crítico de Eventos no se apaga. Las plantillas del boleto (comprado, devuelto, anulado,
     reemitido, el que te mandan, la cortesía), el lugar de la lista de espera, la devolución total, la propuesta y la confirmación del evento
     privado quedan en el grupo `events` SIN pref (siempre llegan); cancelación y cambio de fecha u hora siguen en 'crit'. avisar() solo deja
     de mandar lo apagado cuando la plantilla TIENE pref. Al revés: darle pref a una crítica o pasar una 'crit' a un interruptor → falla. */
  eventosCriticoSiempreLlega() {
    const G = "eventosCriticoSiempreLlega", M = "packages/db/migrations/0115_eventos_admin_config.sql", A = "apps/web/lib/avisos.ts", P = "apps/web/lib/perfil.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0115");
    const m = readFileSync(M, "utf8");
    const CRIT = ["bol_comprado", "bol_reemitido", "bol_anulado", "bol_transfer_in", "bol_cortesia", "espera_lugar", "bol_cancelado", "bol_devuelto", "evt_devolucion_total", "evp_propuesta", "evp_ok", "evp_cancelado_negocio"];
    const nulo = /update notif_templates set grp = 'events', pref = null\s+where key in \(([^)]*)\)/.exec(m)?.[1] ?? "";
    for (const k of CRIT) if (!nulo.includes(`'${k}'`)) falla(G, M, 0, `«${k}» es crítica: va en el grupo events SIN interruptor (pref null)`);
    const conPref = [...m.matchAll(/update notif_templates set grp = 'events', pref = '[a-zA-Z]+'\s+where key (?:in \(([^)]*)\)|= '([a-z0-9_]+)')/g)].map((x) => x[1] ?? `'${x[2]}'`).join(",");
    for (const k of [...CRIT, "evt_cancelado", "evt_fecha_cancelada", "evt_movido", "evt_hora_cambio"]) if (conPref.includes(`'${k}'`)) falla(G, M, 0, `«${k}» es crítica y no puede tener interruptor`);
    if (/update notif_templates set grp = '(?!crit)[a-z]+'[^;]*'evt_(cancelado|fecha_cancelada|movido|hora_cambio)'/.test(m)) falla(G, M, 0, "la cancelación y el cambio de fecha u hora siguen en 'crit' (salen también de noche)");
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql") && y > "0115")) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
      for (const k of CRIT) if (new RegExp(`pref = '[a-zA-Z]+'[^;]*'${k}'`).test(t)) falla(G, `packages/db/migrations/${x}`, 0, `«${k}» es crítica y no puede tener interruptor`);
    }
    if (existsSync(A) && !/if \(\(r\.grp === "community" \|\| r\.grp === "events"\) && apagado\) return;/.test(cuerpoFn(sinComent(A), "avisar"))) falla(G, A, 0, "avisar(): lo apagado de Eventos no llega, y solo se apaga lo que tiene pref");
    if (existsSync(A) && !/const apagado = r\.pref \? r\.prefs\?\.\[r\.pref\] === false : false/.test(cuerpoFn(sinComent(A), "avisar"))) falla(G, A, 0, "avisar(): «apagado» solo vale para una plantilla con pref");
    if (existsSync(P) && !/export const AVISOS = \[[^\]]*"evt", "evtR", "evtG"/.test(readFileSync(P, "utf8"))) falla(G, P, 0, "Mi cuenta › Avisos › Eventos: evt, evtR y evtG");
  },

  /* 6j · «Ajustar cupo» y «Extender ventas» del Super Admin (admin-dashboard L183–185) siguen las reglas de la fase: el cupo nunca baja de lo
     vendido + apartado (la acción lo dice antes y la base lo impone: el último ajuste lo pone un trigger en ticket_stock, table_stock y
     event_day_stock, y el check de cada tabla sigue); el ajuste es de solo inserción; la venta extendida nunca pasa del inicio (D1: en la puerta
     no se vende) — check en la base y least() en bol_venta_hasta; las dos piden evt:editar, motivo, event_changes y auditoría. Y la alerta
     viva «evento con sobreventa» existe y la miran el Inicio y Eventos del Super Admin. Al revés: quitar una de esas piezas → falla. */
  ajusteAdminConRegla() {
    const G = "ajusteAdminConRegla", M = "packages/db/migrations/0115_eventos_admin_config.sql", L = "apps/web/lib/evt-admin.ts", AC = "apps/web/app/admin/acciones-eventos.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0115");
    const m = readFileSync(M, "utf8");
    for (const t of ["ticket_stock", "table_stock", "event_day_stock"]) if (!new RegExp(`create trigger ${t}_cupo_admin before insert or update on ${t} for each row execute function evt_cupo_admin\\(\\)`).test(m)) falla(G, M, 0, `${t}: el ajuste de To'Latino lo pone la base (trigger evt_cupo_admin)`);
    if (!/create trigger event_stock_overrides_no_cambia before update or delete on event_stock_overrides/.test(m)) falla(G, M, 0, "event_stock_overrides es de solo inserción");
    if (!/check \(sales_extended_until is null or sales_extended_until <= starts_at\)/.test(m) || !/least\(d\.starts_at, greatest\(d\.sales_extended_until/.test(ultimaFn("bol_venta_hasta"))) falla(G, M, 0, "la venta extendida nunca pasa del inicio (D1)");
    if (!/create or replace view evt_sobreventa as[\s\S]*?v\.n > s\.quantity[\s\S]*?v\.n > s\.quantity/.test(m)) falla(G, M, 0, "falta la alerta viva evt_sobreventa (boletos vivos contra la existencia de cada tipo y mesa)");
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/evt-admin.ts");
    const t = sinComent(L), a = cuerpoFn(t, "ajustarCupo"), iB = a.search(/if \(n < x\.usado\) return no/), iI = a.search(/insert into event_stock_overrides/);
    if (iB < 0 || iI < 0 || iB > iI) falla(G, L, 0, "ajustarCupo: rechazar por debajo de lo vendido + apartado ANTES de guardar el ajuste");
    for (const fn of ["ajustarCupo", "extenderVenta"]) { const b = cuerpoFn(t, fn); if (!/m\.length < 4\) return no/.test(b) || !/insert into event_changes/.test(b) || !/await auditar\(c,/.test(b) || !/for update/.test(b + cuerpoFn(t, "fechaAdm"))) falla(G, L, 0, `${fn}: motivo, event_changes, auditoría y la fecha bloqueada`); }
    if (existsSync(AC)) { const ac = sinComent(AC); for (const fn of ["evtCupo", "evtExtenderVenta"]) if (!/requerir\("evt", "editar"\)/.test(cuerpoFn(ac, fn))) falla(G, AC, 0, `${fn} pide evt:editar`); }
    for (const f of ["apps/web/app/admin/page.tsx", "apps/web/app/admin/eventos/page.tsx"]) if (existsSync(f) && !/sobreventa\(s\)/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "la alerta «evento con sobreventa» sale aquí");
  },

  /* 6j (clase cazada en el cierre: con más de 200 eventos de un negocio, la lista del panel ordenaba por fecha ascendente con «limit 200» y
     dejaba fuera los PRÓXIMOS; Cobros › PAGOS DE EVENTOS ponía las fechas futuras primero y escondía lo pagado). Una lista con tope del panel
     de Eventos pone primero lo que importa: eventosDelNegocio lo vivo y próximo antes que lo pasado o cancelado; liquidacionesPanel las
     fechas que ya pasaron antes que las próximas. Al revés: volver al orden por fecha a secas → falla. */
  listaConTopeLoQueImporta() {
    const G = "listaConTopeLoQueImporta", E = "apps/web/lib/evt.ts", L = "apps/web/lib/evt-liquidacion.ts";
    if (existsSync(E)) { const b = cuerpoFn(sinComent(E), "eventosDelNegocio"); if (!/order by \(e\.status in \('cancelled', 'rejected', 'done'\)\) or \(e\.start_date \+ \(e\.span_days - 1\) </.test(b) || !/limit 200/.test(b)) falla(G, E, 0, "eventosDelNegocio: lo vivo y próximo primero antes del tope (con muchos eventos, el tope cortaba los próximos)"); }
    if (existsSync(L)) { const b = cuerpoFn(sinComent(L), "liquidacionesPanel"); if (!/order by \(d\.starts_at > now\(\)\), d\.starts_at desc limit 60/.test(b)) falla(G, L, 0, "liquidacionesPanel: las fechas que ya pasaron (dinero en camino o pagado) antes que las próximas"); }
  },

  /* 7a · La ayuda es un producto (fase7-compa.md §3 y §4 7a). Cada docs/ayuda/*.md tiene LA forma única (scripts/ayuda/forma.mjs, la misma
     que lee el indexador): título «Español · English», «_Pantallas: … Versión: … Audiencia: … Tema: …_», secciones en español y una sola
     «## English» al final con la ayuda en inglés. Una ayuda nueva sin forma no entra. Al revés: quitar «## English», el título en inglés o
     la audiencia → falla. Los temas de forma.mjs son los de help_topics (0116). */
  ayudaConForma() {
    const G = "ayudaConForma", M = "packages/db/migrations/0116_ayuda_base.sql";
    const docs = archivos.filter((f) => /^docs\/ayuda\/[^/]+$/.test(f));
    if (docs.length < 100) return falla(G, "docs/ayuda", 0, "no encuentro la ayuda (docs/ayuda/*.md)");
    for (const f of docs) {
      if (!f.endsWith(".md")) { falla(G, f, 0, "en docs/ayuda/ solo van artículos .md"); continue; }
      for (const [l, m] of leerAyuda(readFileSync(f, "utf8"), f).errores) falla(G, f, l, m);
    }
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8"), temas = [...(/insert into help_topics[\s\S]*?on conflict/.exec(m)?.[0] ?? "").matchAll(/\('([a-z]+)', '([a-z]+)'/g)].map((x) => [x[1], x[2]]);
      for (const [k, a] of Object.entries(TEMAS)) if (!temas.some(([x, y]) => x === k && y === a)) falla(G, M, 0, `help_topics no tiene el tema «${k}» de la audiencia «${a}» (scripts/ayuda/forma.mjs)`);
      for (const [k] of temas) if (!(k in TEMAS)) falla(G, M, 0, `el tema «${k}» de help_topics no está en scripts/ayuda/forma.mjs`);
    }
    const D = "infra/pruebas/deploy.sh";
    // 9o · El índice sale del paquete común (infra/comun/lib.sh · indexar_docs), que el sandbox y producción llaman igual.
    const conIndice = (t) => /node scripts\/ayuda\/indexar\.mjs[\s\S]{0,400}\|\| log "ayuda: /.test(t);
    if (!conIndice(readFileSync(D, "utf8")) && !(/\nindexar_docs "\$REPO" /.test(readFileSync(D, "utf8")) && conIndice(readFileSync("infra/comun/lib.sh", "utf8"))))
      falla(G, D, 0, "el despliegue indexa docs/ayuda (scripts/ayuda/indexar.mjs) aparte, con «|| log» para que un fallo no tumbe el sandbox");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    if ((ci.match(/node scripts\/ayuda\/indexar\.mjs \|/g) ?? []).length < 2 || !/grep -q " 0 nuevos · 0 cambiados"/.test(ci)) falla(G, ".github/workflows/ci.yml", 0, "el CI indexa docs/ayuda dos veces contra la base real y la segunda no cambia nada");
  },

  /* 7a · Lo que lee un vecino no habla de fases, bloques ni de lo que «llega con» una fase: eso es lenguaje del equipo. Fuera de una
     sección marcada <!-- solo-equipo -->, ninguna ayuda dice «Fase N», «bloque 4j», «(6e)», «llega con el bloque…» (FASE_INTERNA de
     forma.mjs), y ninguna pantalla de vecinos, negocios, porteros o repartidores lo dice en un texto. Al revés: «(llega con 6e)» en una
     ayuda, o «(Fase 2)» en un texto del panel → falla. */
  ayudaSinFaseInterna() {
    const G = "ayudaSinFaseInterna";
    for (const f of archivos.filter((x) => /^docs\/ayuda\/[^/]+\.md$/.test(x)))
      for (const [l, que] of faseInterna(readFileSync(f, "utf8"), f)) falla(G, f, l, `lenguaje interno para quien lee la ayuda: ${que} (dilo como es hoy, o va en una sección <!-- solo-equipo -->)`);
    const FASE = /\b[Ff]ase \d|\b[Pp]hase \d|\b[Bb]loque \d[a-z]|\b[Bb]lock \d[a-z]/;
    for (const f of codigo) {
      if (!/^apps\/web\/app\/(\(app\)|\(puerta\)|panel|repartidor|entrar|i)\/.*\.tsx$/.test(f)) continue;
      sinComent(f).split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/E2\(\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*,\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g))
          if (FASE.test(m[1]) || FASE.test(m[2])) falla(G, f, i + 1, "un texto de la pantalla habla de fases o bloques: dilo como es hoy");
      });
    }
  },

  /* 7a · Un artículo del equipo nunca llega a un vecino o a un negocio (§3 «De dónde contesta», compaAyudaPorAudiencia). (1) La base: un
     admin-* es «equipo», panel-* «negocio», puerta-* «portero» (checks de 0116), un trozo nunca es más abierto que su artículo (trigger) y
     una sección solo-equipo se guarda como «equipo» (indexar.mjs → ayuda_indexar). (2) lib/compa/ayuda-indice.ts es el único lector de
     help_articles / help_chunks fuera del Super Admin, y cada lectura pública filtra por audiencia (artículo y trozo) y por «live».
     (3) La audiencia sale del servidor: las pantallas la piden con audienciasDe(<id de la sesión>) y nunca pasan una lista escrita a mano;
     ningún archivo del cliente importa el índice. Al revés: quitar «c.audience = any(» de buscarAyuda, pasar ["equipo"] desde una
     página, o dejar un admin-* como vecino → falla. */
  compaAyudaPorAudiencia() {
    const G = "compaAyudaPorAudiencia", M = "packages/db/migrations/0116_ayuda_base.sql", L = "apps/web/lib/compa/ayuda-indice.ts", X = "scripts/ayuda/indexar.mjs";
    for (const f of archivos.filter((x) => /^docs\/ayuda\/[^/]+\.md$/.test(x))) {
      const slug = f.replace(/^.*\//, "").replace(/\.md$/, ""), debe = audienciaPorNombre(slug), r = leerAyuda(readFileSync(f, "utf8"), f);
      if (debe && r.meta && r.meta.audiencia !== debe) falla(G, f, 0, `un ${slug.split("-")[0]}-* es de la audiencia «${debe}»`);
      if (r.meta && !AUDIENCIAS.includes(r.meta.audiencia)) falla(G, f, 0, "audiencia desconocida");
    }
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del índice de la ayuda");
    const m = readFileSync(M, "utf8");
    for (const [re, que] of [[/check \(slug not like 'admin-%' or audience = 'equipo'\)/, "un admin-* es «equipo» (check)"], [/check \(slug not like 'panel-%' or audience = 'negocio'\)/, "un panel-* es «negocio» (check)"],
      [/check \(slug not like 'puerta-%' or audience = 'portero'\)/, "un puerta-* es «portero» (check)"],
      [/create trigger help_chunks_audiencia before insert or update on help_chunks/, "un trozo nunca es más abierto que su artículo (trigger help_chunks_audiencia)"]])
      if (!re.test(m)) falla(G, M, 0, que);
    if (!/case when coalesce\(\(c->>'equipo'\)::boolean, false\) then 'equipo' else a->>'audience' end/.test(ultimaFn("ayuda_indexar"))) falla(G, M, 0, "ayuda_indexar guarda una sección solo-equipo como «equipo»");
    if (!existsSync(X) || !/equipo: c\.equipo/.test(readFileSync(X, "utf8"))) falla(G, X, 0, "el indexador manda la marca solo-equipo de cada trozo");
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/compa/ayuda-indice.ts (el único lector de la ayuda)");
    const t = sinComent(L);
    if (!/^import "server-only";/.test(readFileSync(L, "utf8"))) falla(G, L, 1, "el índice de la ayuda es solo del servidor");
    for (const fn of ["temasAyuda", "listaAyuda", "buscarAyuda", "articulo", "titulosVisibles", "trozosCompa"]) {
      const b = cuerpoFn(t, fn);
      if (!b) { falla(G, L, 0, `falta ${fn}()`); continue; }
      if (!/a\.audience = any\(\$\d::text\[\]\)|\baudience = any\(\$\d::text\[\]\)/.test(b)) falla(G, L, 0, `${fn}() no filtra por la audiencia de la persona`);
      if (/help_chunks/.test(b) && !/c\.audience = any\(\$\d::text\[\]\)/.test(b)) falla(G, L, 0, `${fn}() lee trozos sin filtrar su audiencia (una sección solo-equipo se colaría)`);
      if (!/status = 'live'|status in \('live', 'paused'\)/.test(b)) falla(G, L, 0, `${fn}() no deja fuera lo pausado o retirado`);
    }
    if (!/if \(a\.status === "paused" && !equipo\) return \{ \.\.\.a, paused_reason: null, secciones: \{ es: \[\], en: \[\] \} \};/.test(cuerpoFn(t, "articulo"))) falla(G, L, 0, "un artículo pausado no enseña su texto a quien no es del equipo");
    if (!/if \(r\?\.staff\) return \[\.\.\.TODAS\];/.test(cuerpoFn(t, "audienciasDe")) || !/return \["vecino", \.\.\./.test(cuerpoFn(t, "audienciasDe"))) falla(G, L, 0, "audienciasDe: «equipo» solo para el equipo activo; los demás empiezan en «vecino»");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === L) continue;
      const c = sinComent(x);
      if (/\b(from|join)\s+help_(chunks|articles)\b/.test(c) && !/^apps\/web\/(app\/admin\/|lib\/admin)/.test(x)) falla(G, x, 0, "solo lib/compa/ayuda-indice.ts lee la ayuda indexada");
      if (/\b(update|delete from|insert into)\s+help_(chunks|articles|topics)\b/.test(c)) falla(G, x, 0, "el índice de la ayuda lo escribe el despliegue (ayuda_indexar); la app solo pausa por lib/compa/ayuda-indice.ts");
      // 7c · El Compa: los trozos se piden con las audiencias de la sesión (audienciasDe(q.userId)), nunca con una lista que no salga de ahí.
      if (/\btrozosCompa\(/.test(c) && (!/audienciasDe\(q\.userId\)/.test(c) || !/\.filter\(\(a\) => aud\.includes\(a\)\)/.test(c) || /suyas: Audiencia\[\] = \[/.test(c))) falla(G, x, 0, "El Compa pide la ayuda con las audiencias de la sesión");
      if (!/@\/lib\/compa\/ayuda-indice/.test(c)) continue;
      if (/^\s*["']use client["']/.test(readFileSync(x, "utf8")) && /import \{[^}]*\b(audienciasDe|buscarAyuda|articulo|listaAyuda|temasAyuda|titulosVisibles)\b[^}]*\} from "@\/lib\/compa\/ayuda-indice"/.test(c)) falla(G, x, 0, "una pantalla del cliente no llama al índice de la ayuda: lo hace la página del servidor");
      if (/\b(buscarAyuda|listaAyuda|articulo|temasAyuda|titulosVisibles)\([^)]*\[/.test(c)) falla(G, x, 0, "la audiencia no se escribe a mano: sale de audienciasDe(<sesión>)");
      if (/\b(buscarAyuda|listaAyuda|articulo|temasAyuda|titulosVisibles)\(/.test(c) && !/await audienciasDe\(u\?\.id \?\? null\)/.test(c) && !/^apps\/web\/app\/admin\//.test(x)) falla(G, x, 0, "la audiencia sale de audienciasDe(id de la sesión)");
    }
  },

  /* ── Fase 7 · 7b Soporte ── */
  /* 7b. Todo caso de Soporte entra a la cola «ticket» con su plazo en horas hábiles: lo pone la BASE (trigger), no la app. El plazo es not null
     y se calcula con soporte_sla (Configuración: soporte_sla_h, soporte_dias, soporte_desde_h, soporte_hasta_h); la cola usa ese vencimiento
     (slaSql), nunca 8 h de reloj. Solo lib/soporte.ts abre casos; nadie escribe la cola «ticket» a mano. */
  soporteCasoConSla() {
    const G = "soporteCasoConSla", M = "packages/db/migrations/0117_soporte.sql", C = "apps/web/lib/colas.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de Soporte");
    const m = readFileSync(M, "utf8");
    if (!/sla_due_at\s+timestamptz not null/.test(m)) falla(G, M, 0, "un caso sin plazo: sla_due_at es obligatorio");
    if (!/create trigger support_cases_cola after insert or update on support_cases/.test(m)) falla(G, M, 0, "la base abre y cierra la cola «ticket» de cada caso (trigger support_cases_cola)");
    const cola = ultimaFn("support_cases_cola"), antes = ultimaFn("support_cases_antes");
    if (!/insert into queue_items[\s\S]*'ticket', 'support_case'/.test(cola)) falla(G, M, 0, "support_cases_cola mete el caso en la cola «ticket»");
    if ((antes.match(/new\.sla_due_at := soporte_sla\(new\.city_id, now\(\), cfg_int\('soporte_sla_h'\)\)/g) ?? []).length < 2) falla(G, M, 0, "el plazo sale de soporte_sla con soporte_sla_h al abrir Y al volver al equipo (plazo nuevo)");
    const sla = ultimaFn("soporte_sla");
    for (const k of ["soporte_desde_h", "soporte_hasta_h", "soporte_dias"]) if (!sla.includes(`cfg_int('${k}')`)) falla(G, M, 0, `soporte_sla lee ${k} de Configuración`);
    if (existsSync(C) && !/ticket: \{[^\n]*slaSql: "\(select greatest\(extract\(epoch from sc\.sla_due_at - q\.opened_at\)/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "la cola «ticket» mide la espera contra sla_due_at (horas hábiles), no contra 8 h de reloj");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (/'ticket',\s*'support_case'/.test(t)) falla(G, x, 0, "la cola «ticket» la escribe la base (trigger), no la app");
      if (/insert into support_cases\b/.test(t) && x !== "apps/web/lib/soporte.ts") falla(G, x, 0, "solo lib/soporte.ts (abrirCaso) abre casos de Soporte");
    }
  },

  /* 7b. Las notas internas del equipo NUNCA llegan a la persona: la persona lee su hilo solo con HILO_VECINO_SQL (not m.internal); toda otra lectura
     de support_messages fuera de lib/soporte-equipo.ts (el equipo) filtra internal; las pantallas de la persona no importan lib/soporte-equipo. */
  notaInternaNoSale() {
    const G = "notaInternaNoSale", L = "apps/web/lib/soporte.ts", E = "apps/web/lib/soporte-equipo.ts";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/soporte.ts");
    const l = readFileSync(L, "utf8"), h = /export const HILO_VECINO_SQL = `([^`]*)`/.exec(l);
    if (!h || !/where m\.case_id = \$1 and not m\.internal/.test(h[1])) falla(G, L, 0, "HILO_VECINO_SQL deja fuera las notas internas (not m.internal)");
    if (!/db\(\)\.query<MsjVecino>\(HILO_VECINO_SQL,/.test(l)) falla(G, L, 0, "el caso de la persona se lee con HILO_VECINO_SQL");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === E) continue;
      const t = sinComent(x);
      // Cada «from support_messages …» (hasta su order by / limit / paréntesis) deja fuera las internas o lee solo lo de la persona.
      if (!/^apps\/web\/app\/admin\//.test(x)) for (const q of t.match(/`[^`]*`/g) ?? []) for (const seg of q.match(/\bfrom support_messages\b[\s\S]*?(?=order by|limit|\)|$)/g) ?? [])
        if (!/not m\.internal|\binternal = false\b|\bsender = 'user'/.test(seg)) falla(G, x, 0, `lee support_messages sin dejar fuera las notas internas: «${seg.slice(0, 80)}»`);
      if (/^apps\/web\/app\/\(app\)\//.test(x) && /@\/lib\/soporte-equipo/.test(t)) falla(G, x, 0, "una pantalla de la persona no usa lib/soporte-equipo (lee notas internas)");
    }
    const UI = "apps/web/app/(app)/soporte/Soporte.tsx";
    if (existsSync(UI) && /\.internal\b/.test(sinComent(UI))) falla(G, UI, 0, "la pantalla de la persona no conoce el campo internal (nunca le llega)");
  },

  /* 7b. «Resolver y devolver» de un caso: el TOPE DEL ROL lo decide la BASE al insertar en support_refunds (soporte_tope_devolver: tx:aprobar =
     hasta lo cobrado; sop:editar = soporte_devolver_max_cents por caso, sumando lo ya devuelto; nadie más), con candado por caso; solo después se llama a
     devolverPago con la llave del intento (tk-…), que también es única en support_refunds (dos toques = una devolución). Ningún tope escrito en la app. */
  soporteDevolverConTope() {
    const G = "soporteDevolverConTope", M = "packages/db/migrations/0117_soporte.sql", E = "apps/web/lib/soporte-equipo.ts";
    if (!existsSync(M) || !existsSync(E)) return falla(G, M, 0, "falta Soporte (migración o lib/soporte-equipo.ts)");
    const tope = ultimaFn("soporte_tope_devolver"), antes = ultimaFn("support_refunds_antes");
    if (!/section = 'tx' and action = 'aprobar' and allowed\) then null/.test(tope) || !/section = 'sop' and action = 'editar' and allowed\) then cfg_int\('soporte_devolver_max_cents'\)/.test(tope) || !/else 0 end/.test(tope))
      falla(G, M, 0, "soporte_tope_devolver: Transacciones › aprobar = sin tope del rol; Soporte › editar = soporte_devolver_max_cents; los demás 0");
    if (!/select role into rol from staff_members where user_id = new\.staff_id and status = 'active'/.test(antes) || !/tope := soporte_tope_devolver\(rol\)/.test(antes)) falla(G, M, 0, "el rol y su tope los lee la base al decidir (no los manda la app)");
    if (!/for update;\s*-- una decisión a la vez por caso/.test(antes) || !/if ya \+ new\.amount_cents > tope then raise exception 'devolucion_sobre_tope/.test(antes)) falla(G, M, 0, "el tope suma lo ya devuelto en el caso, con candado");
    if (!/p\.operation_id <> c\.operation_id or p\.user_id <> c\.user_id/.test(antes)) falla(G, M, 0, "solo se devuelve el cobro de la operación de ese caso y de esa persona");
    if (!/idem_key\s+text not null unique check \(idem_key ~ '\^tk-/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "support_refunds.idem_key único (tk-…)");
    const f = cuerpoFn(sinComent(E), "resolverYDevolver");
    const iIns = f.indexOf("insert into support_refunds"), iDev = f.indexOf("devolverPago(");
    if (iIns < 0 || iDev < 0 || iIns > iDev) falla(G, E, 0, "resolverYDevolver inserta la fila pendiente (tope de la base) ANTES de llamar a devolverPago");
    if (!/idem = `tk-\$\{clave\}`/.test(f) || !/devolverPago\(\{ paymentId: fila\.pid, centavos: fila\.amount,[^}]*idem \}\)/.test(f)) falla(G, E, 0, "devolverPago con la llave del intento y el monto de la fila (no el del teléfono)");
    if (/\b5000\b|\$50\b/.test(sinComent(E).replace(/money\([^)]*\)/g, ""))) falla(G, E, 0, "el tope de Soporte no se escribe en la app: sale de Configuración por la base");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== E && /`tk-\$\{/.test(sinComent(x))) falla(G, x, 0, "solo resolverYDevolver usa llaves tk- (devoluciones de un caso)");
  },

  /* 7b · compaTapaSecretos (parte de Soporte): todo lo que una persona o el equipo escribe en un caso pasa por tapar() antes de guardarse (tarjeta con
     Luhn, código de seguridad, SSN, códigos, contraseñas, cuentas), y la base rechaza tarjeta o SSN aunque alguien se lo salte (texto_con_secretos). */
  compaTapaSecretos() {
    const G = "compaTapaSecretos", T = "apps/web/lib/compa/tapar.ts", M = "packages/db/migrations/0117_soporte.sql";
    if (!existsSync(T)) return falla(G, T, 0, "falta lib/compa/tapar.ts");
    const t = readFileSync(T, "utf8");
    if (!/^import "server-only";/.test(t)) falla(G, T, 1, "tapar() es del servidor");
    if (!/export function luhn\(/.test(t) || !/luhn\(m\.replace\(\/\\D\/g, ""\)\) \? TAPADO : m/.test(t)) falla(G, T, 0, "las tarjetas se tapan con Luhn");
    for (const [re, que] of [[/\\d\{3\}\[- \]\\d\{2\}\[- \]\\d\{4\}/, "SSN"], [/cvv2\?\|cvc/, "código de seguridad"], [/contrase\[ñn\]a\|password/, "contraseñas"], [/routing/, "cuentas"]]) if (!re.test(t)) falla(G, T, 0, `tapar() no cubre ${que}`);
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/if texto_con_secretos\(new\.body\) then raise exception 'support_sin_secretos/.test(ultimaFn("support_messages_antes"))) falla(G, M, 0, "la base rechaza tarjeta o SSN en support_messages");
      if (!/luhn_ok\(regexp_replace/.test(ultimaFn("texto_con_secretos"))) falla(G, M, 0, "texto_con_secretos revisa Luhn");
      void m;
    }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const c = sinComent(x);
      for (const mm of c.matchAll(/insert into support_messages \([^)]*\) values \([^)]*'(user|staff)'[^`]*`\s*,\s*\[([^\]]*)\]/g)) {
        if (!/\btapar\(|\bt\.texto\b|\bt\b/.test(mm[2])) falla(G, x, 0, `un mensaje de ${mm[1] === "user" ? "la persona" : "el equipo"} se guarda sin tapar(): «${mm[2].slice(0, 60)}»`);
      }
      if (/insert into support_messages/.test(c) && !/from "\.\/compa\/tapar"|from "@\/lib\/compa\/tapar"/.test(c)) falla(G, x, 0, "escribe en support_messages sin importar tapar()");
      // 7h · Lo que entra y sale por WhatsApp o SMS se guarda tapado (y la base vuelve a rechazar tarjeta o SSN).
      if (/insert into compa_inbound\b/.test(c) && !/const body = e\.texto\.trim\(\) \? tapar\(e\.texto\.slice\(0, 2000\)\)\.texto : null;/.test(c)) falla(G, x, 0, "la entrada de WhatsApp/SMS se guarda tapada");
      if (/insert into compa_outbound\b/.test(c) && !/texto = plano\(tapar\(o\.texto\)\.texto, canal\), guardado = plano\(tapar\(o\.guardar \?\? o\.texto\)\.texto, canal\)/.test(c)) falla(G, x, 0, "la salida de WhatsApp/SMS se guarda y se manda tapada");
    }
    // Vectores: lo que tapar() tiene que tapar (el archivo real, transpilado con typescript del repo).
    try {
      const ts = createRequire(import.meta.url)("typescript");
      const js = ts.transpileModule(t.replace(/^import "server-only";\n/, ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      const mod = { exports: {} }; new Function("module", "exports", js)(mod, mod.exports);
      const { tapar } = mod.exports;
      for (const v of ["4242 4242 4242 4242", "4000-0566-5566-5556", "123-45-6789", "cvv 123", "mi contraseña es Gato2025", "el código es 482913", "routing 021000021", "A-123456789"]) if (!tapar(v).tapado) falla(G, T, 0, `tapar() deja pasar «${v}»`);
      for (const v of ["Pedido #1368 de $85", "Mi teléfono nuevo es 570-555-0199", "TK-5201"]) if (tapar(v).tapado) falla(G, T, 0, `tapar() tapa de más: «${v}»`);
    } catch (e) { falla(G, T, 0, `no pude probar tapar(): ${String(e.message).slice(0, 80)}`); }
  },

  /* 7b. Lo que ve un caso: la persona solo los suyos y el dueño solo los de SU negocio. Las acciones de APP-SOPORTE toman a la persona de la sesión
     (yo()) y revisan el origen; lib/soporte.ts busca cada número con VISIBLE (la persona o el dueño del negocio) — un número ajeno no existe. Las
     fotos de un caso son privadas y su ruta las da solo a esa gente y al equipo (auditado). */
  soporteSoloSuyos() {
    const G = "soporteSoloSuyos", A = "apps/web/app/(app)/soporte/acciones.ts", L = "apps/web/lib/soporte.ts", F = "apps/web/app/api/ayuda/foto/[id]/route.ts";
    if (!existsSync(A) || !existsSync(L)) return falla(G, L, 0, "falta Soporte");
    const a = sinComent(A);
    for (const p of a.split(/\nexport async function /).slice(1)) {
      const nombre = p.slice(0, p.indexOf("("));
      if (!/if \(!\(await mismoOrigen\(\)\)\) return SIN;\s*const u = await yo\(\);\s*if \(!u\) return SIN;/.test(p) || !/userId: u\.id/.test(p)) falla(G, A, 0, `«${nombre}»: la persona sale de la sesión (yo()) y del mismo origen`);
    }
    const l = sinComent(L);
    const vis = /const VISIBLE = [\s\S]*?`;/.exec(l)?.[0] ?? "";
    if (!/\(\(\$\{n\}::text is null and c\.business_id is null and c\.user_id = \$\{u\}\)/.test(vis) || !/and bm\.status = 'active' and \(bm\.kind = 'owner' or 'all' = any\(bm\.panel_access\)\)/.test(vis)) falla(G, L, 0, "VISIBLE: los suyos sin negocio, o los del negocio si es su dueño");
    for (const fn of ["misCasos", "casoVecino", "miCaso"]) if (!/\$\{VISIBLE\("\$\d", "\$\d"\)\}/.test(cuerpoFn(l, fn))) falla(G, L, 0, `${fn}() busca el caso con VISIBLE`);
    for (const q of l.match(/`[^`]*`/g) ?? []) if (/\bfrom support_cases c where c\.number = \$1\b/.test(q) && !/VISIBLE/.test(q)) falla(G, L, 0, `un caso por número sin VISIBLE: «${q.slice(0, 60)}»`);
    for (const q of l.match(/`update media set owner_kind = 'support'[^`]*`/g) ?? ["`sin`"]) if (!/and private`$/.test(q)) falla(G, L, 0, "la foto de un caso tiene que ser privada (and private)");
    if (existsSync(F) && !/m\.tk[\s\S]*me\.id === m\.tkuser[\s\S]*s\.puede\("sop", "ver"\)[\s\S]*soporte\.foto\.ver/.test(readFileSync(F, "utf8"))) falla(G, F, 0, "la foto de un caso: quien lo abrió, el dueño de su negocio o el equipo con Soporte (auditado)");
  },

  /* 7b. Una macro es texto: sin etiquetas HTML ni llaves que no sean {nombre}/{name} (la base lo impide y la app lo rechaza con su mensaje); se
     muestra como texto de React, nunca con dangerouslySetInnerHTML. Solo sop:aprobar las cambia, con auditoría. */
  macroSinHtml() {
    const G = "macroSinHtml", M = "packages/db/migrations/0117_soporte.sql", E = "apps/web/lib/soporte-equipo.ts";
    if (!existsSync(M) || !existsSync(E)) return;
    const m = readFileSync(M, "utf8"), e = sinComent(E);
    if (!/check \(\(\(title->>'es'\) \|\| \(title->>'en'\) \|\| \(body->>'es'\) \|\| \(body->>'en'\)\) !~ '<\[A-Za-z!\/\?\]'\)/.test(m)) falla(G, M, 0, "la base rechaza HTML en una macro");
    if (!/check \(\(\(body->>'es'\) \|\| \(body->>'en'\)\) !~ '\\\{\(\?!nombre\\\}\|name\\\}\)'\)/.test(m)) falla(G, M, 0, "la base solo deja la llave {nombre}/{name}");
    const g = cuerpoFn(e, "guardarMacro");
    if (!/if \(!s\.puede\("sop", "aprobar"\)\)/.test(g) || !/SIN_HTML\.test\(v\)/.test(g) || !/LLAVES_MALAS\.test\(v\)/.test(g) || !/action: "soporte\.macro"/.test(g)) falla(G, E, 0, "guardarMacro: sop:aprobar, sin HTML, solo {nombre} y auditoría");
    for (const x of codigo) if (/^apps\/web\/app\/(admin\/Soporte|\(app\)\/soporte\/)/.test(x) && /dangerouslySetInnerHTML/.test(readFileSync(x, "utf8"))) falla(G, x, 0, "Soporte nunca pinta HTML crudo");
  },

  /* 7b. Los casos son TK-… de su propia secuencia: ningún otro número de la app empieza con TK- y la ayuda de una operación (hrefAyuda) no lo toma. */
  prefijoSoporte() {
    const G = "prefijoSoporte", A = "apps/web/lib/ayuda-cita.ts";
    if (existsSync(A) && /startsWith\("TK-"\)/.test(readFileSync(A, "utf8"))) falla(G, A, 0, "un caso de Soporte no es una «Ayuda con …»");
    for (const x of archivos.filter((f) => /^(packages\/db\/migrations|infra\/pruebas\/semilla)\/.*\.sql$/.test(f) || /^apps\/web\/.*\.tsx?$/.test(f))) {
      const t = readFileSync(x, "utf8");
      for (const mm of t.matchAll(/'TK-' \|\| nextval\('([a-z_]+)'\)/g)) if (mm[1] !== "support_case_seq") falla(G, x, 0, "los TK- salen solo de support_case_seq");
      if (/'(?!TK)[A-Z]{1,3}-' \|\| nextval\('support_case_seq'\)/.test(t)) falla(G, x, 0, "support_case_seq solo da números TK-");
      if (/`TK-\$\{/.test(t)) falla(G, x, 0, "un número TK- no se arma en la app: lo da la base");
    }
  },

  /* 7b. Los libros de Soporte no se borran: support_messages es de solo inserción (solo se oculta el texto, una vez, con motivo); support_refunds
     solo pasa de pendiente a hecha o fallida; un caso y una macro no se borran (estados). */
  soporteSoloInsercion() {
    const G = "soporteSoloInsercion", M = "packages/db/migrations/0117_soporte.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    if (!/create trigger support_messages_antes before insert or update or delete on support_messages/.test(m) || !/raise exception 'support_messages es solo de inserción'/.test(ultimaFn("support_messages_antes"))) falla(G, M, 0, "support_messages es de solo inserción (trigger)");
    if (!/raise exception 'support_refunds es solo de inserción'/.test(ultimaFn("support_refunds_antes"))) falla(G, M, 0, "support_refunds es de solo inserción (pendiente → hecha / fallida)");
    if (!/raise exception 'un caso de soporte no se borra/.test(ultimaFn("support_cases_antes"))) falla(G, M, 0, "un caso de Soporte no se borra");
    if (!/create trigger support_macros_no_borra before delete on support_macros/.test(m)) falla(G, M, 0, "una macro no se borra: se apaga");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x)) for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
      if (/\bdelete from (support_messages|support_refunds|support_cases|support_macros)\b/.test(q)) falla(G, x, 0, `un libro de Soporte se borra: «${q.slice(0, 60)}»`);
      if (/\bupdate support_messages set (?!hidden_at = now\(\), hidden_reason)/.test(q)) falla(G, x, 0, "de un mensaje de Soporte solo se oculta el texto");
    }
  },

  /* ── Fase 7 · 7c El motor de El Compa ── */
  /* 7c. El Compa es SOLO del servidor: todo lib/compa/* empieza con import "server-only"; una pantalla del cliente solo importa TIPOS de ahí;
     nadie llama al modelo desde el navegador (window.claude del prototipo); la llave ANTHROPIC_API_KEY solo la lee lib/compa/modelo-claude.ts
     (en la infra solo se pasa al contenedor de la app); la ruta de pruebas no existe en producción y pide el token. */
  compaSoloServidor() {
    const G = "compaSoloServidor", MC = "apps/web/lib/compa/modelo-claude.ts", R = "apps/web/app/api/interno/compa/route.ts";
    for (const x of codigo.filter((f) => /^apps\/web\/lib\/compa\/[^/]+\.ts$/.test(f))) if (!/^import "server-only";/.test(readFileSync(x, "utf8"))) falla(G, x, 1, "lib/compa es solo del servidor (import \"server-only\")");
    for (const x of codigo) {
      if (!/^(apps|packages)\/.*\.(tsx?|jsx?|mjs|cjs)$/.test(x)) continue;
      const crudo = readFileSync(x, "utf8"), t = sinComent(x);
      if (/\bwindow\b[^;\n]{0,60}\.claude\b|\bclaude\.complete\(/.test(t)) falla(G, x, 0, "nada llama a la IA desde el navegador (window.claude es del prototipo)");
      if (/ANTHROPIC_API_KEY/.test(t) && x !== MC) falla(G, x, 0, "la llave ANTHROPIC_API_KEY solo la lee lib/compa/modelo-claude.ts");
      if (/^\s*["']use client["']/.test(crudo) && /from "@\/lib\/compa\//.test(t)) {
        for (const m of t.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from "@\/lib\/compa\/[^"]+"/g)) if (!m[1] && !m[2].split(",").every((s) => /^\s*type\s/.test(s) || !s.trim())) falla(G, x, 0, "una pantalla del cliente solo importa tipos de lib/compa");
        if (/import\s+(?!type\b)[^{;]*from "@\/lib\/compa\//.test(t)) falla(G, x, 0, "una pantalla del cliente no importa lib/compa");
      }
    }
    // 9o · En producción: el compose de la app (solo el servicio web) y la lista cerrada de secretos (sellada para la app).
    for (const x of archivos.filter((f) => /^infra\//.test(f))) if (/ANTHROPIC_API_KEY/.test(readFileSync(x, "utf8")) && !/^infra\/(pruebas\/docker-compose\.yml|produccion\/compose-app\.yml|comun\/secretos\.json)$/.test(x)) falla(G, x, 0, "la llave de la IA solo se le pasa al contenedor de la app");
    if (existsSync("infra/produccion/compose-app.yml") && (readFileSync("infra/produccion/compose-app.yml", "utf8").match(/ANTHROPIC_API_KEY/g) ?? []).length > 2) falla(G, "infra/produccion/compose-app.yml", 0, "la llave de la IA solo se le pasa al contenedor de la app");
    if (!/^  "ANTHROPIC_API_KEY": \{ "origen": "sellado", "maquina": "app",/m.test(readFileSync("infra/comun/secretos.json", "utf8"))) falla(G, "infra/comun/secretos.json", 0, "la llave de la IA llega sellada solo para la máquina de la app");
    if (existsSync(R)) {
      const r = sinComent(R);
      if (!/if \(ENTORNO === "produccion" \|\| !tokenOk\(req\.headers\.get\("x-barrido-token"\)\)\) return NO\(\);/.test(r)) falla(G, R, 0, "la ruta de pruebas de El Compa no existe en producción y pide el token del barrido");
      if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const u = await yo\(\);/.test(r) || /userId: (?!u\.id)/.test(r)) falla(G, R, 0, "la ruta de pruebas toma a la persona de la sesión y revisa el origen");
    }
  },

  /* 7c. Un solo proveedor de IA y un solo archivo que le habla: solo lib/compa/modelo-claude.ts nombra su dirección o importa su SDK; ningún otro SDK
     de IA en el repo; lo que traduce no importa lib/compa (la regla de 5h sigue: la traducción es propia). */
  compaUnSoloProveedor() {
    const G = "compaUnSoloProveedor", MC = "apps/web/lib/compa/modelo-claude.ts";
    const OTROS = /"(openai|@google\/generative-ai|@google\/genai|cohere-ai|@mistralai\/[\w-]+|mistralai|langchain|@langchain\/[\w-]+|ollama|groq-sdk|together-ai|replicate|ai|@ai-sdk\/[\w-]+)"\s*:/;
    for (const x of archivos) {
      // 9a · pruebas/ (las al revés inyectan el defecto a propósito y compa7c busca la llave en el registro) cuenta como guardianes/.
      if (x.startsWith("docs/") || x.startsWith("guardianes/") || x.startsWith("pruebas/") || !/\.(tsx?|jsx?|mjs|cjs|sh|ya?ml|json|conf)$/.test(x)) continue;
      const t = readFileSync(x, "utf8");
      if (/api\.anthropic\.com|@anthropic-ai\/sdk/.test(t) && x !== MC) falla(G, x, 0, "solo lib/compa/modelo-claude.ts habla con el proveedor de IA");
      if (/(^|\/)package\.json$/.test(x) && OTROS.test(t)) falla(G, x, 0, `otro SDK de IA (${OTROS.exec(t)[1]}): El Compa usa un solo proveedor`);
      if (/api\.openai\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.cohere\.(ai|com)|api\.groq\.com/.test(t)) falla(G, x, 0, "otro proveedor de IA en el repo");
    }
    if (existsSync(MC) && !/const URL_API = "https:\/\/api\.anthropic\.com\/v1\/messages";/.test(readFileSync(MC, "utf8"))) falla(G, MC, 0, "modelo-claude.ts tiene una sola dirección fija del proveedor");
    for (const x of codigo) if (/^apps\/web\/lib\/(traduc|traductor)/.test(x) && /lib\/compa|\.\/compa\//.test(sinComent(x))) falla(G, x, 0, "lo que traduce no usa El Compa (la traducción es propia)");
  },

  /* 7c. Toda llamada al modelo pasa por el tope: cada archivo que llama a .responder( (fuera de las implementaciones del modelo) llama ANTES a
     gastar() y DESPUÉS a anotarUso(); gastar() vuelve a leer los interruptores y reserva en la base. Ningún precio ni costo escrito en el código
     de El Compa: salen de compa_models (compa_costo / compa_anotar en la base). */
  compaPorElTope() {
    const G = "compaPorElTope", T = "apps/web/lib/compa/tope.ts";
    if (!existsSync(T)) return falla(G, T, 0, "falta lib/compa/tope.ts (gastar, anotarUso)");
    const t = sinComent(T), gs = cuerpoFn(t, "gastar");
    if (!/await disponible\(/.test(gs) || !/select compa_reservar\(\$1, \$2, \$3, \$4\)/.test(gs)) falla(G, T, 0, "gastar() lee los interruptores y reserva en la base (compa_reservar)");
    if (!/select compa_anotar\(/.test(cuerpoFn(t, "anotarUso"))) falla(G, T, 0, "anotarUso() liquida y escribe el libro en la base (compa_anotar)");
    let llamadas = 0;
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || /^apps\/web\/lib\/compa\/modelo(-[a-z]+)?\.ts$/.test(x)) continue;
      const c = sinComent(x);
      // Quien usa el modelo de El Compa (importa lib/compa/modelo): cada .responder( pasa por el tope.
      if (/from "(\.\/|@\/lib\/compa\/)modelo"/.test(c)) for (const m of c.matchAll(/\.responder\(/g)) {
        llamadas++;
        const antes = c.slice(0, m.index), despues = c.slice(m.index);
        if (!/await gastar\(/.test(antes.slice(antes.lastIndexOf("export async function")))) falla(G, x, 0, "una llamada al modelo sin gastar() antes (el tope)");
        // Después: anotarUso() en el camino del error Y en el de la respuesta (con los tokens que devolvió).
        const resto = despues.slice(0, (despues.indexOf("\nexport ") + 1 || despues.length + 1) - 1);
        if ((resto.match(/await anotarUso\(/g) ?? []).length < 2 || !/await anotarUso\(\{[^}]*tokens: sal\.tokens/.test(resto)) falla(G, x, 0, "una llamada al modelo sin anotarUso() después (el libro), en el error y en la respuesta");
      }
      if (/^apps\/web\/lib\/compa\//.test(x) && /\b(100000|500000|2000000|10000000|125000|2500000)\b|\b0\.(10|50)\b|\$\s?0\.1\b|\b(input|output)_per_mtok_microusd\s*[*+]/.test(c)) falla(G, x, 0, "un precio de la IA escrito en el código: sale de compa_models");
      if (/\bupdate compa_spend_month\b|\binsert into compa_usage\b|\bupdate compa_reservations\b|\binsert into compa_reservations\b/.test(c)) falla(G, x, 0, "el gasto, las reservas y el libro solo los mueven las funciones de la base");
    }
    if (!llamadas) falla(G, T, 0, "nadie llama al modelo: ¿se movió conversacion.ts?");
  },

  /* 7c (y la parte IA del guardián Costos de PLAN §5). El tope en la BASE: compa_tope_mes_cents con límites (por defecto $100) y aviso al
     compa_alerta_pct; compa_reservar reserva con la condición gastado + reservado + máximo ≤ tope en una sola sentencia (con 20 a la vez no se
     pasa) y lee el tope en ese momento; el costo sale de compa_models; el libro compa_usage es de solo inserción y no guarda texto. */
  costosIA() {
    const G = "costosIA", M = "packages/db/migrations/0118_compa_base.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del tope de El Compa");
    const k = Object.fromEntries(catalogoConfig().map((x) => [x.k, x]));
    if (!k.compa_tope_mes_cents || k.compa_tope_mes_cents.d !== 10000 || k.compa_tope_mes_cents.a !== 0) falla(G, M, 0, "compa_tope_mes_cents en Configuración con límites ($100 por defecto)");
    if (!k.compa_alerta_pct) falla(G, M, 0, "compa_alerta_pct: el aviso antes del tope");
    const r = ultimaFn("compa_reservar"), a = ultimaFn("compa_anotar"), c = ultimaFn("compa_costo");
    if (!/tope bigint := cfg_int\('compa_tope_mes_cents'\)::bigint \* 10000/.test(r)) falla(G, M, 0, "compa_reservar lee el tope de Configuración en el momento");
    if (!/update compa_spend_month set reserved_microusd = reserved_microusd \+ maxi[^;]*where month = m and spent_microusd \+ reserved_microusd \+ maxi <= tope;/.test(r)) falla(G, M, 0, "la reserva es atómica: gastado + reservado + máximo ≤ tope en una sola sentencia");
    if (!/compa_costo\(p_model/.test(r) || !/compa_costo\(p_model/.test(a) || !/from compa_models m where m\.id = p_model/.test(c)) falla(G, M, 0, "el costo sale de los precios de compa_models");
    if (!/create trigger compa_usage_solo_insercion before update or delete on compa_usage/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "compa_usage es de solo inserción");
    const usage = /create table if not exists compa_usage \(([\s\S]*?)\n\);/.exec(readFileSync(M, "utf8"))?.[1] ?? "";
    if (/\b(text|body|prompt|message|reply)\s+text\b/.test(usage)) falla(G, M, 0, "el libro de uso no guarda texto de la conversación");
    if (!/compa_soltar_reservas/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "el barrido suelta las reservas que nunca volvieron");
  },

  /* 7c. El Compa nunca es un camino al dinero: lib/compa/* no importa pagos, cobros, devoluciones, boletos, suscripciones, cupones, monedas ni
     puntos; el tipo de compa_actions es la lista cerrada; cancel_request solo llama a las funciones de cancelar DEL CLIENTE del mapa CANCELABLES. */
  compaSinDinero() {
    const G = "compaSinDinero", A = "apps/web/lib/compa/acciones.ts", M = "packages/db/migrations/0118_compa_base.sql";
    for (const x of codigo.filter((f) => /^apps\/web\/lib\/compa\//.test(f))) {
      const c = sinComent(x);
      for (const m of c.matchAll(/from "([^"]+)"|import\("([^"]+)"\)/g)) {
        const p = m[1] ?? m[2];
        if (/pagos|cobros|devolver|boletos|suscripcion|cupones|monedas|puntos|layaway|apartados|liquidacion|stripe|tarjeta/.test(p)) falla(G, x, 0, `El Compa no importa nada de dinero («${p}»)`);
      }
      if (/\b(devolverPago|cobrarOperacion|liberarOperacion|capturar|reembolsar|transferir)\s*\(/.test(c)) falla(G, x, 0, "El Compa no mueve dinero");
    }
    if (existsSync(M) && !/type\s+text not null check \(type in \('cancel_request', 'open_screen', 'go_to_panel'\)\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "compa_actions.type es la lista cerrada (cancel_request, open_screen, go_to_panel)");
    if (!existsSync(A)) return falla(G, A, 0, "falta lib/compa/acciones.ts");
    const a = sinComent(A), mapa = /const CANCELABLES[^\n]*\{\n([\s\S]*?)\n\};/.exec(a)?.[1] ?? "";
    if (!mapa) falla(G, A, 0, "falta el mapa CANCELABLES");
    for (const l of mapa.split("\n").filter((x) => x.trim())) if (!/^\s+(appointment|table): async \(u, n\) => (citaCliente\(u, n, "cancelar", undefined, "compa"\)|rsvCliente\(u, n, "cancelar", "otro", "compa"\)),$/.test(l)) falla(G, A, 0, `CANCELABLES: solo la cancelación del cliente de una solicitud («${l.trim().slice(0, 60)}»)`);
    if (!/o\.status !== "pending" \|\| o\.detail \|\| !\(o\.pago == null \|\| o\.pago === "held"\)/.test(cuerpoFn(a, "confirmar"))) falla(G, A, 0, "confirmar: solo una solicitud PENDIENTE y sin cobro");
  },

  /* 7c. Nada se ejecuta en la petición que trae la respuesta del modelo: conversacion.ts solo PROPONE (proponer) y nunca confirma ni llama al mapa
     CANCELABLES; confirmar() es otra petición (quien la llama revisa mismoOrigen y toma a la persona de la sesión), la toma una sola vez
     (proposed → confirming), vuelve a leer la operación de ESA persona y vence si cambió. */
  compaAccionConfirmada() {
    const G = "compaAccionConfirmada", C = "apps/web/lib/compa/conversacion.ts", A = "apps/web/lib/compa/acciones.ts", M = "packages/db/migrations/0118_compa_base.sql";
    if (!existsSync(C) || !existsSync(A)) return falla(G, C, 0, "falta el motor de El Compa");
    const c = sinComent(C);
    if (/\bconfirmar\(|CANCELABLES|citaCliente|rsvCliente/.test(c) || !/import \{ proponer, validarAccion, type Propuesta \} from "\.\/acciones";/.test(c)) falla(G, C, 0, "el turno solo propone (proponer/validarAccion); nunca confirma");
    const f = cuerpoFn(sinComent(A), "confirmar");
    if (!/set status = 'confirming', confirmed_via = \$3 where id = \$1 and user_id = \$2 and status = 'proposed' and expires_at >= now\(\)/.test(f)) falla(G, A, 0, "confirmar toma la acción una sola vez (de esa persona, propuesta y sin vencer)");
    if (!/where o\.id = \$1::bigint and o\.user_id = \$2/.test(f) || !/o\.status !== a\.op_status/.test(f)) falla(G, A, 0, "confirmar vuelve a leer la operación de ESA persona y vence si cambió");
    if (existsSync(M) && !/raise exception 'compa_accion_decidida/.test(ultimaFn("compa_actions_antes"))) falla(G, M, 0, "la base no deja decidir una acción dos veces");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || /^apps\/web\/lib\/compa\//.test(x)) continue;
      const t = sinComent(x);
      if (/\.confirmar\(|\bconfirmar\(\{ userId/.test(t) && /lib\/compa\/acciones/.test(t) && !(/await mismoOrigen\(\)/.test(t) && /const u = await yo\(\);/.test(t) && /confirmar\(\{ userId: u\.id \}/.test(t))) falla(G, x, 0, "confirmar una acción de El Compa: mismo origen y la persona de la sesión");
      // 7d · Y en CADA función que confirma (no basta con que otra función del archivo revise el origen).
      if (/lib\/compa\/acciones/.test(t)) for (const m of t.matchAll(/\bconfirmar\(\{ userId/g)) {
        const f = t.slice(t.lastIndexOf("export async function", m.index), m.index);
        if (!/if \(!\(await mismoOrigen\(\)\)\) return/.test(f) || !/const u = await yo\(\);/.test(f) || !/^\{ userId: u\.id \}/.test(t.slice(m.index + 10))) falla(G, x, 0, "cada confirmación de El Compa revisa el mismo origen y toma a la persona de la sesión");
      }
    }
  },

  /* 7c. El contexto es SOLO de esa persona: las funciones de contexto reciben el id de la sesión y filtran por él; una acción solo vale con una ref
     del mapa del servidor (op1, op2…) — nunca un id o un número que diga el modelo; el turno toma la conversación por número Y por persona. */
  compaSoloSusDatos() {
    const G = "compaSoloSusDatos", V = "apps/web/lib/compa/contexto-vecino.ts", A = "apps/web/lib/compa/acciones.ts", C = "apps/web/lib/compa/conversacion.ts";
    if (!existsSync(V)) return falla(G, V, 0, "falta el contexto del vecino");
    const v = sinComent(V);
    if (!/export async function contextoVecino\(userId: string, lang: Lang\)/.test(v) || !/where o\.user_id = \$1/.test(v) || !/where u\.id = \$1/.test(v)) falla(G, V, 0, "el contexto del vecino recibe el id de la sesión y solo lee lo suyo");
    if ((v.match(/\busers\b/g) ?? []).length !== 1 || !/from users u left join cities c on c\.id = coalesce\(u\.home_city_id, 'hzl'\) where u\.id = \$1`/.test(v)) falla(G, V, 0, "el contexto lee a la persona de la sesión y a nadie más");
    if (!/const ref = `op\$\{i \+ 1\}`;/.test(v)) falla(G, V, 0, "las operaciones van al modelo como op1, op2… (sin ids)");
    const val = cuerpoFn(sinComent(A), "validarAccion");
    const gets = (val.match(/x\.refs\.get\(/g) ?? []).length, buenos = (val.match(/\/\^op\\d\{1,2\}\$\/\.test\(a\.ref\) \? x\.refs\.get\(a\.ref\) : undefined/g) ?? []).length;
    if (!gets || gets !== buenos || /query\(|refs\.values\(|refs\.entries\(|\.find\(/.test(val)) falla(G, A, 0, "validarAccion: solo una ref del mapa del servidor (op1…), sin buscar nada que diga el modelo");
    if (existsSync(C)) { const c = sinComent(C), todas = (c.match(/from compa_conversations where number = \$1/g) ?? []).length, buenas = (c.match(/from compa_conversations where number = \$1 and user_id = \$2 and use = \$3 and closed_at is null/g) ?? []).length;
      if (!buenas || todas !== buenas) falla(G, C, 0, "una conversación se sigue solo si es de esa persona (en el turno y en los pasos)"); }
    // (7g · el contexto del copiloto recibe a la persona del equipo de la SESIÓN —Staff, con sus permisos y sus ciudades—, no un id suelto.)
    for (const x of codigo.filter((f) => /^apps\/web\/lib\/compa\/contexto-[a-z]+\.ts$/.test(f))) if (!/export async function contexto[A-Z][a-z]+\((userId|staffId|negocio): string|export async function contextoCopiloto\(s: Staff,/.test(sinComent(x))) falla(G, x, 0, "una función de contexto recibe solo el id de la sesión");
    // 7g · El copiloto: el caso se lee con las MISMAS lecturas de la ficha (casoEquipo: sop:ver y sus ciudades; caso de Colas: su rol y sus
    // ciudades), con el permiso de la acción que el borrador alimenta (sop:editar = Enviar; colas:aprobar = Resolver con un mensaje), solo la cola
    // «sop», y la conversación del copiloto es de esa persona del equipo y de ESE caso.
    const CP = "apps/web/lib/compa/contexto-copiloto.ts";
    if (existsSync(CP)) {
      const t = sinComent(CP), cc = cuerpoFn(t, "contextoCaso"), ca = cuerpoFn(t, "contextoAyuda");
      if (!/if \(!\(s\.puede\("sop", "ver"\) && s\.puede\("sop", "editar"\)\)\) return null;\n\s*const k = await casoEquipo\(s, numero\);/.test(cc)) falla(G, CP, 0, "el copiloto de un caso: Soporte › editar y la lectura de la ficha (casoEquipo con la persona de la sesión)");
      if (!/if \(!s\.puede\("colas", "aprobar"\)\) return null;\n\s*const k = await casoCola\(s, id\);/.test(ca) || !/k\.queue !== "sop"/.test(ca)) falla(G, CP, 0, "el copiloto de una ayuda escalada: Colas › aprobar, la lectura de la ficha (su rol y su ciudad) y solo la cola «sop»");
      if (/\b(from|join|update|into) (support_messages|support_cases|help_requests|queue_items)\b/.test(t)) falla(G, CP, 0, "el contexto del copiloto no lee las tablas del caso por su cuenta: usa las lecturas de la ficha");
    } else falla(G, CP, 0, "falta el contexto del copiloto");
    if (existsSync(C)) { const b = cuerpoFn(sinComent(C), "borradorCopiloto");
      if (!b || !/const ctx = await contextoCopiloto\(s, \{/.test(b) || !/where use = 'copilot' and user_id = \$1 and closed_at is null\s*and \(support_case_id = \$2::bigint or help_request_id = \$3::bigint\)/.test(b)) falla(G, C, 0, "borradorCopiloto: el contexto de la sesión y SU conversación de ese caso"); }
    // 7e · El panel: el contexto vuelve a comprobar en la base que la persona de la sesión es miembro ACTIVO de ESE negocio (la regla de
    // accesoPanel) y reparte la guía con esa misma regla; go_to_panel solo vale con una sección de ese mapa; la conversación del panel se sigue
    // solo si es de esa persona Y de ese negocio; el hilo que ve la pantalla es el suyo.
    const P = "apps/web/lib/compa/contexto-panel.ts";
    if (existsSync(P)) {
      const t = sinComent(P), cp = cuerpoFn(t, "contextoPanel");
      if (!/export async function contextoPanel\(userId: string, negocio: string, lang: Lang\)/.test(t) || !/where m\.business_id = \$2 and m\.user_id = \$1 and m\.status = 'active' and b\.status <> 'merged'/.test(cp)) falla(G, P, 0, "el contexto del panel comprueba que la persona de la sesión es miembro activo de ese negocio");
      if (!/const partes = m\.kind === "owner" \? \["all"\] : m\.access \?\? \[\];/.test(cp) || !/\(puedeAbrir\(partes, s\.parte\) \? secciones : prohibidas\)\.set\(s\.code, s\)/.test(cp)) falla(G, P, 0, "la guía del panel se reparte con la regla de accesoPanel (dueño todo; equipo sus partes)");
      if (!/export const puedeAbrir = \(partes: string\[\], parte: string \| null\) => !parte \|\| partes\.includes\("all"\) \|\| partes\.includes\(parte\);/.test(t)) falla(G, P, 0, "puedeAbrir = la regla de accesoPanel");
      if (!/puedes_abrir: \[\.\.\.secciones\.values\(\)\]/.test(cp) || /prohibidas\.values\(\)\]\.map/.test(cp)) falla(G, P, 0, "el modelo recibe solo las secciones que esa persona puede abrir");
      if (!/ve\("ord"\) \? db\(\)/.test(cp) || !/ve\("msg"\) \? db\(\)/.test(cp) || !/\.\.\.\(pay \? \{ plan:/.test(cp)) falla(G, P, 0, "las cifras del panel solo de las partes de esa persona");
    } else falla(G, P, 0, "falta el contexto del panel");
    if (!/const s = \/\^\[a-z\]\+\(\\\/\[a-z\]\+\)\?\$\/\.test\(a\.ref\) \? x\.secciones\.get\(a\.ref\) : undefined;/.test(val)) falla(G, A, 0, "go_to_panel: solo una sección del mapa del servidor (las que esa persona puede abrir)");
    if (existsSync(C)) {
      const tp = cuerpoFn(sinComent(C), "turnoPanel"), hp = cuerpoFn(sinComent(C), "hiloPanel");
      if (tp && (!/const ctx = await contextoPanel\(q\.userId, String\(x\.negocio \?\? ""\), lang\);\n\s*if \(!ctx\) return/.test(tp) || !/and closed_at is null and business_id = \$4 for update/.test(tp) || !/secciones: ctx\.secciones/.test(tp))) falla(G, C, 0, "turnoPanel: el contexto de la sesión en ESE negocio, su conversación y sus secciones");
      if (tp && !/if \(r\.accion\.tipo === "go_to_panel" && ctx\.prohibidas\.has\(r\.accion\.ref\)\) return fija\(LINEAS\.dueno/.test(tp)) falla(G, C, 0, "turnoPanel: una sección prohibida que propone el modelo = «Eso lo ve el dueño», sin enlace");
      if (tp && (!/if \(sec && !sec\.permitida\) return fija\(LINEAS\.dueno/.test(tp) || !/crudos\.filter\(\(h\) => !ctx\.slugsProhibidos\.has\(h\.slug\)\)/.test(tp))) falla(G, C, 0, "turnoPanel: nada de una parte que no tiene llega al modelo (sección y ayuda)");
      if (hp && !/where user_id = \$1 and business_id = \$2 and use = 'owner'/.test(hp)) falla(G, C, 0, "hiloPanel: solo la conversación de esa persona en ese negocio");
    }
  },

  /* 7c. El contexto nunca lee datos sensibles: Salud, Profesionales, Niños e inscripciones, op_private (salvo para dejarlas fuera), door_code,
     mensajes entre vecinos, fotos privadas ni nada del Super Admin. */
  compaSinDatosSensibles() {
    const G = "compaSinDatosSensibles";
    for (const x of codigo.filter((f) => /^apps\/web\/lib\/compa\/contexto-[a-z]+\.ts$/.test(f))) {
      const t = sinComent(x), sinExcl = t.replace(/not exists \(select 1 from op_private p where p\.operation_id = o\.id\)/g, "");
      if (/\b(op_private|door_code|dm_threads|dm_messages|neighbor_messages|chat_messages|health_|salud_|ninos|kids_|staff_members|audit_entries|support_messages|media\b)/.test(sinExcl)) falla(G, x, 0, "el contexto de El Compa lee una tabla sensible");
      if (/ninos-privado|salud|citas-salud|mensajes-vecinos/.test(t.match(/from "[^"]+"/g)?.join(" ") ?? "")) falla(G, x, 0, "el contexto importa un módulo sensible");
      // 7g · El copiloto nunca lee Salud, Profesionales, inscripciones (Niños) ni datos privados (la base lo dice por la operación), nunca la cola de
      // Cuidado de niños, y quita teléfonos y correos antes del modelo.
      if (/contexto-copiloto/.test(x) && (!/not \(o\.kind not in \('enrollment'\) and not \(coalesce\(o\.details->>'rubro', ''\) in \('salud', 'pro'\)\) and not exists \(select 1 from op_private p where p\.operation_id = o\.id\)\) as s/.test(t)
        || !/if \(h\.k === "enrollment" \|\| h\.rub === "salud" \|\| h\.rub === "pro"\) return null;/.test(t) || !/if \(await sensible\(h\.num, h\.uid, null\)\) return null;/.test(t)
        || !/export const paraModelo = [^\n]*tapar\([^\n]*\.replace\(TEL, TAPADO\)\.replace\(CORREO, TAPADO\)/.test(t))) falla(G, x, 0, "el contexto del copiloto deja fuera Salud, Profesionales, inscripciones y datos privados, y tapa teléfonos y correos");
      if (/contexto-vecino/.test(x) && (!/o\.kind not in \('enrollment'\)/.test(t) || !/coalesce\(o\.details->>'rubro', ''\) in \('salud', 'pro'\)/.test(t) || !/not exists \(select 1 from op_private p where p\.operation_id = o\.id\)/.test(t))) falla(G, x, 0, "el contexto del vecino deja fuera Salud, Profesionales, inscripciones (Niños) y lo que tiene datos privados");
    }
  },

  /* 7c. Lo que pasa por El Compa se TAPA: el texto de la persona antes de guardarlo y antes del modelo, los trozos y el historial que van al modelo,
     y la respuesta antes de guardarla; la base rechaza tarjeta o SSN en compa_messages y compa_handoffs. */
  compaTapaEnElMotor() {
    const G = "compaTapaEnElMotor", C = "apps/web/lib/compa/conversacion.ts", M = "packages/db/migrations/0118_compa_base.sql";
    if (!existsSync(C)) return;
    const c = sinComent(C);
    if (!/const t = tapar\(crudo\);/.test(c) || !/values \(\$1, \$2, 'user', \$3, \$4\)`, \[conv\.id, ciudad, q\.userId, t\.texto\]/.test(c)) falla(G, C, 0, "el mensaje de la persona se guarda tapado");
    if (!/texto: tapar\(h\.body\)\.texto/.test(c) || !/texto: tapar\(r\.text\)\.texto/.test(c)) falla(G, C, 0, "los trozos y el historial que van al modelo pasan por tapar()");
    if (!/\[conv\.id, ciudad, tapar\(r\.texto\)\.texto,/.test(c)) falla(G, C, 0, "la respuesta se guarda tapada");
    // 7e · En CADA uso (vecino y panel): cada trozo que va al modelo, cada mensaje de la persona y cada respuesta que se guarda, tapados.
    const nTrozos = (c.match(/\.map\(\(h\) => \(\{ fuente: h\.slug,/g) ?? []).length;
    if (nTrozos !== (c.match(/\.map\(\(h\) => \(\{ fuente: h\.slug, titulo: [^}]*texto: tapar\(h\.body\)\.texto \}\)\)/g) ?? []).length) falla(G, C, 0, "cada uso pasa sus trozos de ayuda por tapar() antes del modelo");
    for (const m of c.matchAll(/insert into compa_messages \(conversation_id, city_id, sender, user_id, text(?:, step_key)?\) values \(\$1, \$2, 'user', \$3, \$4(?:, \$5)?\)`, \[([^\]]*)\]/g))
      if (!/^conv\.id, ciudad, q\.userId, (t\.texto|tapar\()/.test(m[1])) falla(G, C, 0, "cada mensaje de la persona se guarda tapado");
    // 7h · El mensaje de alguien SIN cuenta (WhatsApp/SMS a un negocio) también se guarda tapado.
    for (const m of c.matchAll(/insert into compa_messages \(conversation_id, city_id, sender, contact_phone_hash, text\) values \(\$1, \$2, 'user', \$3, \$4\)`, \[([^\]]*)\]/g))
      if (!/^v\.id, ciudad, x\.contacto\.hash, tapar\(/.test(m[1])) falla(G, C, 0, "cada mensaje de un contacto sin cuenta se guarda tapado");
    for (const m of c.matchAll(/insert into compa_messages \(conversation_id, city_id, sender, text,[^`]*'compa'[^`]*`,\s*\[([^\]]*)\]/g))
      if (!/^conv\.id, ciudad, tapar\(/.test(m[1])) falla(G, C, 0, "cada respuesta de El Compa se guarda tapada");
    if (existsSync(M)) {
      if (!/if texto_con_secretos\(new\.text\) then raise exception 'compa_sin_secretos/.test(ultimaFn("compa_messages_antes"))) falla(G, M, 0, "la base rechaza tarjeta o SSN en compa_messages");
      if (!/if texto_con_secretos\(new\.summary\)/.test(ultimaFn("compa_handoffs_antes"))) falla(G, M, 0, "la base rechaza tarjeta o SSN en el resumen al pasar a una persona");
    }
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && /insert into compa_messages/.test(sinComent(x)) && x !== C) falla(G, x, 0, "solo conversacion.ts escribe mensajes de El Compa");
    // 7i · «Lo que El Compa no supo» guarda la pregunta TAPADA (la misma t.texto del mensaje) y solo lo escribe el motor; la base rechaza tarjeta y SSN.
    const nNo = [...c.matchAll(/anotarNoSupo\(c, \{([^}]*)\}\)/g)];
    if (nNo.length < 2 || nNo.some((m) => !/texto: t\.texto\b/.test(m[1]))) falla(G, C, 0, "lo que El Compa no supo se anota con la pregunta tapada (t.texto) en vecino y panel");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && /insert into compa_unknowns/.test(sinComent(x)) && x !== C) falla(G, x, 0, "solo el motor anota lo que El Compa no supo");
    if (!/if texto_con_secretos\(new\.query_tapada\) then raise exception 'compa_sin_secretos/.test(ultimaFn("compa_unknowns_antes"))) falla(G, C, 0, "la base rechaza tarjeta o SSN en lo que El Compa no supo");
    // 7f · La respuesta automática que sale en Mensajes también va tapada, y solo conversacion.ts escribe una (compa = true).
    const ins = [...c.matchAll(/insert into chat_messages \(thread_id, sender, body, compa\) values \(\$1, 'auto', \$2, true\)(?: returning id::text)?`, \[([^\]]*)\]/g)];
    if (!ins.length || ins.some((m) => !/^t\.id, tapar\(/.test(m[1]))) falla(G, C, 0, "la respuesta automática de El Compa se escribe en Mensajes tapada");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && x !== C && /insert into chat_messages[^`]*compa/.test(sinComent(x))) falla(G, x, 0, "solo conversacion.ts escribe una respuesta de El Compa en Mensajes");
    const nHist = (c.match(/\.map\(\(m\) => \(\{ de: m\.sender === "user"/g) ?? []).length;
    if (!nHist || nHist !== (c.match(/\.map\(\(m\) => \(\{ de: m\.sender === "user" \? "persona" as const : "compa" as const, texto: tapar\(m\.body\)\.texto \}\)\)/g) ?? []).length) falla(G, C, 0, "cada conversación de Mensajes que va al modelo pasa por tapar()");
  },

  /* 7c. El verificador de salida corre en TODA respuesta: la del modelo (sal.json) y la de las reglas; cubre esquema, emoji, enlaces, teléfonos,
     datos tapados, montos/porcentajes/plazos, «confirmada», «ya lo hice», hacerse pasar por una persona y la fuente (una cita ajena se quita). */
  compaSalidaLimpia() {
    const G = "compaSalidaLimpia", V = "apps/web/lib/compa/verificar.ts", C = "apps/web/lib/compa/conversacion.ts";
    if (!existsSync(V) || !existsSync(C)) return falla(G, V, 0, "falta el verificador de salida");
    const v = sinComent(V), f = cuerpoFn(v, "verificar"), c = sinComent(C);
    for (const [re, q] of [[/EMOJI\.test\(todo\)/, "emoji"], [/URL\.test\(todo\)/, "enlaces"], [/tapar\(todo\)\.tapado/, "datos tapados"], [/todo\.match\(TEL\)/, "teléfonos"], [/todo\.match\(CORREO\)/, "correos"],
      [/r\.respuesta\.match\(MONTO\)/, "montos"], [/r\.respuesta\.match\(PCT\)/, "porcentajes"], [/r\.respuesta\.match\(PLAZO\)/, "plazos"], [/HECHO\.test\(r\.respuesta\)/, "«ya lo hice»"], [/PERSONA\.test\(todo\)/, "hacerse pasar"],
      [/matchAll\(CONF\)/, "«confirmada»"], [/!c\.fuentes\.includes\(fuente\)\) fuente = ""/, "cita fuera de los trozos"], [/r\.tipo === "respuesta" && !fuente\) return \{ ok: false, motivo: "sin_fuente" \}/, "respuesta sin fuente"]])
      if (!re.test(f)) falla(G, V, 0, `el verificador no revisa ${q}`);
    // 7g · Cada uso verifica su salida: el verificador de siempre o el del uso (el copiloto), nunca ninguno; sal.json se lee una sola vez.
    if (!/const ver = x\.verificador \?\? \(\(j: unknown\) => verificar\(j, vctx!\)\);/.test(c) || !/v = ver\(sal\.json\)/.test(c) || (c.match(/sal\.json/g) ?? []).length !== 1) falla(G, C, 0, "la salida del modelo solo se usa después de verificar()");
    for (const m of c.matchAll(/await consultar\(\{[^]*?\}\);/g)) if (/SISTEMA_COPILOTO/.test(m[0]) && !/esquema: ESQUEMA_COPILOTO, verificador: \(j\) => verificarCopiloto\(j, vc\)/.test(m[0])) falla(G, C, 0, "el copiloto pasa por su esquema y por verificarCopiloto");
    if (!/const v = verificarCopiloto\(borradorCopilotoConReglas\(/.test(c)) falla(G, C, 0, "el borrador de reglas del copiloto también pasa por verificarCopiloto");
    const vc = cuerpoFn(v, "verificarCopiloto");
    for (const [re, q] of [[/EMOJI\.test\(todo\)/, "emoji"], [/URL\.test\(todo\)/, "enlaces"], [/tapar\(todo\)\.tapado/, "datos tapados"], [/todo\.match\(TEL\)/, "teléfonos"], [/HECHO\.test\(r\.borrador\)/, "«ya lo hice»"],
      [/PROMETE_COP\.test\(sinAcentosV\(r\.borrador\)\)/, "promesas de dinero o sanciones"], [/r\.borrador\.match\(MONTO\)/, "montos"], [/r\.borrador\.match\(PLAZO\)/, "plazos"], [/for \(const nota of c\.internas\) for \(const s of tejas\(nota, 5\)\) if \(t\.has\(s\)\) return \{ ok: false, motivo: "nota_interna" \}/, "notas internas en el borrador (cinco palabras seguidas)"],
      [/for \(const w of palabrasV\(r\.borrador\)\) if \(numsInt\.has\(w\)\) return \{ ok: false, motivo: "nota_interna" \}/, "números que solo están en una nota interna"],
      [/c\.macros\.includes\(r\.macro\)/, "la macro de la lista"], [/sugerir_devolver: r\.sugerir_devolver && c\.puedeDevolver/, "«Resolver y devolver» solo si su rol puede"]])
      if (!re.test(vc)) falla(G, V, 0, `verificarCopiloto no revisa ${q}`);
    if (!/verificar\(responderConReglas\(/.test(c)) falla(G, C, 0, "las reglas fijas también pasan por el verificador");
    if (!/export const SISTEMA_VECINO = \[/.test(c) || /SISTEMA_VECINO\s*=.*(query|valor|process\.env)/.test(c)) falla(G, C, 0, "el sistema del modelo es fijo y vive en el código del servidor");
    // 7e · El del panel también; y el modelo solo se llama por consultar() (que verifica): cada uso le pasa su sistema fijo.
    if (!/export const SISTEMA_PANEL = \[/.test(c) || /SISTEMA_PANEL\s*=.*(query|valor|process\.env)/.test(c)) falla(G, C, 0, "el sistema del panel es fijo y vive en el código del servidor");
    for (const m of c.matchAll(/await consultar\(\{[^}]*sistema: ([A-Za-z_.]+)/g)) if (!/^SISTEMA_(VECINO|PANEL|AUTO|BORRADOR|COPILOTO)$/.test(m[1])) falla(G, C, 0, `el modelo recibe un sistema fijo (no ${m[1]})`);
    // 7f · Los de la respuesta automática y el borrador, también fijos del servidor (la nota del dueño va como DATO, nunca en el sistema).
    for (const k of ["SISTEMA_AUTO", "SISTEMA_BORRADOR", "SISTEMA_COPILOTO"]) if (!new RegExp(`export const ${k} = \\[`).test(c) || new RegExp(`${k}\\s*=.*(query|valor|process\\.env|nota)`).test(c)) falla(G, C, 0, `${k} es fijo y vive en el código del servidor`);
  },

  /* 7c. Los interruptores se leen en UN lugar (lib/compa/interruptores.ts: feature_flags compa.* y compa_pauses), en cada turno y otra vez en gastar();
     una bandera que falta = apagado; en producción El Compa no se enciende antes de la fase 9 (candado). */
  compaInterruptores() {
    const G = "compaInterruptores", I = "apps/web/lib/compa/interruptores.ts", C = "apps/web/lib/compa/conversacion.ts";
    if (!existsSync(I)) return falla(G, I, 0, "falta lib/compa/interruptores.ts");
    const i = sinComent(I), d = cuerpoFn(i, "disponible");
    if (!/if \(candadoProduccion\(\)\) return \{ ok: false, por: "produccion" \};/.test(d) || !/ENTORNO === "produccion" && process\.env\.TOLATINO_COMPA !== "encendido"/.test(i)) falla(G, I, 0, "candado: en producción El Compa no se enciende antes de la fase 9");
    if (!/if \(!r\?\.nivel\) return \{ ok: false, por: "nivel" \};/.test(d) || !/compa_pauses where scope = 'city'/.test(d) || !/compa_pauses where scope = 'business'/.test(d)) falla(G, I, 0, "disponible(): nivel, canal, ciudad y negocio (una bandera que falta = apagado)");
    for (const fn of ["turno", "paso"]) { const b = cuerpoFn(sinComent(C), fn); if (b && (!/const d = await disponible\(/.test(b) || !/if \(!d\.ok \|\| !dOp\.ok\) return \{ ok: false, apagado: true/.test(b))) falla(G, C, 0, `${fn}(): revisa los interruptores (la persona y la operación) antes de todo`); }
    // 7e · El panel: nivel «owner», canal, la ciudad y la pausa DEL NEGOCIO y el tope, antes de escribir nada.
    { const b = cuerpoFn(sinComent(C), "turnoPanel"), i = b.indexOf("insert into compa_conversations");
      if (b && (!/const d = await disponible\(\{ uso: "owner", canal: "app", ciudad, negocio \}\);\n\s*if \(!d\.ok \|\| \(await alTope\(\)\)\) return \{ ok: false, apagado: true/.test(b) || i < 0 || b.indexOf("await disponible(") > i)) falla(G, C, 0, "turnoPanel(): revisa los interruptores del panel y el tope antes de todo"); }
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || x === I) continue;
      const t = sinComent(x);
      if (/feature_flags[^`]*compa\.|'compa\.(use|channel)\./.test(t) || /\b(from|update|into) compa_pauses\b/.test(t)) falla(G, x, 0, "los interruptores de El Compa se leen y se cambian solo en lib/compa/interruptores.ts");
      // 7f · «Apagar El Compa aquí» en una conversación (chat_threads.compa_off_*): se lee y se cambia solo ahí.
      if (/\bcompa_off_(at|by|reason)\b/.test(t.replace(/compa_off_reason as compa_off/g, ""))) falla(G, x, 0, "El Compa apagado en una conversación se lee y se cambia solo en lib/compa/interruptores.ts");
    }
  },

  /* 7c. El Compa nunca está en la ruta crítica: ninguna pantalla ni acción de pedido, pago, boleto, puerta, panel o cuenta importa el motor
     (conversación, modelo, tope, acciones, contexto). Solo lo usan lib/compa, su ruta de pruebas, el barrido y el Super Admin. */
  compaSinRutaCritica() {
    const G = "compaSinRutaCritica";
    // 7e · Y las acciones del asistente del panel (app/panel/acciones-compa.ts: solo las llama la sección El Compa) y Negocios 360° (Super Admin).
    const PERMITIDO = /^apps\/web\/(lib\/compa\/|app\/api\/interno\/compa\/|lib\/barrido\.ts$|app\/admin\/(page\.tsx$|compa\/|acciones-compa\.ts$|acciones-copiloto\.ts$|ElCompaAdmin\.tsx$|negocios\/\[id\]\/page\.tsx$|usuarios\/\[id\]\/page\.tsx$|sistema\/configuracion\/page\.tsx$|acciones-config\.ts$)|app\/\(app\)\/soporte\/compa\/|app\/panel\/acciones-compa\.ts$)/;
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x) || PERMITIDO.test(x)) continue;
      const t = sinComent(x);
      // (un import solo de TIPOS no ejecuta nada: no cuenta)
      const sinTipos = t.replace(/import\s+type\s+\{[^}]*\}\s+from\s+"[^"]+";/g, "");
      for (const m of sinTipos.matchAll(/(?:from |import\()"(@\/lib\/compa\/|\.\.?\/(?:\.\.\/)*compa\/)(conversacion|modelo[a-z-]*|tope|acciones|persona|contexto-[a-z]+|interruptores|verificar|reglas|admin-compa)"/g)) falla(G, x, 0, `la ruta de ${x.split("/").slice(2, 4).join("/")} no espera a El Compa (importa ${m[2]})`);
      // 7e · El asistente del panel solo lo carga la página del panel, solo para su sección y siempre con .catch(() => …): si falla, la sección
      // dice que El Compa no está y nada más del panel cambia.
      if (/(?:from |import\()"@\/lib\/compa\/asistente-panel"/.test(sinTipos)) {
        if (x !== "apps/web/app/panel/[id]/[[...r]]/page.tsx") falla(G, x, 0, "el asistente del panel solo lo carga la página del panel");
        else if (!/const cpa = ruta\.sec === "cpa" \? await \(await import\("@\/lib\/compa\/asistente-panel"\)\)\.asistentePanel\(acc\.yo\.id, d\.id, lang\)\.catch\(\(\) => null\) : undefined;/.test(t)) falla(G, x, 0, "el asistente del panel: solo en su sección y con .catch(() => null)");
      }
      // 7d · Fuera de su lugar solo se puede preguntar si El Compa está (lib/compa/hoja: lectura barata) y SIEMPRE con el camino de siempre si falla.
      if (/from "@\/lib\/compa\/hoja"/.test(t)) for (const m of t.matchAll(/\b(estadoVecino|hojaDe|opsVecino|vecinoDisponible|opVecino)\(/g))
        if (!/^[^;]*?\.catch\(\(\) =>/.test(t.slice(m.index))) falla(G, x, 0, `${m[1]}() fuera de El Compa sin .catch(() => …): si falla, la pantalla sigue como siempre`);
      if (/hoja-ayuda/.test(t) && !/^apps\/web\/app\/\(app\)\/[a-z/]+\/\[num\]\/ayuda\/page\.tsx$/.test(x)) falla(G, x, 0, "la hoja de ayuda solo la abre la página «Ayuda con …» de una operación");
      // 7g · El copiloto: fuera de su acción (acciones-copiloto.ts), solo la ficha de Soporte y la de Colas PREGUNTAN si está (copilotoDisponible,
      // lectura barata) y siempre con .catch(() => false): apagado, al tope o con un error, la ficha es la de siempre. Responder, resolver y devolver
      // nunca esperan al copiloto.
      if (/(?:from |import\()"(?:@\/lib\/|\.\/)compa\/copiloto"/.test(sinTipos)) {
        if (!/^apps\/web\/(app\/admin\/soporte\/page\.tsx|lib\/admin-colas\.ts)$/.test(x)) falla(G, x, 0, "solo la ficha de Soporte y la de Colas preguntan por el copiloto");
        for (const m of t.matchAll(/\bcopilotoDisponible\(/g)) if (!/^[^;]*?\.catch\(\(\) => false\)/.test(t.slice(m.index))) falla(G, x, 0, "copilotoDisponible() sin .catch(() => false): si falla, la ficha sigue como siempre");
        if (/\bborrador\(/.test(t)) falla(G, x, 0, "el borrador del copiloto solo lo pide su acción (acciones-copiloto.ts)");
      }
      // 7f · Mensajes y el panel solo PREGUNTAN a lib/compa/respuesta-auto (lecturas baratas) y siempre con .catch (si falla, lo de siempre); el turno
      // con el modelo nunca se espera: corre después (after) o en el barrido.
      if (/compa\/respuesta-auto"/.test(t) && !/^apps\/web\/(app\/panel\/acciones-compa\.ts|app\/admin\/compa\/page\.tsx)$/.test(x)) {
        for (const m of t.matchAll(/\b(compaContestara|ajustesAuto|estadoAutoMensajes|sugerirDisponible|contestarAuto)\(/g)) {
          const resto = t.slice(m.index, m.index + 200);
          if (!/^[^;\n]*?\.catch\(\(\) =>/.test(resto) && !(m[1] === "contestarAuto" && /^contestarAuto\(hilo\)\)\.catch\(\(\) => undefined\)\); \}/.test(resto))) falla(G, x, 0, `${m[1]}() fuera de El Compa sin .catch(() => …): si falla, Mensajes y el panel siguen como siempre`);
        }
        if (/\bcontestarAuto\(/.test(t) && !/after\(\(\) => import\("@\/lib\/compa\/respuesta-auto"\)\.then\(\(m\) => m\.contestarAuto\(hilo\)\)\.catch\(\(\) => undefined\)\)/.test(t)) falla(G, x, 0, "la respuesta automática corre DESPUÉS de contestar (after), nunca en la ruta del mensaje");
      }
    }
  },

  /* ── Fase 7 · 7d El Compa para vecinos ── */
  /* 7d. Siempre se sabe que es una IA y siempre hay una persona: la hoja (2as) y los pasos (2at) pasan por CompaVecino con el aviso fijo (ES/EN,
     verbatim de §1c) y su línea de privacidad a /ayuda/privacidad-de-el-compa en `disclaimer`, «Con una persona» SIEMPRE (personLabel y
     person2Label sin condición) y «EL COMPA LO PREPARÓ · CONFÍRMALO TÚ» en la barra de confirmar; las piezas Compa* del sistema solo se usan ahí. */
  compaSiempreIA() {
    const G = "compaSiempreIA", V = "apps/web/app/(app)/soporte/compa/CompaVecino.tsx", C = "apps/web/lib/compa/conversacion.ts";
    if (!existsSync(V)) return falla(G, V, 0, "falta la pantalla de El Compa para vecinos");
    // 7h · El enlace de un uso de WhatsApp/SMS (la misma hoja con la acción preparada) cumple lo mismo: aviso de IA verbatim, privacidad,
    // «Con una persona» sin condición y «EL COMPA LO PREPARÓ · CONFÍRMALO TÚ».
    const EN = "apps/web/app/(app)/compa/e/[token]/EnlaceCompa.tsx";
    for (const VV of [V, ...(existsSync(EN) ? [EN] : [])]) { const v = sinComent(VV), V = VV;
    for (const [re, q] of [[/"EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE\. LO QUE MUEVE DINERO O CAMBIA TU CUENTA LO REVISA UNA PERSONA\."/, "el aviso de IA en español (verbatim)"],
      [/"EL COMPA IS AN AI AND CAN MAKE MISTAKES\. ANYTHING THAT MOVES MONEY OR CHANGES YOUR ACCOUNT IS REVIEWED BY A PERSON\."/, "el aviso de IA en inglés (verbatim)"],
      [/href="\/ayuda\/privacidad-de-el-compa"/, "la línea de privacidad a /ayuda/privacidad-de-el-compa"], [/disclaimer=\{disc\}/, "el aviso en el marco (disclaimer)"],
      [/personLabel=\{E2\("Con una persona", "Talk to a person"\)\}/, "«Con una persona» arriba, sin condición"], [/person2Label=\{E2\("Hablar con una persona", "Talk to a person"\)\}/, "«Hablar con una persona» en la hoja, sin condición"],
      [/note: E2\("EL COMPA LO PREPARÓ · CONFÍRMALO TÚ", "EL COMPA PREPARED IT · YOU CONFIRM"\)/, "«EL COMPA LO PREPARÓ · CONFÍRMALO TÚ»"]])
      if (!re.test(v)) falla(G, V, 0, `falta ${q}`);
    if ((v.match(/<C\.CompaFrame\b/g) ?? []).length !== 1) falla(G, V, 0, "un solo marco CompaFrame (con el aviso y la persona)"); }
    for (const x of codigo) if (/^apps\/web\/.*\.tsx$/.test(x) && x !== V && x !== EN && /\bCompaFrame\b/.test(sinComent(x))) falla(G, x, 0, "El Compa del vecino se pinta solo en CompaVecino.tsx o en el enlace de WhatsApp/SMS (con el aviso de IA y «Con una persona»)");
    if (existsSync(C) && !/Eres El Compa, el asistente de IA de To'Latino[^"]*Eres una IA y lo dices si te preguntan/.test(sinComent(C))) falla(G, C, 0, "el sistema del modelo dice que es una IA");
    // 7e · El panel (DASH-COMPA): la nota fija de IA (verbatim de §1c) siempre que El Compa está, «Con una persona» sin condición, el rótulo
    // «EL COMPA · IA» en cada respuesta; y los DOS sistemas dicen que es una IA.
    const PC = "apps/web/app/panel/CompaPanel.tsx";
    if (!existsSync(PC)) falla(G, PC, 0, "falta la pantalla Panel › El Compa");
    else {
      const t = sinComent(PC);
      for (const [re, q] of [[/E2\(`El Compa es una IA\. No cambia nada en tu panel: te dice dónde se hace y te lleva\. Lo de dinero o tu cuenta lo ve una persona del equipo, \$\{x\.horario\}\.`,/, "la nota fija de IA del panel (verbatim)"],
        [/\{ l: E2\("Con una persona", "Talk to a person"\), v: "secondary"/, "«Con una persona» siempre"], [/m: `EL COMPA · \$\{/, "el rótulo «EL COMPA · IA» en cada respuesta"]]) if (!re.test(t)) falla(G, PC, 0, `falta ${q}`);
      const iNota = t.indexOf("El Compa es una IA. No cambia nada"), iRet = t.indexOf("return { blocks: out, ed: null };\n  }");
      if (iNota < iRet) falla(G, PC, 0, "la nota de IA va en toda pantalla donde El Compa contesta (después del «no disponible»)");
    }
    if (existsSync(C) && (sinComent(C).match(/Eres El Compa, el asistente de IA de To'Latino[^"]*Eres una IA y lo dices si te preguntan/g) ?? []).length < 2) falla(G, C, 0, "el sistema del panel también dice que es una IA");
    // 7f · CADA sistema fijo (vecino, panel, respuesta automática y borrador) dice que es una IA (contar no basta: hay cuatro).
    if (existsSync(C)) { const c = sinComent(C);
      for (const k of ["VECINO", "PANEL", "AUTO", "BORRADOR"]) { const i = c.indexOf(`export const SISTEMA_${k} = [`);
        if (i < 0) { if (k === "VECINO" || k === "PANEL") falla(G, C, 0, `falta SISTEMA_${k}`); continue; }
        if (!/Eres El Compa, el asistente de IA de To'Latino[^"]*Eres una IA y lo dices si te preguntan/.test(c.slice(i, c.indexOf("].join(", i)))) falla(G, C, 0, `SISTEMA_${k} dice que es una IA`); } }
  },

  /* 7d. Sin El Compa nada se rompe (la regresión «todo apagado» hecha regla): cada página «Ayuda con …» de una operación pregunta PRIMERO por la
     hoja con hojaAyuda() y, si vuelve null, sigue con lo de siempre (`if (hoja) return hoja;`); hojaAyuda envuelve todo en try/catch → null y
     respeta ?de=compa; hojaDe() solo devuelve la hoja si vecinoDisponible() (interruptores de nivel, canal, ciudad y negocio, y el tope) y la
     operación es de esa persona, del tipo de la ruta y sin solicitud de ayuda. Al revés: quitar el `if (hoja)`, el catch, el tope o el tipo → falla. */
  compaHojaSinRomper() {
    const G = "compaHojaSinRomper", H = "apps/web/app/(app)/soporte/compa/hoja-ayuda.tsx", L = "apps/web/lib/compa/hoja.ts";
    const RUTA = { cita: "appointment", pedido: "order", mercado: "market_order", apartado: "hold", fiesta: "party", viaje: "trip", noche: "night", insc: "enrollment", vis: "visit", privado: "private_event", "eventos/orden": "tickets" };
    const paginas = codigo.filter((f) => /^apps\/web\/app\/\(app\)\/[a-z/]+\/\[num\]\/ayuda\/page\.tsx$/.test(f));
    for (const f of paginas) {
      const t = sinComent(f), r = f.replace(/^apps\/web\/app\/\(app\)\//, "").replace(/\/\[num\]\/ayuda\/page\.tsx$/, "");
      const k = RUTA[r];
      if (!k) { falla(G, f, 0, `una página de ayuda nueva (${r}): súmala a la hoja de El Compa con su tipo`); continue; }
      if (!new RegExp(`const hoja = await hojaAyuda\\(u, [^,]+, \\(await searchParams\\)\\.de, \\["${k}"\\], \\(\\) => <Operacion params=\\{params\\}[^>]*/>\\);\\n\\s*if \\(hoja\\) return hoja;`).test(t)) falla(G, f, 0, `la Ayuda pregunta primero por la hoja (tipo ${k}) y si no, sigue como siempre`);
      if (!/import Operacion from "\.\.\/page";/.test(t)) falla(G, f, 0, "la hoja va sobre la pantalla de la operación de siempre");
      const iH = t.indexOf("const hoja = await hojaAyuda("), iN = t.lastIndexOf("notFound();", iH);
      if (iH < 0 || iN < 0) falla(G, f, 0, "la hoja va DESPUÉS de las revisiones de siempre de la página (si la Ayuda no existe para esa persona, 404 como antes)");
    }
    if (paginas.length < 11) falla(G, H, 0, `faltan páginas de ayuda con la hoja (${paginas.length} de 11)`);
    if (!existsSync(H) || !existsSync(L)) return falla(G, H, 0, "falta la hoja de ayuda");
    const h = sinComent(H), l = sinComent(L);
    if (!/if \(de === "compa"\) return null;/.test(h) || !/try \{[\s\S]*const h = await hojaDe\(u\.id, num, kinds\);[\s\S]*\} catch \(e\) \{[\s\S]*return null;\s*\}/.test(h)) falla(G, H, 0, "hojaAyuda: ?de=compa y cualquier falla = el camino de siempre (null)");
    const hd = cuerpoFn(l, "hojaDe"), vd = cuerpoFn(l, "vecinoDisponible"), ev = cuerpoFn(l, "estadoVecino");
    if (!/if \(!op \|\| op\.ayuda \|\| !kinds\.includes\(op\.kind\)\) return null;/.test(hd) || !/if \(!\(await vecinoDisponible\(userId, op\.negocioId, op\.ciudad\)\)\) return null;/.test(hd)) falla(G, L, 0, "hojaDe: suya, del tipo de la ruta, sin solicitud y con El Compa disponible en ese negocio");
    if (!/return e\.encendido && !e\.alTope;/.test(vd) || !/disponible\(\{ uso: "neighbor", canal: "app", ciudad, negocio: negocio \?\? null \}\)/.test(ev) || !/alTope\(\)/.test(ev)) falla(G, L, 0, "la hoja respeta nivel, canal, ciudad, negocio y el tope");
    if (!/where o\.user_id = \$1/.test(l) || !/not exists \(select 1 from op_private p where p\.operation_id = o\.id\)/.test(l) || !/'NEG-SALUD', 'NEG-PRO'/.test(l) || !/b\.category_id = 'NEG-NINOS'/.test(l)) falla(G, L, 0, "la hoja solo toca operaciones de la persona y nunca Salud, Profesionales, Niños ni datos privados");
  },

  /* 7d. Lo que hablan los vecinos con El Compa lo lee solo el equipo con compa:editar y CADA apertura queda en compa_reads antes de leer el hilo;
     fuera del motor (conversacion.ts) solo la ficha del Super Admin lee compa_messages. */
  compaLecturaAnotada() {
    const G = "compaLecturaAnotada", A = "apps/web/lib/compa/admin-compa.ts";
    if (!existsSync(A)) return falla(G, A, 0, "falta el Super Admin de El Compa");
    const f = cuerpoFn(sinComent(A), "fichaConversacion");
    if (!/if \(!s\.puede\("compa", "editar"\)\) return null;/.test(f)) falla(G, A, 0, "la ficha con el hilo pide compa:editar");
    const i = f.indexOf("insert into compa_reads"), j = f.indexOf("from compa_messages");
    if (i < 0 || j < 0 || i > j) falla(G, A, 0, "cada lectura del hilo queda en compa_reads ANTES de leerlo");
    // 7i · La ficha (y la marca) es de una conversación de las CIUDADES de quien mira; la pregunta de «Lo que El Compa no supo» (tapada) la ve solo
    // quien lee hilos (compa:editar): Solo lectura ve cifras. Nadie fuera del motor y del Super Admin de El Compa lee compa_unknowns.
    if (!/insert into compa_reads[\s\S]*\$\{SUS\("city_id", "\$2"\)\}|where number = \$1 and \$\{SUS\("city_id", "\$2"\)\}`, \[n, s\.cities\]/.test(f)) falla(G, A, 0, "la ficha con el hilo es solo de las ciudades de quien mira");
    const R7 = cuerpoFn(sinComent(A), "resumenCompa");
    if (!R7 || !/const leer = s\.puede\("compa", "editar"\)/.test(R7) || !/case when \$2 then q\.query_tapada end as q/.test(R7) || /select [^`]*\bq\.query_tapada\b(?! end)/.test(R7.replace(/case when \$2 then q\.query_tapada end/g, ""))) falla(G, A, 0, "«Lo que El Compa no supo»: la pregunta solo para quien lee hilos (compa:editar)");
    for (const fn of ["marcarConversacion", "quitarMarca", "decidirNoSupo"]) if (!new RegExp(`if \\(!s\\.puede\\("compa", "editar"\\)\\) return`).test(cuerpoFn(sinComent(A), fn))) falla(G, A, 0, `${fn} pide compa:editar`);
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && !/^apps\/web\/lib\/compa\/(conversacion|admin-compa)\.ts$/.test(x) && /\b(from|join) compa_unknowns\b/.test(sinComent(x))) falla(G, x, 0, "lo que El Compa no supo solo lo leen el motor y el Super Admin de El Compa");
    for (const x of codigo) if (/^apps\/web\/.*\.tsx?$/.test(x) && !/^apps\/web\/lib\/compa\/(conversacion|admin-compa)\.ts$/.test(x) && /\bfrom compa_messages\b/.test(sinComent(x))) falla(G, x, 0, "el hilo de El Compa solo lo leen el motor y la ficha anotada del Super Admin");
  },

  /* ── Fase 7 · 7e El Compa en el panel ── */
  /* 7e. La guía del panel (compa_panel_guide, migración 0120) es la NAVEGACIÓN del panel, entera: cada ruta de app/panel/[id]/[[...r]]/page.tsx
     (hoy, clientes, mensajes, vendes, entrega, mas, eventos, cobros, cobros/plan, compa y Tu página) y cada apartado de Tu página (Panel.tsx PARTS
     → pagina/{k}, con el mismo título) tiene su fila; la PARTE de cada fila es la que esa ruta le pide a accesoPanel (así El Compa nunca ofrece
     «Ir a …» a algo que el panel le negaría, ni esconde algo que sí le abre). Los apartados de «Lo que vendes» (vendes/menu…) van con su fila
     «vendes». Y el toque «Ir a …» (confirmar) vuelve a leer la parte de la guía y a pedir accesoPanel con ella. */
  guiaDelPanelCompleta() {
    const G = "guiaDelPanelCompleta", M = "packages/db/migrations/0120_compa_panel.sql", R = "apps/web/app/panel/[id]/[[...r]]/page.tsx", PN = "apps/web/app/panel/Panel.tsx", A = "apps/web/lib/compa/acciones.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la guía del panel (0120)");
    // 9m · Las filas de la guía de TODAS las migraciones (0120 y las que agregan una sección después, como «pagina/dir» en 0143): solo dentro de un
    // «insert into compa_panel_guide … on conflict».
    const m = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8"))
      .flatMap((s) => [...s.matchAll(/insert into compa_panel_guide \([^)]*\) values([\s\S]*?)\non conflict/g)].map((y) => y[1])).join("\n"), filas = new Map();
    for (const x of m.matchAll(/^\s*\('([a-z/]+)', '([a-z/]*)', (null|'[a-z]+'), '([a-z]+)', '(\{[^']*\})',/gm)) filas.set(x[1], { ruta: x[2], parte: x[3] === "null" ? null : x[3].slice(1, -1), title: JSON.parse(x[5]) });
    if (filas.size < 15) falla(G, M, 0, `la guía del panel tiene ${filas.size} filas: ¿se rompió su forma?`);
    for (const [k, f] of filas) if (f.ruta !== (k === "pagina" ? "" : k)) falla(G, M, 0, `la fila «${k}» lleva a «${f.ruta}» (el código ES la ruta)`);
    const r = sinComent(R);
    // La parte que pide cada sección (la expresión de accesoPanel de la página).
    const exp = /const acc = await accesoPanel\(id, ([^;]+)\);/.exec(r)?.[1] ?? "";
    if (!exp) return falla(G, R, 0, "no encuentro la llamada a accesoPanel de la página del panel");
    const parteDe = (sec) => { for (const y of exp.matchAll(/((?:ruta\.sec === "[a-z]+"(?: \|\| )?)+) \? (undefined|"[a-z]+")/g)) if ([...y[1].matchAll(/"([a-z]+)"/g)].some((z) => z[1] === sec)) return y[2] === "undefined" ? null : y[2].slice(1, -1); return /: "([a-z]+)"$/.exec(exp)?.[1] ?? "?"; };
    const rutas = [];
    for (const y of r.matchAll(/r\.length === 1 && r\[0\] === "([a-z]+)"\) ruta = \{ sec: "([a-z]+)"/g)) rutas.push([y[1], y[2]]);
    for (const y of r.matchAll(/r\.length === 2 && r\[0\] === "([a-z]+)" && r\[1\] === "([a-z]+)"\) ruta = \{ sec: "([a-z]+)"/g)) rutas.push([`${y[1]}/${y[2]}`, y[3]]);
    if (/r\.length === 0\) ruta = \{ sec: "pag"/.test(r)) rutas.push(["pagina", "pag"]);
    if (rutas.length < 10) falla(G, R, 0, "no encuentro las rutas del panel");
    for (const [ruta, sec] of rutas) {
      const f = filas.get(ruta);
      if (!f) { falla(G, M, 0, `la sección «${ruta}» del panel no tiene su fila en la guía de El Compa`); continue; }
      const p = parteDe(sec);
      if (f.parte !== p) falla(G, M, 0, `la fila «${ruta}» pide la parte «${f.parte}» y la página del panel pide «${p}»`);
    }
    const parts = /export const PARTS[^=]*= \[\n([\s\S]*?)\n\];/.exec(sinComent(PN))?.[1] ?? "";
    for (const y of parts.matchAll(/\{ k: "([a-z]+)", icon: "[a-z]+", l: \["([^"]+)", "([^"]+)"\]/g)) {
      const f = filas.get(`pagina/${y[1]}`);
      if (!f) falla(G, M, 0, `el apartado «${y[2]}» de Tu página no tiene su fila en la guía (pagina/${y[1]})`);
      else if (f.title.es !== y[2] || f.title.en !== y[3]) falla(G, M, 0, `la fila pagina/${y[1]} se llama «${f.title.es}» y en el panel «${y[2]}»`);
      else if (f.parte !== "page") falla(G, M, 0, `pagina/${y[1]} pide la parte «page» (Tu página)`);
    }
    // Todo lo de la guía existe en el panel (nada inventado).
    const conocidas = new Set([...rutas.map((x) => x[0]), ...[...parts.matchAll(/\{ k: "([a-z]+)"/g)].map((y) => `pagina/${y[1]}`)]);
    for (const k of filas.keys()) if (!conocidas.has(k)) falla(G, M, 0, `la guía tiene «${k}», que no es una sección del panel`);
    if (existsSync(A)) { const c = cuerpoFn(sinComent(A), "confirmar");
      if (!/select ruta, parte from compa_panel_guide where code = \$1 and enabled/.test(c) || !/const acc = await accesoPanel\(a\.target\.negocio \?\? "", s\.parte \?\? undefined\);/.test(c) || !/if \(!acc \|\| acc\.yo\.id !== q\.userId\)/.test(c)) falla(G, A, 0, "«Ir a …»: confirmar vuelve a leer la parte de la guía y pide accesoPanel con ella, para la misma persona"); }
  },

  /* ── Fase 7 · 7f Respuestas automáticas (Pro) en Mensajes y «Sugerir respuesta con El Compa» ── */
  /* 7f. Lo que la respuesta automática nunca hace, hecho regla (revisión de seguridad de 7f):
     (1) Solo Pro, decidido en el servidor y en la base: debeContestarAuto pide compa_negocio_pro y «enabled»; guardarAuto no enciende sin Pro ni
         con la pausa de To'Latino; la base no deja encender sin Pro (compa_solo_pro) y nace apagada (enabled false);
     (2) solo «fuera de tu horario» y con El Compa disponible: cerrado (negocio_abierto, la regla de la fija), nivel auto_reply, la conversación sin
         apagar y no al tope;
     (3) quien la cambia o pide un borrador: el dueño o quien lleva Mensajes (accesoPanel(id, "msg") en cada acción);
     (4) nunca promete: lo que solo decide el negocio pasa al negocio ANTES del modelo (detectarAuto); la salida del modelo y la de las reglas
         pasan por verificarAuto (acciones, porcentajes, descuentos, devoluciones, «confirmado», disponibilidad); el verificador NO acepta
         montos que solo escribió el cliente (su texto no entra en lo que se le permite citar);
     (5) con El Compa la respuesta fija no sale; sin El Compa (apagado, tope, falla) sale EXACTAMENTE la de antes (mismo texto, una cada 12 h);
     (6) nunca bloquea al humano: la respuesta automática no marca leído el hilo para el negocio. */
  compaRespuestaAuto() {
    const G = "compaRespuestaAuto", M = "packages/db/migrations/0121_compa_respuestas_auto.sql", C = "apps/web/lib/compa/conversacion.ts", R = "apps/web/lib/compa/respuesta-auto.ts",
      V = "apps/web/lib/compa/verificar.ts", L = "apps/web/lib/compa/reglas.ts", MS = "apps/web/lib/mensajes.ts", AC = "apps/web/app/panel/acciones-compa.ts";
    for (const f of [M, C, R, V, L, MS, AC]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza de las respuestas automáticas");
    const m = readFileSync(M, "utf8"), c = sinComent(C), r = sinComent(R), v = sinComent(V), ms = sinComent(MS), ac = sinComent(AC);
    if (!/enabled\s+boolean not null default false/.test(m)) falla(G, M, 0, "las respuestas automáticas nacen apagadas (enabled false)");
    if (!/if new\.enabled and \(tg_op = 'INSERT' or not old\.enabled\) and not compa_negocio_pro\(new\.business_id\) then\s*raise exception 'compa_solo_pro/.test(ultimaFn("compa_business_settings_antes"))) falla(G, M, 0, "la base no deja encender sin Pro (compa_solo_pro)");
    if (!/raise exception 'los ajustes de las respuestas automáticas no se borran/.test(ultimaFn("compa_business_settings_antes"))) falla(G, M, 0, "los ajustes no se borran (estados)");
    const d = cuerpoFn(c, "debeContestarAuto");
    for (const [re, q] of [[/compa_negocio_pro\(b\.id\) as pro/, "Pro AHORA (compa_negocio_pro)"], [/if \(!r \|\| !r\.on \|\| !r\.pro \|\| r\.cuando !== "closed" \|\| r\.abierto\) return false;/, "encendido, Pro, «fuera de tu horario» y cerrado"],
      [/negocio_abierto\(b\.id, now\(\) at time zone c\.timezone\)/, "el horario real del negocio (negocio_abierto)"], [/disponible\(\{ uso: "auto_reply", canal: "app"/, "el nivel y el canal de El Compa"], [/alTope\(\)/, "el tope"], [/hiloApagado\(hilo\)/, "la conversación sin apagar"]])
      if (!re.test(d)) falla(G, C, 0, `debeContestarAuto: falta ${q}`);
    const g = cuerpoFn(r, "guardarAuto");
    if (!/if \(!b\.pro\) return no\(/.test(g) || !/if \(x\.enabled === true && pausa\) return no\(/.test(g)) falla(G, R, 0, "guardarAuto: sin Pro o con la pausa de To'Latino no se enciende");
    if (/"(no_reply_10m|always)"/.test(g)) falla(G, R, 0, "7f solo contesta «fuera de tu horario»");
    for (const fn of ["compaAutoGuardar", "compaAutoProbar", "compaAutoTraducir", "compaSugerir"]) { const b = cuerpoFn(ac, fn);
      if (!b || !/if \(!\(await mismoOrigen\(\)\)\) return SIN;/.test(b) || !/await accesoPanel\(id, "msg"\)/.test(b)) falla(G, AC, 0, `${fn}: mismo origen y el dueño o quien lleva Mensajes (accesoPanel(id, "msg"))`); }
    const ra = cuerpoFn(c, "respuestaAuto");
    if (!/if \(det \|\| detectarAuto\(x\.ultimo\)\) return pasar\(LINEAS_AUTO\.decide\(N\)/.test(ra) || ra.indexOf("detectarAuto(") > ra.indexOf("await consultar(")) falla(G, C, 0, "lo que solo decide el negocio pasa al negocio ANTES del modelo (detectarAuto)");
    if (!/const w = verificarAuto\(q2\.r\);\s*if \(!w\.ok\) return reglas\(/.test(ra) || !/w = v\.ok \? verificarAuto\(v\.r\) : v;/.test(ra)) falla(G, C, 0, "la salida del modelo y la de las reglas pasan por verificarAuto");
    if (!/texto: \[x\.ctx\.texto, \.\.\.trozos\.map\(\(z\) => `\$\{z\.titulo\} \$\{z\.seccion\} \$\{z\.texto\}`\)\]\.join\("\\n"\)/.test(ra) || /x\.ultimo\]\.join|ultimo, \.\.\.trozos/.test(ra)) falla(G, C, 0, "el verificador solo acepta montos y plazos de la página y la ayuda, nunca del cliente");
    if (!/permitidos: \[\]/.test(ra)) falla(G, C, 0, "la respuesta automática no comparte teléfonos ni correos de nadie");
    const va = cuerpoFn(v, "verificarAuto");
    if (!/if \(r\.accion\.tipo !== "ninguna"\) return/.test(va) || !/PCT_TODO\.test\(todo\)/.test(va) || !/PROMETE\.test\(sinAcentosV\(todo\)\)/.test(va)) falla(G, V, 0, "verificarAuto: sin acciones, porcentajes ni promesas");
    const pr = /const PROMETE = \/([^\n]*)\/;/.exec(v)?.[1] ?? "";
    for (const w of ["descuent", "confirmad", "disponib", "reembols", "refund", "discount", "gratis", "garantiz"]) if (!pr.includes(w)) falla(G, V, 0, `verificarAuto no frena «${w}»`);
    const ec = cuerpoFn(ms, "enviarCliente");
    if (!/const compa = !b\.abierto \? await \(await import\("\.\/compa\/respuesta-auto"\)\)\.compaContestara\(b\.id, previo\.rows\[0\]\?\.id \?\? null, userId\)\.catch\(\(\) => false\) : false;/.test(ec)) falla(G, MS, 0, "Mensajes pregunta a El Compa solo fuera del horario y con .catch (si falla, lo de siempre)");
    if (!/if \(compa\) await c\.query\(`update chat_threads set compa_pending_until = coalesce\(compa_pending_until, now\(\)\) where id = \$1`, \[t\.id\]\);\s*else if \(b\.auto && !b\.abierto && !t\.auto_reciente\) \{ await ponerRespuestaFija\(/.test(ec)) falla(G, MS, 0, "con El Compa no sale la fija; sin El Compa, la fija de siempre");
    if (!/m\.sender = 'auto' and not m\.compa and m\.created_at > now\(\) - interval '12 hours'/.test(ec)) falla(G, MS, 0, "la fija sigue saliendo una vez cada 12 horas (sin contar las de El Compa)");
    if (!/export const textoFijo = \(nombre: string, lang: "es" \| "en"\) => \(lang === "en" \? `Thanks for writing to \$\{nombre\}\. We are closed now; we will reply when we open\.` : `Gracias por escribir a \$\{nombre\}\. Ahora estamos cerrados; te contestamos cuando abramos\.`\);/.test(ms)) falla(G, MS, 0, "la respuesta fija es la de siempre (texto a texto)");
    if (!/if \(x && t\.fija && !t\.abierto && !x\.reciente\) await ponerRespuestaFija\(/.test(cuerpoFn(c, "comoAntes"))) falla(G, C, 0, "sin El Compa entre el mensaje y la respuesta: la fija de siempre");
    const una = cuerpoFn(c, "unaRespuestaAuto");
    if (/biz_unread\s*=|biz_read_at\s*=/.test(una)) falla(G, C, 0, "la respuesta automática nunca marca leído el hilo para el negocio (el humano siempre lo ve)");
    if (!/if \(S\.n >= lim\.compa_auto_hilo_max\)/.test(una)) falla(G, C, 0, "como mucho compa_auto_hilo_max respuestas seguidas sin el negocio");
  },

  /* 7f. «Sugerir respuesta con El Compa» deja un BORRADOR: borradorNegocio nunca envía ni escribe en Mensajes (ni enviarNegocio, ni chat_messages);
     guarda su respuesta como draft; la pantalla solo llena el campo y el envío es el botón de siempre. */
  borradorSoloBorrador() {
    const G = "borradorSoloBorrador", C = "apps/web/lib/compa/conversacion.ts", P = "apps/web/app/panel/MensajesPanel.tsx", AC = "apps/web/app/panel/acciones-compa.ts";
    const b = cuerpoFn(sinComent(C), "borradorNegocio");
    if (!b) return falla(G, C, 0, "falta borradorNegocio");
    if (/insert into chat_messages|update chat_threads|enviarNegocio|enviarCliente|avisar\(/.test(b)) falla(G, C, 0, "el borrador nunca envía ni escribe en Mensajes");
    if (!/source_label, chips, engine, draft\) values \(\$1, \$2, 'compa', \$3, \$4, \$5, '\{\}', \$6, true\)/.test(b)) falla(G, C, 0, "el borrador queda guardado como borrador (draft)");
    const s = cuerpoFn(sinComent(AC), "compaSugerir");
    if (/enviarNegocio|mensajeResponder|insert into/.test(s)) falla(G, AC, 0, "«Sugerir respuesta» no envía");
    const p = sinComent(P);
    if (!/c\.run\(\(\) => compaSugerir\(d\.id, x\.id\), E2\("Revísalo antes de enviar\. Sale con tu nombre\.", "Check it before sending\. It goes out with your name\."\), \(r: \{ texto\?: string \}\) => \{ c\.setUi\(\{ cpaSug: null \}\); if \(r\.texto\) F\.set\(\{ txt: r\.texto\.slice\(0, 1000\)\ }\); \}\)/.test(p)) falla(G, P, 0, "«Sugerir respuesta» solo llena el campo, con «Revísalo antes de enviar. Sale con tu nombre.»");
  },

  /* 7g. El copiloto del equipo SOLO deja un borrador (fase7-compa.md §3 punto 6; copilotoSoloBorrador): su turno (conversacion.ts borradorCopiloto)
     solo escribe su conversación (compa_messages, draft) y el borrador (compa_drafts); nunca un mensaje del caso, el estado del caso o de la ayuda,
     la cola, un aviso ni nada de dinero. Su acción (acciones-copiloto.ts) revisa el mismo origen, la persona del equipo de la sesión y el permiso
     de la acción que alimenta, y no envía. Las pantallas solo ponen el borrador en el campo (Soporte) o en el mensaje de «Resolver con un
     mensaje» (Colas): el envío es el botón de siempre. El mensaje que sale marca from_draft solo con un borrador de ESE caso y de ESA persona
     (la base lo vuelve a revisar). Interruptor y tope: nivel «copiloto» antes de todo, límite por persona del equipo al día, y la ficha solo
     pinta el botón con el copiloto encendido y bajo el tope. */
  copilotoSoloBorrador() {
    const G = "copilotoSoloBorrador", C = "apps/web/lib/compa/conversacion.ts", AC = "apps/web/app/admin/acciones-copiloto.ts", SA = "apps/web/app/admin/SoporteAdmin.tsx", CO = "apps/web/app/admin/Colas.tsx",
      E = "apps/web/lib/soporte-equipo.ts", M = "packages/db/migrations/0122_compa_copiloto.sql", K = "apps/web/lib/compa/copiloto.ts", CP = "apps/web/lib/compa/contexto-copiloto.ts";
    const b = cuerpoFn(sinComent(C), "borradorCopiloto");
    if (!b) return falla(G, C, 0, "falta borradorCopiloto");
    if (/insert into support_messages|update support_cases|update help_requests|update queue_items|insert into chat_messages|devolverPago|resolverYDevolver|decidirSop|responder\(|avisar|avisarCaso|notaInterna\(/.test(b)) falla(G, C, 0, "el copiloto nunca envía, ni cambia el caso, ni avisa, ni toca dinero: solo deja un borrador");
    if (!/insert into compa_drafts \(/.test(b) || !/source_label, chips, engine, draft\) values \(\$1, \$2, 'compa', \$3, \$4, \$5, '\{\}', \$6, true\)/.test(b)) falla(G, C, 0, "el copiloto guarda su respuesta como borrador (draft) y en compa_drafts");
    if (!/const d = await disponible\(\{ uso: "copilot", canal: "app", ciudad, negocio: ctx\.negocio \}\);\n\s*if \(!d\.ok\) return/.test(b) || b.indexOf("await disponible(") > b.indexOf("insert into compa_conversations")) falla(G, C, 0, "borradorCopiloto revisa el interruptor del copiloto antes de escribir nada");
    if (!/select count\(\*\)::int as n from compa_drafts where staff_id = \$1 and at > now\(\) - interval '1 day'/.test(b) || !/if \(n >= lim\) return \{ limite: true \};/.test(b) || !/valor\("compa_copiloto_dia_staff"\)/.test(b)) falla(G, C, 0, "el copiloto cuenta aparte por persona del equipo (compa_copiloto_dia_staff)");
    for (const f of [K, CP]) if (existsSync(f) && /from "[^"]*(acciones-colas|acciones-soporte|cobros|pagos|avisos)"|\b(responder|resolver|resolverYDevolver|notaInterna|decidirSop)\(/.test(sinComent(f))) falla(G, f, 0, "el copiloto no importa ni llama nada que envíe, resuelva o devuelva");
    if (existsSync(CP) && !/import \{ casoEquipo, money \} from "\.\.\/soporte-equipo";/.test(sinComent(CP))) falla(G, CP, 0, "de Soporte, el contexto del copiloto solo usa la lectura de la ficha (casoEquipo)");
    if (!existsSync(AC)) return falla(G, AC, 0, "falta la acción del copiloto");
    const a = cuerpoFn(sinComent(AC), "copilotoSugerir");
    if (!/if \(!\(await mismoOrigen\(\)\)\) return/.test(a) || !/const s = await staff\(\);/.test(a) || !/if \(caso && !\(s\.puede\("sop", "ver"\) && s\.puede\("sop", "editar"\)\)\) return/.test(a) || !/if \(cola && !s\.puede\("colas", "aprobar"\)\) return/.test(a)) falla(G, AC, 0, "la acción del copiloto: mismo origen, la persona del equipo de la sesión y el permiso de la acción que alimenta");
    if (/sopResponder|decidirSop|insert into|update /.test(a)) falla(G, AC, 0, "«Sugerir respuesta con El Compa» no envía");
    const trozo = (t, i) => (i < 0 ? "" : t.slice(i, t.indexOf("}); };", i) + 6));
    const tSA = sinComent(SA), sa = trozo(tSA, tSA.indexOf("const sugerir = "));
    if (!/copilotoSugerir\(\{ caso: num \}\)/.test(sa) || !/setResp\(r\.borrador\)/.test(sa) || /sopResponder|sopResolver|sopDevolver|sopNota/.test(sa)) falla(G, SA, 0, "Soporte: el borrador solo llena el campo RESPUESTA; se envía con «Enviar»");
    if (!/sopResponder\(k\.num, resp, macro, borrador\)/.test(sinComent(SA)) || !/"Revísalo antes de enviar: sale con tu nombre\."/.test(sinComent(SA)) || !/"\(sin IA: borrador de reglas\)"|\(sin IA: borrador de reglas\)/.test(sinComent(SA))) falla(G, SA, 0, "Soporte: «Revísalo antes de enviar: sale con tu nombre.», «(sin IA: borrador de reglas)» y Enviar con el borrador");
    const tCO = sinComent(CO), co = trozo(tCO, tCO.indexOf("const sugerir = "));
    if (!/copilotoSugerir\(\{ cola: id \}\)/.test(co) || /decidirSop|decidir[A-Z]/.test(co)) falla(G, CO, 0, "Colas: el borrador solo va al mensaje de «Resolver con un mensaje»; se resuelve con ese botón");
    if (!/const copOn = k\.queue === "sop" && "copiloto" in k && !!k\.copiloto/.test(sinComent(CO))) falla(G, CO, 0, "Colas: el copiloto solo en la cola «sop» y cuando el servidor dice que está");
    const r = cuerpoFn(sinComent(E), "responder");
    if (!/from compa_drafts where id = \$1::uuid and case_id = \$2::bigint and staff_id = \$3 and used is null/.test(r) || !/\[k\.id, k\.city_id, s\.id, t, mk, !!bd\]/.test(r)) falla(G, E, 0, "from_draft solo con un borrador de ESE caso y de ESA persona del equipo, sin usar");
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del copiloto");
    const m = readFileSync(M, "utf8");
    if (!/check \(not from_draft or \(sender = 'staff' and not internal\)\)/.test(m) || !/raise exception 'compa_borrador_mensaje/.test(ultimaFn("compa_drafts_antes"))) falla(G, M, 0, "la base: from_draft solo en un mensaje del equipo a la persona, y el mensaje de un borrador es de ese caso y de esa persona");
    if (!/new\.from_draft\)\s*is distinct from/.test(ultimaFn("support_messages_antes"))) falla(G, M, 0, "from_draft no cambia después (solo inserción)");
    if (existsSync(K) && !/disponible\(\{ uso: "copilot", canal: "app", ciudad: x\.ciudad, negocio: x\.negocio \?\? null \}\), alTope\(\)/.test(sinComent(K))) falla(G, K, 0, "copilotoDisponible: el nivel «copiloto», el canal, la ciudad, el negocio y el tope");
  },

  /* 7f. Siempre se sabe que es una IA (compaSiempreIA, en Mensajes): la primera respuesta de El Compa en una conversación empieza con «Soy El
     Compa, el asistente de IA de {negocio}.» (verbatim de §1c); el cliente y el negocio la ven con «EL COMPA · IA»; nunca se hace pasar por el
     dueño (verificar + verificarAuto). */
  compaSiempreIAMensajes() {
    const G = "compaSiempreIAMensajes", L = "apps/web/lib/compa/reglas.ts", C = "apps/web/lib/compa/conversacion.ts", CH = "apps/web/app/(app)/cuenta/mensajes/[negocio]/Chat.tsx", P = "apps/web/app/panel/MensajesPanel.tsx";
    if (!/presentacion: \(n: string\): Bi7 => \(\{ es: `Soy El Compa, el asistente de IA de \$\{n\}\.`, en: `I'm El Compa, \$\{n\}'s AI assistant\.` \}\)/.test(sinComent(L))) falla(G, L, 0, "la presentación «Soy El Compa, el asistente de IA de {negocio}.» (verbatim)");
    const una = cuerpoFn(sinComent(C), "unaRespuestaAuto");
    if (!/const resp = a, texto = `\$\{S\.primera \? `\$\{LINEAS_AUTO\.presentacion\(t\.nombre\)\[lang\]\} ` : ""\}\$\{resp\.texto\}`/.test(una)) falla(G, C, 0, "la primera respuesta automática de una conversación empieza con la presentación");
    if (!/time: `\$\{m\.de === "auto" \? \(m\.compa \? E2\("EL COMPA · IA · ", "EL COMPA · AI · "\)/.test(sinComent(CH))) falla(G, CH, 0, "el cliente ve «EL COMPA · IA» en cada respuesta de El Compa");
    if (!/m\.compa \? E2\("EL COMPA · IA · ", "EL COMPA · AI · "\)/.test(sinComent(P))) falla(G, P, 0, "el negocio ve «EL COMPA · IA» en cada respuesta de El Compa");
  },

  /* 7f. Una columna de salida `x::text` con el mismo nombre que la columna NO ordena: en Postgres «order by id» usa la columna de SALIDA (el
     texto), así que 100 va antes que 98 (cazado en 7f: la respuesta automática se saltaba el último mensaje del cliente). En lib/compa y en
     Mensajes, ninguna consulta ordena por un nombre que en su select es un ::text sin otro alias (se califica: «order by x.id»). La misma clase
     existe en otros módulos (LAUNCH «order by sobre id::text»): este guardián se amplía cuando se arreglen. */
  /* ── Fase 7 · 7h WhatsApp y SMS con enlace ──
     7h. canalConFirma: la entrada pública de WhatsApp y SMS solo cree lo FIRMADO y nunca hace nada por mensaje.
     - La ruta verifica la firma del proveedor ANTES de leer el JSON (401 si no; sin secreto en el entorno = nada entra); Telnyx con su hora
       firmada dentro de la ventana; Meta en tiempo constante; el proveedor «sim» no tiene ruta pública (solo el simulador con sesión).
     - Una entrada una sola vez (único por proveedor e id; on conflict do nothing) y lo rechazado solo se cuenta.
     - Identidad: solo el teléfono VERIFICADO de UNA cuenta activa que encendió el canal; si no, la respuesta fija.
     - Ninguna acción por mensaje: canales.ts no confirma ni cancela nada; solo crea un enlace de un uso (enlace.ts) que guarda la HUELLA del
       token, sirve solo a esa cuenta con su sesión (la página manda a Entrar; nunca abre una sesión) y se usa una vez.
     - La salida vuelve a leer el canal, la baja (STOP), la ventana de 24 h de WhatsApp y las horas de silencio.
     - Solo canales-proveedor.ts habla con Meta o Telnyx (además del SMS de avisos.ts) y lee sus secretos; nada de esto escribe en el registro. */
  canalConFirma() {
    const G = "canalConFirma", R = "apps/web/app/api/compa/entrada/[proveedor]/route.ts", P = "apps/web/lib/compa/canales-proveedor.ts", K = "apps/web/lib/compa/canales.ts",
      E = "apps/web/lib/compa/enlace.ts", PG = "apps/web/app/(app)/compa/e/[token]/page.tsx", AC = "apps/web/app/(app)/compa/e/[token]/acciones.ts", M = "packages/db/migrations/0123_compa_canales.sql";
    for (const f of [R, P, K, E, PG, AC]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza de los canales de El Compa");
    const r = sinComent(R), post = cuerpoFn(r, "POST");
    const iF = post.search(/firmaTelnyx\(|firmaWhatsApp\(/), iJ = post.indexOf("JSON.parse("), iL = post.search(/leerTelnyx\(|leerWhatsApp\(|recibir\(/);
    if (iF < 0 || iJ < 0 || iF > iJ || iL < iJ) falla(G, R, 0, "la firma se verifica antes de leer el JSON y antes de guardar nada");
    if (!/if \(!f\.ok\) \{ await contarRechazo\(p, f\.motivo\); return no\(401\); \}/.test(post)) falla(G, R, 0, "firma mala = 401 (solo se cuenta el rechazo)");
    if (/req\.(json|text|formData)\(\)/.test(post)) falla(G, R, 0, "el cuerpo se lee crudo (para la firma), nunca como JSON antes de verificar");
    // 9l · Los avisos de entrega (Telnyx message.finalized, Meta statuses) y el estado de las plantillas de WhatsApp: también solo DESPUÉS de la firma.
    const iE = post.search(/leerEstadosTelnyx\(|leerEstadosWhatsApp\(|leerPlantillasWhatsApp\(|anotar\(/);
    if (iE < 0 || iE < iJ || iE < iF) falla(G, R, 0, "los avisos de entrega y el estado de las plantillas se leen después de la firma");
    // 9l · El contrato de los canales: las especificaciones FIJAS a un commit y a su huella (L1113), y cada función del proveedor probada contra ellas.
    const CS = "scripts/contrato-canales/correr.sh", CP = "scripts/contrato-canales/prueba.cjs";
    if (existsSync(CS)) {
      const c = readFileSync(CS, "utf8");
      if (/openapi\/(master|main)\//.test(c) || !/TELNYX_COMMIT=[0-9a-f]{40};/.test(c) || !/META_COMMIT=[0-9a-f]{40};/.test(c) || !/echo "\$TELNYX_SHA256  \$SPECS\/telnyx\.json" \| sha256sum -c/.test(c) || !/echo "\$META_SHA256  \$SPECS\/meta\.yaml" \| sha256sum -c/.test(c)) falla(G, CS, 0, "las especificaciones del contrato van fijas a un commit y a su huella, nunca a master/main");
    }
    if (existsSync(CP) && existsSync(P)) for (const m of sinComent(P).matchAll(/\nexport (?:async )?function (\w+)\(/g)) if (!["hayLlaves", "numeroSms", "wabaListo", "retoWhatsApp"].includes(m[1]) && !new RegExp(`P\\.${m[1]}\\(`).test(readFileSync(CP, "utf8"))) falla(G, CP, 0, `el contrato no prueba ${m[1]}() contra la especificación del proveedor`);
    if (!/if \(p !== "telnyx" && p !== "whatsapp"\) return no\(404\);/.test(post) || /proveedor: "sim"|"sim"/.test(r)) falla(G, R, 0, "la ruta pública solo acepta Telnyx y WhatsApp (el simulador no tiene ruta)");
    if (!/firmaTelnyx\(cuerpo, req\.headers\.get\("telnyx-signature-ed25519"\), req\.headers\.get\("telnyx-timestamp"\), Math\.floor\(Date\.now\(\) \/ 1000\), await valor\("compa_canal_firma_seg"\)\)/.test(post)) falla(G, R, 0, "Telnyx: firma con su hora y la ventana de Configuración");
    if (!/Math\.abs\(Date\.now\(\) - m\.hora\.getTime\(\)\) > DIA_MS/.test(post)) falla(G, R, 0, "WhatsApp: un mensaje más viejo que 24 h (o del futuro) no se contesta");
    const pp = sinComent(P);
    if (!/if \(!llave\) return \{ ok: false, motivo: "sin_secreto" \};/.test(pp) || !/if \(!secreto\) return \{ ok: false, motivo: "sin_secreto" \};/.test(pp)) falla(G, P, 0, "sin el secreto en el entorno, nada entra");
    if (!/verify\(null, Buffer\.concat\(\[Buffer\.from\(`\$\{hora\}\|`, "utf8"\), cuerpo\]\), k, sig\)/.test(pp) || !/if \(Math\.abs\(ahora - Number\(hora\)\) > ventana\) return \{ ok: false, motivo: "hora" \};/.test(pp)) falla(G, P, 0, "Telnyx: Ed25519 sobre «hora|cuerpo» y la hora dentro de la ventana");
    if (!/a\.length === b\.length && timingSafeEqual\(a, b\) \? \{ ok: true \}/.test(cuerpoFn(pp, "firmaWhatsApp"))) falla(G, P, 0, "WhatsApp: HMAC comparado en tiempo constante");
    if (!/timingSafeEqual\(a, b\) \? reto : null/.test(cuerpoFn(pp, "retoWhatsApp"))) falla(G, P, 0, "la verificación del webhook de Meta compara en tiempo constante");
    const k = sinComent(K);
    if (!/on conflict \(provider, provider_msg_id\) do nothing returning id::text/.test(cuerpoFn(k, "recibir"))) falla(G, K, 0, "una entrada se guarda una sola vez (idempotente por proveedor e id)");
    if (existsSync(M) && !/unique \(provider, provider_msg_id\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "la base no deja dos entradas con el mismo id del proveedor");
    const tv = cuerpoFn(k, "turnoVecino");
    if (!/phone_verified_at is not null and cuenta_estado\(status, status_until\) in \('active', 'muted'\)/.test(tv) || !/coalesce\(notif_prefs->>'cpa', 'false'\) = 'true' limit 2/.test(tv) || !/if \(U\.length !== 1\) \{/.test(tv)) falla(G, K, 0, "identidad: solo el teléfono verificado de UNA cuenta activa que encendió el canal; si no, la respuesta fija");
    if (/\b(confirmar|descartar|usarEnlace|citaCliente|rsvCliente|CANCELABLES)\b/.test(k.replace(/import \{[^}]*\} from "\.\/enlace";/, (x) => x.replace(/crearEnlace/, ""))) || !/import \{ crearEnlace \} from "\.\/enlace";/.test(k)) falla(G, K, 0, "por mensaje nunca se confirma nada: solo se manda un enlace de un uso");
    const en = cuerpoFn(k, "enviar");
    if (!/!\(await canalEncendido\(canal\)\)\) st = "apagado"/.test(en) || !/compa_canal_en_baja\(\$1, \$2, \$3\)/.test(en) || !/received_at > now\(\) - interval '24 hours'/.test(en) || !/\(await tarde\(o\)\)\) st = "silencio"/.test(en)) falla(G, K, 0, "la salida vuelve a leer el canal, la baja (STOP), la ventana de 24 h y las horas de silencio");
    if (!/if \(ENTORNO === "produccion"\) return \{ ok: false, msg: "El simulador no existe en producción\." \};/.test(cuerpoFn(k, "simular"))) falla(G, K, 0, "el simulador no existe en producción");
    const e = sinComent(E);
    if (!/randomBytes\(24\)\.toString\("base64url"\)/.test(e) || !/values \(\$1, \$2::uuid, \$3::uuid/.test(e) || !/\[sha\(token\), x\.accion/.test(e)) falla(G, E, 0, "el enlace guarda la huella del token (nunca el token)");
    const u = cuerpoFn(e, "usarEnlace");
    if (!/for update`, \[h\]/.test(u) || !/if \(l\.user_id !== q\.userId\) return/.test(u) || !/if \(l\.usado\) return/.test(u) || !/if \(l\.vencido\) return/.test(u) || !/confirmar\(\{ userId: q\.userId \}, l\.action_id, "link"\)/.test(u)) falla(G, E, 0, "el enlace: tomado, solo de esa cuenta, una vez, sin vencer, y confirma por confirmar() con via «link»");
    const pg = sinComent(PG);
    if (!/if \(!u\?\.first_name\) redirect\(`\/entrar\?volver=/.test(pg) || /cookies\(\)|verificarCodigo|sessions/.test(pg)) falla(G, PG, 0, "el enlace nunca abre una sesión: sin sesión va a Entrar");
    const ac = sinComent(AC);
    if (!/if \(!\(await mismoOrigen\(\)\)\) return/.test(ac) || !/const u = await yo\(\);/.test(ac) || !/usarEnlace\(\{ userId: u\.id \}/.test(ac)) falla(G, AC, 0, "usar el enlace: mismo origen y la persona de la sesión");
    for (const x of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(x)) continue;
      const t = sinComent(x);
      if (x !== P && /graph\.facebook\.com|WHATSAPP_(APP_SECRET|TOKEN|VERIFY_TOKEN)|TELNYX_PUBLIC_KEY/.test(t)) falla(G, x, 0, "solo canales-proveedor.ts habla con Meta y lee los secretos de los canales");
      if (x !== P && /api\.telnyx\.com/.test(t)) falla(G, x, 0, "solo canales-proveedor.ts habla con Telnyx (9l: también los avisos, por el único camino de los SMS)");
      if ([R, P, K, E, AC].includes(x) && /console\.(log|info|warn|error)/.test(t)) falla(G, x, 0, "los canales no escriben en el registro del servidor (teléfono o texto)");
      if (/insert into compa_links\b/.test(t) && x !== E) falla(G, x, 0, "solo enlace.ts crea enlaces de un uso");
    }
    if (existsSync(M)) for (const fn of ["compa_inbound_antes", "compa_outbound_antes"]) if (!/texto_con_secretos\(coalesce\(new\.body, ''\)\)/.test(ultimaFn(fn))) falla(G, M, 0, `${fn}: la base rechaza tarjeta o SSN`);
  },

  ordenSinTexto() {
    const G = "ordenSinTexto";
    for (const x of codigo.filter((f) => /^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f))) {
      for (const q of sinComent(x).match(/`[^`]*`/g) ?? []) {
        const sel = /^`\s*select\s+([\s\S]*?)\s+from\s/i.exec(q);
        if (!sel) continue;
        const iOb = q.toLowerCase().lastIndexOf("order by");
        if (iOb < 0) continue;
        const ob = q.slice(iOb + 8).split(/\blimit\b|\bfor update\b/i)[0];
        for (const m of sel[1].matchAll(/(?:^|,)\s*(?:\w+\.)?(\w+)::text(?:\s+as\s+"?(\w+)"?)?\s*(?=,|$)/g)) {
          const nom = m[2] ?? m[1];   // la columna de salida se llama como el alias (o como la columna, sin alias)
          if (new RegExp(`(^|,)\\s*${nom}\\b(?!\\.)`).test(ob)) falla(G, x, 0, `«order by ${nom}» ordena el TEXTO de ${m[1]}::text (100 antes que 98): califica la columna`);
        }
      }
    }
  },

  /* 7i · Una retención que se promete y no corre: compa_retener_meses estuvo en Configuración diciendo «Después solo quedan las cifras» sin que nada
     lo hiciera (bloqueada hasta 7i). Toda clave de Configuración que promete borrar o vaciar (…_retener_… o …_purga_…) la lee una función que el
     barrido central corre (en lib/: la función que la lee o una exportada del mismo archivo que la llama; en la base: la función SQL que la lee,
     llamada desde una de ellas). Al revés: quitar la tarea del barrido, o que la función deje de leer la clave → falla. */
  retencionQueCorre() {
    const G = "retencionQueCorre", B = "apps/web/lib/barrido.ts";
    if (!existsSync(B)) return falla(G, B, 0, "falta el barrido central");
    const bar = sinComent(B), claves = [...new Set(catalogoConfig().map((x) => x.k).filter((k) => /(_purga_dias|_retener_(dias|meses))$|^retener_/.test(k)))];
    // 9d · Cada clave retener_* (Configuración › Retención) tiene, además, su prueba con el reloj movido (una prueba de punta a punta que la nombra
    // y mueve una fecha hacia atrás con interval).
    const e2e = readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => [y, sinComent(`pruebas/e2e/${y}`)]);
    for (const k of claves.filter((x) => /^retener_/.test(x))) if (!e2e.some(([, t]) => t.includes(k) && /interval '\d+ (days?|months?)'/.test(t))) falla(G, "pruebas/e2e", 0, `«${k}» no tiene su prueba con el reloj movido (una prueba de punta a punta que la nombre)`);
    if (claves.length < 5) falla(G, "packages/db/migrations", 0, `solo ${claves.length} claves de retención: ¿se rompió la lectura del catálogo?`);
    const libs = codigo.filter((x) => /^apps\/web\/lib\/.*\.ts$/.test(x) && x !== B && x !== "apps/web/lib/config.ts");
    // Las funciones de nivel superior de un archivo (nombre, cuerpo, exportada).
    const funciones = (t) => [...t.matchAll(/\n(export )?(?:async )?function (\w+)\(/g)].map((m, i, L) => ({ n: m[2], exp: !!m[1], b: t.slice(m.index, L[i + 1]?.index ?? t.length) }));
    const corre = (t, quien) => { // ¿alguna función de este archivo que use `quien` la corre el barrido (directa o desde una exportada del mismo archivo)?
      const F = funciones(t), usa = F.filter((f) => quien(f.b));
      return usa.some((f) => bar.includes(`.${f.n}(`) || F.some((e) => e.exp && e.n !== f.n && new RegExp(`\\b${f.n}\\(`).test(e.b) && bar.includes(`.${e.n}(`)));
    };
    const fnSql = new Map(); // nombre de función SQL → su último cuerpo
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) for (const m of readFileSync(`packages/db/migrations/${x}`, "utf8").matchAll(/create or replace function (\w+)\(/g)) fnSql.set(m[1], ultimaFn(m[1]));
    for (const k of claves) {
      let ok = false;
      for (const x of libs) {
        const t = sinComent(x);
        if (!t.includes(k) && ![...fnSql].some(([n, b]) => b.includes(`cfg_int('${k}')`) && t.includes(`${n}(`))) continue;
        if (corre(t, (b) => new RegExp(`["'\`]${k}["'\`]`).test(b))) ok = true;
        // En la base: una función SQL que lee la clave (o que llama a otra que la lee), llamada desde una función del archivo que corre el barrido.
        for (const [n, b] of fnSql) if (b.includes(`cfg_int('${k}')`) && corre(t, (cuerpo) => new RegExp(`select ${n}\\(`).test(cuerpo))) ok = true;
        if (ok) break;
      }
      if (!ok) falla(G, B, 0, `«${k}» promete borrar o vaciar, pero ninguna función que el barrido central corre la lee`);
    }
  },

  /* 7i · Mi cuenta › Avisos › Soporte (fase7-compa §4 7i): lo del caso NO se apaga. Las plantillas del caso (recibido, te respondieron, resuelto,
     El Compa te pasó con una persona, el caso del negocio) van en el grupo `support` SIN pref (avisar() solo deja de mandar lo que tiene pref);
     ninguna migración posterior les pone interruptor y Mi cuenta › Avisos no tiene un interruptor de Soporte. Al revés: darle pref a una → falla. */
  soporteSiempreLlega() {
    const G = "soporteSiempreLlega", M = "packages/db/migrations/0124_compa_admin_config.sql", A = "apps/web/lib/avisos.ts", AV = "apps/web/app/(app)/cuenta/avisos/Avisos.tsx";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0124");
    const SOP = ["sop_recibido", "sop_respuesta", "sop_resuelto", "compa_caso", "compa_caso_negocio"];
    const nulo = /update notif_templates set grp = 'support', pref = null\s+where key in \(([^)]*)\)/.exec(readFileSync(M, "utf8"))?.[1] ?? "";
    for (const k of SOP) if (!nulo.includes(`'${k}'`)) falla(G, M, 0, `«${k}» es del caso: va en el grupo support SIN interruptor (pref null)`);
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql") && y > "0124")) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
      for (const k of SOP) if (new RegExp(`pref = '[a-zA-Z]+'[^;]*'${k}'`).test(t) || new RegExp(`set grp = '(?!support)[a-z]+'[^;]*'${k}'`).test(t)) falla(G, `packages/db/migrations/${x}`, 0, `«${k}» es del caso: siempre llega`);
    }
    if (existsSync(A) && /r\.grp === "support"[^;\n]*apagado/.test(cuerpoFn(sinComent(A), "avisar"))) falla(G, A, 0, "avisar(): lo de Soporte no se apaga");
    if (existsSync(AV)) {
      const t = readFileSync(AV, "utf8");
      if (!/E2\("SOPORTE", "SUPPORT"\)/.test(t) || !/Lo de tus casos siempre te llega/.test(t)) falla(G, AV, 0, "Mi cuenta › Avisos › Soporte dice que lo del caso siempre llega");
      if (/\["sop[A-Za-z]*",/.test(t)) falla(G, AV, 0, "Mi cuenta › Avisos no tiene interruptor de Soporte");
    }
  },

  /* ── 8a · Las cuatro cáscaras (fase8-apps.md §4 8a). Cada guardián vigila una clase y se prueba al revés (alreves8a). ── */

  /* 8a · Una sola fuente para las cuatro apps: apps/mobile/apps.json. Lo nativo generado (configs de Capacitor, Info.plist, textos, manifiestos,
     sabores de Gradle, project.yml) es exactamente lo que sale de él (generar.mjs --verificar), la migración 0125 copia sus ids, entradas y
     alcances, la base acepta sus claves, y nadie más escribe un id de tienda ni una entrada a mano. Al revés: cambiar un id en apps.json sin
     regenerar, o escribir «com.tolatino.negocios» en la web → falla. */
  appsUnaFuente() {
    const G = "appsUnaFuente", J = "apps/mobile/apps.json", M = "packages/db/migrations/0125_apps_base.sql";
    if (!existsSync(J)) return falla(G, J, 0, "falta la fuente de las apps");
    const A = JSON.parse(readFileSync(J, "utf8"));
    try { execSync("node apps/mobile/scripts/generar.mjs --verificar", { stdio: "pipe" }); }
    catch (e) { falla(G, "apps/mobile/scripts/generar.mjs", 0, String(e.stderr || e.stdout).split("\n").find((l) => l.includes("✗")) || "lo generado no es lo que sale de apps.json"); }
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración 0125");
    const m = readFileSync(M, "utf8");
    for (const a of A.apps) {
      const re = new RegExp(`\\('${a.key}', '\\{"es":"([^"]+)","en":"([^"]+)"\\}', '${a.ios.replace(/\./g, "\\.")}', '${a.android.replace(/\./g, "\\.")}', '${a.entrada}', '\\{${a.alcance.join(",")}\\}'`);
      const x = re.exec(m);
      if (!x) falla(G, M, 0, `app_clients no copia de apps.json la app «${a.key}» (ids, entrada o alcance)`);
      else if (x[1].replace(/''/g, "'") !== a.nombre.es || x[2].replace(/''/g, "'") !== a.nombre.en) falla(G, M, 0, `el nombre de «${a.key}» no es el de apps.json`);
      if (!m.includes(`('app.cascara.${a.key}', `)) falla(G, M, 0, `falta el interruptor app.cascara.${a.key}`);
      for (const p of ["ios", "android"]) for (const t of ["min", "aviso"]) if (!m.includes(`('app_${t}_build_${a.key}_${p}', `)) falla(G, M, 0, `falta la clave app_${t}_build_${a.key}_${p}`);
    }
    const S6 = "packages/db/migrations/0006_cuenta.sql", ses = /app\s+text not null default 'cliente' check \(app in \(([^)]*)\)\)/.exec(existsSync(S6) ? readFileSync(S6, "utf8") : "")?.[1] ?? "";
    for (const a of A.apps) if (!ses.includes(`'${a.key}'`)) falla(G, S6, 0, `sessions.app no acepta «${a.key}»`);
    const ev = /alter table app_events add column if not exists app text check \(app in \(([^)]*)\)\)/.exec(m)?.[1] ?? "";
    for (const a of A.apps) if (!ev.includes(`'${a.key}'`)) falla(G, M, 0, `app_events.app no acepta «${a.key}»`);
    const C = "apps/web/lib/app-nativa-comun.ts";
    if (!existsSync(C) || !/import APPS from "\.\.\/\.\.\/mobile\/apps\.json"/.test(readFileSync(C, "utf8"))) falla(G, C, 0, "el servidor lee las apps de apps/mobile/apps.json");
    const generados = /^apps\/mobile\/(apps\.json|ios\/(Targets\/|project\.yml)|android\/app\/(src\/(cliente|negocios|repartidor|puerta)\/|sabores\.gradle))/;
    for (const f of codigo) {
      if (generados.test(f) || f === M || f.startsWith("guardianes/")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/["'`]com\.tolatino\.(app|negocios|repartidor|puerta)["'`]/.test(l)) falla(G, f, i + 1, "un id de tienda escrito a mano: sale de apps/mobile/apps.json"); });
    }
  },

  /* 8a · Cada cáscara abre SOLO su alcance, y la regla es la misma en los tres lugares (§3.1): el servidor (middleware → destinoEnApp de
     app-nativa-comun.ts), el filtro nativo (TLAlcance en Swift y en Java, con la lista de su capacitor.config.json) y la navegación permitida
     (allowNavigation = solo nuestro dominio). Se comparan las decisiones de los dos algoritmos sobre todas las rutas de la web. El Super Admin
     no es de ninguna app. Al revés: quitar /panel de las «ajenas» de To'Latino, sumar un dominio a allowNavigation, escribir una ruta en el
     filtro nativo o que el middleware deje de usar destinoEnApp → falla. */
  cascaraSoloSuAlcance() {
    const G = "cascaraSoloSuAlcance", J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8"));
    const bajo = (r, p) => p === "/" || r === p || r.startsWith(p + "/");
    // El servidor (la semántica de duenoDe en app-nativa-comun.ts).
    const dueno = (r) => A.tecnico.some((p) => bajo(r, p)) ? "tecnico" : A.comun.some((p) => bajo(r, p)) ? "comun" : A.soloWeb.some((p) => bajo(r, p)) ? "web"
      : (A.apps.find((a) => !a.alcance.includes("/") && a.alcance.some((p) => bajo(r, p))) ?? A.apps.find((a) => a.alcance.includes("/"))).key;
    const servidor = (k, r) => { const d = dueno(r); return d === "tecnico" || d === "comun" || d === k; };
    const C = "apps/web/lib/app-nativa-comun.ts";
    const dc = existsSync(C) ? cuerpoFn(sinComent(C), "duenoDe") : "";
    if (!/APPS\.tecnico[\s\S]*APPS\.comun[\s\S]*APPS\.soloWeb[\s\S]*DEF_APPS/.test(dc)) falla(G, C, 0, "duenoDe(): el orden es técnico → común → solo web → la app dueña (el mismo que el filtro nativo)");
    // Todas las rutas de páginas de la web (sin grupos), con un ejemplo de cada segmento dinámico.
    const rutas = new Set(["/", "/cuenta", "/admin", "/admin/sistema", "/panel", "/sistema"]);
    for (const f of archivos) {
      const m = /^apps\/web\/app\/(.*)page\.tsx$/.exec(f); if (!m) continue;
      rutas.add("/" + m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s)).map((s) => s.replace(/^\[\[?\.{0,3}([^\]]+)\]\]?$/, "x1")).join("/"));
    }
    for (const a of A.apps) {
      for (const T of [`apps/mobile/ios/Targets/${a.target}/capacitor.config.json`, `apps/mobile/android/app/src/${a.sabor}/assets/capacitor.config.json`]) {
        if (!existsSync(T)) { falla(G, T, 0, "falta el capacitor.config.json de la app"); continue; }
        const c = JSON.parse(readFileSync(T, "utf8")), host = new URL(c.server?.url ?? "http://x").host;
        if (JSON.stringify(c.server?.allowNavigation) !== JSON.stringify([host])) falla(G, T, 0, "allowNavigation es solo nuestro dominio (lo ajeno abre fuera de la cáscara)");
        const N = c.plugins?.TLAlcance;
        if (!N || N.host !== host) { falla(G, T, 0, "TLAlcance sin su alcance o con otro dominio"); continue; }
        if (!c.packageClassList?.includes("TLAlcancePlugin")) falla(G, T, 0, "la cáscara no carga su filtro nativo TLAlcance");
        const nativo = (r) => N.comunes.some((p) => bajo(r, p)) || N.inicio.includes(r) || (!N.ajenas.some((p) => bajo(r, p)) && N.propias.some((p) => bajo(r, p)));
        for (const r of rutas) if (nativo(r) !== servidor(a.key, r) && !(A.inicio.includes(r))) { falla(G, T, 0, `«${r}»: el filtro nativo de ${a.key} dice ${nativo(r) ? "abre" : "fuera"} y el servidor lo contrario`); break; }
        if (N.ajenas.length === 0 && a.alcance.includes("/")) falla(G, T, 0, "To'Latino no excluye las rutas de las otras apps");
      }
      for (const p of A.soloWeb) if (a.alcance.some((x) => bajo(p, x) && x !== "/") || A.comun.some((x) => bajo(p, x))) falla(G, J, 0, `«${p}» es solo de la web: ninguna app lo abre`);
    }
    const prop = A.apps.flatMap((a) => a.alcance.filter((p) => p !== "/").map((p) => [a.key, p]));
    for (const [k, p] of prop) for (const [k2, p2] of prop) if (k !== k2 && (bajo(p, p2) || bajo(p2, p))) falla(G, J, 0, `«${p}» (${k}) y «${p2}» (${k2}) se pisan`);
    for (const f of ["apps/mobile/plugins/tl-alcance/ios/TLAlcancePlugin.swift", "apps/mobile/plugins/tl-alcance/android/com/tolatino/plugins/TLAlcancePlugin.java"]) {
      if (!existsSync(f)) { falla(G, f, 0, "falta el filtro nativo"); continue; }
      const t = sinComent(f);
      for (const k of ["comunes", "inicio", "propias", "ajenas", "host"]) if (!t.includes(`"${k}"`)) falla(G, f, 0, `el filtro nativo lee «${k}» de su configuración`);
      if (/"\/(panel|repartidor|puerta|admin|cuenta|entrar|sistema)/.test(t)) falla(G, f, 0, "una ruta escrita en el filtro nativo: sale de apps.json");
      if (!/shouldOverrideLoad/.test(t)) falla(G, f, 0, "el filtro nativo decide en shouldOverrideLoad");
    }
    const MW = "apps/web/middleware.ts";
    if (!existsSync(MW) || !/destinoEnApp\(app\.app,/.test(sinComent(MW))) falla(G, MW, 0, "el middleware manda cada ruta de la cáscara con destinoEnApp() (la misma regla)");
  },

  /* 8a · El puente nativo solo para nuestro origen y el marco principal (§3.1 «Seguridad del WebView»). 11 nov, primera corrida del emulador:
     en Negocios, Repartidor y Puerta un iframe de otro origen alcanzaba el puente. Causa: server.url con ruta (https://…/panel). Capacitor usa
     server.url tal cual como regla de origen de addWebMessageListener; con ruta la regla es inválida, la llamada falla y Capacitor cae EN
     SILENCIO a addJavascriptInterface, que entrega el objeto a todos los marcos. Además, los plugins internos CapacitorHttp y CapacitorCookies
     instalan siempre su objeto Java (setCookie deja a cualquier marco poner cookies, también HttpOnly). La clase: «algo de la configuración o
     del código hace que Capacitor entregue el puente por addJavascriptInterface, o que un manejador de iOS atienda a cualquier marco».
     - Android: server.url es solo un origen y la entrada va en appStartPath; allowNavigation son nombres de dominio (sin comodín ni ruta);
       sin el puente viejo; CapacitorHttp y CapacitorCookies apagados; MainActivity quita los tres objetos Java después de super.onCreate; y
       ningún código propio usa addJavascriptInterface.
     - iOS: TLBridgeViewController reemplaza el manejador «bridge» por el portero (solo el marco principal y nuestros dos orígenes), la escena
       lo usa, y ningún código propio agrega otro manejador ni un script para todos los marcos.
     - El humo de Android prueba las cuatro apps (de apps.json) en la página local y en la isla: el iframe opaco debe responder "false" y el
       marco principal debe tener el puente.
     Al revés: volver a poner la entrada en server.url de Android, quitar un removeJavascriptInterface, un addJavascriptInterface en un plugin,
     quitar isMainFrame del portero o darle allow-same-origin al iframe del humo → falla. */
  puenteSoloNuestroOrigen() {
    const G = "puenteSoloNuestroOrigen", J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8"));
    for (const a of A.apps) {
      const T = `apps/mobile/android/app/src/${a.sabor}/assets/capacitor.config.json`;
      if (!existsSync(T)) { falla(G, T, 0, "falta el capacitor.config.json del sabor"); continue; }
      const c = JSON.parse(readFileSync(T, "utf8")), s = c.server ?? {};
      let origen = null;
      try { origen = new URL(s.url).origin; } catch { /* abajo */ }
      if (!origen || s.url !== origen) falla(G, T, 0, `server.url «${s.url}» no es solo un origen: Capacitor la usa como regla de addWebMessageListener y, con ruta, entrega el puente a todos los marcos (la entrada va en server.appStartPath)`);
      if ((a.entrada === "/" ? undefined : a.entrada) !== s.appStartPath) falla(G, T, 0, `server.appStartPath es la entrada de ${a.key} (${a.entrada})`);
      for (const n of s.allowNavigation ?? []) if (!/^[a-z0-9.-]+(:\d+)?$/.test(n)) falla(G, T, 0, `allowNavigation «${n}»: solo un nombre de dominio (sin comodín, esquema ni ruta; también es regla de origen del puente)`);
      if (c.android?.useLegacyBridge !== false) falla(G, T, 0, "android.useLegacyBridge: false (el puente viejo es addJavascriptInterface)");
      for (const p of ["CapacitorHttp", "CapacitorCookies"]) if (c.plugins?.[p]?.enabled) falla(G, T, 0, `${p} apagado: su objeto Java lo alcanza cualquier marco`);
    }
    const MA = "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java";
    const ma = existsSync(MA) ? sinComent(MA) : "";
    const oc = /void onCreate\(Bundle [a-zA-Z]+\)\s*\{([\s\S]*?)\n    \}/.exec(ma)?.[1] ?? "";
    if (!/super\.onCreate\([\s\S]*removeJavascriptInterface\(/.test(oc)) falla(G, MA, 0, "MainActivity.onCreate quita los objetos Java del puente después de super.onCreate");
    for (const n of ["androidBridge", "CapacitorHttpAndroidInterface", "CapacitorCookiesAndroidInterface"]) if (!ma.includes(`"${n}"`)) falla(G, MA, 0, `MainActivity no quita «${n}» (addJavascriptInterface lo da a todos los marcos)`);
    for (const f of archivos.filter((x) => /^apps\/mobile\/.*\.(java|kt)$/.test(x))) if (/\baddJavascriptInterface\s*\(/.test(sinComent(f))) falla(G, f, 0, "addJavascriptInterface entrega el objeto a todos los marcos, también a un iframe de otro origen: usa un plugin de Capacitor");
    const BV = "apps/mobile/ios/App/TLBridgeViewController.swift", bv = existsSync(BV) ? sinComent(BV) : "";
    if (!/guard message\.frameInfo\.isMainFrame else \{ return \}/.test(bv) || !/securityOrigin/.test(bv) || !/guard origenes\.contains\(/.test(bv)) falla(G, BV, 0, "el portero del puente de iOS solo deja pasar el marco principal de nuestros orígenes");
    if (!/removeScriptMessageHandler\(forName: "bridge"\)[\s\S]*\.add\(TLPortero\(/.test(bv)) falla(G, BV, 0, "el manejador «bridge» de Capacitor se reemplaza por el portero");
    const SD = "apps/mobile/ios/App/SceneDelegate.swift";
    if (!existsSync(SD) || !/rootViewController = TLBridgeViewController\(\)/.test(sinComent(SD))) falla(G, SD, 0, "la escena abre TLBridgeViewController (con el portero), no CAPBridgeViewController");
    for (const f of archivos.filter((x) => /^apps\/mobile\/.*\.swift$/.test(x) && x !== BV)) {
      const t = sinComent(f);
      if (/\.add\([^)]*,\s*name:|addScriptMessageHandler|messageHandlers/.test(t)) falla(G, f, 0, "un manejador de mensajes de WKWebView lo llama cualquier marco: solo el portero de TLBridgeViewController");
      if (/forMainFrameOnly:\s*false/.test(t)) falla(G, f, 0, "un script para todos los marcos (forMainFrameOnly: false)");
    }
    const H = "apps/mobile/scripts/humo-android.sh", h = existsSync(H) ? readFileSync(H, "utf8") : "";
    const MJ = "apps/mobile/scripts/humo/marco-ajeno.js", mj = existsSync(MJ) ? readFileSync(MJ, "utf8") : "";
    if (!/require\(process\.argv\[1\]\)[\s\S]*apps\.json/.test(h) || !/for par in \$APPS; do\n\s+IFS=: read -r s id isla/.test(h)) falla(G, H, 0, "el humo de Android prueba las cuatro apps de apps.json");
    if (!h.includes(`"$(cat "$DIR/humo/marco-ajeno.js")"`) || !h.includes(`[ "$r" = '"false"' ] || {`) || !/marco "\$s" "página local"/.test(h) || !/marco "\$s" "isla"/.test(h)) falla(G, H, 0, "el humo exige que el marco ajeno no vea el puente (\"false\"), en la página local y en la isla");
    if (!h.includes(`"$(cat "$DIR/humo/puente-principal.js")"`)) falla(G, H, 0, "el humo comprueba que el marco principal sí tiene el puente");
    if (!/f\.sandbox = "allow-scripts";/.test(mj) || /allow-same-origin/.test(mj) || !/androidBridge/.test(mj) || !/CapacitorCookiesAndroidInterface/.test(mj)) falla(G, MJ, 0, "el iframe del humo es de otro origen (sandbox allow-scripts, sin allow-same-origin) y busca todo el puente");
    const WF = ".github/workflows/cascaras.yml", wf = existsSync(WF) ? readFileSync(WF, "utf8") : "";
    if (!/script: bash apps\/mobile\/scripts\/humo-android\.sh /.test(wf) || !/run: bash apps\/mobile\/scripts\/humo-ios\.sh /.test(wf)) falla(G, WF, 0, "el CI de las cáscaras corre los dos humos");
  },

  /* 8a · Cada cáscara de iOS arranca (11 nov, primera corrida del simulador: las cuatro se cerraban al abrir). Causa: el plugin SplashScreen de
     Capacitor abre UIStoryboard(name: "LaunchScreen") al cargar y el Info.plist usaba la clave UILaunchScreen sin storyboard: iOS lanza una
     excepción y cierra la app. La clase: «algo que el código nativo exige del paquete y el paquete no trae». Con SplashScreen, cada Info.plist
     nombra su storyboard de arranque y el archivo está en las fuentes del target; server.appStartPath no se usa en iOS (allí es un archivo
     local y, si no existe, Capacitor cierra la app); cada plugin propio que la config pide se puede encontrar por su nombre (@objc); y el
     humo guarda lo que la app escribe y el informe de cierre. Al revés: volver a UILaunchScreen, borrar el storyboard, poner appStartPath en
     iOS o quitar @objc(TLLocalPlugin) → falla. */
  cascaraArrancaIos() {
    const G = "cascaraArrancaIos", J = "apps/mobile/apps.json", PY = "apps/mobile/ios/project.yml";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8")), py = existsSync(PY) ? readFileSync(PY, "utf8") : "";
    for (const a of A.apps) {
      const T = `apps/mobile/ios/Targets/${a.target}`, pl = existsSync(`${T}/Info.plist`) ? readFileSync(`${T}/Info.plist`, "utf8") : "";
      const bloque = py.split(/\n  (?=[A-Za-z]+:\n    type: application)/).find((b) => b.startsWith(`${a.target}:\n`)) ?? "";
      if (!bloque) falla(G, PY, 0, `project.yml no tiene el target ${a.target}`);
      if (a.plugins.includes("SplashScreen")) {
        const sb = /<key>UILaunchStoryboardName<\/key>\s*<string>([^<]+)<\/string>/.exec(pl)?.[1];
        if (!sb) falla(G, `${T}/Info.plist`, 0, "con SplashScreen, el Info.plist nombra su storyboard de arranque (UILaunchStoryboardName): sin él la app se cierra al abrir");
        else if (!["App", `Targets/${a.target}`].some((d) => existsSync(`apps/mobile/ios/${d}/${sb}.storyboard`) && bloque.includes(`- path: ${d}\n`))) falla(G, `${T}/Info.plist`, 0, `${sb}.storyboard no está en las fuentes del target ${a.target}`);
      }
      const cf = `${T}/capacitor.config.json`, c = existsSync(cf) ? JSON.parse(readFileSync(cf, "utf8")) : {};
      if (c.server?.appStartPath) falla(G, cf, 0, "server.appStartPath en iOS es un archivo local (public/…): si no existe, Capacitor cierra la app. La entrada va en server.url");
      const dirs = [...bloque.matchAll(/- path: \.\.\/plugins\/([a-z-]+)\/ios/g)].map((m) => m[1]);
      for (const p of c.packageClassList ?? []) {
        if (!/^TL/.test(p)) continue;
        const ok = dirs.some((d) => archivos.some((f) => f.startsWith(`apps/mobile/plugins/${d}/ios/`) && f.endsWith(".swift") && new RegExp(`@objc\\(${p}\\)\\s*public class ${p}: CAPPlugin, CAPBridgedPlugin`).test(readFileSync(f, "utf8"))));
        if (!ok) falla(G, cf, 0, `${p}: el target ${a.target} no compila una clase @objc(${p}) que Capacitor pueda encontrar por su nombre`);
      }
    }
    const H = "apps/mobile/scripts/humo-ios.sh", h = existsSync(H) ? readFileSync(H, "utf8") : "";
    if (!/--stdout=/.test(h) || !/DiagnosticReports/.test(h) || !/log show/.test(h)) falla(G, H, 0, "si una app se cierra, el humo de iOS imprime lo que escribió, el registro del simulador y el informe de cierre");
    // 11 nov: con pipefail, «launchctl list | grep -q» falló por SIGPIPE y dio por cerrada una app viva. Un humo no busca en un tubo con -q.
    for (const f of archivos.filter((x) => /^apps\/mobile\/scripts\/.*\.sh$/.test(x))) {
      const t = readFileSync(f, "utf8");
      if (/set -[a-z]*o pipefail|set -euo pipefail/.test(t)) t.split("\n").forEach((l, i) => { if (/\|\s*grep\s+-[a-zA-Z]*q/.test(l) && !/^\s*#/.test(l)) falla(G, f, i + 1, "«… | grep -q» con pipefail: el SIGPIPE se lee como fallo (busca con grep -q … <<< \"$texto\")"); });
    }
  },

  /* 8a · @capacitor/* solo en el puente (lib/nativo/puente.ts): ninguna pantalla habla con lo nativo por su cuenta ni toca window.Capacitor.
     Al revés: importar @capacitor/core en una pantalla → falla. */
  capacitorSoloEnPuente() {
    const G = "capacitorSoloEnPuente";
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?|mjs)$/.test(f) || f === "apps/web/lib/nativo/puente.ts") continue;
      const t = sinComent(f);
      if (/from ["']@capacitor\/|import\(["']@capacitor\/|require\(["']@capacitor\//.test(t)) falla(G, f, 0, "@capacitor/* solo se importa en lib/nativo/puente.ts");
      if (/\bwindow\.Capacitor\b|\(window as[^)]*\)\.Capacitor|globalThis\.Capacitor/.test(t)) falla(G, f, 0, "el puente nativo se usa desde lib/nativo/ (nunca window.Capacitor)");
    }
    const P = "apps/web/lib/nativo/puente.ts";
    if (!existsSync(P) || !/window\.self !== window\.top/.test(readFileSync(P, "utf8"))) falla(G, P, 0, "el puente no se entrega a un marco (iframe): solo al documento de arriba");
  },

  /* 8a · Todo lo nativo tiene su respaldo web (§3.1 «Puente»): en lib/nativo/*, cada plugin pedido se revisa (`if (!p)`) y la función hace lo
     mismo (o lo más parecido) sin la cáscara. Y cada método que la web le pide a un plugin propio (TL*) existe en Swift (declarado en
     pluginMethods) y en Java (@PluginMethod). Al revés: usar un plugin sin el `if (!p)`, o llamar un método que el nativo no tiene → falla. */
  nativoConRespaldo() {
    const G = "nativoConRespaldo", D = "apps/web/lib/nativo";
    const fs8 = codigo.filter((f) => f.startsWith(D + "/") && f.endsWith(".ts") && !f.endsWith("/puente.ts"));
    if (fs8.length < 5) falla(G, D, 0, "faltan las piezas del puente (almacen, externo, pantalla, permisos, reporte, inicio)");
    const usos = new Map(); // plugin → métodos que la web le pide
    for (const f of fs8) {
      const t = sinComent(f);
      for (const m of t.matchAll(/const (\w+) = (plugin<(\w+)>\("(\w+)"\)|nativo\(\))/g)) {
        const resto = t.slice(m.index, m.index + 420);
        if (!new RegExp(`if \\(!${m[1]}\\)`).test(resto)) falla(G, f, 0, `«${m[1]}» (${m[4] ?? "TLLocal"}) se usa sin su respaldo web (if (!${m[1]}) …)`);
      }
      for (const m of t.matchAll(/type (\w+) = \{([^}]*(?:\{[^}]*\}[^}]*)*)\};/g)) {
        const nombre = m[1], cuerpo = m[2];
        const plug = new RegExp(`plugin<${nombre}>\\("(TL\\w+)"\\)`).exec(t)?.[1] ?? (nombre === "TLLocal" ? "TLLocal" : null);
        if (!plug) continue;
        const L = usos.get(plug) ?? new Set();
        for (const x of cuerpo.matchAll(/(\w+)\(/g)) L.add(x[1]);
        usos.set(plug, L);
      }
    }
    for (const [plug, L] of usos) {
      const dir = { TLLocal: "tl-local", TLPantalla: "tl-pantalla", TLReporte: "tl-reporte", TLAlcance: "tl-alcance", TLRuta: "tl-ruta", TLLlave: "tl-llave" }[plug];
      if (!dir) { falla(G, D, 0, `«${plug}» no es un plugin propio de apps/mobile/plugins`); continue; }
      const sw = `apps/mobile/plugins/${dir}/ios/${plug}Plugin.swift`, jv = `apps/mobile/plugins/${dir}/android/com/tolatino/plugins/${plug}Plugin.java`;
      const s = existsSync(sw) ? readFileSync(sw, "utf8") : "", j = existsSync(jv) ? readFileSync(jv, "utf8") : "";
      if (!s) falla(G, sw, 0, `falta ${plug} en iOS`); if (!j) falla(G, jv, 0, `falta ${plug} en Android`);
      if (s && !s.includes(`jsName = "${plug}"`)) falla(G, sw, 0, `${plug}: jsName distinto`);
      if (j && !new RegExp(`@CapacitorPlugin\\(\\s*name = "${plug}"[,)]`).test(j)) falla(G, jv, 0, `${plug}: nombre distinto`);
      // 8e · Un método puede vivir en una extensión por variante de target (tl-pantalla/ios-camara y ios-sin-camara: la linterna solo enlaza la
      // cámara donde hay texto de cámara). Entonces TODAS las variantes lo tienen que traer.
      const variantes = existsSync(`apps/mobile/plugins/${dir}`) ? readdirSync(`apps/mobile/plugins/${dir}`).filter((d) => /^ios-/.test(d)).map((d) => `apps/mobile/plugins/${dir}/${d}`) : [];
      const enVariantes = (x) => variantes.length > 0 && variantes.every((d) => readdirSync(d).some((f) => f.endsWith(".swift") && new RegExp(`@objc func ${x}\\(_ call: CAPPluginCall\\)`).test(readFileSync(`${d}/${f}`, "utf8"))));
      for (const x of L) {
        if (s && ((!new RegExp(`@objc func ${x}\\(_ call: CAPPluginCall\\)`).test(s) && !enVariantes(x)) || !s.includes(`CAPPluginMethod(name: "${x}"`))) falla(G, sw, 0, `${plug}.${x}() lo pide la web y no está en iOS`);
        if (j && !new RegExp(`@PluginMethod\\s+public void ${x}\\(PluginCall call\\)`).test(j)) falla(G, jv, 0, `${plug}.${x}() lo pide la web y no está en Android`);
      }
    }
  },

  /* 8a · El rótulo TLApp dice qué app es; NUNCA da permisos ni cambia lo que se cobra o se ve (§1c). Solo lo leen los archivos de esta lista
     (mandar a la entrada, «Actualiza la app», anotar la sesión y la analítica, el contexto de Soporte, la hoja de permisos); ninguno decide
     acceso. La cabecera x-tl-app ya no se lee. El middleware solo redirige (no pone cabeceras de confianza). Al revés: leer el rótulo en el
     panel o en lib/admin.ts, o volver a leer x-tl-app → falla. */
  appNoAutoriza() {
    const G = "appNoAutoriza";
    const OK = new Set(["apps/web/lib/app-nativa.ts", "apps/web/lib/app-nativa-comun.ts", "apps/web/middleware.ts", "apps/web/lib/cuenta.ts", "apps/web/lib/soporte.ts", "apps/web/lib/eventos.ts",
      "apps/web/app/_cascara/Compuerta.tsx", "apps/web/app/_cascara/HojaPermiso.tsx", "apps/web/app/(cascara)/app/actualizar/page.tsx", "apps/web/app/(cascara)/app/pausa/page.tsx",
      "apps/web/app/(cascara)/app/fuera/page.tsx", "apps/web/app/(cascara)/app/Estados.tsx",
      // 8f · Los errores se agrupan por app y plataforma y llevan su build (informativo; nunca decide nada).
      "apps/web/lib/errores/ingesta.ts",
      // 8i · Las reglas de las tiendas: el rótulo SOLO QUITA (dentro de las apps no se vende Pro); nunca da nada.
      "apps/web/lib/tiendas/reglas.ts",
      // 9h · Un escaneo de QR anota si vino de la web o de la app (cifra sin personas); nunca decide nada.
      "apps/web/lib/crecimiento/enlaces.ts"]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      if (/\b(deLaApp|leerRotulo|compuerta)\(/.test(t) && !OK.has(f)) falla(G, f, 0, "el rótulo TLApp solo lo leen los archivos de la lista de appNoAutoriza (nunca decide permisos)");
      if (/["']x-tl-app["']/.test(t)) falla(G, f, 0, "la cabecera x-tl-app no se lee: la app se sabe por el rótulo y nunca da permisos");
      if (/TLApp\//.test(t) && !OK.has(f)) falla(G, f, 0, "el rótulo TLApp se lee solo en lib/app-nativa-comun.ts");
    }
    const AD = "apps/web/lib/admin.ts", CU = "apps/web/lib/cuenta.ts";
    if (existsSync(AD) && /app-nativa|TLApp/.test(sinComent(AD))) falla(G, AD, 0, "los permisos del equipo no miran la app");
    if (existsSync(CU)) {
      const y = cuerpoFn(sinComent(CU), "yo");
      if (/returning[^`]*\b(app|platform|app_build|app_version)\b/.test(y)) falla(G, CU, 0, "yo() no devuelve la app de la sesión (nadie decide con ella)");
    }
    const MW = "apps/web/middleware.ts";
    if (existsSync(MW)) { const c = cuerpoFn(sinComent(MW), "cascara"); if (/headers\.set\(["']x-|cookies\.set|NextResponse\.next\(\{\s*request/.test(c)) falla(G, MW, 0, "cascara() solo redirige: no agrega cabeceras ni cookies"); }
  },

  /* 8a · Cada permiso que pide una app tiene su texto ES/EN (§1c): iOS (Info.plist e InfoPlist.strings es/en, iguales a apps.json) y Android
     (strings.xml es/en). Ningún permiso sin texto ni texto inventado. Al revés: quitar un texto de apps.json o un NS…UsageDescription → falla. */
  permisoConTexto() {
    const G = "permisoConTexto", J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8")), IOS = { camara: "NSCameraUsageDescription", ubicacion: "NSLocationWhenInUseUsageDescription" };
    const un = (s) => s.replace(/\\"/g, '"').replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\\'/g, "'");
    for (const a of A.apps) {
      const ps = [...(a.permisos.camara ? ["camara"] : []), ...(a.permisos.ubicacion !== "no" ? ["ubicacion"] : [])];
      const T = `apps/mobile/ios/Targets/${a.target}`, S = `apps/mobile/android/app/src/${a.sabor}/res`;
      const plist = existsSync(`${T}/Info.plist`) ? readFileSync(`${T}/Info.plist`, "utf8") : "";
      for (const k of plist.matchAll(/<key>(NS\w+UsageDescription)<\/key>/g)) if (!ps.some((p) => IOS[p] === k[1])) falla(G, `${T}/Info.plist`, 0, `${k[1]} sin permiso en apps.json`);
      for (const p of ps) {
        const t = A.textos?.[p]?.[a.key];
        if (!t?.es || !t?.en || t.es.length < 30 || t.en.length < 30) { falla(G, J, 0, `${a.key}: el permiso ${p} sin su texto ES/EN (§1c)`); continue; }
        if (!new RegExp(`<key>${IOS[p]}</key>\\s*<string>[^<]{30,}</string>`).test(plist)) falla(G, `${T}/Info.plist`, 0, `${IOS[p]} sin texto`);
        for (const l of ["es", "en"]) {
          const f = `${T}/${l}.lproj/InfoPlist.strings`, x = existsSync(f) ? new RegExp(`"${IOS[p]}" = "((?:[^"\\\\]|\\\\.)*)";`).exec(readFileSync(f, "utf8"))?.[1] : null;
          if (!x || un(x) !== t[l]) falla(G, f, 0, `${IOS[p]} en ${l} no es el texto de apps.json`);
          const fa = `${S}/${l === "es" ? "values" : "values-en"}/strings.xml`, y = existsSync(fa) ? new RegExp(`<string name="permiso_${p}">([^<]*)</string>`).exec(readFileSync(fa, "utf8"))?.[1] : null;
          if (!y || un(y) !== t[l]) falla(G, fa, 0, `permiso_${p} en ${l} no es el texto de apps.json`);
        }
      }
    }
    const H = "apps/web/app/_cascara/HojaPermiso.tsx";
    if (!existsSync(H) || !/APPS\.textos/.test(readFileSync(H, "utf8"))) falla(G, H, 0, "la hoja previa dice el porqué con el mismo texto de la tienda (apps.json)");
  },

  /* 8a · Permisos mínimos (§3.6): cada app pide solo lo que usa. Cámara solo donde hay foto o lector; ubicación «al usar» solo To'Latino (el
     Repartidor la suma en 8e, «entrega», con modo de fondo solo él); nunca micrófono, galería entera, contactos, otras apps ni ubicación
     «siempre». Los permisos normales de las cuatro (apps.json androidComun) solo de esta lista, cada uno con su porqué (normales: sin aviso ni
     texto de permiso, permisoConTexto no los pide). Al revés: sumar RECORD_AUDIO, CAMERA al Repartidor, NSMicrophoneUsageDescription o un
     permiso fuera de la lista en androidComun → falla. */
  permisosMinimos() {
    const G = "permisosMinimos", J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8"));
    const COMUNES = {
      // Normal (sin aviso). La WebView no sabe sola si hay red: RedWebView la sigue y se la cuenta (navigator.onLine honesto; senalHonesta).
      "android.permission.ACCESS_NETWORK_STATE": "la red para la WebView",
    };
    for (const p of A.androidComun ?? []) if (!(p in COMUNES)) falla(G, J, 0, `androidComun: ${p} no es un permiso normal con su porqué en permisosMinimos`);
    const NUNCA = /android\.permission\.(RECORD_AUDIO|READ_MEDIA_IMAGES|READ_MEDIA_VIDEO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|READ_CONTACTS|QUERY_ALL_PACKAGES|SYSTEM_ALERT_WINDOW|ACCESS_BACKGROUND_LOCATION|READ_PHONE_STATE|READ_SMS)\b/;
    const base = "apps/mobile/android/app/src/main/AndroidManifest.xml";
    if (existsSync(base)) for (const m of readFileSync(base, "utf8").matchAll(/uses-permission android:name="([^"]+)"/g)) if (m[1] !== "android.permission.INTERNET") falla(G, base, 0, `la base común solo pide INTERNET (${m[1]} va en el sabor que lo usa)`);
    for (const a of A.apps) {
      if (a.permisos.ubicacion === "entrega" && a.key !== "delivery") falla(G, J, 0, `${a.key}: la ubicación de fondo es solo del Repartidor`);
      if (a.permisos.ubicacion === "siempre") falla(G, J, 0, `${a.key}: nunca ubicación «siempre»`);
      const mf = `apps/mobile/android/app/src/${a.sabor}/AndroidManifest.xml`, t = existsSync(mf) ? readFileSync(mf, "utf8") : "";
      // 8c · Avisos: POST_NOTIFICATIONS (Android 13+) solo en la app que lleva el plugin de avisos.
      // 8e · Repartidor («entrega»): ubicación mientras se usa + servicio en primer plano de tipo ubicación (nunca BACKGROUND_LOCATION). Háptica:
      // VIBRATE (normal) solo con el plugin Haptics.
      const entrega = a.permisos.ubicacion === "entrega";
      const ok = new Set([...(A.androidComun ?? []).filter((p) => p in COMUNES), ...(a.permisos.camara ? ["android.permission.CAMERA"] : []), ...(a.permisos.ubicacion === "al_usar" || entrega ? ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"] : []),
        ...(entrega ? ["android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_LOCATION"] : []), ...(a.plugins.includes("PushNotifications") ? ["android.permission.POST_NOTIFICATIONS"] : []), ...(a.plugins.includes("Haptics") ? ["android.permission.VIBRATE"] : [])]);
      for (const m of t.matchAll(/uses-permission(?:-sdk-23)? android:name="([^"]+)"/g)) {
        if (NUNCA.test(m[1])) falla(G, mf, 0, `${a.key}: ${m[1]} no se pide (§3.6)`);
        else if (!ok.has(m[1])) falla(G, mf, 0, `${a.key}: ${m[1]} no lo usa esta app`);
      }
      const pl = `apps/mobile/ios/Targets/${a.target}/Info.plist`, p = existsSync(pl) ? readFileSync(pl, "utf8") : "";
      if (/NSMicrophoneUsageDescription|NSPhotoLibraryUsageDescription|NSContactsUsageDescription|NSLocationAlwaysAndWhenInUseUsageDescription|NSLocationAlwaysUsageDescription|NSBluetooth/.test(p)) falla(G, pl, 0, `${a.key}: un permiso que ninguna app usa (micrófono, galería entera, contactos, ubicación siempre, Bluetooth)`);
      if (/UIBackgroundModes/.test(p) && !(a.key === "delivery" && a.permisos.ubicacion === "entrega")) falla(G, pl, 0, `${a.key}: modo de fondo solo para el Repartidor con entrega (8e)`);
      // 8e · El modo de fondo del Repartidor es SOLO «location» (nada de audio, fetch, voip…); la ruta (TLRuta) y su servicio, solo ahí.
      const modos = /<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(p)?.[1] ?? "";
      for (const m of modos.matchAll(/<string>([^<]+)<\/string>/g)) if (m[1] !== "location") falla(G, pl, 0, `${a.key}: modo de fondo «${m[1]}» no se pide (solo «location» para la entrega)`);
      if (entrega && !/<string>location<\/string>/.test(modos)) falla(G, pl, 0, `${a.key}: la entrega con la pantalla apagada necesita UIBackgroundModes location`);
      if (a.plugins.includes("TLRuta") !== entrega) falla(G, J, 0, `${a.key}: TLRuta solo en la app con ubicación «entrega» (Repartidor)`);
      if (/TLRutaServicio|foregroundServiceType/.test(t) !== entrega) falla(G, mf, 0, `${a.key}: el servicio de ubicación en primer plano solo en el Repartidor`);
      if (entrega && !/<service android:name="com\.tolatino\.plugins\.TLRutaServicio" android:exported="false" android:foregroundServiceType="location" \/>/.test(t)) falla(G, mf, 0, `${a.key}: TLRutaServicio no exportado y de tipo «location» (y nada más)`);
      if (!a.permisos.camara && /NSCameraUsageDescription/.test(p)) falla(G, pl, 0, `${a.key}: cámara sin usarla`);
    }
  },

  /* 8a · La señal no se da por hecha (11 nov: en el emulador en modo avión la isla del Repartidor decía «Hay señal» y ofrecía «Abrir el
     Repartidor»). En Android navigator.onLine solo dice la verdad si la app le cuenta la red a la WebView: la cáscara pide ACCESS_NETWORK_STATE
     (los cuatro sabores), sigue la red por defecto y llama setNetworkAvailable, y suelta el escucha al cerrar. En la web nadie lee
     navigator.onLine ni escucha online/offline fuera de lib/nativo/senal.ts, y una pantalla que ofrece «hay señal» lo confirma contra nuestro
     servidor (haySenal/useSenal), nunca con el teléfono solo. El humo de Android lo comprueba en el emulador. Al revés: leer navigator.onLine
     en una isla, quitar setNetworkAvailable o el registro del escucha, o quitar el permiso de apps.json → falla. */
  senalHonesta() {
    const G = "senalHonesta", S = "apps/web/lib/nativo/senal.ts";
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?|mjs)$/.test(f) || f === S) continue;
      const t = sinComent(f);
      if (/\bnavigator\.onLine\b|\bon(online|offline)\s*=/.test(t)) falla(G, f, 0, "navigator.onLine solo en lib/nativo/senal.ts (sinRed / haySenal / useSenal): en la app no prueba que el servidor responda");
      if (/addEventListener\(\s*["'](online|offline)["']/.test(t)) falla(G, f, 0, "los avisos online/offline se escuchan con alCambiarRed (lib/nativo/senal.ts)");
    }
    if (!existsSync(S)) return falla(G, S, 0, "falta la señal compartida");
    const s = sinComent(S);
    if (!/method: "HEAD"/.test(s) || !/signal: ab\.signal/.test(s) || !/setTimeout\(\(\) => ab\.abort\(\)/.test(s) || !/urlServidor\(/.test(s)) falla(G, S, 0, "haySenal prueba NUESTRO servidor (urlServidor), con HEAD y tiempo límite");
    // Las islas que ofrecen «hay señal» lo confirman contra el servidor.
    for (const [f, re] of [["apps/web/app/repartidor/sin-conexion/SinSenalRep.tsx", /useSenal\(\)/], ["apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts", /haySenal\(\)/]]) {
      if (existsSync(f) && !re.test(sinComent(f))) falla(G, f, 0, "«hay señal» se confirma con nuestro servidor (lib/nativo/senal.ts), no con el teléfono");
    }
    const U = "apps/web/app/(puerta)/puerta/sin-conexion/usePuertaLocal.ts";
    if (existsSync(U) && !/if \(enIsla\(\)\) return null;/.test(cuerpoFn(sinComent(U), "post"))) falla(G, U, 0, "desde la isla no se manda nada a un /api relativo (cae en el origen local y su 404 parecía señal)");
    // Android: la cáscara le cuenta la red a la WebView.
    const J = "apps/mobile/apps.json", D = "apps/mobile/android/app/src/main/java/com/tolatino/cascara";
    const A = existsSync(J) ? JSON.parse(readFileSync(J, "utf8")) : { apps: [] };
    if (!(A.androidComun ?? []).includes("android.permission.ACCESS_NETWORK_STATE")) falla(G, J, 0, "androidComun pide ACCESS_NETWORK_STATE (sin él la WebView no sabe si hay red)");
    for (const a of A.apps) {
      const mf = `apps/mobile/android/app/src/${a.sabor}/AndroidManifest.xml`;
      if (!existsSync(mf) || !readFileSync(mf, "utf8").includes('<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />')) falla(G, mf, 0, `${a.key}: sin ACCESS_NETWORK_STATE la WebView no sabe si hay red`);
    }
    const sinJ = (f) => (existsSync(f) ? readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "") : "");
    const R = `${D}/RedWebView.java`, M = `${D}/MainActivity.java`, r = sinJ(R), m = sinJ(M);
    if (!/\.setNetworkAvailable\(/.test(r)) falla(G, R, 0, "la red se le cuenta a la WebView (setNetworkAvailable)");
    if (!/registerDefaultNetworkCallback\([^;]*Looper\.getMainLooper\(\)/.test(r)) falla(G, R, 0, "se sigue la red por defecto, en el hilo principal (registerDefaultNetworkCallback con el Looper principal)");
    if (!/unregisterNetworkCallback\(/.test(r)) falla(G, R, 0, "el escucha de la red se suelta al cerrar");
    if (!/void onLost\(/.test(r) || !/void onCapabilitiesChanged\(/.test(r) || !/NET_CAPABILITY_INTERNET/.test(r)) falla(G, R, 0, "sin red al perderla (onLost) y con red solo si dice INTERNET (onCapabilitiesChanged)");
    if (!/new RedWebView\(this, \w+\)/.test(m) || !/\.empezar\(\)/.test(cuerpoJava(m, "onCreate")) || !/\.parar\(\)/.test(cuerpoJava(m, "onDestroy"))) falla(G, M, 0, "MainActivity empieza RedWebView en onCreate y lo para en onDestroy");
    const H = "apps/mobile/scripts/humo-android.sh", h = existsSync(H) ? readFileSync(H, "utf8") : "";
    if (!/navigator\.onLine/.test(h) || !/Hay señal\\\|There is signal/.test(h)) falla(G, H, 0, "el humo de Android comprueba en modo avión que la página dice sin red y que la isla no dice «Hay señal»");
  },

  /* 8a · Sin rastreo (§3.6, ATT): ningún SDK de anuncios ni de analítica de terceros, nada de IDFA / AdSupport / AppTrackingTransparency ni del
     id de anuncios de Android; cada target declara NSPrivacyTracking false y ningún dominio de rastreo. La web tampoco carga analítica ajena.
     Al revés: sumar NSUserTrackingUsageDescription, AD_ID o un dominio de rastreo → falla. */
  sinRastreo() {
    const G = "sinRastreo";
    const MAL = /NSUserTrackingUsageDescription|AppTrackingTransparency|ATTrackingManager|AdSupport|ASIdentifierManager|advertisingIdentifier|com\.google\.android\.gms\.permission\.AD_ID|play-services-ads|firebase-analytics|FirebaseAnalytics|FBSDK|facebook-android-sdk|googletagmanager|google-analytics\.com|connect\.facebook\.net|\bgtag\(|\bfbq\(/;
    for (const f of archivos) {
      if (!/^apps\/(mobile|web)\//.test(f) || /\.(png|jpe?g|webp|ico|jar|woff2?)$/.test(f) || f.includes("/node_modules/")) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (MAL.test(l) && !/^\s*(\/\/|\/\*|\*|#|<!--)/.test(l)) falla(G, f, i + 1, "rastreo o anuncios de terceros: To'Latino no rastrea (sin ATT porque no hay nada que pedir)"); });
    }
    const J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    for (const a of JSON.parse(readFileSync(J, "utf8")).apps) {
      const f = `apps/mobile/ios/Targets/${a.target}/PrivacyInfo.xcprivacy`, t = existsSync(f) ? readFileSync(f, "utf8") : "";
      if (!/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(t)) falla(G, f, 0, `${a.key}: NSPrivacyTracking false`);
      if (!/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/.test(t)) falla(G, f, 0, `${a.key}: ningún dominio de rastreo`);
    }
  },

  /* 8a · Dentro de una cáscara no hay «Instala la app» ni «Agregar a la pantalla de inicio» (§3.1): toda pantalla que lo ofrezca lo esconde con
     esApp() del puente. Al revés: un aviso de instalar sin esa revisión → falla. */
  sinAvisoWebEnApp() {
    const G = "sinAvisoWebEnApp";
    const AVISO = /beforeinstallprompt|pantalla de inicio|instala(r)? (la )?app\b|add to home screen|install (the )?app\b/i;
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?)$/.test(f)) continue;
      const t = sinComent(f);
      if (AVISO.test(t) && !/\besApp\(\)/.test(t)) falla(G, f, 0, "un aviso para instalar la app se esconde dentro de la cáscara (if (esApp()) …)");
    }
  },

  /* 8a · Las islas sin señal (§3.1): cada isla de apps.json (y la página local «Sin señal») es una página estática (force-static) que no toca el
     servidor (ni la base, ni cookies ni cabeceras), guarda y lee SOLO por lib/nativo/almacen.ts (nadie más abre IndexedDB), vuelve al servidor
     con irAlServidor() (desde la isla, «/» no es el servidor), se copia con scripts/islas.mjs (que lee la lista de apps.json) y el CI de las
     cáscaras corre cuando cambia. Al revés: quitar force-static, abrir IndexedDB fuera del almacén o un `location.href = "/…"` en una isla → falla. */
  islaCoherente() {
    const G = "islaCoherente", J = "apps/mobile/apps.json";
    if (!existsSync(J)) return;
    const A = JSON.parse(readFileSync(J, "utf8")), islas = ["/app/sin-senal", ...new Set(A.apps.flatMap((a) => a.islas))];
    const pagina = (r) => archivos.find((f) => { const m = /^apps\/web\/app\/(.*)page\.tsx$/.exec(f); return m && "/" + m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/") === r; });
    const WF = ".github/workflows/cascaras.yml", wf = existsSync(WF) ? readFileSync(WF, "utf8") : "";
    for (const r of islas) {
      const p = pagina(r);
      if (!p) { falla(G, J, 0, `la isla ${r} no tiene página`); continue; }
      if (!/export const dynamic = "force-static";/.test(readFileSync(p, "utf8"))) falla(G, p, 0, `${r} es estática (force-static): abre sin servidor`);
      const dir = p.slice(0, p.lastIndexOf("/"));
      for (const f of archivos.filter((x) => x.startsWith(dir + "/") && /\.tsx?$/.test(x) && !x.slice(dir.length + 1).includes("/"))) {
        const t = sinComent(f);
        if (/from ["'](server-only|next\/headers|@\/lib\/db)["']|\bdb\(\)/.test(t)) falla(G, f, 0, `la isla ${r} no toca el servidor (ni la base ni cabeceras)`);
        if (/location\.(href|assign|replace)\s*(=|\()\s*["'`]\/(?!.*\.html)/.test(t)) falla(G, f, 0, `desde la isla, «/…» no es el servidor: usa irAlServidor()`);
      }
      const ruta = `"apps/web/app/${dir.replace(/^apps\/web\/app\//, "")}/**"`, [push, pr] = wf.split(/\n  pull_request:\n/);
      if (!push?.includes(ruta) || !pr?.split(/\n  workflow_dispatch:/)[0]?.includes(ruta)) falla(G, WF, 0, `el CI de las cáscaras corre cuando cambia la isla ${r} (en push y en pull_request)`);
    }
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== "apps/web/lib/nativo/almacen.ts" && /\bindexedDB\./.test(sinComent(f))) falla(G, f, 0, "lo que se guarda para sin señal va por lib/nativo/almacen.ts (IndexedDB en la web, TLLocal en la app)");
    const IS = "apps/mobile/scripts/islas.mjs";
    if (!existsSync(IS) || !/A\.apps\.flatMap\(\(a\) => a\.islas\)/.test(readFileSync(IS, "utf8"))) falla(G, IS, 0, "las islas que se copian salen de apps.json");
    // 11 nov: en Android, con server.url, Capacitor solo deja navegar dentro al servidor; ir a la isla (https://localhost/…) abría el navegador
    // y el humo no lo notaba (aceptaba «Sin señal» en cualquier página). El filtro nativo abre el origen local dentro; el humo exige la URL.
    const TA = "apps/mobile/plugins/tl-alcance/android/com/tolatino/plugins/TLAlcancePlugin.java";
    if (!existsSync(TA) || !/if \(url != null && url\.getHost\(\) != null && esLocal\(url\)\) return false;/.test(sinComent(TA))) falla(G, TA, 0, "el origen local (las islas) se abre dentro de la cáscara, no en el navegador");
    const HA = "apps/mobile/scripts/humo-android.sh", ha = existsSync(HA) ? readFileSync(HA, "utf8") : "";
    if (!ha.includes(`grep -q "\\"url\\":\\"https://localhost$isla.html\\""`)) falla(G, HA, 0, "el humo comprueba que la isla de verdad se abrió (su URL), no solo un «Sin señal»");
    if (!ha.includes(`"$(cat "$DIR/humo/local.js")"`) || !/origen_local "\$s" "página local"/.test(ha) || !/origen_local "\$s" "isla"/.test(ha) || !/a\.plugins\.includes\("TLLocal"\)/.test(ha)) falla(G, HA, 0, "el humo comprueba que la página local y la isla se hidratan y tienen TLLocal sin red");
    // Con server.url, Capacitor no sirve del paquete más que la página de error ni inyecta su JS en el origen local: lo hace MainActivity.
    const MA = "apps/mobile/android/app/src/main/java/com/tolatino/cascara/MainActivity.java", ma = existsSync(MA) ? sinComent(MA) : "";
    if (!/new WebViewAssetLoader\.Builder\(\)[\s\S]*assets\.handle\("public\/"/.test(ma) || !/b\.setWebViewClient\(new BridgeWebViewClient\(b\)/.test(ma)) falla(G, MA, 0, "el origen local (https://localhost) se sirve entero desde assets/public, sin red");
    if (!/addDocumentStartJavaScript\(w, [^;]*Collections\.singleton\(b\.getScheme\(\) \+ ":\/\/" \+ host\)\)/.test(ma)) falla(G, MA, 0, "el JS de Capacitor se inyecta también en el origen local (y solo ahí), para que la isla use TLLocal");
  },

  /* 8a · Ninguna llave en el repo (es PÚBLICO) ni en GitHub (§3.5): ni archivos de llaves (.p8, .p12, .jks, .keystore, .mobileprovision,
     AuthKey_*, google-services.json), ni JSON con private_key, ni `secrets.*` / pull_request_target en el flujo de las cáscaras. El llavero
     guarda el sobre cifrado y solo lib/tiendas/llavero.ts lo toca; ninguna pantalla ni respuesta lleva el contenido; leer queda anotado
     (store_secret_reads, solo inserción) y una llave no se borra. Al revés: subir un .p8 de prueba al repo, `select blob_enc` en una pantalla
     o devolver el archivo en la respuesta → falla. */
  llavesFueraDelRepo() {
    const G = "llavesFueraDelRepo";
    for (const f of archivos) {
      if (/\.(p8|p12|jks|keystore|mobileprovision|pfx)$/i.test(f) || /(^|\/)(AuthKey_[A-Z0-9]+\.p8|google-services\.json|GoogleService-Info\.plist)$/.test(f)) falla(G, f, 0, "un archivo de llave en el repo (va cifrado en el llavero del servidor)");
      // 8h · Ni una llave de App Store Connect con otra extensión, ni un almacén con otro nombre (AuthKey_*, *.keystore.*, upload-keystore*).
      if (/(^|\/)AuthKey_[^/]*$/.test(f) || /(^|\/)[^/]*\.(keystore|jks)\.[a-z0-9]+$/i.test(f) || /(^|\/)(upload|subida)[-_]?(keystore|key)\.[a-z0-9]+$/i.test(f)) falla(G, f, 0, "un archivo de llave en el repo (va cifrado en el llavero del servidor)");
      // 8g · Ni certificados ni solicitudes ni pases firmados (el del Pass Type ID y su cadena viven en el llavero; los de prueba se hacen al vuelo).
      if (/\.(cer|crt|der|pem|key|csr|certSigningRequest|pkpass)$/i.test(f)) falla(G, f, 0, "un certificado, una llave o un pase firmado en el repo (el repo es público)");
      if (/\.(tsx?|jsx?|mjs|cjs|json|md|sql|sh|ya?ml|txt)$/.test(f) && !f.includes("node_modules") && f !== "guardianes/run.mjs") { const t = readFileSync(f, "utf8"); if (/-----BEGIN (CERTIFICATE|PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY|CERTIFICATE REQUEST)-----\r?\n[A-Za-z0-9+/=]{40,}/.test(t)) falla(G, f, 0, "un certificado o una llave en PEM dentro de un archivo del repo"); }
      if (/\.json$/.test(f) && !f.includes("node_modules")) { const t = readFileSync(f, "utf8"); if (/"private_key"\s*:\s*"(-----BEGIN|[A-Za-z0-9+/=\\n]{200,})/.test(t)) falla(G, f, 0, "una cuenta de servicio con su llave privada en el repo"); }
    }
    for (const g of ["apps/mobile/.gitignore", "apps/mobile/android/.gitignore", "apps/mobile/ios/.gitignore"]) if (!existsSync(g)) falla(G, g, 0, "falta el .gitignore que deja fuera las llaves");
    const gi = ["apps/mobile/android/.gitignore", "apps/mobile/ios/.gitignore"].map((g) => (existsSync(g) ? readFileSync(g, "utf8") : "")).join("\n");
    for (const x of ["*.jks", "*.keystore", "*.p12", "*.p8", "google-services.json", "GoogleService-Info.plist", "*.mobileprovision"]) if (!gi.includes(x)) falla(G, "apps/mobile", 0, `el .gitignore deja fuera ${x}`);
    for (const f of archivos.filter((x) => /^\.github\/workflows\/.*\.ya?ml$/.test(x))) {
      const t = readFileSync(f, "utf8");
      if (/pull_request_target/.test(t)) falla(G, f, 0, "pull_request_target le da secretos a un PR ajeno: no se usa");
      if (/cascaras|tiendas/.test(f) && /\bsecrets\.|\bsecrets\[/.test(t)) falla(G, f, 0, "las cáscaras y las tiendas no usan secretos de GitHub: las llaves viven en el llavero (OIDC, 8h)");
    }
    // 8h · El flujo de las tiendas: solo push a pruebas y workflow_dispatch (nunca un PR), id-token solo en los jobs del entorno «tiendas», sin
    // credenciales de git guardadas, y las llaves en un directorio temporal que se borra con if: always() (ningún artefacto las lleva).
    const TY = ".github/workflows/tiendas.yml";
    if (existsSync(TY)) {
      const t = readFileSync(TY, "utf8"), on = (/\non:\n([\s\S]*?)\n(?:permissions|concurrency|jobs):/.exec(t) ?? [])[1] ?? "";
      if (/\bpull_request|\bissue_comment|\bworkflow_run|\bschedule|\brepository_dispatch/.test(on) || !/\n  push:\n    branches: \[pruebas\]\n/.test("\n" + on + "\n") || !/\n  workflow_dispatch:/.test("\n" + on)) falla(G, TY, 0, "el flujo de las tiendas corre SOLO con push a pruebas o workflow_dispatch");
      const top = (/\npermissions:\n((?:  .*\n)+)/.exec(t) ?? [])[1] ?? "";
      if (!/^  contents: read\n$/.test(top)) falla(G, TY, 0, "los permisos de arriba son solo contents: read (id-token, en cada job del entorno tiendas)");
      for (const j of t.split(/\n  (?=[a-z][\w-]*:\n    name:)/).slice(1)) {
        const nombre = j.slice(0, j.indexOf(":"));
        if (/id-token: write/.test(j) && !/\n    environment: tiendas\n/.test(j)) falla(G, TY, 0, `el job «${nombre}» pide id-token sin el entorno tiendas`);
        if (/uses: actions\/checkout/.test(j) && (j.match(/uses: actions\/checkout@v\d+\n        with: \{ persist-credentials: false \}/g) ?? []).length !== (j.match(/uses: actions\/checkout/g) ?? []).length) falla(G, TY, 0, `el job «${nombre}» deja las credenciales de git (persist-credentials: false)`);
        if (/ci\.mjs llaves/.test(j) && !/- name: Borrar las llaves[^\n]*\n        if: always\(\)\n        run: [|]?[\s\S]{0,400}rm -rf -- "\$LLAVES"/.test(j)) falla(G, TY, 0, `el job «${nombre}» no borra las llaves con if: always()`);
        if (/upload-artifact[\s\S]{0,200}(LLAVES|tl-llaves|\.p8|\.p12|keychain)/.test(j)) falla(G, TY, 0, `el job «${nombre}» sube las llaves como artefacto`);
      }
      if (/RUNNER_TEMP\/tl-llaves/.test(t) === false) falla(G, TY, 0, "las llaves van en el directorio temporal del runner");
    }
    const CI = "scripts/tiendas/ci.mjs";
    if (existsSync(CI)) {
      const t = readFileSync(CI, "utf8");
      if (!/if \(!BASE\.startsWith\("https:\/\/"\)\) falla\(/.test(cuerpoFn(t, "pedir"))) falla(G, CI, 0, "el CI manda su token SOLO por https");
      if (!/console\.log\(`::add-mask::\$\{j\.value\}`\)/.test(cuerpoFn(t, "token"))) falla(G, CI, 0, "el token OIDC se enmascara en el log");
      t.split("\n").forEach((l, i) => { if (/console\.(log|error)\(/.test(l) && /\b(l\.archivo|j\.llaves|j\.value|l\.clave)\b/.test(l) && !/::add-mask::/.test(l)) falla(G, CI, i + 1, "una llave o el token en el log del CI"); });
    }
    const LL = "apps/web/lib/tiendas/llavero.ts";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === LL) continue;
      const t = sinComent(f);
      if (/\bblob_enc\b/.test(t)) falla(G, f, 0, "el sobre de una llave solo lo toca lib/tiendas/llavero.ts");
      if (/from ["']@\/lib\/tiendas\/llavero["']/.test(t) && /\bleer\b[,} ]/.test((/import \{([^}]*)\} from ["']@\/lib\/tiendas\/llavero["']/.exec(t) ?? [])[1] ?? "")) falla(G, f, 0, "leer() del llavero es solo del servidor de tiendas (8h), nunca de una pantalla");
      // 8h · Quién abre un sobre: el programa beta, la tubería, el push y Wallet (servidor). Ninguna ruta ni pantalla. 8i: las fichas (subir como
      // borrador con la llave de la API de Apple y la cuenta de servicio de Play) y «Lo que te toca» (¿existen las apps en App Store Connect?).
      const imp = (/import \{([^}]*)\} from ["'](?:\.{1,2}\/)+(?:lib\/)?tiendas\/llavero["']|import \{([^}]*)\} from ["']\.\/llavero["']/.exec(t) ?? []);
      if (/\bleer\b/.test((imp[1] ?? "") + (imp[2] ?? "")) && !/^apps\/web\/lib\/(beta|tiendas\/tuberia|tiendas\/fichas|tiendas\/paquete|push\/llaves|pases\/[a-z-]+)\.ts$/.test(f)) falla(G, f, 0, "leer() del llavero solo desde lib/beta, lib/tiendas/tuberia, lib/tiendas/fichas, lib/tiendas/paquete, lib/push/llaves y lib/pases");
    }
    if (existsSync(LL)) {
      const t = sinComent(LL), l = cuerpoFn(t, "listar");
      if (/\bs\.\*|\bblob_enc\b/.test(l)) falla(G, LL, 0, "listar() nombra sus columnas: el sobre nunca sale");
      if (!/insert into store_secret_reads/.test(cuerpoFn(t, "leer"))) falla(G, LL, 0, "cada lectura de una llave queda anotada");
      if (!/LLAVERO_SECRET|DATOS_SECRET/.test(t) || /randomBytes\(32\)\.toString\("hex"\)\s*;?\s*\/\/\s*llave/.test(t)) falla(G, LL, 0, "la llave del llavero sale de los secretos del entorno");
    }
    const R = "apps/web/app/api/admin/llavero/route.ts";
    if (existsSync(R)) {
      const t = sinComent(R);
      if (/\b(b|archivo|contenido)\.toString\(|NextResponse\.json\([^)]*\b(b|contenido)\b/.test(t)) falla(G, R, 0, "la respuesta dice la huella, nunca el contenido del archivo");
      if (!/s\.role !== "admin"/.test(t) || !/consumirCodigo\(c, s\.phone, "llavero"/.test(t)) falla(G, R, 0, "subir una llave: solo un Admin y con el código otra vez");
    }
    const M = "packages/db/migrations/0125_apps_base.sql";
    if (existsSync(M)) {
      if (!/raise exception 'store_secret_reads es solo de inserción'/.test(ultimaFn("store_secret_reads_antes"))) falla(G, M, 0, "store_secret_reads es de solo inserción (trigger)");
      if (!/raise exception 'una llave del llavero no se borra/.test(ultimaFn("store_secrets_antes"))) falla(G, M, 0, "una llave no se borra: se retira");
    }
  },

  /* ── 8c · Avisos push propios (fase8-apps.md §4 8c). Cada guardián vigila una clase y se prueba al revés (alreves8c). ── */

  /* 8c · No hay push sin plantilla: la cola solo se llena desde un aviso YA guardado (notifications, con su plantilla), en lib/push/cola.ts y en
     una sola sentencia que une notifications y notif_templates; los proveedores (Web Push, APNs, FCM) solo los llama el trabajador; la prueba
     del Super Admin pasa por avisar() con su plantilla. Al revés: un insert en push_outbox en otro archivo o sin unir el aviso, o llamar a
     enviarApns() desde otra parte → falla. */
  pushConPlantilla() {
    const G = "pushConPlantilla", C = "apps/web/lib/push/cola.ts", A = "apps/web/lib/push/admin.ts", M = "packages/db/migrations/0126_push.sql";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      if (/insert into push_outbox/.test(t) && f !== C) falla(G, f, 0, "solo lib/push/cola.ts encola un push (desde un aviso guardado)");
      if (/\b(enviarWebPush|enviarApns|enviarFcm)\(/.test(t) && !/^apps\/web\/lib\/push\/(cola|webpush|apns|fcm)\.ts$/.test(f)) falla(G, f, 0, "solo el trabajador (lib/push/cola.ts) llama a los proveedores de push");
    }
    if (!existsSync(C)) return falla(G, C, 0, "falta lib/push/cola.ts");
    const e = cuerpoFn(sinComent(C), "encolar");
    if (!/insert into push_outbox[\s\S]*join notifications n on n\.id = x\.nid join notif_templates tp on tp\.key = n\.tpl/.test(e)) falla(G, C, 0, "encolar() parte del aviso guardado y su plantilla");
    if (existsSync(A) && !/await avisar\(s\.id, "push_prueba"/.test(cuerpoFn(sinComent(A), "pushPrueba"))) falla(G, A, 0, "la prueba del Super Admin pasa por avisar() con la plantilla push_prueba");
    if (existsSync(M) && !/create table if not exists push_outbox \(\s*id\s+bigint generated always as identity primary key,\s*notification_id bigint not null references notifications \(id\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "push_outbox.notification_id es obligatorio");
  },

  /* 8c · Lo sensible no pasa con su texto por Apple, Google ni el navegador (§1c): Salud, Niños, Soporte, moderación y sanciones, cuenta → «Tienes
     un aviso nuevo en To'Latino.». La base lo impone (check + trigger), la cola arma el contenido con el genérico cuando la plantilla es privada
     y el Super Admin no lo puede destapar. Al revés: quitar el genérico de cargaDe, el check de 0126 o el candado de plantillaPush → falla. */
  pushPrivadoSinTexto() {
    const G = "pushPrivadoSinTexto", C = "apps/web/lib/push/cola.ts", M = "packages/db/migrations/0126_push.sql", AC = "apps/web/app/admin/acciones-notif.ts";
    const t = existsSync(C) ? sinComent(C) : "";
    if (!/es: \{ t: "To'Latino", b: "Tienes un aviso nuevo en To'Latino\." \}, en: \{ t: "To'Latino", b: "You have a new notice in To'Latino\." \}/.test(t)) falla(G, C, 0, "el texto genérico es el de §1c (ES/EN)");
    if (!/export const cargaDe = \(x[^)]*\) =>\s*JSON\.stringify\(x\.priv \? GENERICO\[/.test(t)) falla(G, C, 0, "cargaDe(): una plantilla privada lleva solo el genérico");
    if (!/t\.push_private as priv/.test(cuerpoFn(t, "encolar"))) falla(G, C, 0, "encolar() lee push_private de la plantilla");
    const m = existsSync(M) ? readFileSync(M, "utf8") : "";
    if (!/check \(push_private or not \(key ~ '\^\(sal_\|biz_sal_\|nin_\|ninos_\|cuenta_\)' or grp in \('support', 'mod'\)\)\)/.test(m)) falla(G, M, 0, "la base no deja destapar Salud, Niños, cuenta, Soporte ni moderación");
    if (!/if new\.key ~ '\^\(sal_\|biz_sal_\|nin_\|ninos_\|cuenta_\)' or new\.grp in \('support', 'mod'\) then new\.push_private := true; end if;/.test(m)) falla(G, M, 0, "una plantilla sensible nueva nace privada (trigger)");
    if (existsSync(AC) && !/if \(campo === "priv" && p\.fija && valor !== "si"\) return/.test(sinComent(AC))) falla(G, AC, 0, "plantillaPush no destapa una plantilla sensible");
  },

  /* 8c · Push primero, SMS de respaldo (§3.3): «siempre» solo el grupo crit (la base lo impone); «sin_push» espera al push («respaldo») y solo sale si
     el push no llegó, reclamándolo UNA vez; el push que llega lo deja «ahorrado». Al revés: mandar el SMS en línea con push pendiente, soltar el
     respaldo sin reclamar el estado o permitir «siempre» fuera de crit → falla. */
  smsSoloRespaldo() {
    const G = "smsSoloRespaldo", A = "apps/web/lib/avisos.ts", C = "apps/web/lib/push/cola.ts", M = "packages/db/migrations/0126_push.sql";
    const a = existsSync(A) ? cuerpoFn(sinComent(A), "avisar") : "";
    if (!/const st = pst === "pendiente" && r\.sms_mode === "sin_push" && \(st1 === "pendiente" \|\| st1 === "pruebas"\) \? "respaldo" : st1;/.test(a)) falla(G, A, 0, "avisar(): con push en camino, el SMS de una plantilla sin_push queda «respaldo»");
    // 9l · El SMS sale por el único camino (salirSms → lib/sms) y en línea solo el «pendiente» (o el del simulador «pruebas»), nunca el de respaldo.
    if (!/if \(st === "pendiente" \|\| st === "pruebas"\) await salirSms\("notifications", id,/.test(a) || /salirSms\([^;]*st1|smsTelnyx\(|fetch\(/.test(a)) falla(G, A, 0, "avisar() solo manda en línea el SMS «pendiente» (nunca el de respaldo)");
    const r = existsSync(A) ? cuerpoFn(sinComent(A), "smsRespaldo") : "";
    if (!/where n\.id = \$1::bigint and n\.sms_status = 'respaldo'/.test(r)) falla(G, A, 0, "smsRespaldo() reclama el estado «respaldo» en la misma escritura (una vez)");
    const v = existsSync(C) ? cuerpoFn(sinComent(C), "resolver") : "";
    if (!/sms_status = case when r\.ok and n\.sms_status = 'respaldo' then 'ahorrado'/.test(v) || !/if \(!r\.ok && r\.sms === "respaldo"\)/.test(v)) falla(G, C, 0, "resolver(): push que llegó → «ahorrado»; solo si no llegó sale el respaldo");
    if (existsSync(M) && !/check \(sms_mode in \('siempre', 'sin_push', 'nunca'\) and \(sms_mode <> 'siempre' or grp = 'crit'\)\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "«siempre» solo para el grupo crit");
  },

  /* 8c · Ningún push sale dentro de una transacción (§4 8c «pushFueraDeTx»): encolar, el empujón, el trabajador y los proveedores van DESPUÉS del
     commit (una red lenta no puede tener filas tomadas ni dejar un aviso que se deshace con su push ya mandado). Al revés: llamar a encolar() o
     enviarPendientes() dentro de tx(…) o entre begin y commit → falla. */
  pushFueraDeTx() {
    const G = "pushFueraDeTx", RED = /\b(encolar|pronto|enviarPendientes|barrerPush|enviarWebPush|enviarApns|enviarFcm|smsRespaldo)\(/;
    const tramo = (t, i) => { let d = 0; for (let j = t.indexOf("{", i); j < t.length; j++) { if (t[j] === "{") d++; else if (t[j] === "}" && --d === 0) return t.slice(i, j); } return t.slice(i); };
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/\btx\(async \(?[^)=]*\)?(?:: [^=]+)? => \{/g)) if (RED.test(tramo(t, m.index))) falla(G, f, 0, "un push (o su SMS de respaldo) dentro de tx(…): va después del commit");
      for (const m of t.matchAll(/\.query\(["']begin["']\)/g)) { const fin = t.indexOf('query("commit")', m.index); if (fin > 0 && RED.test(t.slice(m.index, fin))) falla(G, f, 0, "un push entre begin y commit: va después del commit"); }
    }
  },

  /* 8c · Los tokens de push nunca en claro (§2 push_tokens): solo lib/push/tokens.ts escribe push_tokens, con el token cifrado (cifrar) y su
     huella (huella); solo el trabajador lo descifra; ninguna pantalla ni el Super Admin lee token_enc ni las llaves de Web Push (el 360° muestra los
     últimos 6 de la huella). Al revés: guardar el token tal cual, leer token_enc en lib/push/admin.ts o una pantalla → falla. */
  tokensCifrados() {
    const G = "tokensCifrados", T = "apps/web/lib/push/tokens.ts", M = "packages/db/migrations/0126_push.sql";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      if (/insert into push_tokens/.test(t) && f !== T) falla(G, f, 0, "solo lib/push/tokens.ts registra un token");
      if (/\b(token_enc|webpush_keys_enc)\b/.test(t) && !/^apps\/web\/lib\/push\/(tokens|cola)\.ts$/.test(f)) falla(G, f, 0, "el token cifrado solo lo tocan lib/push/tokens.ts (guardar) y lib/push/cola.ts (mandar)");
    }
    if (!existsSync(T)) return falla(G, T, 0, "falta lib/push/tokens.ts");
    const r = cuerpoFn(sinComent(T), "registrar");
    if (!/const tok = [^\n]*, h = huella\(`push:\$\{p\}:\$\{tok\}`\)/.test(r) || !/\[userId, ses\.id, ses\.city, app, ses\.platform, p, cifrar\(tok\), h, p === "webpush" \? cifrar\(JSON\.stringify\(\{ p256dh: r\.p256dh, auth: r\.auth \}\)\) : null/.test(r)) falla(G, T, 0, "registrar() guarda el token y sus llaves cifrados y busca por la huella");
    if (/\bt\.token_hash\b/.test(cuerpoFn(sinComent(T), "misDispositivos"))) falla(G, T, 0, "misDispositivos() no devuelve la huella del token");
    if (existsSync(M) && !/token_hash\s+text not null check \(token_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "token_hash es una huella hex de 64");
    // 8g · El token de push de un teléfono de Wallet: cifrado y con su huella; solo lib/pases/pases.ts lo guarda y lo abre para mandar el aviso.
    const PW = "apps/web/lib/pases/pases.ts", MW = "packages/db/migrations/0129_pases_wallet.sql";
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== PW && /\bpush_token_enc\b/.test(sinComent(f))) falla(G, f, 0, "el token de un teléfono de Wallet solo lo toca lib/pases/pases.ts");
    if (existsSync(PW) && !/cifrar\(token\.toLowerCase\(\)\), h\]/.test(cuerpoFn(sinComent(PW), "registrar"))) falla(G, PW, 0, "el token de push de Wallet se guarda cifrado, con su huella");
    if (existsSync(MW) && !/push_token_enc\s+bytea not null/.test(readFileSync(MW, "utf8"))) falla(G, MW, 0, "pass_devices guarda el token cifrado (bytea)");
  },

  /* 8c · El servidor solo le escribe a un servicio de push conocido (SSRF): la dirección de Web Push la da el navegador, pero se revisa al registrar
     y al mandar (https, puerto 443, hosts de Apple, Google, Mozilla y Microsoft); los simuladores (PUSH_*) solo fuera de producción y solo en
     localhost; FCM nunca usa el token_uri del archivo subido. Al revés: aceptar http, un host cualquiera, leer PUSH_WEB_HOSTS en producción o
     usar sa.token_uri → falla. */
  pushSoloServiciosConocidos() {
    const G = "pushSoloServiciosConocidos", W = "apps/web/lib/push/webpush.ts", L = "apps/web/lib/push/llaves.ts", T = "apps/web/lib/push/tokens.ts";
    const w = existsSync(W) ? sinComent(W) : "", p = cuerpoFn(w, "endpointPermitido");
    if (!/return u\.protocol === "https:" && \(u\.port === "" \|\| u\.port === "443"\) && HOSTS\.some/.test(p) || !/u\.username \|\| u\.password/.test(p)) falla(G, W, 0, "endpointPermitido(): https, 443, sin credenciales y solo hosts conocidos");
    if (/HOSTS = \[[^\]]*(\.\*|\\S\+|\[\^)/.test(w)) falla(G, W, 0, "la lista de servicios de push no acepta cualquier host");
    if (!/if \(!endpointPermitido\(s\.endpoint, o\.extra \?\? \[\]\)\) return/.test(cuerpoFn(w, "enviarWebPush"))) falla(G, W, 0, "enviarWebPush() revisa la dirección antes de llamar");
    if (existsSync(T) && !/if \(!endpointPermitido\(t, HOSTS_WEB_EXTRA\(\)\)\) return/.test(cuerpoFn(sinComent(T), "registrar"))) falla(G, T, 0, "registrar() revisa la dirección de Web Push");
    const l = existsSync(L) ? sinComent(L) : "";
    if (!/const env = \(k: string\) => \(PROD \? undefined : process\.env\[k\] \|\| undefined\);/.test(l) || /process\.env\.PUSH_/.test(l)) falla(G, L, 0, "los simuladores (PUSH_*) no se leen en producción");
    if (!/\^\(127\\\.0\\\.0\\\.1\|localhost\):\\d\{2,5\}\$/.test(l)) falla(G, L, 0, "PUSH_WEB_HOSTS solo acepta localhost");
    if (!/fcm = \{ \.\.\.j, token_uri: TOKEN_URI \}/.test(l)) falla(G, L, 0, "FCM nunca usa el token_uri del archivo subido");
    // 8g · Wallet: los simuladores (PASES_*) no se leen en producción y solo lib/pases/credenciales.ts los lee; el intermedio del certificado
    // se baja solo de Apple (o de localhost en pruebas); Google nunca usa el token_uri del archivo subido.
    const W8 = "apps/web/lib/pases/credenciales.ts", w8 = existsSync(W8) ? sinComent(W8) : "";
    if (!/const env = \(k: string\) => \(PROD \? undefined : process\.env\[k\] \|\| undefined\);/.test(w8) || /process\.env\.PASES_/.test(w8)) falla(G, W8, 0, "los simuladores de Wallet (PASES_*) no se leen en producción");
    if (!/\["certs\.apple\.com", "www\.apple\.com", \.\.\.\(env\("PASES_AIA_HOSTS"\)/.test(w8) || !/\^\(127\\\.0\\\.0\\\.1\|localhost\):\\d\{2,5\}\$/.test(w8)) falla(G, W8, 0, "el intermedio del certificado del pase se baja solo de Apple (o de localhost fuera de producción)");
    if (!/google = \{ sa: \{ \.\.\.j, token_uri: TOKEN_URI \}/.test(w8)) falla(G, W8, 0, "Google Wallet nunca usa el token_uri del archivo subido");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== W8 && /PASES_(APNS|GOOGLE|AIA)/.test(sinComent(f))) falla(G, f, 0, "solo lib/pases/credenciales.ts lee las direcciones de Wallet");
  },

  /* 8c · Un aviso nunca llega dos veces al mismo teléfono y su SMS de respaldo sale una vez: única (aviso, token) en la cola con «on conflict do
     nothing», el trabajador toma con «for update skip locked», el estado del aviso se resuelve una vez (push_status 'pendiente') y el respaldo se
     reclama. Al revés: quitar el unique, el on conflict o el skip locked → falla. */
  pushSinDuplicados() {
    const G = "pushSinDuplicados", M = "packages/db/migrations/0126_push.sql", C = "apps/web/lib/push/cola.ts";
    const m = existsSync(M) ? readFileSync(M, "utf8") : "", c = existsSync(C) ? sinComent(C) : "";
    if (!/create table if not exists push_outbox \([\s\S]*?unique \(notification_id, token_id\)/.test(m)) falla(G, M, 0, "push_outbox: una fila por aviso y token");
    if (!/on conflict \(notification_id, token_id\) do nothing/.test(cuerpoFn(c, "encolar"))) falla(G, C, 0, "encolar() no duplica (on conflict do nothing)");
    if (!/where status = 'pendiente' and not_before <= now\(\) order by not_before, id limit \$1 for update skip locked/.test(cuerpoFn(c, "enviarPendientes"))) falla(G, C, 0, "el trabajador toma con for update skip locked");
    if (!/from r where n\.id = r\.nid and n\.push_status = 'pendiente'/.test(cuerpoFn(c, "resolver"))) falla(G, C, 0, "el estado del push de un aviso se resuelve una vez");
  },

  /* 8c · El service worker de los avisos (/sw-push.js, alcance «/») solo muestra y abre (§3.3): no guarda nada (sin caché ni «fetch»: las pantallas
     sin señal tienen los suyos) y solo abre /app/aviso/{id} de NUESTRO origen. Al revés: agregar caches, un fetch, o abrir la ruta que mande el
     aviso sin revisarla → falla. */
  swPushSoloAbre() {
    const G = "swPushSoloAbre", F = "apps/web/public/sw-push.js";
    if (!existsSync(F)) return falla(G, F, 0, "falta el service worker de los avisos");
    const t = readFileSync(F, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    if (/\bcaches\b|addEventListener\(["']fetch["']|indexedDB|importScripts/.test(t)) falla(G, F, 0, "el service worker de los avisos no guarda nada ni atiende «fetch»");
    if (!/var RUTA = \/\^\\\/app\\\/aviso\\\/\\d\{1,18\}\(\\\?v=push\)\?\$\/;/.test(t)) falla(G, F, 0, "solo abre /app/aviso/{id}");
    if (!/RUTA\.test\(e\.notification\.data\.u\) \? e\.notification\.data\.u : "\/avisos"/.test(t) || !/new URL\(u, self\.location\.origin\)\.href/.test(t)) falla(G, F, 0, "el toque revisa la ruta y la abre en nuestro origen");
    if (/openWindow\((?!destino\))/.test(t)) falla(G, F, 0, "openWindow solo con la ruta revisada");
    const N = "apps/web/lib/nativo/avisos.ts";
    if (existsSync(N) && !/if \(\/\^\\\/app\\\/aviso\\\/\\d\{1,18\}\(\\\?v=push\)\?\$\/\.test\(u\)\) location\.href = u;/.test(sinComent(N))) falla(G, N, 0, "en la app, el toque solo abre /app/aviso/{id}");
  },

  /* 8c · avisoConPlantilla, ampliado: el push abre la app de su plantilla (notif_templates.app, 0126), así que un aviso cuyo enlace es de otra app se
     abriría fuera. Para cada avisar(…) con plantilla y enlace escritos, la familia del enlace (/panel → Negocios, /repartidor → Repartidor, /puerta →
     Puerta) es la app de la plantilla según las reglas de 0126. Al revés: un aviso de cliente con enlace a /repartidor (chofer_salida antes de 8c)
     → falla. */
  pushAbreSuApp() {
    const G = "pushAbreSuApp", M = "packages/db/migrations/0126_push.sql";
    if (!existsSync(M)) return;
    const m = readFileSync(M, "utf8");
    if (!/when key like 'drv\\_%' or key like 'chofer\\_%' then 'delivery'\s+when key in \('puerta_abre', 'puerta_asignado', 'puerta_invitado'\) then 'checkin'\s+when grp = 'biz' or key like 'biz\\_%' then 'negocio'/.test(m)) return falla(G, M, 0, "las reglas de la app de cada plantilla cambiaron: actualiza este guardián");
    const grp = new Map();
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) for (const t of readFileSync(`packages/db/migrations/${x}`, "utf8").matchAll(/\(\s*'([a-z0-9_]+)',\s*'(crit|tx|mod|biz|mkt|community|events|support)',/g)) grp.set(t[1], t[2]);
    const app = (k) => (/^(drv|chofer)_/.test(k) ? "delivery" : ["puerta_abre", "puerta_asignado", "puerta_invitado"].includes(k) ? "checkin" : grp.get(k) === "biz" || /^biz_/.test(k) ? "negocio" : "cliente");
    const dueno = (h) => (/^\/panel/.test(h) ? "negocio" : /^\/repartidor/.test(h) ? "delivery" : /^\/puerta/.test(h) ? "checkin" : /^\/(admin|app|ayuda|soporte|entrar|cuenta\/ajustes)/.test(h) ? null : "cliente");
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.+\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const x of l.matchAll(/\bavisar(?:Negocio|Telefono|Muchos)?\([^;]*?"([a-z]+_[a-z0-9_]+)"[^;]*?href: *[`"](\/[a-z0-9/_-]*)/g)) {
          const d = dueno(x[2]);
          if (d && grp.has(x[1]) && d !== app(x[1])) falla(G, f, i + 1, `«${x[1]}» abre ${app(x[1])} y su enlace ${x[2]} es de ${d}: el push lo abriría fuera`);
        }
      });
    }
  },

  /* 8c · Sin contexto seguro (el sandbox por HTTP en la IP) el navegador NO tiene crypto.randomUUID (solo con https o localhost): pedir, reservar,
     pagar o escanear se caían ahí (la clave de respaldo ni siquiera era un UUID y el servidor la rechazaba: «No se pudo enviar»). Toda clave que
     sale del navegador usa uuid() de lib/uuid.ts (crypto.getRandomValues, que existe siempre). Al revés: volver a usar crypto.randomUUID() o
     «"randomUUID" in crypto» en una pantalla → falla. El servidor (node:crypto randomUUID y el middleware) puede. */
  uuidSinContextoSeguro() {
    const G = "uuidSinContextoSeguro";
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?)$/.test(f) || f === "apps/web/middleware.ts") continue;
      sinComent(f).split("\n").forEach((l, i) => { if (/\bcrypto\.randomUUID\b|["']randomUUID["'] in crypto/.test(l)) falla(G, f, i + 1, "crypto.randomUUID no existe sin https (el sandbox por HTTP): usa uuid() de lib/uuid.ts"); });
    }
    const L = "apps/web/lib/uuid.ts";
    if (!existsSync(L) || !/crypto\.getRandomValues\(new Uint8Array\(16\)\)/.test(readFileSync(L, "utf8")) || !/\(b\[6\]! & 0x0f\) \| 0x40/.test(readFileSync(L, "utf8"))) falla(G, L, 0, "uuid() es un UUID v4 de crypto.getRandomValues");
  },

  /* 8f · Errores y cierres propios (fase8-apps.md §4 8f): lo que llega a /api/errores se TAPA antes de guardarse o de sacar su huella. La clase:
     un error que guarda el teléfono que la persona escribió, la URL con el número del pedido o el valor de un campo. Vigila: (a) solo
     lib/errores/ingesta.ts escribe app_error_events / app_error_groups; (b) ahí mensaje y stack salen de taparError() y la ruta de familiaRuta(), y lo
     simbolizado se vuelve a tapar; (c) taparError quita direcciones, correos, teléfonos y pasa tapar() de 7c; (d) el navegador solo manda la familia de
     la pantalla (nunca location.href / search / hash, ni el valor de un campo); (e) la base vuelve a rechazar correos, teléfonos, «?x=» y tarjetas. */
  erroresTapados() {
    const G = "erroresTapados", I = "apps/web/lib/errores/ingesta.ts", T = "apps/web/lib/errores/tapar.ts", C = "apps/web/lib/nativo/errores.ts", M = "packages/db/migrations/0127_apps_beta.sql";
    for (const f of [I, T, C, M]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza de los errores propios");
    for (const f of codigo) {
      if (!/\.(tsx?|mjs|cjs)$/.test(f) || f === I || f.startsWith("guardianes/")) continue;
      if (/insert into app_error_(events|groups)\b/.test(sinComent(f))) falla(G, f, 0, "solo lib/errores/ingesta.ts guarda errores (pasan por el tapado)");
    }
    const i = sinComent(I);
    if (!/const mensaje = taparError\(texto\(b\.mensaje, \d+\)[^;]*, \d+\);/.test(i)) falla(G, I, 0, "el mensaje se guarda tapado: const mensaje = taparError(...)");
    if (!/const crudo = taparError\(texto\(b\.stack, \d+\), \d+\);/.test(i) || !/simbolizar\(crudo\)/.test(i)) falla(G, I, 0, "el stack se tapa ANTES de simbolizar (crudo = taparError(...); simbolizar(crudo))");
    if (!/const stack = taparError\(s\.stack, \d+\);/.test(i)) falla(G, I, 0, "lo simbolizado se vuelve a tapar (const stack = taparError(s.stack, …))");
    if (!/const ruta = familiaRuta\(b\.ruta\);/.test(i)) falla(G, I, 0, "la ruta se guarda como familia (familiaRuta)");
    const ins = /insert into app_error_events \(([^)]*)\)\s*values \(([^)]*)\)`,\s*\[([^\]]*)\]/.exec(i);
    if (!ins) falla(G, I, 0, "no encuentro el insert de app_error_events");
    else {
      const cols = ins[1].split(",").map((x) => x.trim()), vals = ins[3].split(",").map((x) => x.trim());
      const de = (c) => vals[cols.indexOf(c)] ?? "";
      if (!/^mensaje\b/.test(de("message"))) falla(G, I, 0, "message ← mensaje (tapado)");
      if (!/^stack\b/.test(de("stack"))) falla(G, I, 0, "stack ← stack (tapado y simbolizado)");
      if (de("route_family") !== "ruta") falla(G, I, 0, "route_family ← ruta (familia)");
    }
    if (!/const titulo = \(normalizar\(`\$\{nombre[\s\S]{0,80}?\? `\$\{nombre\}: ` : ""\}\$\{mensaje \|\|/.test(i)) falla(G, I, 0, "el título del grupo sale del mensaje YA tapado");
    const t = sinComent(T), tf = cuerpoFn(t, "taparError");
    for (const [re, m] of [[/sinDirecciones\(t\)/, "las direcciones (sinDirecciones)"], [/\.replace\(CORREO, "\[correo\]"\)/, "los correos"], [/\.replace\(TEL, "\[tel\]"\)/, "los teléfonos"], [/tapar\(t\)\.texto/, "tarjetas, SSN, códigos y contraseñas (tapar de 7c)"], [/\.replace\(COMILLAS,/, "el texto entre comillas (valores de campos)"], [/\.replace\(NUMERO, "#"\)/, "los números de operación"]])
      if (!re.test(tf)) falla(G, T, 0, `taparError no tapa ${m}`);
    if (!/if \(ESTATICO\.test\(p\) && !p\.includes\("\.\."\)\) return p \+ pos;/.test(t) || !/return `\[url\]\$\{pos\}`;/.test(t)) falla(G, T, 0, "de una dirección solo queda la ruta de /_next/static; lo demás es [url] (con su línea y columna)");
    const c = sinComent(C);
    if (/location\.(href|search|hash)|document\.(cookie|querySelector|getElement)|\.value\b|localStorage|sessionStorage/.test(c)) falla(G, C, 0, "el navegador no manda la dirección, cookies, almacenamiento ni el valor de un campo");
    if (!/ruta: familia\(location\.pathname\)/.test(c)) falla(G, C, 0, "la pantalla va como familia (familia(location.pathname))");
    const m = readFileSync(M, "utf8");
    for (const [re, x] of [[/check \(coalesce\(message, ''\) \|\| ' ' \|\| coalesce\(stack, ''\) !~\* '\[a-z0-9\._%\+-\]\+@/, "correos"], [/!~ '\(\\\+\?1\[ \.-\]\?\)\?\\\(\?\[0-9\]\{3\}/, "teléfonos"], [/!~ '\[\?&\]\[A-Za-z_\]\+='\)/, "«?x=»"], [/check \(not texto_con_secretos\(message\) and not texto_con_secretos\(stack\)\)/, "tarjetas y SSN"], [/route_family !~ '\[0-9\?#&=\]'/, "números en la ruta"]])
      if (!re.test(m)) falla(G, M, 0, `la base ya no rechaza ${x} en app_error_events`);
  },

  /* 8f · La puerta de los errores no tiene sesión: cualquiera la puede llamar. Tamaño (cuerpo ≤ 64 KB leído con tope, no entero), origen (una
     página nuestra o el origen local de una cáscara), límite por minuto global y por teléfono / conexión ANTES de tocar la base, y el interruptor
     app.errores. Al revés: leer el cuerpo sin tope, quitar el límite o aceptar cualquier origen → falla. */
  ingestaLimitada() {
    const G = "ingestaLimitada", R = "apps/web/app/api/errores/route.ts", I = "apps/web/lib/errores/ingesta.ts";
    if (!existsSync(R) || !existsSync(I)) return falla(G, R, 0, "falta la puerta de los errores");
    const r = sinComent(R), i = sinComent(I);
    const max = Number(/const MAX = (\d+) \* 1024;/.exec(r)?.[1] ?? 0);
    if (!max || max > 64) falla(G, R, 0, "el cuerpo tiene un tope (≤ 64 KB)");
    if (/req\.(json|text|formData|arrayBuffer)\(\)/.test(r)) falla(G, R, 0, "el cuerpo se lee con tope (leer), nunca entero");
    if (!/if \(n > MAX\) \{ await r\.cancel\(\)/.test(r) || !/content-length[^\n]*> MAX\) return null/.test(r)) falla(G, R, 0, "leer() corta al pasar MAX");
    if (!/if \(!mio\) return nada\(403\);/.test(r) || !/LOCAL\.has\(origen\) \|\| new URL\(origen\)\.host === host/.test(r)) falla(G, R, 0, "solo desde una página nuestra o una cáscara (origen)");
    const f = cuerpoFn(i, "recibirError");
    const ip = f.indexOf("permitir("), ib = f.search(/tx\(|db\(\)/);
    if (ip < 0 || (ib >= 0 && ib < ip)) falla(G, I, 0, "el límite por minuto va ANTES de la base");
    if (!/valores\("errores_por_minuto", "errores_por_dispositivo"\)/.test(f)) falla(G, I, 0, "los topes salen de Configuración (errores_por_minuto / errores_por_dispositivo)");
    if (!/if \(!\(await encendido\(\)\)\) return/.test(f)) falla(G, I, 0, "el interruptor app.errores se mira primero");
    const p = cuerpoFn(i, "permitir");
    // 9b-3: los tres topes van al contador compartido (lib/topes.ts, rate_counters), no a la memoria del proceso (guardián topeCompartido).
    if (!/dentroDelTope\("errores", "todo", lim\.global\)/.test(p) || !/dentroDelTope\("errores_dev", dev, lim\.dev\)/.test(p) || !/dentroDelTope\("errores_ip", ip \?\? "\?", lim\.dev \* 4\)/.test(p)) falla(G, I, 0, "permitir(): tope global, por teléfono y por conexión, compartidos (dentroDelTope)");
    if (!/if \(\(tipo === "cierre" \|\| tipo === "nativo"\) && !app\) return/.test(f)) falla(G, I, 0, "un cierre nativo solo de una app");
    // Lo que corre sobre 16 KB sin sesión no puede ser cuadrático: el correo solo desde el comienzo de una palabra y con topes (sin eso, 16 KB de
    // letras costaban ~300 ms), y un cuadro de stack largo no se intenta (dos «.+?» seguidos).
    const T = "apps/web/lib/errores/tapar.ts", H = "apps/web/lib/errores/huella.ts";
    if (existsSync(T) && !/const CORREO = \/\(\?<!\[A-Za-z0-9\._%\+-\]\)\[A-Za-z0-9\._%\+-\]\{1,64\}@/.test(readFileSync(T, "utf8"))) falla(G, T, 0, "CORREO: desde el comienzo de una palabra y con tope ({1,64}@): sin eso es cuadrático sobre la entrada sin sesión");
    if (existsSync(H) && !/if \(l\.length > 500\) return null;/.test(cuerpoFn(sinComent(H), "cuadro"))) falla(G, H, 0, "cuadro(): una línea larga no se intenta (expresiones cuadráticas)");
  },

  /* 8f · En los errores no hay personas (fase8-apps.md §4 8f: «nada de nombre, teléfono, correo ni ids de operación»). Las tablas de errores no
     tienen esas columnas; la sesión es una huella que cambia cada día; Salud no lee la huella ni junta errores con cuentas; el navegador no manda
     quién es. Al revés: sumar user_id u operation_id a app_error_events, devolver session_hash a la pantalla, o mandar el id de la cuenta → falla. */
  erroresSinPersonas() {
    const G = "erroresSinPersonas", M = "packages/db/migrations/0127_apps_beta.sql", I = "apps/web/lib/errores/ingesta.ts", A = "apps/web/lib/errores/admin.ts", C = "apps/web/lib/nativo/errores.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta 0127");
    const PROHIBIDO = /^\s*(user_id|users?_|phone|telefono|email|correo|first_name|last_name|nombre|name|operation_id|operation|op_id|business_id|order_id|case_id|ip|ip_address|user_agent|ua|device_id|tl_dev|city_id)\b/;
    const sql = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8")).join("\n");
    for (const tabla of ["app_error_groups", "app_error_events", "app_error_alerts"]) {
      const b = new RegExp(`create table if not exists ${tabla} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1];
      if (!b) { falla(G, M, 0, `no encuentro ${tabla}`); continue; }
      for (const l of b.split("\n")) if (PROHIBIDO.test(l)) falla(G, M, 0, `${tabla} no lleva datos de personas: «${l.trim().slice(0, 50)}»`);
      for (const m of sql.matchAll(new RegExp(`alter table ${tabla} add column(?: if not exists)? (\\w+)`, "g"))) if (PROHIBIDO.test(m[1])) falla(G, M, 0, `${tabla} no suma ${m[1]}`);
    }
    if (!existsSync(I)) return;
    const i = sinComent(I);
    if (!/sesion = hmac\(`errores:\$\{dia\}:\$\{e\.dev \?\? e\.ip \?\? "\?"\}`\)\.slice\(0, 32\)/.test(i)) falla(G, I, 0, "la sesión es una huella del día (hmac con la fecha), nunca el id del teléfono");
    if (/\byo\(|\buser_id\b|users\b/.test(i)) falla(G, I, 0, "la ingesta no mira la cuenta");
    if (existsSync(A)) { const a = sinComent(A); if (/session_hash\s+as|select[^;]*\bsession_hash\b[^;]*from app_error_events/i.test(a.replace(/count\(distinct e\.session_hash\)/g, ""))) falla(G, A, 0, "Salud no devuelve la huella de la sesión"); if (/join users u on u\.id = (e|g)\.(user|session)/.test(a)) falla(G, A, 0, "Salud no junta errores con cuentas"); }
    if (existsSync(C)) { const c = sinComent(C); const b = /JSON\.stringify\(\{([^}]*)\}\)/.exec(c)?.[1] ?? ""; const k = [...b.matchAll(/(\w+):/g)].map((x) => x[1]).sort().join(","); if (k !== "mensaje,nombre,ruta,stack,tipo") falla(G, C, 0, `el navegador manda solo tipo, nombre, mensaje, stack y ruta (manda: ${k})`); }
  },

  /* 8f · «Reportar un problema»: el registro técnico y la captura salen del teléfono SOLO al tocar «Enviar» (consentimiento). La clase: una pantalla
     que manda el registro al abrirse, una captura que se sube al elegirla, o el nativo que lo manda por su cuenta. Vigila: en Reportar.tsx la acción
     reportar() y subirFotoPrivada() solo dentro de enviar(), enviar solo desde un botón y nada de eso en un useEffect; registro() solo en enviar()
     o en «Ver lo que se envía» (que lo muestra en el teléfono); solo esa acción llama a reportarProblema; los plugins TLReporte no usan la red. */
  reporteConConsentimiento() {
    const G = "reporteConConsentimiento", P = "apps/web/app/(app)/soporte/reportar/Reportar.tsx", A = "apps/web/app/(app)/soporte/reportar/acciones.ts";
    if (!existsSync(P) || !existsSync(A)) return falla(G, P, 0, "falta la pantalla de Reportar un problema");
    const t = sinComent(P), env = cuerpoFn("\n" + t.replace(/\n  function enviar\(/, "\nfunction enviar("), "enviar");
    if (!env) return falla(G, P, 0, "no encuentro enviar()");
    const fuera = t.replace(env.slice(1), "");
    for (const x of ["reportar(", "subirFotoPrivada("]) {
      if (!env.includes(x)) falla(G, P, 0, `${x}…) se llama en enviar()`);
      if (fuera.includes(x)) falla(G, P, 0, `${x}…) solo en enviar() (al tocar «Enviar»)`);
    }
    for (const m of fuera.matchAll(/registro\(\)/g)) { const antes = fuera.slice(Math.max(0, m.index - 200), m.index); if (!/const ver = \(\) => \{[^\n]*$/.test(antes.split("\n").pop() ?? "")) falla(G, P, 0, "registro() solo en enviar() o en «Ver lo que se envía» (ver)"); }
    for (const m of t.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[/g)) if (/reportar\(|subirFotoPrivada\(|registro\(|enviar\(/.test(m[1])) falla(G, P, 0, "nada se manda al abrir la pantalla (useEffect)");
    const llamadas = [...t.matchAll(/\benviar\(/g)].length, boton = [...t.matchAll(/onClick: enviar\b/g)].length, otros = [...t.matchAll(/[=(,{]\s*enviar\b(?!\()/g)].length;
    if (boton !== 1 || llamadas !== 1 || otros !== 0) falla(G, P, 0, "enviar() solo desde el botón «Enviar» (se define una vez y solo lo usa ese onClick)");
    if (/onClick: enviar/.test(t) && !/l: pend \? E2\("Enviando…", "Sending…"\) : conSesion \? E2\("Enviar", "Send"\)/.test(t)) falla(G, P, 0, "el botón de enviar dice «Enviar»");
    for (const f of codigo) if (/\.(tsx?)$/.test(f) && f !== A && f !== "apps/web/lib/reportar.ts" && /reportarProblema\(/.test(sinComent(f))) falla(G, f, 0, "solo la acción de «Enviar» abre un reporte");
    const R = "apps/web/lib/nativo/reporte.ts";
    if (existsSync(R) && /fetch\(|XMLHttpRequest|sendBeacon|urlServidor/.test(sinComent(R))) falla(G, R, 0, "el registro y la captura no salen del puente por su cuenta");
    if (existsSync("apps/web/lib/nativo/errores.ts") && /registro\(|capturaGuardada\(/.test(sinComent("apps/web/lib/nativo/errores.ts"))) falla(G, "apps/web/lib/nativo/errores.ts", 0, "los errores nunca llevan el registro ni la captura");
    for (const f of archivos) if (/^apps\/mobile\/plugins\/tl-reporte\/.*\.(swift|java)$/.test(f) && /URLSession|URLRequest|HttpURLConnection|HttpsURLConnection|okhttp|java\.net\.URL\b|Socket\(/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "TLReporte no usa la red: todo sale por «Enviar» en la página");
  },

  /* 8f · «Errores en vivo» (docs/PLAN.md §5): lee app_error_groups y avisa al equipo de un grupo nuevo, un pico o un error resuelto que vuelve,
     UNA vez por grupo, tipo y build. Vigila que el barrido lo corra, que la alerta quede anotada (única) ANTES de avisar, que lo silenciado no avise,
     que la plantilla exista y que la base reabra un grupo resuelto que vuelve en un build posterior. Al revés: sacar la tarea del barrido, avisar
     sin anotar, o quitar la regresión → falla. */
  erroresEnVivo() {
    const G = "erroresEnVivo", B = "apps/web/lib/barrido.ts", V = "apps/web/lib/errores/vivo.ts", M = "packages/db/migrations/0127_apps_beta.sql";
    if (!existsSync(V) || !existsSync(M)) return falla(G, V, 0, "falta «Errores en vivo»");
    if (!/\["errores", async \(\) => \(await import\("\.\/errores\/vivo"\)\)\.barrerErrores\(\)\]/.test(sinComent(B))) falla(G, B, 0, "el barrido corre barrerErrores");
    const v = sinComent(V), f = cuerpoFn(v, "barrerErrores");
    const ia = f.indexOf("insert into app_error_alerts"), iv = f.indexOf("avisar(u.id, \"err_vivo\"");
    if (ia < 0 || iv < 0 || iv < ia) falla(G, V, 0, "la alerta se anota (única) antes de avisar");
    if (!/if \(!a\) continue;/.test(f)) falla(G, V, 0, "si la alerta ya estaba, no se avisa otra vez");
    if (!/from app_error_groups g/.test(f) || !/g\.status <> 'silenciado'/.test(f)) falla(G, V, 0, "lee los grupos y lo silenciado no avisa");
    if (!/cfg_int|valor\("errores_pico_n"\)/.test(f)) falla(G, V, 0, "el pico sale de Configuración (errores_pico_n)");
    if (!/sinSms: true/.test(f)) falla(G, V, 0, "el aviso del equipo no va por SMS");
    const m = readFileSync(M, "utf8");
    if (!/unique \(group_id, kind, release\)/.test(m)) falla(G, M, 0, "una alerta por grupo, tipo y build (único)");
    if (!/\('err_vivo', 'mod',/.test(m)) falla(G, M, 0, "falta la plantilla err_vivo");
    if (!/status = case when g\.status = 'resuelto' and error_build_posterior\(new\.release, g\.resolved_in_build\) then 'nuevo'/.test(m)) falla(G, M, 0, "un resuelto que vuelve en un build posterior se reabre solo");
  },

  /* 8f · Los mapas de fuente simbolizan EN EL SERVIDOR y nunca se sirven (fase8-apps.md §4 8f). La clase: productionBrowserSourceMaps encendido y los
     .map en /_next/static (el código original del sitio, entero, para cualquiera). Vigila: el build de apps/web corre scripts/mapas-privados.mjs (que
     los saca y falla si queda uno); nginx niega *.map; las islas no los copian; simbolizar.ts los lee de .next/mapas con la ruta comprobada; nada
     de public/ termina en .map. Al revés: quitar el paso del build o la regla de nginx → falla. */
  mapasPrivados() {
    const G = "mapasPrivados", N = "apps/web/next.config.ts", P = "apps/web/package.json", X = "infra/pruebas/nginx-pruebas.conf", S = "scripts/mapas-privados.mjs", I = "apps/mobile/scripts/islas.mjs", Z = "apps/web/lib/errores/simbolizar.ts";
    const mapas = existsSync(N) && /productionBrowserSourceMaps:\s*true/.test(sinComent(N));
    if (!mapas) return;
    const build = JSON.parse(readFileSync(P, "utf8")).scripts?.build ?? "";
    if (!/^next build && node \.\.\/\.\.\/scripts\/mapas-privados\.mjs \.$/.test(build)) falla(G, P, 0, "el build saca los mapas de lo que se sirve (next build && node ../../scripts/mapas-privados.mjs .)");
    if (!existsSync(S) || !/renameSync\(p, q\)/.test(readFileSync(S, "utf8")) || !/if \(quedan\.length\)[^\n]*process\.exit\(1\)/.test(readFileSync(S, "utf8"))) falla(G, S, 0, "mapas-privados mueve los .map y falla si queda alguno");
    if (!existsSync(X) || !/location ~\* \\\.map\$ \{ return 404; \}/.test(readFileSync(X, "utf8"))) falla(G, X, 0, "nginx niega *.map");
    if (existsSync(I) && !/filter: \(s\) => !s\.endsWith\("\.map"\)/.test(readFileSync(I, "utf8"))) falla(G, I, 0, "las islas no copian mapas a la app");
    if (existsSync(Z)) { const z = sinComent(Z); if (!/path\.join\(process\.cwd\(\), "\.next", "mapas"\)/.test(z) || !/if \(f\.startsWith\(raiz \+ path\.sep\)\)/.test(z) || !/rel\.includes\("\.\."\)/.test(z)) falla(G, Z, 0, "simbolizar lee de .next/mapas, con la ruta comprobada (sin «..», dentro de la carpeta)"); }
    for (const f of archivos) if (/^apps\/web\/public\/.*\.map$/.test(f)) falla(G, f, 0, "un mapa de fuente en public/ se serviría");
    const D = "infra/pruebas/Dockerfile";
    if (existsSync(D) && /\.next\/mapas[^\n]*\/static|static[^\n]*\.map/.test(readFileSync(D, "utf8"))) falla(G, D, 0, "la imagen no pone los mapas en lo que se sirve");
  },

  /* 8f · El enlace de un uso del APK propio: verlo no lo gasta (una vista previa, un rastreador), bajarlo sí, una vez, con la sesión del tester y la
     huella sha256 comprobada; solo se guarda la huella del enlace; ningún APK en el repo. Al revés: gastar en el GET, quitar la condición de la
     escritura o subir un .apk → falla. */
  apkUnUso() {
    const G = "apkUnUso", L = "apps/web/lib/beta.ts", P = "apps/web/app/(app)/beta/apk/[ficha]/page.tsx", R = "apps/web/app/(app)/beta/apk/[ficha]/bajar/route.ts";
    for (const f of archivos) if (/\.(apk|aab|ipa)$/i.test(f)) falla(G, f, 0, "ningún binario de app en el repo (el APK de prueba lo arma el servidor; los de verdad, el CI en 8h)");
    if (!existsSync(L) || !existsSync(P) || !existsSync(R)) return falla(G, L, 0, "falta el enlace de un uso");
    const p = sinComent(P), r = sinComent(R), l = sinComent(L);
    if (/bajarApk|used_at|update /.test(p)) falla(G, P, 0, "abrir el enlace (GET) no lo gasta");
    if (/export async function (GET|HEAD)\b/.test(r) || !/export async function POST\(/.test(r)) falla(G, R, 0, "bajar es solo POST");
    if (!/if \(!\(await mismoOrigen\(\)\)\)/.test(r) || !/const u = await yo\(\);/.test(r)) falla(G, R, 0, "bajar: desde nuestra página y con la sesión");
    const b = cuerpoFn(l, "bajarApk");
    if (!/update apk_links set used_at = now\(\) where id = \$1::bigint and used_at is null and revoked_at is null and expires_at > now\(\)/.test(b)) falla(G, L, 0, "se gasta en UNA escritura condicionada (used_at is null…)");
    if (!/createHash\("sha256"\)\.update\(b\)\.digest\("hex"\) !== l\.sha/.test(b)) falla(G, L, 0, "se comprueba la huella sha256 antes de entregar");
    if (!/where l\.token_hash = \$1 and t\.user_id = \$2/.test(b) || !/where l\.token_hash = \$1 and t\.user_id = \$2/.test(cuerpoFn(l, "verEnlace"))) falla(G, L, 0, "el enlace es solo de la cuenta del tester");
    if (/token_hash, [^)]*ficha\b(?!\))/.test(l.replace(/createHash\("sha256"\)\.update\(ficha\)\.digest\("hex"\)/g, "H"))) falla(G, L, 0, "del enlace solo se guarda la huella");
    for (const f of codigo) if (/\.(tsx?)$/.test(f) && f !== L && /update apk_links/.test(sinComent(f))) falla(G, f, 0, "solo lib/beta.ts toca los enlaces del APK");
  },

  /* 8f · La API de App Store Connect: fuera de producción un simulador la puede reemplazar (ASC_API_URL, como el push de 8c); en producción esa
     variable NO se lee y la dirección es la de Apple. Solo lib/beta.ts la lee. Al revés: leerla también en producción → falla. */
  tiendasSimuladorAislado() {
    // 8h · Las direcciones de Apple, Google y GitHub viven en lib/tiendas/direcciones.ts (8f empezó con ASC_API_URL en lib/beta.ts).
    const G = "tiendasSimuladorAislado", L = "apps/web/lib/tiendas/direcciones.ts";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/tiendas/direcciones.ts (las direcciones de las tiendas en un solo lugar)");
    const t = readFileSync(L, "utf8");
    if (!/const PROD = ENTORNO === "produccion";/.test(t)) falla(G, L, 0, "las direcciones saben si es producción");
    const VARS = { ASC_API_URL: '"https://api.appstoreconnect.apple.com"', PLAY_API_URL: '"https://androidpublisher.googleapis.com"', PLAY_OAUTH_URL: '"https://oauth2.googleapis.com/token"', TIENDAS_GITHUB_API_URL: '"https://api.github.com"', TIENDAS_OIDC_JWKS_URL: "JWKS_GITHUB" };
    for (const [v, real] of Object.entries(VARS)) {
      if (!new RegExp(`= \\(\\) => \\(!PROD && process\\.env\\.${v} \\? process\\.env\\.${v} : ${real.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\);`).test(t)) falla(G, L, 0, `${v} solo fuera de producción; en producción, ${real}`);
      for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== L && new RegExp(`\\b${v}\\b`).test(readFileSync(f, "utf8"))) falla(G, f, 0, `solo lib/tiendas/direcciones.ts lee ${v}`);
    }
    if (!/export const JWKS_GITHUB = `\$\{EMISOR\}\/\.well-known\/jwks`;/.test(readFileSync("apps/web/lib/tiendas/oidc.ts", "utf8"))) falla(G, "apps/web/lib/tiendas/oidc.ts", 0, "el JWKS de producción es el de GitHub");
  },

  /* 8h · Un flujo de GitHub mal formado no corre (corrida 43074283366: una salida «ios» repetida → «workflow file issue», sin ningún job) y una
     variable del job con el nombre de una de generar.mjs lo rompe (corrida 43072031036: SABOR=negocios en vez de pruebas | produccion). Ninguna
     llave repetida en el mismo mapa de un flujo, y SABOR solo puede valer pruebas. Al revés: repetir una salida o poner SABOR: negocios → falla. */
  flujosBienFormados() {
    const G = "flujosBienFormados";
    for (const f of archivos.filter((x) => /^\.github\/workflows\/.*\.ya?ml$/.test(x))) {
      const pila = [];
      let bloque = -1;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (!l.trim() || /^\s*#/.test(l)) return;
        const ind = l.length - l.trimStart().length;
        if (bloque >= 0) { if (ind > bloque) return; bloque = -1; }
        let m = /^(\s*)- (?:([\w.-]+):(?:\s|$))?/.exec(l), k = null, ki = ind;
        if (m) {
          while (pila.length && pila[pila.length - 1].ind >= ind + 2) pila.pop();
          if (m[2]) { pila.push({ ind: ind + 2, llaves: new Set([m[2]]) }); }
          if (/:\s*[|>][-+]?\s*$/.test(l)) bloque = ind + 2 - 1;
          return;
        }
        m = /^(\s*)([\w.${}-]+):(?:\s|$)/.exec(l);
        if (!m) return;
        k = m[2];
        while (pila.length && pila[pila.length - 1].ind > ki) pila.pop();
        const top = pila[pila.length - 1];
        if (top && top.ind === ki) { if (top.llaves.has(k)) falla(G, f, i + 1, `«${k}» repetida en el mismo mapa: GitHub rechaza el flujo entero`); top.llaves.add(k); }
        else pila.push({ ind: ki, llaves: new Set([k]) });
        if (/:\s*[|>][-+]?\s*$/.test(l)) bloque = ki;
        if (k === "SABOR" && !/^\s*SABOR:\s*["']?pruebas["']?\s*$/.test(l)) falla(G, f, i + 1, "SABOR es la variable de generar.mjs (pruebas | produccion): el sabor de Gradle va con otro nombre");
      });
    }
  },

  /* 8h · El token OIDC de GitHub se revisa ENTERO antes de dar nada (fase8-apps.md §3.5): RS256 exacto (ni none, ni HS256 con la llave pública,
     ni llaves incrustadas), kid del JWKS de GitHub con RSA ≥ 2048, firma, emisor, audiencia, repo con su id y su dueño, entorno «tiendas», sub,
     rama permitida (el sandbox solo pruebas; producción solo produccion y solo con app.tiendas.publico), evento push o workflow_dispatch, el flujo
     tiendas.yml de esa rama, runner de GitHub, nada de un PR, tiempos con poca holgura; HTTPS antes que nada; el jti se gasta en UNA inserción;
     cada ruta de /api/tiendas autentica primero; nadie más verifica tokens de GitHub ni escribe sus libros. Al revés: aceptar otro alg, saltar el
     repo, la rama, el entorno o el jti, permitir produccion en el sandbox, o una ruta que no autentica → falla. */
  oidcEstricto() {
    const G = "oidcEstricto", O = "apps/web/lib/tiendas/oidc.ts", T = "apps/web/lib/tiendas/tuberia.ts", M = "packages/db/migrations/0131_tiendas_tuberia.sql";
    if (!existsSync(O) || !existsSync(T)) return falla(G, O, 0, "falta la verificación del OIDC de GitHub");
    const o = sinComent(O), v = cuerpoFn(o, "verificar");
    const exige = [
      [/if \(h\.alg !== "RS256"\) return \{ ok: false, motivo: "alg" \};/, "alg EXACTAMENTE RS256"],
      [/if \("crit" in h \|\| "jku" in h \|\| "jwk" in h \|\| "x5u" in h \|\| "x5c" in h\) return/, "sin crit ni llaves incrustadas (jku, jwk, x5u, x5c)"],
      [/if \(!llave\) return \{ ok: false, motivo: "kid" \};/, "un kid que no está en el JWKS no entra"],
      [/llave\.asymmetricKeyType !== "rsa" \|\| bits < 2048\) return/, "solo RSA de 2048 bits o más"],
      [/!verify\("sha256", Buffer\.from\(`\$\{p\[0\]\}\.\$\{p\[1\]\}`\), llave, firma\)\) return \{ ok: false, motivo: "firma" \};/, "la firma se verifica con la llave del JWKS (sha256)"],
      [/if \(c\.iss !== EMISOR\) return/, "el emisor"], [/c\.aud !== AUDIENCIA/, "la audiencia"],
      [/if \(c\.repository !== REPO\.nombre \|\| String\(c\.repository_id\) !== REPO\.id\) return/, "el repo y su id"],
      [/if \(c\.repository_owner !== REPO\.dueno \|\| String\(c\.repository_owner_id\) !== REPO\.duenoId\) return/, "el dueño y su id"],
      [/if \(c\.environment !== REPO\.entorno\) return/, "el entorno tiendas"], [/if \(c\.sub !== `repo:\$\{REPO\.nombre\}:environment:\$\{REPO\.entorno\}`\) return/, "el sub del entorno"],
      [/if \(c\.ref_type !== "branch" \|\| !esperado\.ramas\.includes\(c\.ref\)\) return/, "la rama permitida"],
      [/if \(!\(EVENTOS as readonly string\[\]\)\.includes\(c\.event_name\)\) return/, "el evento"],
      [/if \(c\.job_workflow_ref !== flujo \|\| c\.workflow_ref !== flujo\) return/, "el flujo tiendas.yml de esa rama"],
      [/if \(c\.runner_environment !== "github-hosted"\) return/, "un runner de GitHub"], [/if \(c\.head_ref \|\| c\.base_ref\) return/, "nada de un pull request"],
      [/if \(ahora > exp \+ HOLGURA_S\) return \{ ok: false, motivo: "vencido", c \};/, "un token vencido no entra"],
    ];
    for (const [re, que] of exige) if (!re.test(v)) falla(G, O, 0, `verificar(): ${que}`);
    if (!/export const REPO = \{ nombre: "devpayxer\/tolatino", id: "1283030677", dueno: "devpayxer", duenoId: "281237548", entorno: "tiendas", flujo: "\.github\/workflows\/tiendas\.yml" \} as const;/.test(o)) falla(G, O, 0, "el repo, sus ids, el entorno y el flujo, fijos");
    if (!/export const EVENTOS = \["push", "workflow_dispatch"\] as const;/.test(o)) falla(G, O, 0, "solo push y workflow_dispatch");
    const hol = /export const HOLGURA_S = (\d+);/.exec(o);
    if (!hol || Number(hol[1]) > 120) falla(G, O, 0, "la holgura de los tiempos es chica (≤ 120 s)");
    if (/createHmac|"HS256"|alg === "none"|h\.alg\s*\)/.test(o.replace(/if \(h\.alg !== "RS256"\)/, ""))) falla(G, O, 0, "el algoritmo no sale de la cabecera del token");
    const t = sinComent(T), a = cuerpoFn(t, "autenticar");
    if (!/if \(!llegoPorHttps\(req\)\) return no\("sin_https"\);/.test(a) || a.indexOf("llegoPorHttps(req)") > a.indexOf("verificar(")) falla(G, T, 0, "autenticar(): HTTPS antes de mirar el token");
    if (!/export const llegoPorHttps = \(req: Request\) => \(req\.headers\.get\("x-forwarded-proto"\) \?\? ""\)\.split\(","\)\[0\]!\.trim\(\)\.toLowerCase\(\) === "https";/.test(t)) falla(G, T, 0, "HTTPS: lo dice nginx (x-forwarded-proto), sin atajos");
    if (/process\.env\.\w*(HTTP|HTTPS|INSEGURO|LOCAL)\w*/.test(t)) falla(G, T, 0, "ninguna variable del entorno salta el HTTPS");
    if (!/insert into ci_oidc_jti \(jti, exp, run_id, para\) values \(\$1, to_timestamp\(\$2\), \$3, \$4\) on conflict \(jti\) do nothing returning jti/.test(a) || !/if \(!nuevo\) return no\("jti_repetido", c\);/.test(a)) falla(G, T, 0, "autenticar(): el jti se gasta en UNA inserción y uno repetido no entra");
    if (!/const r = await verificar\(token, llavesDe\(URL_JWKS\(\)\), \{ ramas: await ramasPermitidas\(\) \}\);\s*\/\/[^\n]*\n?\s*if \(!r\.ok\) return no\(r\.motivo, r\.c\);|const r = await verificar\(token, llavesDe\(URL_JWKS\(\)\), \{ ramas: await ramasPermitidas\(\) \}\);\s*if \(!r\.ok\) return no\(r\.motivo, r\.c\);/.test(a)) falla(G, T, 0, "autenticar(): verificar() con el JWKS y las ramas permitidas; si no, fuera");
    const ram = cuerpoFn(t, "ramasPermitidas");
    if (!/if \(!PROD\) return \["refs\/heads\/pruebas"\];\s*return \(await encendido\("app\.tiendas\.publico"\)\) \? \["refs\/heads\/produccion"\] : \[\];/.test(ram)) falla(G, T, 0, "las ramas: el sandbox solo pruebas; producción solo produccion y con app.tiendas.publico");
    for (const f of codigo.filter((x) => /^apps\/web\/app\/api\/tiendas\/.*route\.ts$/.test(x))) {
      const r = sinComent(f);
      if (!/export const dynamic = "force-dynamic";/.test(r)) falla(G, f, 0, "las rutas de la tubería no se guardan en caché");
      if (/export async function (GET|HEAD|DELETE|PATCH|OPTIONS)\b/.test(r)) falla(G, f, 0, "la tubería solo recibe POST o PUT");
      for (const m of r.matchAll(/export async function (POST|PUT)\(req: Request\) \{\n([^\n]*)\n([^\n]*)/g)) if (!/^\s*const a = await autenticar\(req, "(llaves|build|archivo)"\);$/.test(m[2]) || !/if \(!a\.ok\) return/.test(m[3])) falla(G, f, 0, `${m[1]}: lo primero es autenticar() y, si no, fuera`);
      if (!/export async function (POST|PUT)\(req: Request\) \{\n\s*const a = await autenticar/.test(r)) falla(G, f, 0, "toda ruta de la tubería autentica primero");
    }
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === O || f === T) continue;
      const x = sinComent(f);
      if (/token\.actions\.githubusercontent\.com|verificar\(.*llavesDe|from ["'][^"']*tiendas\/oidc["']/.test(x) && f !== "apps/web/lib/tiendas/direcciones.ts") falla(G, f, 0, "solo lib/tiendas/tuberia.ts verifica tokens de GitHub");
      for (const q of x.match(/`[^`]*`/g) ?? []) if (/\b(insert into|update|delete from) (ci_oidc_jti|ci_oidc_log)\b/.test(q)) falla(G, f, 0, "solo la tubería escribe los jti y el libro del OIDC");
    }
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/jti     text primary key/.test(m)) falla(G, M, 0, "ci_oidc_jti: el jti es la llave primaria (el mismo token no entra dos veces)");
      if (!/raise exception 'ci_oidc_jti: un jti usado no cambia'/.test(ultimaFn("ci_oidc_jti_antes")) || !/if old\.exp > now\(\) - interval '1 day' then raise exception/.test(ultimaFn("ci_oidc_jti_antes"))) falla(G, M, 0, "ci_oidc_jti: no cambia y solo se purga lo vencido");
    } else falla(G, M, 0, "falta la migración de la tubería");
  },

  /* 8h · Cambiar el código nativo exige subir la versión (fase8-apps.md §3.5): apps/mobile/versiones.json guarda cada versión con la huella de lo
     nativo; la última = apps.json y = la huella de hoy, el historial solo crece. Y el CI de las tiendas lo revisa antes de compilar. Al revés: tocar
     un plugin sin subir la versión, re-sellar la última o bajar la versión → falla. */
  versionCoherente() {
    const G = "versionCoherente", V = "apps/mobile/scripts/version.mjs", TY = ".github/workflows/tiendas.yml";
    if (!existsSync(V)) return falla(G, V, 0, "falta la versión de las apps (version.mjs)");
    const req = createRequire(import.meta.url), raiz = process.cwd();
    try {
      const out = execSync(`node -e 'import(${JSON.stringify("file://" + join(raiz, V))}).then((m) => console.log(JSON.stringify(m.problemas())))'`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      for (const p of JSON.parse(out.trim().split("\n").pop())) falla(G, "apps/mobile/versiones.json", 0, p);
    } catch (e) { falla(G, V, 0, `no se pudo revisar la versión: ${String(e.stderr ?? e.message).split("\n")[0]}`); }
    void req;
    if (existsSync(TY) && !/run: node apps\/mobile\/scripts\/version\.mjs --verificar/.test(readFileSync(TY, "utf8"))) falla(G, TY, 0, "el CI de las tiendas revisa la versión antes de compilar");
    const gr = readFileSync("apps/mobile/android/app/build.gradle", "utf8");
    if (!/versionName APPS\.version/.test(gr) || !/versionCode BUILD/.test(gr)) falla(G, "apps/mobile/android/app/build.gradle", 0, "versionName sale de apps.json y versionCode del build del CI");
    if (!/MARKETING_VERSION: "\$\{A\.version\}"/.test(readFileSync("apps/mobile/scripts/generar.mjs", "utf8"))) falla(G, "apps/mobile/scripts/generar.mjs", 0, "MARKETING_VERSION sale de apps.json");
  },

  /* 8h · Las tiendas públicas son de la Fase 9 (fase8-apps.md §3.5 «Sabor y canal»): la base rechaza «revision_publica» y «lanzamiento», el sabor de
     producción y el canal «tienda» mientras app.tiendas.publico esté apagado (y piden el OK del fundador); el interruptor nace apagado y ningún
     código lo enciende ni inserta esos envíos; el flujo de las tiendas no corre en produccion ni compila su sabor; generar.mjs mantiene el candado.
     Al revés: quitar la condición del trigger, encender el interruptor en la migración o compilar el sabor produccion en el flujo → falla. */
  tiendaSoloProduccion() {
    const G = "tiendaSoloProduccion", M = "packages/db/migrations/0131_tiendas_tuberia.sql", TY = ".github/workflows/tiendas.yml";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la tubería");
    const m = readFileSync(M, "utf8");
    if (!/\('app\.tiendas\.publico', false, /.test(m)) falla(G, M, 0, "app.tiendas.publico nace APAGADO");
    const ss = ultimaFn("store_submissions_antes");
    if (!/if new\.kind in \('revision_publica', 'lanzamiento'\) then\s+[^\n]*\n\s+if not coalesce\(\(select enabled from feature_flags where key = 'app\.tiendas\.publico'\), false\) then\s+raise exception 'tienda_solo_produccion/.test(ss)) falla(G, M, 0, "store_submissions: la revisión pública y el lanzamiento, rechazados sin app.tiendas.publico");
    if (!/if new\.founder_ok_ref is null then raise exception 'tienda_solo_produccion/.test(ss)) falla(G, M, 0, "store_submissions: la Fase 9 pide la referencia del OK del fundador");
    if (!/raise exception 'store_submissions es solo de inserción'/.test(ss)) falla(G, M, 0, "store_submissions es de solo inserción");
    if (!/if \(new\.flavor = 'produccion' or new\.channel = 'tienda'\) and not coalesce\(\(select enabled from feature_flags where key = 'app\.tiendas\.publico'\), false\) then\s+raise exception 'tienda_solo_produccion/.test(ultimaFn("app_builds_antes"))) falla(G, M, 0, "app_builds: el sabor de producción y la tienda, solo con app.tiendas.publico");
    if (!/if new\.ref = 'produccion' and not coalesce\(\(select enabled from feature_flags where key = 'app\.tiendas\.publico'\), false\) then\s+raise exception 'tienda_solo_produccion/.test(ultimaFn("build_requests_antes"))) falla(G, M, 0, "build_requests: un build de producción, solo con app.tiendas.publico");
    for (const x of readdirSync("packages/db/migrations").filter((y) => y > "0131" && y.endsWith(".sql"))) if (/app\.tiendas\.publico'[^;]*\btrue\b|set enabled = true where key = 'app\.tiendas\.publico'/.test(readFileSync(`packages/db/migrations/${x}`, "utf8"))) falla(G, `packages/db/migrations/${x}`, 0, "app.tiendas.publico se enciende en la Fase 9, con el OK del fundador (no en una migración)");
    for (const f of codigo) {
      if (!/^(apps\/web|scripts|infra)\/.*\.(tsx?|mjs|cjs|sh|sql)$/.test(f)) continue;
      const x = /\.(tsx?|mjs|cjs)$/.test(f) ? sinComent(f) : readFileSync(f, "utf8");
      if (/'(revision_publica|lanzamiento)'/.test(x) && /insert into store_submissions/.test(x)) falla(G, f, 0, "la revisión pública y el lanzamiento son de la Fase 9");
      if (/app\.tiendas\.publico/.test(x) && /update feature_flags|insert into feature_flags/.test(x) && !/^scripts\//.test(f)) falla(G, f, 0, "app.tiendas.publico no se cambia desde el código");
    }
    if (existsSync(TY)) {
      const t = readFileSync(TY, "utf8");
      if (/produccion|TL_PRODUCCION|SABOR: produccion|\bmain\b\]/.test(t.replace(/#[^\n]*/g, ""))) falla(G, TY, 0, "el flujo de las tiendas no corre en produccion ni compila su sabor (Fase 9)");
    }
    if (!/if \(SABOR === "produccion" && process\.env\.TL_PRODUCCION !== "fase9"\)/.test(readFileSync("apps/mobile/scripts/generar.mjs", "utf8"))) falla(G, "apps/mobile/scripts/generar.mjs", 0, "generar.mjs no prepara el sabor produccion antes de la Fase 9");
  },

  /* 8f · Una cáscara instalada de antes no trae los métodos nuevos de un plugin propio (TLReporte.agitar, .cierres, .ultimaCaptura): Capacitor
     contesta «no implementado» y, sin atraparlo, la página se rompe (lo cazó push8c con el puente de 8c: «TLReporte.addListener() is not
     implemented»). Toda llamada a un método de un plugin propio en lib/nativo va con .catch( o dentro de un try en la misma línea. Al revés: quitar
     el try de agitar() → falla. */
  pluginViejoNoRompe() {
    const G = "pluginViejoNoRompe";
    for (const f of codigo.filter((x) => /^apps\/web\/lib\/nativo\/.*\.ts$/.test(x) && !x.endsWith("/puente.ts"))) {
      const t = sinComent(f), vars = [...t.matchAll(/const (\w+) = plugin<TL\w+>\(/g)].map((m) => m[1]);
      if (!vars.length) continue;
      t.split("\n").forEach((l, i) => {
        for (const v of new Set(vars)) for (const m of l.matchAll(new RegExp(`\\b${v}(?:\\??\\.|\\s+as\\s+unknown\\s+as\\s+\\w+\\)\\.)(\\w+)\\(`, "g"))) {
          if (!/\.catch\(/.test(l.slice(m.index)) && !/\btry \{/.test(l.slice(0, m.index))) falla(G, f, i + 1, `«${v}.${m[1]}(…)» sin .catch ni try: una cáscara de antes sin ese método rompería la página`);
        }
      });
    }
  },

  /* ── 8e · Lo nativo de cada app: la ruta del Repartidor, la Puerta, los boletos y los cupones (fase8-apps.md §4 8e). Al revés: alreves8e. ── */

  /* 8e · La ubicación del repartidor solo se guarda con una entrega ACTIVA de ESE repartidor en ESA ciudad, y solo empieza con el paso que inicia
     la entrega. Dos paredes: lib/ruta.ts (token de esa entrega guardado como huella, ruta_activa antes de insertar, velocidad imposible) y la base
     (0128: ruta_activa en el trigger de delivery_positions, solo inserción). Solo lib/ruta.ts escribe la ruta; solo el paso del repartidor la
     abre; el POST no usa la cookie (solo el token); el teléfono deja de compartir cuando el servidor dice que terminó (web, Android, iOS).
     Al revés: quitar ruta_activa del trigger o de guardarPosiciones, abrir la ruta desde otro archivo, leer la sesión en el POST, o no parar
     con 410 → falla. */
  ubicacionSoloEntregaActiva() {
    const G = "ubicacionSoloEntregaActiva", M = "packages/db/migrations/0128_ruta_en_vivo.sql", L = "apps/web/lib/ruta.ts", RT = "apps/web/app/api/ruta/posicion/route.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la ruta");
    const m = readFileSync(M, "utf8");
    const act = /create or replace function ruta_activa\([\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    for (const [re, que] of [[/t\.sharing_until is null/, "la ruta abierta"], [/t\.rider_user_id = rider/, "de ese repartidor"], [/o\.status = 'confirmed'/, "la entrega sin terminar"], [/coalesce\(o\.stage, ''\) <> 'delivered'/, "no entregada"],
      [/o\.city_id = ciudad/, "de esa ciudad"], [/t\.city_id = ciudad/, "la ruta de esa ciudad"], [/d\.user_id = rider and d\.status = 'active'/, "el repartidor activo de esa entrega"], [/d\.id = t\.driver_id/, "el mismo repartidor que la empezó"]])
      if (!re.test(act)) falla(G, M, 0, `ruta_activa revisa ${que}`);
    const tr = /create or replace function delivery_positions_antes\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/if tg_op = 'UPDATE' then raise exception/.test(tr)) falla(G, M, 0, "delivery_positions es solo de inserción");
    if (!/if not ruta_activa\(new\.operation_id, new\.rider_user_id, new\.city_id\) then raise exception/.test(tr)) falla(G, M, 0, "la base rechaza una posición sin entrega activa de ese repartidor en esa ciudad");
    if (!/cfg_int\('ubic_vel_max_mps'\)/.test(tr) || !/st_dwithin\(new\.geom, c\.center/.test(tr) || !/new\.at < t\.sharing_from/.test(tr)) falla(G, M, 0, "la base rechaza velocidad imposible, fuera de la ciudad y de antes de empezar");
    if (!/create trigger delivery_positions_antes before insert or update or delete on delivery_positions/.test(m)) falla(G, M, 0, "el trigger de las posiciones");
    if (!/create trigger operations_ruta after update of status, stage, driver_id on operations/.test(m)) falla(G, M, 0, "la entrega cierra su ruta sola al entregar, cancelar o cambiar de repartidor");
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/ruta.ts");
    const l = sinComent(L), gp = cuerpoFn(l, "guardarPosiciones");
    if (!/where t\.token_hash = \$1 and t\.sharing_until is null/.test(gp) || !/huella\(token\)/.test(gp)) falla(G, L, 0, "guardarPosiciones busca la ruta abierta por la huella del token");
    const iAct = gp.search(/ruta_activa\(/), iIns = gp.search(/insertar\(ok\)/);
    if (iAct < 0 || iIns < 0 || iAct > iIns) falla(G, L, 0, "guardarPosiciones revisa ruta_activa ANTES de guardar");
    if (!/m \/ seg > vmax/.test(gp) || !/x\.at < desde/.test(gp) || !/> 100_000/.test(gp)) falla(G, L, 0, "guardarPosiciones descarta velocidad imposible, de antes de empezar y fuera de la ciudad");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === L) continue;
      const t = sinComent(f);
      if (/(insert into|update|delete from) delivery_(positions|tracks)\b/.test(t)) falla(G, f, 0, "solo lib/ruta.ts escribe la ruta del repartidor");
      // 9n (L1267): «Aceptar» una oferta con cuenta regresiva es el paso que inicia la ruta (lib/repartidor-ofertas.ts aceptarOferta, solo «empezar»).
      if (/\bempezarRuta\(|\bempezar\(c, /.test(t) && f !== "apps/web/lib/repartidor.ts") {
        const ofe = f === "apps/web/lib/repartidor-ofertas.ts", ac = ofe ? cuerpoFn(t, "aceptarOferta") : "", fuera = ofe ? t.replace(ac, "") : t;
        if (!ofe || /\bempezarRuta\(|\bempezar\(c, /.test(fuera) || [...ac.matchAll(/empezarRuta\(c, f\.op, userId, "(\w+)"\)/g)].map((x) => x[1]).join(",") !== "empezar")
          falla(G, f, 0, "la ruta solo la abre el paso del repartidor (lib/repartidor.ts) o «Aceptar» la oferta (aceptarOferta, «empezar»)");
      }
      if (/\bcompartirRuta\(/.test(t) && !["apps/web/app/repartidor/Repartidor.tsx", "apps/web/lib/nativo/ruta.ts"].includes(f)) falla(G, f, 0, "el teléfono empieza a compartir solo desde el Repartidor, con el token del servidor");
    }
    const R = existsSync("apps/web/lib/repartidor.ts") ? sinComent("apps/web/lib/repartidor.ts") : "";
    const ps = cuerpoFn(R, "pasoRepartidor"), usos = [...ps.matchAll(/empezarRuta\(c, o\.id, userId, "(\w+)"\)/g)].map((x) => x[1]);
    if (usos.sort().join(",") !== "empezar,recogi") falla(G, "apps/web/lib/repartidor.ts", 0, "la ruta se abre en «Voy por el pedido» y en «Recogí», y en ningún otro paso");
    if (existsSync(RT)) { const r = sinComent(RT); if (/\byo\(\)|cookies|mismoOrigen/.test(r) || !/Bearer \(\[A-Za-z0-9_-\]\{43\}\)/.test(r)) falla(G, RT, 0, "el POST de posiciones solo acepta el token de la entrega (sin la sesión del navegador)"); }
    else falla(G, RT, 0, "falta el POST de posiciones");
    const W = existsSync("apps/web/lib/nativo/ruta.ts") ? sinComent("apps/web/lib/nativo/ruta.ts") : "";
    if (!/r\.status === 401 \|\| r\.status === 410 \|\| j\.activa === false\) \{ pararWeb\(\)/.test(W)) falla(G, "apps/web/lib/nativo/ruta.ts", 0, "la web deja de compartir cuando el servidor dice que la entrega terminó");
    const J = "apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaServicio.java", S = "apps/mobile/plugins/tl-ruta/ios/TLRutaPlugin.swift";
    if (!existsSync(J) || !/if \(st == 401 \|\| st == 410 \|\| !activa\) \{[^}]*terminar\(\)/.test(readFileSync(J, "utf8"))) falla(G, J, 0, "Android deja de compartir con 401/410 o «activa: false»");
    if (!existsSync(S) || !/if h\.statusCode == 401 \|\| h\.statusCode == 410 \|\| !activa \{ self\.limpiar\(\)/.test(readFileSync(S, "utf8"))) falla(G, S, 0, "iOS deja de compartir con 401/410 o «activa: false»");
    if (existsSync(S) && /requestAlwaysAuthorization/.test(readFileSync(S, "utf8"))) falla(G, S, 0, "nunca el permiso «Siempre»");
  },

  /* 8e · La ruta la ven solo tres: el cliente de ESE pedido (desde «Recogí», solo la última posición), el negocio de ESE pedido (con «Hoy y
     pedidos») y el Super Admin con un motivo que queda en la auditoría ANTES de ver nada. Solo lib/ruta.ts lee la ruta; el SSE de una entrega
     ajena (o antes de «Recogí») contesta 404, igual para todos. Al revés: quitar el user_id del cliente, el accesoPanel del SSE, el motivo o
     auditar después de leer, o leer delivery_positions en otro archivo → falla. */
  rutaSoloDeLosTres() {
    const G = "rutaSoloDeLosTres", L = "apps/web/lib/ruta.ts", V = "apps/web/app/api/ruta/vivo/route.ts";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/ruta.ts");
    const l = sinComent(L);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === L) continue;
      if (/\bdelivery_positions\b|\bdelivery_tracks\b|\blast_geom\b/.test(sinComent(f))) falla(G, f, 0, "solo lib/ruta.ts lee la ruta del repartidor");
    }
    const cl = cuerpoFn(l, "rutaCliente");
    if (!/user_id = \$2/.test(cl) || !/ubic_cliente_desde !== 1/.test(cl) || !/vista\(o\.id, false, true\)/.test(cl)) falla(G, L, 0, "el cliente: solo SU pedido, si ubic_cliente_desde lo deja, sin rastro y desde «Recogí»");
    if (!/if \(desdeCliente && !t\.cliente\) return null/.test(cuerpoFn(l, "vista"))) falla(G, L, 0, "antes de «Recogí» el cliente no ve nada");
    if (!/business_id = \$2/.test(cuerpoFn(l, "rutaNegocio"))) falla(G, L, 0, "el negocio: solo SU pedido");
    const ad = cuerpoFn(l, "rutaAdmin");
    if (!/s\.puede\("tx", "ver"\)/.test(ad) || !/m\.length < 10/.test(ad) || !/o\.city_id = any\(\$2::text\[\]\)/.test(ad)) falla(G, L, 0, "el Super Admin: permiso tx:ver, sus ciudades y un motivo");
    const iA = ad.search(/await auditar\(c, \{ actor: s\.id, action: "ruta\.ver"/), iP = ad.search(/from delivery_positions/);
    if (iA < 0 || iP < 0 || iA > iP) falla(G, L, 0, "el motivo queda en la auditoría ANTES de leer las posiciones");
    if (!existsSync(V)) return falla(G, V, 0, "falta el SSE de la ruta");
    const v = sinComent(V);
    if (!/accesoPanel\(negocio, "ord"\)\) \? rutaNegocio\(negocio, pedido\)/.test(v) || !/rutaCliente\(u\.id, pedido\)/.test(v)) falla(G, V, 0, "el SSE revisa quién mira (el negocio con «Hoy y pedidos» o el cliente del pedido) en cada cambio");
    if (/status: 40[13]\b/.test(v) || !/status: 404/.test(v)) falla(G, V, 0, "una entrega ajena es 404, igual para todos (no dice si existe)");
    for (const f of ["apps/web/app/admin/acciones-tx.ts"]) if (existsSync(f) && !/staff\(\)[\s\S]{0,120}s\.puede\("tx", "ver"\)[\s\S]{0,200}rutaAdmin\(s,/.test(sinComent(f))) falla(G, f, 0, "ver el recorrido desde Transacciones pide el permiso y pasa el motivo");
  },

  /* 8e · Las posiciones se borran a los ubic_retener_dias (14 por defecto, máximo 90) y la entrega queda con su resumen; nada más se borra. La
     base solo deja borrar lo vencido; el barrido corre la purga; el teléfono borra su cola al terminar. Al revés: quitar la purga del barrido,
     dejar borrar lo no vencido o subir el máximo → falla. */
  posicionesConPurga() {
    const G = "posicionesConPurga", M = "packages/db/migrations/0128_ruta_en_vivo.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la ruta");
    const m = readFileSync(M, "utf8"), k = catalogoConfig().find((x) => x.k === "ubic_retener_dias");
    if (!k || k.b > 90 || k.d !== 14) falla(G, M, 0, "ubic_retener_dias: 14 días por defecto y nunca más de 90 (§6 #14)");
    const tr = /create or replace function delivery_positions_antes\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/if old\.received_at >= now\(\) - make_interval\(days => cfg_int\('ubic_retener_dias'\)\) then\s+raise exception/.test(tr)) falla(G, M, 0, "la base solo deja borrar posiciones vencidas");
    const pu = /create or replace function ruta_purgar\([\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/received_at < now\(\) - make_interval\(days => cfg_int\('ubic_retener_dias'\)\)/.test(pu) || !/last_geom = null/.test(pu)) falla(G, M, 0, "ruta_purgar borra lo vencido y deja la entrega solo con su resumen");
    if (!/ruta_purgar\(5000\)/.test(sinComent("apps/web/lib/ruta.ts"))) falla(G, "apps/web/lib/ruta.ts", 0, "purgarRutas corre ruta_purgar");
    if (!/\["ruta", async \(\) => \(await import\("\.\/ruta"\)\)\.purgarRutas\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "el barrido central corre la purga de la ruta");
    const J = "apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaServicio.java";
    if (existsSync(J) && !/public void onDestroy\(\)[\s\S]*?archivo\(\)\.delete\(\)/.test(readFileSync(J, "utf8"))) falla(G, J, 0, "Android borra su cola del teléfono al dejar de compartir");
    if (existsSync(J) && !/getNoBackupFilesDir\(\)/.test(readFileSync(J, "utf8"))) falla(G, J, 0, "la cola sin señal vive fuera de la copia");
  },

  /* 8e · El nativo manda la ubicación SOLO al servidor de la cáscara (capacitor.config: plugins.TLRuta.servidor, de apps.json), nunca a una
     dirección que diga la página (una página o un marco ajeno no pueden desviar la ubicación). La única excepción es el humo del CI en un build
     de prueba: Android depurable con 10.0.2.2/127.0.0.1, iOS #if DEBUG con 127.0.0.1. Al revés: aceptar «url» de la página o quitar el candado
     del build de prueba → falla. */
  rutaSoloNuestroServidor() {
    const G = "rutaSoloNuestroServidor", P = "apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaPlugin.java", S = "apps/mobile/plugins/tl-ruta/ios/TLRutaPlugin.swift", SV = "apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaServicio.java";
    if (!existsSync(P) || !existsSync(S) || !existsSync(SV)) return falla(G, P, 0, "falta TLRuta (Android e iOS)");
    const p = readFileSync(P, "utf8"), s = readFileSync(S, "utf8"), sv = readFileSync(SV, "utf8");
    const strs = [...p.matchAll(/call\.getString\("(\w+)"/g)].map((x) => x[1]);
    for (const x of strs) if (!["token", "entrega", "negocio", "servidorPrueba"].includes(x)) falla(G, P, 0, `TLRuta no recibe «${x}» de la página`);
    if (!/getConfig\(\)\.getString\("servidor"/.test(p)) falla(G, P, 0, "Android: el servidor sale de la configuración de la cáscara");
    if (!/if \(prueba != null && depurable\(\)\)/.test(p) || !/h\.equals\("10\.0\.2\.2"\) \|\| h\.equals\("127\.0\.0\.1"\)/.test(p)) falla(G, P, 0, "Android: servidorPrueba solo en un build depurable y hacia el emulador");
    if (!/new URL\(servidor \+ "\/api\/ruta\/posicion"\)/.test(sv) || (sv.match(/new URL\(/g) ?? []).length !== 1) falla(G, SV, 0, "Android: un solo destino, el servidor de la cáscara");
    const ss = [...s.matchAll(/call\.getString\("(\w+)"/g)].map((x) => x[1]);
    for (const x of ss) if (!["token", "entrega", "servidorPrueba"].includes(x)) falla(G, S, 0, `TLRuta (iOS) no recibe «${x}» de la página`);
    if (!/getConfig\(\)[\s\S]{0,80}getString\("servidor"/.test(s)) falla(G, S, 0, "iOS: el servidor sale de la configuración de la cáscara");
    if (!/#if DEBUG\s+if let p = call\.getString\("servidorPrueba"\)[\s\S]*?#endif/.test(s)) falla(G, S, 0, "iOS: servidorPrueba solo en Debug");
    if (!/URL\(string: servidor \+ "\/api\/ruta\/posicion"\)/.test(s)) falla(G, S, 0, "iOS: un solo destino, el servidor de la cáscara");
    // HTTP sin cifrar solo en depuración y solo hacia el emulador (el humo); nunca en release ni en un sabor.
    const NS = "apps/mobile/android/app/src/debug/res/xml/red_humo.xml";
    for (const d of readdirSync("apps/mobile/android/app/src")) {
      const x = `apps/mobile/android/app/src/${d}/AndroidManifest.xml`;
      if (d !== "debug" && existsSync(x) && /networkSecurityConfig/.test(readFileSync(x, "utf8"))) falla(G, x, 0, "la excepción de HTTP es solo del build de depuración");
    }
    if (existsSync(NS)) { const n = readFileSync(NS, "utf8"), doms = [...n.matchAll(/<domain[^>]*>([^<]+)<\/domain>/g)].map((m) => m[1]);
      if (!/<base-config cleartextTrafficPermitted="false"/.test(n) || doms.some((d) => !["10.0.2.2", "127.0.0.1"].includes(d))) falla(G, NS, 0, "en depuración, HTTP solo hacia el emulador (10.0.2.2, 127.0.0.1)"); }
  },

  /* 8e · Compartir y la háptica pasan por el puente (la hoja nativa y el motor del sistema en la app; lo del navegador en la web): nadie más
     llama a navigator.share ni a navigator.vibrate (en el WebView de Android navigator.share no existe y la app solo copiaba el enlace). Al
     revés: volver a llamar navigator.share en la ficha del negocio → falla. */
  compartirPorElPuente() {
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?)$/.test(f)) continue;
      const t = sinComent(f);
      if (/\bnavigator\.share\b|\bn\?\.share\(/.test(t) && f !== "apps/web/lib/nativo/compartir.ts") falla("compartirPorElPuente", f, 0, "compartir va por lib/nativo/compartir.ts (la hoja del sistema en la app)");
      if (/\bnavigator\.vibrate\b/.test(t) && f !== "apps/web/lib/nativo/haptica.ts") falla("compartirPorElPuente", f, 0, "la vibración va por lib/nativo/haptica.ts (la háptica del sistema en la app)");
    }
  },

  /* 8e · El brillo al máximo se devuelve siempre: solo useBrilloQr lo sube y su limpieza lo baja (salir de la pantalla); el nativo además lo
     devuelve al salir de la app. Al revés: llamar brilloMaximo(true) en una pantalla, o quitar el brilloMaximo(false) de la limpieza → falla. */
  brilloSeDevuelve() {
    const G = "brilloSeDevuelve", P = "apps/web/lib/nativo/pantalla.ts";
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== P && /\bbrilloMaximo\(/.test(sinComent(f))) falla(G, f, 0, "el brillo lo sube y lo baja useBrilloQr (lib/nativo/pantalla.ts)");
    const b = existsSync(P) ? cuerpoFn(sinComent(P), "useBrilloQr") : "";
    if (!/void brilloMaximo\(true\)/.test(b) || !/return \(\) => \{[^}]*void brilloMaximo\(false\)/.test(b)) falla(G, P, 0, "useBrilloQr sube el brillo y lo devuelve al salir");
    const S = "apps/mobile/plugins/tl-pantalla/ios/TLPantallaPlugin.swift";
    const sw = existsSync(S) ? readFileSync(S, "utf8") : "", sal = /@objc private func alSalir\(\) \{([\s\S]*?)\n    \}/.exec(sw)?.[1] ?? "";
    if (!/selector: #selector\(alSalir\), name: UIApplication\.willResignActiveNotification/.test(sw) || !/UIScreen\.main\.brightness = b/.test(sal)) falla(G, S, 0, "iOS devuelve el brillo al salir de la app");
  },

  /* 8e · Fijar la Puerta en la pantalla solo después de que la persona lo confirma (y el sistema lo vuelve a confirmar: startLockTask sin ser
     dueño del dispositivo); en iOS no se intenta (Acceso guiado). Al revés: llamar fijarPantalla() al abrir la Puerta → falla. */
  fijarConConfirmacion() {
    const G = "fijarConConfirmacion", P = "apps/web/app/(puerta)/puerta/Puerta.tsx";
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== P && f !== "apps/web/lib/nativo/pantalla.ts" && /\bfijarPantalla\(/.test(sinComent(f))) falla(G, f, 0, "solo la Puerta fija la pantalla, después de confirmarlo");
    if (!existsSync(P)) return;
    const t = sinComent(P), i = t.indexOf("fijarPantalla()"), c = t.lastIndexOf('if (fij === "pregunta")', i);
    if (i < 0 || c < 0 || t.slice(c, i).includes("} else")) falla(G, P, 0, "fijarPantalla() solo en el botón de la confirmación («Fijar la pantalla»)");
    const J = "apps/mobile/plugins/tl-pantalla/android/com/tolatino/plugins/TLPantallaPlugin.java";
    if (existsSync(J) && /setLockTaskPackages|DevicePolicyManager/.test(readFileSync(J, "utf8"))) falla(G, J, 0, "sin MDM: la fijación de pantalla del sistema, que la persona confirma");
    const S = "apps/mobile/plugins/tl-pantalla/ios/TLPantallaPlugin.swift";
    if (existsSync(S) && /requestGuidedAccessSession|UIAccessibility\.requestGuidedAccess/.test(readFileSync(S, "utf8"))) falla(G, S, 0, "iOS no se fija solo (Acceso guiado lo enciende la persona)");
  },

  /* 8g · El QR del pase de Wallet es EXACTAMENTE el QR firmado del boleto (6c): el pase lo toma de la misma vista que la pantalla del boleto
     (boletoParaPase → vistaBoleto), nunca firma ni arma uno por su cuenta; así la Puerta lo valida igual con y sin señal. Apple lo pone en
     barcodes[].message (QR, iso-8859-1) y Google en barcode.value (QR_CODE). Anulado: ninguno. Al revés: firmar en lib/pases, poner el código
     humano en el mensaje o armar el pase sin vistaBoleto → falla. */
  paseMismoQr() {
    const G = "paseMismoQr", P = "apps/web/lib/pases/pases.ts", A = "apps/web/lib/pases/apple.ts", GO = "apps/web/lib/pases/google.ts", B = "apps/web/lib/boletos.ts";
    for (const f of codigo.filter((x) => /^apps\/web\/lib\/pases\/.*\.ts$/.test(x))) {
      const t = sinComent(f);
      if (/boletos-qr|\bfirmarQR\b|\bmatrizQR\b|\bqr_ver\b|["'`]TL1\.|\bqr_keys\b|QR_LLAVE/.test(t)) falla(G, f, 0, "el pase no firma ni arma un QR: lo toma de vistaBoleto (boletoParaPase)");
    }
    if (!existsSync(P) || !existsSync(A) || !existsSync(GO)) return falla(G, P, 0, "faltan lib/pases/pases.ts, apple.ts o google.ts");
    const cp = cuerpoFn(sinComent(P), "contenidoPase");
    if (!/const B = await boletoParaPase\(p\.tid\)/.test(cp) || !/const qr = p\.voided \? null : es\.qr;/.test(cp) || !/if \(es\.qr !== en\.qr\) throw/.test(cp) || !/\bqr, anulado: p\.voided/.test(cp)) falla(G, P, 0, "contenidoPase: el QR es el de vistaBoleto (es.qr, igual en los dos idiomas) y ninguno si el pase está anulado");
    const bp = cuerpoFn(sinComent(B), "boletoParaPase");
    if (!/es: await vistaBoleto\(b, true, !es\.pasado\), en: await vistaBoleto\(b, false, !en\.pasado\)/.test(bp)) falla(G, B, 0, "boletoParaPase usa vistaBoleto, la MISMA vista de la pantalla del boleto");
    const a = cuerpoFn(sinComent(A), "paseJson");
    if (!/if \(c\.qr && !c\.anulado\) json\.barcodes = \[\{ format: "PKBarcodeFormatQR", message: c\.qr, messageEncoding: "iso-8859-1", altText: c\.codigo \}\];/.test(a) || /\bbarcode:/.test(a)) falla(G, A, 0, "Apple: barcodes con message = c.qr (QR, iso-8859-1), solo si hay QR y no está anulado");
    const o = cuerpoFn(sinComent(GO), "objeto");
    if (!/if \(c\.qr && !c\.anulado\) b\.barcode = \{ type: "QR_CODE", value: c\.qr, alternateText: c\.codigo \};/.test(o) || /rotatingBarcode/.test(o)) falla(G, GO, 0, "Google: barcode.value = c.qr (QR_CODE), solo si hay QR y no está anulado");
  },

  /* 8g · Todo cambio del boleto toca su pase EN LA MISMA ACCIÓN que ya avisa: (1) en la base, los triggers de 0129 (tickets: estado, versión del
     QR, dueño, nombre; event_dates: fecha, hora, cancelar; events: nombre, lugar, cancelar) llaman pase_tocar() en la misma transacción, que
     anula lo que ya no vale (anulado, devuelto, transferido, otro dueño, fecha o evento cancelados) y actualiza lo demás; solo pase_tocar sube
     la versión. (2) Ninguna escritura de un boleto cambia una columna que el trigger no mira. (3) Toda función de la app que cambia un boleto,
     una fecha o un evento (fuera de la transacción de otro) llama pasesPronto() para que el aviso salga ya. Al revés: sacar holder_name del
     trigger, anular sin mirar «replaced», escribir admits de un boleto o quitar pasesPronto() de transferir → falla. */
  paseSigueAlBoleto() {
    const G = "paseSigueAlBoleto", M = "packages/db/migrations/0129_pases_wallet.sql";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de los pases");
    const m = readFileSync(M, "utf8"), vigila = /create trigger tickets_pase after update of ([a-z_, ]+) on tickets for each row/.exec(m)?.[1]?.split(/,\s*/) ?? [];
    for (const c of ["status", "qr_ver", "holder_user_id", "holder_name"]) if (!vigila.includes(c)) falla(G, M, 0, `el trigger de los pases mira ${c} del boleto`);
    if (!/create trigger event_dates_pase after update of starts_at, ends_at, doors_at, local_date, status on event_dates/.test(m)) falla(G, M, 0, "el trigger de los pases mira la fecha, la hora y el estado de event_dates");
    if (!/create trigger events_pase after update of title, venue_mode, venue_name, venue_address, status on events/.test(m)) falla(G, M, 0, "el trigger de los pases mira el nombre, el lugar y el estado del evento");
    const pt = ultimaFn("pase_tocar");
    for (const [re, que] of [[/t\.status in \('void', 'refunded', 'replaced'\) then 'boleto'/, "anulado, devuelto o transferido"], [/t\.holder_user_id is distinct from p\.issued_to then 'dueno'/, "otro dueño"],
      [/e\.status = 'cancelled' then 'evento'/, "evento cancelado"], [/d\.status = 'cancelled' then 'fecha'/, "fecha cancelada"], [/version = p\.version \+ 1/, "sube la versión"], [/perform set_config\('tl\.pase', 'si', true\)/, "con la marca de la base"]])
      if (!re.test(pt)) falla(G, M, 0, `pase_tocar: ${que}`);
    if (!/coalesce\(current_setting\('tl\.pase', true\), ''\) <> 'si' then\s+raise exception/.test(ultimaFn("ticket_passes_antes"))) falla(G, M, 0, "la versión y el estado de un pase solo los cambia pase_tocar (marca tl.pase)");
    // (2) Lo que una escritura cambia de un boleto, el trigger lo mira (más lo que siempre acompaña al estado).
    const OK = new Set([...vigila, "void_reason", "replaced_by", "updated_at"]);
    const textos = [...codigo.filter((f) => /^apps\/web\/.*\.tsx?$/.test(f)).map((f) => [f, sinComent(f)]),
      ...readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).map((x) => [`packages/db/migrations/${x}`, readFileSync(`packages/db/migrations/${x}`, "utf8").replace(/--.*$/gm, "")])];
    for (const [f, t] of textos) for (const u of t.matchAll(/update tickets set ([\s\S]*?)\s+(?:where|from|returning)\b/g)) {
      const cols = u[1].split(/,(?![^(]*\))/).map((x) => x.trim().split(/\s*=/)[0].trim());
      for (const c of cols) if (!OK.has(c)) falla(G, f, 0, `«update tickets set ${c}»: el pase de Wallet no mira esa columna (súmala al trigger tickets_pase o no la cambies)`);
    }
    // (3) pasesPronto() en cada función que cambia un boleto, una fecha o un evento (las que reciben la transacción de otro no: lo hace quien la abre).
    const CAMBIA = /update tickets set [^`]*\b(status|qr_ver|holder_user_id|holder_name)\s*=|update event_dates set [^`]*\b(starts_at|ends_at|status)\s*=|update events set (\$\{|[^`]*\b(status|title|venue_name|venue_address|venue_mode)\s*=)/;
    for (const f of codigo.filter((x) => /^apps\/web\/lib\/[^/]+\.ts$/.test(x))) {
      // Cada función de primer nivel hasta la siguiente (una de una sola línea no se come a la de abajo).
      const t = sinComent(f), ms = [...t.matchAll(/\n(?:export )?(?:async )?function (\w+)\(([^)]*)/g)], fns = ms.map((x, i) => ({ n: x[1], p: x[2], c: t.slice(x.index, ms[i + 1]?.index ?? t.length) }));
      const ayudantes = new Set(fns.filter((x) => CAMBIA.test(x.c) && /^c\s*:/.test(x.p.trim())).map((x) => x.n));
      for (const x of fns) {
        if (/^c\s*:/.test(x.p.trim())) continue;
        const cambia = CAMBIA.test(x.c) || [...ayudantes].some((h) => new RegExp(`\\b${h}\\(c\\b`).test(x.c));
        if (cambia && !/\bpasesPronto\(\)/.test(x.c)) falla(G, f, 0, `«${x.n}» cambia un boleto, una fecha o un evento y no llama pasesPronto() (el pase de Wallet tiene que salir con el mismo aviso)`);
      }
    }
    const PR = "apps/web/lib/pases/pronto.ts";
    if (!existsSync(PR) || !/import\("\.\/pases"\)\.then\(\(m\) => m\.pasesPronto\(\)\)/.test(sinComent(PR))) falla(G, PR, 0, "pasesPronto() despierta al trabajador de los pases");
    if (!/\["pases", async \(\) => \(await import\("\.\/pases\/pases"\)\)\.barrerPases\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "el barrido reintenta los avisos de los pases");
  },

  /* 8g · El servicio web de Apple Wallet solo responde por un pase con el token de ESE pase («Authorization: ApplePass <token>»): se busca el
     pase por su tipo y su serie y se compara la huella del token en tiempo constante; un token ajeno, viejo o de otro pase → 401, igual que
     un pase que no existe. El token nunca se guarda (solo su sha256). Ninguna ruta del servicio usa cookies ni la sesión. La lista de series
     (sin token, por el diseño de Apple) solo devuelve series. Al revés: buscar el pase solo por serie, comparar con ===, quitar el 401 de una
     ruta o devolver el pase entero en la lista → falla. */
  tokenDePase() {
    const G = "tokenDePase", M = "packages/db/migrations/0129_pases_wallet.sql", P = "apps/web/lib/pases/pases.ts", R = "apps/web/app/api/pases/v1";
    if (existsSync(M)) { const m = readFileSync(M, "utf8"); if (!/auth_token_hash\s+text check \(auth_token_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/.test(m) || /\bauth_token\s+(text|bytea)/.test(m)) falla(G, M, 0, "el token del pase se guarda solo como huella (sha256 hex)"); }
    if (!existsSync(P)) return falla(G, P, 0, "falta lib/pases/pases.ts");
    const p = sinComent(P), a = cuerpoFn(p, "autorizarPase");
    if (!/\^ApplePass \(\[A-Za-z0-9_-\]\{16,128\}\)\$/.test(a) || !/where p\.serial = \$1 and p\.pass_type_id = \$2 and p\.platform = 'apple'/.test(a) || !/timingSafeEqual\(a, b\)/.test(a) || !/Buffer\.from\(huellaToken\(t\), "hex"\)/.test(a) || /===\s*p\.h\b|p\.h\s*===/.test(a))
      falla(G, P, 0, "autorizarPase: «ApplePass <token>», el pase por tipo Y serie, huella comparada en tiempo constante");
    if (!/return \{ serialNumbers: r\.map\(\(x\) => x\.serial\), lastUpdated:/.test(cuerpoFn(p, "seriesCambiadas")) || !/where r\.device_library_id = \$1 and r\.removed_at is null/.test(cuerpoFn(p, "seriesCambiadas"))) falla(G, P, 0, "la lista sin token devuelve solo series de los registros de ESE teléfono");
    const rutas = { [`${R}/devices/[dispositivo]/registrations/[tipo]/[serie]/route.ts`]: ["POST", "DELETE"], [`${R}/passes/[tipo]/[serie]/route.ts`]: ["GET"] };
    for (const [f, ms] of Object.entries(rutas)) {
      if (!existsSync(f)) { falla(G, f, 0, "falta la ruta del servicio web"); continue; }
      const t = sinComent(f);
      for (const mt of ms) {
        const c = cuerpoFn(t, mt);
        const iA = c.search(/const p = await autorizarPase\(tipo, serie, req\.headers\.get\("authorization"\)\);\s+if \(!p\) return [^\n]*401/), iU = c.search(/\b(registrar|darDeBaja|paseAlDia)\(p,/);
        if (iA < 0 || iU < 0 || iA > iU) falla(G, f, 0, `${mt}: autoriza con el token de ESE pase (401 si no) antes de tocar nada`);
      }
    }
    for (const f of codigo.filter((x) => x.startsWith(`${R}/`))) if (/\byo\(\)|cookies\(|mismoOrigen|staff\(\)/.test(sinComent(f))) falla(G, f, 0, "el servicio web de Wallet no usa la sesión ni cookies: solo el token del pase");
    for (const f of codigo.filter((x) => /^apps\/web\/.*\.tsx?$/.test(x) && x !== P && !x.startsWith(`${R}/`))) if (/\b(registrar|darDeBaja|paseAlDia)\s*\(\s*p\b|\btokenPase\(|\bauthenticationToken\b/.test(sinComent(f)) && !/lib\/pases\/apple\.ts$/.test(f)) falla(G, f, 0, "el token del pase y lo que pide un pase autorizado viven solo en lib/pases y el servicio web");
  },

  /* ── 8d · Entrar con Face ID o huella: llaves de acceso (fase8-apps.md §4 8d). Al revés: alreves8d. ── */

  /* 8d · Un reto de WebAuthn sirve UNA vez y poco tiempo. La base (0130): solo la huella del reto (nunca el reto), vence a los minutos, used_at
     pasa de null a una hora una sola vez («ya se usó») y no se alarga. La app (lib/llaves/llaves.ts): gastarReto lo consume en UNA escritura
     atómica (sin usar, sin vencer, de este propósito, dispositivo y cuenta) con `returning`, y registrar/entrar lo gastan ANTES de verificar la
     firma (un intento fallido también lo gasta). Nadie más escribe en webauthn_challenges. Al revés: quitar `used_at is null` o
     `expires_at > now()` de gastarReto, verificar antes de gastar, o borrar el «ya se usó» del trigger → falla. */
  retoUnUso() {
    const G = "retoUnUso", M = "packages/db/migrations/0130_llaves_acceso.sql", L = "apps/web/lib/llaves/llaves.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, M, 0, "faltan la migración 0130 o lib/llaves/llaves.ts");
    const m = readFileSync(M, "utf8"), fn = ultimaFn("webauthn_challenges_antes");
    if (!/challenge_hash text not null unique check \(challenge_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/.test(m) || /\bchallenge\s+(text|bytea)\b/.test(m)) falla(G, M, 0, "el reto se guarda solo como huella (sha256 hex)");
    if (!/expires_at <= created_at \+ interval '10 minutes'/.test(m)) falla(G, M, 0, "un reto vive minutos, no más");
    if (!/if old\.used_at is not null then raise exception 'reto: ya se usó \(un uso\)'/.test(fn) || !/if new\.used_at is null or old\.expires_at <= now\(\) then raise exception 'reto: vencido'/.test(fn) || !/is distinct from \(old\.purpose, old\.challenge_hash, old\.user_id, old\.device, old\.ip, old\.created_at, old\.expires_at\)/.test(fn))
      falla(G, M, 0, "webauthn_challenges: un uso, sin vencer y sin cambiar nada más (trigger)");
    const t = sinComent(L), g = cuerpoFn(t, "gastarReto");
    if (!/update webauthn_challenges set used_at = now\(\)\s+where challenge_hash = \$1 and purpose = \$2 and used_at is null and expires_at > now\(\) and device = \$3::uuid and user_id is not distinct from \$4::uuid\s+returning id/.test(g) || !/rowCount \?\? 0\) === 1/.test(g))
      falla(G, L, 0, "gastarReto: una sola escritura atómica (sin usar, sin vencer, propósito, dispositivo y cuenta) que devuelve la fila");
    for (const [fn2, ver] of [["registrar", "verifyRegistrationResponse"], ["entrar", "verificar\\("]]) {
      const c = cuerpoFn(t, fn2), iG = c.search(/await gastarReto\(reto, "(registro|entrar)"/), iV = c.search(new RegExp(ver));
      if (iG < 0 || iV < 0 || iG > iV) falla(G, L, 0, `${fn2}: el reto se gasta ANTES de verificar la firma`);
      if (!/leerCliente\(resp\.response\.clientDataJSON, "webauthn\.(create|get)"\)/.test(c)) falla(G, L, 0, `${fn2}: el reto sale del clientDataJSON del tipo correcto (y sin crossOrigin)`);
    }
    if (!/j\.crossOrigin === true/.test(cuerpoFn(t, "leerCliente"))) falla(G, L, 0, "un marco de otro origen (crossOrigin) no vale");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== L && /webauthn_challenges/.test(sinComent(f))) falla(G, f, 0, "solo lib/llaves/llaves.ts toca los retos de WebAuthn");
  },

  /* 8d · Una llave entra SOLO a su cuenta. La base: credential_id único en todo el sistema. lib/llaves/llaves.ts entrar: la llave se busca por su
     id (viva), el userHandle (si viene) tiene que ser el de la dueña (manejador = HMAC del servidor, opaco), la sesión se abre con la cuenta
     de la LLAVE (k.user_id) y el reto de entrar no lista llaves (no se adivina la cuenta). Al revés: abrir la sesión con otro id, quitar la
     comparación del userHandle o el `unique` → falla. */
  llaveDeSuCuenta() {
    const G = "llaveDeSuCuenta", M = "packages/db/migrations/0130_llaves_acceso.sql", L = "apps/web/lib/llaves/llaves.ts";
    if (!existsSync(M) || !existsSync(L)) return falla(G, M, 0, "faltan la migración 0130 o lib/llaves/llaves.ts");
    if (!/credential_id\s+text not null unique check/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "una credencial es de una sola cuenta (unique)");
    const t = sinComent(L), e = cuerpoFn(t, "entrar");
    if (!/from passkeys where credential_id = \$1 and revoked_at is null`, \[resp\.id\]/.test(e)) falla(G, L, 0, "entrar: la llave viva se busca por su id");
    if (!/Buffer\.from\(uh, "base64url"\)\.compare\(manejador\(k\.user_id\)\) !== 0/.test(e)) falla(G, L, 0, "entrar: el userHandle tiene que ser el de la dueña de la llave");
    if (!/abrirSesionEn\(c, \{ dev, ip, ua, via: "llave", passkeyId: k\.id \}/.test(e) || !/returning id, first_name, cuenta_estado\(status, status_until\) as status, status_until as until, delete_at, false as nuevo`, \[k\.user_id\]\)/.test(e))
      falla(G, L, 0, "entrar: la sesión se abre para la cuenta de la llave (k.user_id), nunca otra");
    if (/allowCredentials/.test(cuerpoFn(t, "retoEntrar"))) falla(G, L, 0, "el reto de entrar no lista llaves de nadie");
    if (!/createHmac\("sha256", secretoAuth\(\)\)\.update\(`llave:\$\{userId\}`\)/.test(t)) falla(G, L, 0, "el userHandle es un HMAC del servidor (ni el id ni el teléfono)");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== L && /\b(verifyAuthenticationResponse|verifyRegistrationResponse)\b/.test(sinComent(f))) falla(G, f, 0, "solo lib/llaves/llaves.ts verifica llaves");
  },

  /* 8d · Una llave nunca salta un bloqueo. La sesión SOLO nace en lib/cuenta.ts abrirSesionEn (dispositivo bloqueado; suspendida, baneada,
     borrándose, borrada o fusionada; borrado pedido → se cancela), y la llave entra por ahí; además mira el dispositivo y la sesión donde NACIÓ
     (bloqueados → no) y que el teléfono siga verificado (el equipo lo restableció → con el código). Al revés: insertar sesiones en otro lado,
     que entrar no llame abrirSesionEn, o quitar una de las revisiones → falla. */
  passkeyNoSaltaBloqueo() {
    const G = "passkeyNoSaltaBloqueo", C = "apps/web/lib/cuenta.ts", L = "apps/web/lib/llaves/llaves.ts";
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== C && /insert into sessions\b/.test(sinComent(f))) falla(G, f, 0, "una sesión solo nace en lib/cuenta.ts abrirSesionEn");
    if (!existsSync(C) || !existsSync(L)) return falla(G, L, 0, "faltan lib/cuenta.ts o lib/llaves/llaves.ts");
    const c = sinComent(C), a = cuerpoFn(c, "abrirSesionEn");
    const iB = a.search(/from blocked_devices where device = \$1::uuid and lifted_at is null/), iC = a.search(/await cargar\(\)/), iE = a.search(/\["suspended", "banned", "deleted_pending", "deleted", "merged"\]\.includes\(user\.status\)/),
      iU = a.search(/update users set delete_at = null, delete_reason = null where id = \$1 and status = 'active'/), iS = a.search(/insert into sessions/);
    if (iB < 0 || iC < 0 || iE < 0 || iU < 0 || iS < 0 || !(iB < iC && iC < iE && iE < iU && iU < iS)) falla(G, C, 0, "abrirSesionEn: dispositivo bloqueado → cuenta → estado → borrado pedido → sesión, en ese orden");
    if ((c.match(/insert into sessions/g) ?? []).length !== 1) falla(G, C, 0, "una sola inserción de sesión (la de abrirSesionEn)");
    if (!/return abrirSesionEn\(c, \{ dev: dev as string, ip, ua: h\.get\("user-agent"\), via: "codigo" \}/.test(cuerpoFn(c, "verificarCodigo"))) falla(G, C, 0, "el código por SMS abre la sesión con abrirSesionEn");
    const e = cuerpoFn(sinComent(L), "entrar");
    if (!/return abrirSesionEn\(c,/.test(e)) falla(G, L, 0, "la llave abre la sesión con abrirSesionEn (las mismas revisiones que el SMS)");
    if (!/from blocked_devices where device = \$1::uuid and lifted_at is null`, \[k\.created_device\]/.test(e) || !/from sessions where id = \$1::uuid and blocked`, \[k\.created_session\]/.test(e))
      falla(G, L, 0, "entrar: el dispositivo y la sesión donde nació la llave, bloqueados → no entra");
    if (!/phone_verified_at is not null`, \[k\.user_id\]\)\)\.rowCount\) return \{ error: "verificar_sms" as const \}/.test(e)) falla(G, L, 0, "entrar: verificación del teléfono restablecida → con el código");
    if (!/requireUserVerification: true/.test(e) || !/v\.authenticationInfo\.userVerified/.test(e)) falla(G, L, 0, "entrar: Face ID / huella / PIN siempre (verificación de la persona requerida)");
    const r = cuerpoFn(sinComent("apps/web/app/admin/acciones-usuarios.ts"), "restablecerVerificacion");
    if (!/quitarTodasEn\(c, u\.id\)/.test(r)) falla(G, "apps/web/app/admin/acciones-usuarios.ts", 0, "restablecer la verificación quita también las llaves");
  },

  /* 8d · Contador que retrocede = copia de la llave, pero SOLO si la firma es buena. @simplewebauthn revisa el contador ANTES que la firma: sin
     esta pared, cualquiera que sepa el id de una llave (no es secreto) mandaría basura con un contador bajo y la llave de otra persona se
     quitaría sola (lo cazó llave8d). Al revés: quitar la verificación sin contador antes de quitarPorContador → falla. */
  clonSoloConFirma() {
    const G = "clonSoloConFirma", L = "apps/web/lib/llaves/llaves.ts";
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/llaves/llaves.ts");
    const t = sinComent(L), e = cuerpoFn(t, "entrar");
    if (!/const firmaBuena = await verificar\(0\)\.then\(\(x\) => x\.verified && x\.authenticationInfo\.userVerified\)\.catch\(\(\) => false\);\s+if \(firmaBuena\) \{ await quitarPorContador\(/.test(e))
      falla(G, L, 0, "una llave se quita por contador solo después de verificar su firma");
    if ((t.match(/quitarPorContador\(/g) ?? []).length !== 2) falla(G, L, 0, "quitarPorContador se llama en un solo lugar (después de la firma)");
    const M = "packages/db/migrations/0130_llaves_acceso.sql";
    if (existsSync(M) && !/if new\.sign_count < old\.sign_count or \(new\.sign_count = old\.sign_count and old\.sign_count > 0 and new\.last_used_at is distinct from old\.last_used_at\)\s+then raise exception 'llave: el contador de firmas no retrocede \(posible clon\)'/.test(ultimaFn("passkeys_antes"))) falla(G, M, 0, "la base: el contador de firmas solo sube");
  },

  /* 8d · La llave se ofrece solo donde de verdad funciona: el RP ID y los orígenes salen del entorno (https o http://localhost, del dominio del RP
     ID), el interruptor cuenta.llaves y el origen de la petición; el cliente además exige contexto seguro y WebAuthn (o TLLlave). En el
     sandbox por HTTP en una IP: ni botón ni retos (nunca un botón roto). Las rutas de las llaves piden mismo origen. Al revés: aceptar http
     en otro host, ofrecer el botón sin `llaves` o sin `cap.entrar`, o una ruta sin cuerpo() → falla. */
  llaveSoloDondeSePuede() {
    const G = "llaveSoloDondeSePuede", K = "apps/web/lib/llaves/config.ts", N = "apps/web/lib/nativo/llave.ts", E = "apps/web/app/entrar/Entrar.tsx", R = "apps/web/app/api/cuenta/llave";
    if (!existsSync(K) || !existsSync(N)) return falla(G, K, 0, "faltan lib/llaves/config.ts o lib/nativo/llave.ts");
    const k = sinComent(K);
    if (!/const seguro = u\.protocol === "https:" \|\| \(u\.protocol === "http:" && u\.hostname === "localhost"\);/.test(k) || !/u\.hostname === rpId \|\| u\.hostname\.endsWith\(`\.\$\{rpId\}`\)/.test(k)) falla(G, K, 0, "orígenes: solo https (o http://localhost) del dominio del RP ID");
    if (!/process\.env\.PASSKEY_RP_ID/.test(k) || !/r\.web\.includes\(o\)/.test(cuerpoFn(k, "llavesAqui")) || !/key = 'cuenta\.llaves'/.test(k)) falla(G, K, 0, "llavesAqui: entorno + interruptor + el origen de esta petición");
    if (!/window\.isSecureContext === true && typeof window\.PublicKeyCredential === "function"/.test(sinComent(N))) falla(G, N, 0, "el cliente ofrece la llave solo con contexto seguro y WebAuthn");
    if (existsSync(E) && !/\{llaves && cap\.entrar && !enviado && \(/.test(sinComent(E))) falla(G, E, 0, "Entrar: el botón solo con `llaves` (servidor) y `cap.entrar` (dispositivo)");
    const L = sinComent("apps/web/lib/llaves/llaves.ts");
    for (const fn of ["retoRegistro", "registrar", "retoEntrar", "entrar"]) if (!/const r = await llavesAqui\(\);\s+if \(!r\) throw fallo\("llave_no_disponible"\)/.test(cuerpoFn(L, fn))) falla(G, "apps/web/lib/llaves/llaves.ts", 0, `${fn}: sin llavesAqui() no hay llaves`);
    for (const f of codigo.filter((x) => x.startsWith(R + "/") && x.endsWith("/route.ts"))) if (!/await cuerpo\(req\)/.test(sinComent(f))) falla(G, f, 0, "las rutas de las llaves piden mismo origen y cuerpo acotado (cuerpo())");
  },

  /* 8i · Las fichas de las tiendas dentro de sus límites y sobrias (fase8-apps.md §4 8i): cada .md (apps/mobile/tiendas/{app}/{es,en}.md) cumple
     los topes de Apple y Google (fijados aquí: si alguien los afloja, falla), sin emoji ni superlativos, con sus fuentes de docs/ayuda; fichas.json
     es lo que sale de los .md (el servidor sube ESO); la base también los exige (store_listings). Y NADA se manda a revisión: la ficha va a la
     versión EN PREPARACIÓN de Apple y Google confirma con changesNotSentForReview=true; ninguna ruta de envío a revisión existe en el código.
     Al revés: alargar un subtítulo, un emoji, «la mejor», aflojar un tope, fichas.json viejo, commit sin changesNotSentForReview, llamar a
     appStoreVersionSubmissions → falla. */
  fichaEnLimites() {
    const G = "fichaEnLimites", { json, problemas: P } = salidaFichas(), L = LIMITES_FICHAS, F = "apps/mobile/scripts/fichas.mjs", J = "apps/mobile/tiendas/fichas.json";
    for (const p of P) falla(G, p.split(":")[0], 0, p.replace(/^[^:]+: /, ""));
    if (!existsSync(J) || readFileSync(J, "utf8") !== json) falla(G, J, 0, "fichas.json no es lo que sale de los .md (corre node apps/mobile/scripts/fichas.mjs)");
    const fijos = { apple: { nombre: 30, subtitulo: 30, palabras: 100, promo: 170, descripcion: 4000, novedades: 4000 }, google: { nombre: 30, corta: 80, descripcion: 4000, novedades: 500 } };
    for (const [t, x] of Object.entries(fijos)) for (const [k, v] of Object.entries(x)) if (!(L[t]?.[k] <= v)) falla(G, F, 0, `el tope de ${t}.${k} es ${v} (las tiendas no aceptan más)`);
    if (!SUPERLATIVOS_FICHA.test("la mejor app") || !SUPERLATIVOS_FICHA.test("the best") || !SUPERLATIVOS_FICHA.test("#1")) falla(G, F, 0, "la lista de superlativos se aflojó");
    const M = "packages/db/migrations/0132_tiendas_fichas.sql";
    if (existsSync(M)) { const m = readFileSync(M, "utf8"); for (const re of [/title\s+text not null check \(char_length\(title\) between 2 and 30\)/, /subtitle\s+text check \(char_length\(subtitle\) <= 30\)/, /short_desc\s+text check \(char_length\(short_desc\) <= 80\)/, /keywords\s+text check \(octet_length\(keywords\) <= 100\)/, /promo\s+text check \(char_length\(promo\) <= 170\)/]) if (!re.test(m)) falla(G, M, 0, `la base no exige el tope: ${re.source.slice(0, 40)}…`); }
    const FS = "apps/web/lib/tiendas/fichas.ts";
    if (existsSync(FS) && (/readFileSync|\.md["'`]/.test(sinComent(FS)) || !/import FICHAS from "\.\.\/\.\.\/\.\.\/mobile\/tiendas\/fichas\.json"/.test(sinComent(FS)))) falla(G, FS, 0, "el servidor sube fichas.json (lo que revisó el guardián), no otra cosa");
    const PL = "apps/web/lib/tiendas/play.ts", AS = "apps/web/lib/tiendas/asc.ts";
    if (existsSync(PL) && !/`\$\{E\}:commit\?changesNotSentForReview=true`/.test(cuerpoFn(sinComent(PL), "subirFichasPlay"))) falla(G, PL, 0, "la ficha de Google se confirma con changesNotSentForReview=true (no se manda a revisión)");
    if (existsSync(AS) && !/q\("filter\[appStoreState\]", "PREPARE_FOR_SUBMISSION"\)/.test(cuerpoFn(sinComent(AS), "versionEnPreparacion"))) falla(G, AS, 0, "la ficha de Apple solo toca la versión en preparación");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      if (/appStoreVersionSubmissions|reviewSubmissions|reviewSubmissionItems|changesNotSentForReview=false|sendChangesForReview/.test(sinComent(f))) falla(G, f, 0, "nada se envía a revisión desde el código (Fase 9, con el OK del fundador)");
    }
  },

  /* 8i · La privacidad sale de UN inventario real y sus salidas coinciden (fase8-apps.md §3.6, §4 8i): cada columna que parece personal en las
     migraciones (teléfono, correo, geom, nombre, dirección, fotos, mensajes…) está en una categoría del inventario o en «noPersonales» con su
     porqué; lo que cita existe; rastreo siempre false; las etiquetas de Apple, el CSV de Google, salidas.json y la semilla data_inventory son lo
     que sale del inventario; el PrivacyInfo.xcprivacy de cada target es xcprivacy(app); /privacidad lee el inventario (no texto a mano). El
     patrón de columnas está fijado AQUÍ (si alguien lo afloja en el script, sigue cazando). Al revés: una columna «phone» nueva sin inventario,
     un tipo de Apple que falta en el xcprivacy, rastreo true, el CSV viejo, /privacidad sin el inventario → falla. */
  /* 9d · mapaDeDatos (reemplaza y amplía privacidadCoherente; fase9-apertura.md §3.7): además de lo de 8i (el inventario y sus salidas), UN mapa
     dice qué pasa con cada dato de una persona (packages/db/mapa-de-datos.json → data_map): toda columna que apunta a users en las migraciones
     (create table o add column) está en el mapa (de la persona o del equipo); toda tabla con una columna que parece personal está en el mapa, en
     «sinPersona» o en noPersonales; toda tabla del inventario está en el mapa; cada tabla y columna del mapa (y lo que escribe) existe; el mapa no
     tiene problemas (scripts/datos/mapa.mjs) y la semilla mapa_datos.sql es la que sale de él. Al revés (alreves9d): una tabla nueva con
     `references users` sin mapa, una columna que no existe, la semilla vieja, un valor que no está en la lista → falla. */
  mapaDeDatos() {
    const G = "mapaDeDatos", I = "apps/mobile/inventario-datos.json", MJ = "packages/db/mapa-de-datos.json";
    if (!existsSync(I)) return falla(G, I, 0, "falta el inventario de datos");
    for (const p of problemasPrivacidad()) falla(G, I, 0, p);
    const PAT = /^(phone|\w+_phone|phone_\w+|email|\w+_email|geom|\w+_geom|lat|lng|latitude|longitude|first_name|last_name|full_name|birth\w*|dob|address\w*|street\w*|photo\w*|\w+_photo\w*|body|message|selfie\w*|ssn|license\w*|plate)$/;
    const inv = JSON.parse(readFileSync(I, "utf8")), citadas = new Set(inv.categorias.flatMap((c) => c.tablas)), libres = inv.noPersonales ?? {};
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8"), cols = [];
      for (const m of t.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)) for (const l of m[2].split("\n")) { const c = l.trim().split(/\s+/)[0]; if (c && PAT.test(c)) cols.push(`${m[1]}.${c}`); }
      for (const m of t.matchAll(/alter table (\w+) add column if not exists (\w+)/g)) if (PAT.test(m[2])) cols.push(`${m[1]}.${m[2]}`);
      for (const c of cols) if (!citadas.has(c) && !(c in libres)) falla(G, `packages/db/migrations/${x}`, 0, `${c} parece un dato personal y no está en el inventario (apps/mobile/inventario-datos.json)`);
    }
    if (inv.rastreo !== false || inv.categorias.some((c) => c.rastreo === true)) falla(G, I, 0, "To'Latino no rastrea: rastreo false");
    for (const [r, c] of salidasPrivacidad()) if (!existsSync(r) || readFileSync(r, "utf8") !== c) falla(G, r, 0, "no es lo que sale del inventario (corre node apps/mobile/scripts/privacidad.mjs)");
    const A = JSON.parse(readFileSync("apps/mobile/apps.json", "utf8"));
    for (const a of A.apps) { const f = `apps/mobile/ios/Targets/${a.target}/PrivacyInfo.xcprivacy`; if (!existsSync(f) || readFileSync(f, "utf8") !== xcprivacyDe(a.key)) falla(G, f, 0, `${a.key}: el PrivacyInfo.xcprivacy no es el del inventario (corre node apps/mobile/scripts/generar.mjs)`); }
    if (!/poner\(`\$\{T\}\/PrivacyInfo\.xcprivacy`, xcprivacy\(a\.key\)\)/.test(sinComent("apps/mobile/scripts/generar.mjs"))) falla(G, "apps/mobile/scripts/generar.mjs", 0, "el xcprivacy sale de xcprivacy(app) del inventario");
    const W = "apps/web/app/(app)/privacidad/page.tsx";
    if (!existsSync(W)) falla(G, W, 0, "falta /privacidad (la piden Apple y Google)");
    else { const w = sinComent(W); if (!/import INV from "\.\.\/\.\.\/\.\.\/\.\.\/mobile\/inventario-datos\.json"/.test(w) || !/I\.categorias\.map\(/.test(w)) falla(G, W, 0, "la sección de datos de /privacidad sale del inventario"); }
    const M = "packages/db/migrations/0132_tiendas_fichas.sql";
    if (existsSync(M) && !/tracking\s+boolean not null default false check \(tracking = false\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "data_inventory: rastreo siempre false");
    // ── 9d · El mapa ──
    if (!existsSync(MJ)) return falla(G, MJ, 0, "falta el mapa de datos");
    const mapa = leerMapa(), tablas = mapa.tablas ?? {}, sinP = mapa.sinPersona ?? {};
    for (const x of problemasMapa(mapa)) falla(G, MJ, 0, x);
    if (!existsSync(SEMILLA_MAPA) || readFileSync(SEMILLA_MAPA, "utf8") !== semillaMapa(mapa)) falla(G, SEMILLA_MAPA, 0, "no es la que sale del mapa (corre node scripts/datos/mapa.mjs)");
    const enMapa = new Set(filasMapa(mapa).map((f) => `${f.tabla}.${f.columna}`)), { cols: tipos, renombre } = columnasMigraciones();
    for (const [x, tb0, co] of columnasMigraciones().refsUsers) {
      const c = `${renombre.get(tb0) ?? tb0}.${co}`;
      if (!enMapa.has(c)) falla(G, `packages/db/migrations/${x}`, 0, `${c} apunta a una persona y no está en el mapa de datos (${MJ}): qué se exporta, qué se borra y por qué se guarda`);
    }
    for (const c of inv.categorias.flatMap((k) => k.tablas)) { const tb = c.split(".")[0]; if (!tablas[tb] && !sinP[tb]) falla(G, MJ, 0, `${tb} está en el inventario (${c}) y no en el mapa de datos`); }
    for (const [tb, def] of Object.entries(tablas)) {
      const cols = tipos.get(tb);
      if (!cols) { falla(G, MJ, 0, `${tb}: esa tabla no existe en las migraciones`); continue; }
      for (const r of [...(def.reglas ?? []), ...(def.equipo ?? []).map((c) => ({ col: c }))]) {
        if (!cols.has(r.col)) falla(G, MJ, 0, `${tb}.${r.col}: esa columna no existe`);
        for (const c of Object.keys(r.set ?? {})) if (!cols.has(c)) falla(G, MJ, 0, `${tb}.${r.col}: escribe ${c}, que no existe`);
      }
    }
    for (const tb of Object.keys(sinP)) if (!tipos.get(tb)) falla(G, MJ, 0, `sinPersona: ${tb} no existe`);
  },

  /* 8i · Dentro de las apps de las tiendas no se compra Pro (Apple 3.1.3(f), Pagos de Google; fase8-apps.md §3.6, §6 #6): el panel no muestra
     botón, enlace ni precio de Pro cuando el servidor dice que es la app (compraPro, por el rótulo TLApp; en la web sí). Cada «Ver Pro» pasa
     por ctaPro; el plan dentro de la app es solo su estado; la hoja de compra pide compraPro; y el servidor rechaza comprar o volver a Pro
     desde la app aunque alguien llame a la acción. Al revés: un onCta directo a Cobros y plan, estadoPlan con un botón, planSeguir sin la
     compuerta, otra puerta a seguirConPro → falla. */
  sinCompraDigitalEnApp() {
    const G = "sinCompraDigitalEnApp", P = "apps/web/app/panel", R = "apps/web/lib/tiendas/reglas.ts";
    if (!existsSync(R) || !/export async function compraDigitalAqui\(\): Promise<boolean> \{\s+return !\(await deLaApp\(\)\);\s+\}/.test(sinComent(R))) falla(G, R, 0, "compraDigitalAqui: no en la app (el rótulo solo quita)");
    for (const f of codigo.filter((x) => x.startsWith(P + "/") && /\.tsx?$/.test(x))) {
      const t = sinComent(f);
      if (f === `${P}/pro-cta.ts`) { if (!/return c\.compraPro \? \{ cta: l, onCta: \(\) => c\.go\("pay", "plan"\) \} : \{\};/.test(t)) falla(G, f, 0, "ctaPro: el botón solo si compraPro"); continue; }
      t.split("\n").forEach((l, i) => {
        if (/onCta:\s*(\(\)\s*=>\s*)?(c\.)?(go|verPro|plan)\b/.test(l) && /"pay",\s*"plan"|verPro|onCta:\s*plan\b/.test(l) && !/c\.compraPro \? \{ cta: l, onCta: \(\) => c\.go\("pay", "plan"\) \} : \{\}/.test(l)) falla(G, f, i + 1, "«Ver Pro» con su botón directo: usa ctaPro(c, …) (dentro de las apps no se ofrece Pro)");
        if (/"pay",\s*"plan"/.test(l) && !/navIt\(|type: "tabs"|c\.compraPro \? \{ cta: l, onCta: \(\) => c\.go\("pay", "plan"\)|go\("pay", d\.cat === "NEG-FOOD" \? null : "plan"\)|ruta = \{ sec: "pay", sub: "plan"|\["cobros", "plan"\]|r\[1\] === "plan"/.test(l)) falla(G, f, i + 1, "un camino a Cobros y plan › Tu plan que no es el menú ni ctaPro");
      });
    }
    const PN = `${P}/Panel.tsx`, PLN = `${P}/Plan.tsx`, AC = `${P}/acciones-cobros.ts`, PG = `${P}/[id]/[[...r]]/page.tsx`;
    if (!/\{ui\.planHoja && plan && plan\.modo !== "apagado" && compraPro \? \(/.test(sinComent(PN))) falla(G, PN, 0, "la hoja de compra de Pro solo con compraPro");
    if (!/const fin = fechaCorta\(t\.end, d\.hoy\.tz, es\), plan = \(l: string\) => \(c\.compraPro \? \{ cta: l, onCta: \(\) => c\.go\("pay", "plan"\) \} : \{\}\);/.test(sinComent(PN))) falla(G, PN, 0, "los avisos de la prueba Pro sin botón dentro de la app");
    const pl = sinComent(PLN);
    if (!/if \(!c\.compraPro\) return estadoPlan\(c, x\);/.test(pl)) falla(G, PLN, 0, "dentro de la app, el plan es solo su estado (estadoPlan)");
    if (/setUi|planHoja|seguir\(|planSeguir|planDeshacer|planFree|acts:|cta:|PRECIO_PRO|dinero\(/.test(cuerpoFn(pl, "estadoPlan"))) falla(G, PLN, 0, "estadoPlan no compra, no cambia ni dice el precio de Pro");
    const ac = sinComent(AC);
    for (const fn of ["planSeguir", "planDeshacer"]) if (!/if \(!\(await \(await import\("@\/lib\/tiendas\/reglas"\)\)\.compraDigitalAqui\(\)\)\) return no\(/.test(cuerpoFn(ac, fn))) falla(G, AC, 0, `${fn}: el servidor no deja comprar Pro desde la app`);
    if (!/compraPro=\{await \(await import\("@\/lib\/tiendas\/reglas"\)\)\.compraDigitalAqui\(\)\}/.test(sinComent(PG))) falla(G, PG, 0, "el panel recibe compraPro del servidor");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== "apps/web/lib/suscripcion.ts" && f !== AC && /\b(seguirConPro|deshacerFree)\(/.test(sinComent(f))) falla(G, f, 0, "comprar o volver a Pro solo por acciones-cobros.ts (con la compuerta de las apps)");
  },

  /* 8i · «Borrar mi cuenta» alcanzable en las cuatro apps (Apple 5.1.1(v), Google Play): /cuenta/ajustes está en el alcance común de las
     cuatro (apps.json), la pantalla de borrar existe, y cada app tiene su camino visible a Mi cuenta › Ajustes (To'Latino: Mi cuenta;
     Negocios: Más y el menú de escritorio; Repartidor: Idioma y cuenta; Puerta: Tu cuenta, también desde la puerta abierta). Al revés: quitar
     /cuenta/ajustes del alcance común, el enlace de la Puerta o el de Negocios → falla. */
  borrarCuentaEnCadaApp() {
    const G = "borrarCuentaEnCadaApp", A = JSON.parse(readFileSync("apps/mobile/apps.json", "utf8"));
    if (!(A.comun ?? []).includes("/cuenta/ajustes")) falla(G, "apps/mobile/apps.json", 0, "/cuenta/ajustes tiene que estar en el alcance común de las cuatro apps");
    if (!existsSync("apps/web/app/(app)/cuenta/ajustes/borrar/page.tsx")) falla(G, "apps/web/app/(app)/cuenta/ajustes/borrar/page.tsx", 0, "falta Borrar mi cuenta");
    const CAMINO = {
      cliente: [["apps/web/app/(app)/cuenta/ajustes/Ajustes.tsx", /\/cuenta\/ajustes\/borrar/], ["apps/web/app/(app)/cuenta/ajustes/privacidad/Privacidad.tsx", /router\.push\("\/cuenta\/ajustes\/borrar"\)/]],
      negocio: [["apps/web/app/panel/Panel.tsx", /\{ icon: "shield", t: E2\("Mi cuenta y ajustes", "My account and settings"\)[^\n]*onClick: \(\) => c\.nav\("\/cuenta\/ajustes"\) \}/], ["apps/web/app/panel/Panel.tsx", /navIt\(false, "shield", E2\("Mi cuenta y ajustes", "My account and settings"\), \(\) => router\.push\("\/cuenta\/ajustes"\)\)/]],
      // 9b-1 · En TODOS los estados de la entrada, no solo en Perfil: sin equipo (antes de entrar a uno o después de salir del último) no hay
      // barra de abajo ni Perfil, y la cuenta de revisión que perdía su equipo no llegaba a Borrar mi cuenta (fich8i en una base nueva).
      delivery: [["apps/web/app/repartidor/Repartidor.tsx", /const filasCuenta: Fila\[\] = \[\s*\{[^\n]*onClick: \(\) => router\.push\("\/cuenta\/ajustes"\)/],
        ["apps/web/app/repartidor/Repartidor.tsx", /\} else if \(!eq && !det\) \{(?:(?!\} else if \(det\))[\s\S])*B\.push\(\{ type: "rows", items: filasCuenta \}\)/],
        ["apps/web/app/repartidor/Repartidor.tsx", /\} else \{\s*B\.push\(\{ type: "head", t: nombre,(?:(?!\n  \}\n)[\s\S])*B\.push\(\{ type: "rows", items: filasCuenta \}\)/]],
      checkin: [["apps/web/app/(puerta)/puerta/Inicio.tsx", /key: "cuenta", icon: "shield"[^\n]*onClick: \(\) => router\.push\("\/cuenta\/ajustes"\)/], ["apps/web/app/(puerta)/puerta/Puerta.tsx", /key: "cuenta", icon: "shield"[^\n]*onClick: \(\) => router\.push\("\/cuenta\/ajustes"\)/]],
    };
    for (const a of A.apps) {
      const L = CAMINO[a.key];
      if (!L) { falla(G, "apps/mobile/apps.json", 0, `${a.key}: sin camino a Borrar mi cuenta en borrarCuentaEnCadaApp`); continue; }
      for (const [f, re] of L) if (!existsSync(f) || !re.test(sinComent(f))) falla(G, f, 0, `${a.key}: falta el camino visible a Mi cuenta › Ajustes › Borrar mi cuenta`);
    }
  },

  /* 9a · (antes sinProntoEnTienda, 8i, que contaba la ciudad «próximamente» como si fuera «En construcción»; partido en dos).
     Ninguna pantalla «En construcción» en la app (Apple 2.1, fase8-apps.md §3.6): el componente Pronto se borró en 9a y no vuelve; ninguna
     pantalla de la app dice «EN CONSTRUCCIÓN» ni «Esta pantalla se construye en». FALLA SIEMPRE. PantallaPronto / CiudadPronto (APP-CIUDAD-PRONTO,
     la ciudad que todavía no abre) es una función de verdad y no cuenta. Las secciones del Super Admin que todavía no existen (FASE sin HECHAS en
     lib/admin-nav.ts, la nota «Esta sección se construye en…») solo AVISAN hasta la apertura; con TOLATINO_FASE=9 fallan.
     Al revés (alreves9a): devolver Pronto.tsx, usar <Pronto>, escribir «EN CONSTRUCCIÓN» en una pantalla, una sección pendiente con TOLATINO_FASE=9. */
  sinEnConstruccion() {
    const G = "sinEnConstruccion", AN = "apps/web/lib/admin-nav.ts";
    for (const f of codigo) {
      if (!/^apps\/web\/app\/.*\.tsx$/.test(f) || /^apps\/web\/app\/admin\//.test(f)) continue;
      if (/\/Pronto\.tsx$/.test(f)) { falla(G, f, 0, "el componente «En construcción» (Pronto) se borró en 9a y no vuelve"); continue; }
      const t = sinComent(f);
      if (/<Pronto\b|import \{[^}]*\bPronto\b[^}]*\} from "[^"]*\/Pronto"/.test(t)) falla(G, f, 0, "usa «Pronto» (En construcción): ninguna pantalla de la app puede estar sin construir");
      t.split("\n").forEach((l, i) => { if (/EN CONSTRUCCIÓN|UNDER CONSTRUCTION|[Ee]sta pantalla se construye en/.test(l)) falla(G, f, i + 1, "pantalla «En construcción»: ninguna pantalla de la app puede quedar sin construir"); });
    }
    if (!existsSync(AN)) return falla(G, AN, 0, "falta lib/admin-nav.ts");
    const an = sinComent(AN), llaves = (n) => Object.keys(Object.fromEntries([...(new RegExp(`export const ${n}[^=]*= \\{([\\s\\S]*?)\\};`).exec(an)?.[1] ?? "").matchAll(/(\w+):\s*"/g)].map((m) => [m[1], 1])));
    const hechas = new Set(llaves("HECHAS")), pend = llaves("FASE").filter((k) => !hechas.has(k));
    if (!pend.length) return;
    const msg = `${pend.length} sección(es) del Super Admin todavía «se construye en…» (${pend.join(", ")}): en la apertura no puede quedar ninguna`;
    if (process.env.TOLATINO_FASE === "9") falla(G, AN, 0, msg); else avisos.push(`[${G}] ${msg} (solo aviso hasta TOLATINO_FASE=9)`);
  },

  /* 9a · Las cuentas de revisión de Apple y Google (y la beta) entran a una ciudad ABIERTA: si su ciudad no abre, lo primero que ven es
     APP-CIUDAD-PRONTO y la app no se puede revisar (Apple 2.1). Hoy: cada semilla que crea cuentas de revisión (insert into review_accounts) pone a
     esas personas y a su negocio en una ciudad que la semilla del sandbox abre (update cities set status = 'on'); los probadores de la beta
     (beta_testers) también. Cuando 9i agregue el estado «beta» a cities.status, una ciudad en «beta» también cuenta (se lee de las
     migraciones: no hay que tocar el guardián). Lo que no se puede mirar aquí: las cuentas de revisión de PRODUCCIÓN se crean a mano en 9u (OK-2);
     9u lo comprueba en vivo. Al revés (alreves9a): una cuenta de revisión en Allentown (soon), su negocio fuera de una ciudad abierta, la semilla
     que deja de abrir Hazleton. */
  revisionVeCiudadAbierta() {
    const G = "revisionVeCiudadAbierta", SD = "infra/pruebas/semilla";
    const mig = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8")).join("\n");
    const estados = [...mig.matchAll(/cities[\s\S]{0,400}?status\s+text[^\n]*check \(status in \(([^)]*)\)\)|alter table cities[^;]*check \(status in \(([^)]*)\)\)/g)].map((m) => m[1] ?? m[2]).pop() ?? "";
    const abiertos = ["on", ...(/'beta'/.test(estados) ? ["beta"] : [])];
    if (!existsSync(SD)) return falla(G, SD, 0, "falta la semilla del sandbox");
    const semillas = readdirSync(SD).filter((x) => x.endsWith(".sql")).sort().map((x) => [`${SD}/${x}`, readFileSync(`${SD}/${x}`, "utf8").replace(/--.*$/gm, "")]);
    const abiertas = new Set();
    for (const [, t] of semillas) for (const m of t.matchAll(/update cities set status = '(\w+)'[^;]*? where id (?:= '(\w+)'|in \(([^)]*)\))/g)) if (abiertos.includes(m[1])) for (const c of (m[2] ? [m[2]] : m[3].match(/\w+/g))) abiertas.add(c);
    if (!abiertas.size) falla(G, SD, 0, "la semilla del sandbox no abre ninguna ciudad: las cuentas de revisión verían «próximamente»");
    /* Las tuplas de un «insert into <tabla> (cols) values (…), (…)»: el valor de una columna en cada una. */
    const valores = (t, tabla, col) => {
      const out = [];
      for (const m of t.matchAll(new RegExp(`insert into ${tabla} \\(([^)]*)\\)\\s*values([\\s\\S]*?)(?:on conflict|;)`, "g"))) {
        const cols = m[1].split(",").map((x) => x.trim()), k = cols.indexOf(col);
        if (k < 0) continue;
        for (const tup of m[2].matchAll(/\(((?:[^()']|'(?:[^']|'')*'|\([^()]*\))*)\)/g)) {
          // Cada valor: una cadena '…' (con su ::tipo), un array[…] o lo que haya hasta la coma (las comas de adentro no parten).
          const vs = [...tup[1].matchAll(/\s*(?:array\[(?:[^\]']|'(?:[^']|'')*')*\](?:::[\w\[\]]+)?|'(?:[^']|'')*'(?:::[\w\[\]]+)?|[^,']+)+/g)].map((x) => x[0].trim()).filter(Boolean);
          if (vs.length === cols.length) out.push(vs[k].replace(/^'|'$/g, ""));
        }
      }
      return out;
    };
    for (const [f, t] of semillas) {
      if (/insert into review_accounts/.test(t)) {
        const cs = valores(t, "users", "home_city_id");
        if (!cs.length) falla(G, f, 0, "las cuentas de revisión se crean sin home_city_id: entrarían a la ciudad por defecto, que puede no estar abierta");
        for (const c of cs) if (!abiertas.has(c)) falla(G, f, 0, `una cuenta de revisión vive en «${c}», que la semilla no abre (${abiertos.join(" / ")}): vería «próximamente»`);
        for (const c of valores(t, "businesses", "city_id")) if (!abiertas.has(c)) falla(G, f, 0, `el negocio de revisión está en «${c}», que no está abierta`);
      }
      if (/insert into beta_testers/.test(t)) for (const c of valores(t, "users", "home_city_id")) if (!abiertas.has(c)) falla(G, f, 0, `un probador de la beta vive en «${c}», que no está abierta`);
    }
  },

  /* 9a · Las pruebas de punta a punta y al revés viven en pruebas/ y EL REPO ES PÚBLICO: ninguna lleva un secreto del entorno (AUTH_SECRET,
     DATOS_SECRET, BARRIDO_TOKEN, REVISION_CODIGO_*, VAPID, la llave del QR, Stripe, Telnyx, WhatsApp, Garage, la base…), una llave de un proveedor,
     una llave privada, una cadena hex o base64 larga, un «secret=…», una ruta absoluta de una máquina ni un teléfono que no sea de prueba (555;
     los gratuitos 8XX de un servicio público, como ChildLine, sí). Los secretos los genera pruebas/servir/servir.sh en $PRUEBAS_SALIDA/secretos.env
     (fuera del repo) y las pruebas los leen con pruebas/lib/entorno.cjs (ENT.sec). Una huella pública o un dato de prueba que parece secreto lleva
     GUARDIAN-OK en la línea, con su motivo. Ningún archivo de llaves (*.pem, *.p8, *.p12, *.key, secretos.env) en pruebas/.
     Al revés (alreves9a): un token escrito a mano, un código de revisión, una llave PEM, un hex largo, un teléfono real, una ruta /home/…. */
  pruebaSinSecretos() {
    const G = "pruebaSinSecretos";
    const NOMBRES = "AUTH_SECRET|DATOS_SECRET|BARRIDO_TOKEN|LLAVERO_SECRET|VAPID_PRIVADA|QR_LLAVE_PRIVADA|STRIPE_[A-Z_]+|WHATSAPP_[A-Z_]+|TELNYX_[A-Z_]+|MEDIOS_SECRET|MEDIOS_KEY_ID|ANTHROPIC_API_KEY|SES_[A-Z_]+|REVISION_CODIGO_[A-Z]+|DATABASE_URL|POSTGRES_PASSWORD";
    const reglas = [
      [new RegExp(`\\b(?:${NOMBRES})\\s*[=:]\\s*['"\`]?(?![^\\s'"\`]*\\$)(?!ENT\\.|process\\.env|env\\.)[^\\s'"\`,;)]{4,}`), "un secreto del entorno escrito a mano (se lee de secretos.env con ENT.sec)"],
      [/sk_(?:live|test)_[A-Za-z0-9]{8,}|rk_(?:live|test)_[A-Za-z0-9]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|whsec_[A-Za-z0-9]{8,}|xox[bpa]-[A-Za-z0-9-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}/, "llave de un proveedor"],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----(?:\\n|\s)*[A-Za-z0-9+/]{40,}/, "llave privada"],
      [/(?<![\w-])[0-9a-f]{32,}(?![\w-])/i, "una cadena hex larga (¿una llave o un token?)"],
      [/(?<![\w/+.-])(?=[A-Za-z0-9+/]*\d)(?=[A-Za-z0-9+/]*[A-Z])(?=[A-Za-z0-9+/]*[a-z])[A-Za-z0-9+/]{48,}={0,2}/, "una cadena base64 larga (¿una llave?)"],
      [/(?:secret|token|password|passwd|clave|contrasena)=(?!\$)[^\s&'"`$)]{8,}/i, "«secret=…» escrito a mano"],
      [/\/tmp\/claude-|\/home\/[a-z]+\/|\/root\//, "una ruta absoluta de una máquina (usa ENT.RAIZ / ENT.S)"],
    ];
    const tel = /(['"`])\+?1?([2-9]\d{2})([2-9]\d{2})\d{4}\1|\(?\b([2-9]\d{2})\)?[ .-]([2-9]\d{2})[ .-]\d{4}\b/g;
    for (const f of archivos) {
      if (!f.startsWith("pruebas/")) continue;
      if (/(secretos\.env|\.pem|\.p8|\.p12|\.key|\.der)$/.test(f)) { falla(G, f, 0, "archivo de llaves o de secretos dentro de pruebas/ (van a $PRUEBAS_SALIDA)"); continue; }
      if (!/\.(cjs|mjs|js|sh|json|py|txt|md)$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/GUARDIAN-OK/.test(l)) return;
        for (const [re, que] of reglas) if (re.test(l)) falla(G, f, i + 1, que);
        for (const m of l.matchAll(tel)) { const area = m[2] ?? m[4], ex = m[3] ?? m[5]; if (ex !== "555" && !/^8(00|33|44|55|66|77|88)$/.test(area)) falla(G, f, i + 1, `teléfono que no es de prueba (${m[0].trim()}): solo 555`); }
      });
    }
  },

  /* 9a · Toda línea pendiente de docs/LAUNCH-CHECKLIST.md tiene destino: es una casilla «- [ ] **→ 9x** · …» (un bloque de la Fase 9 que
     todavía no cerró: 9b … 9v) o «- [ ] **→ Paquete N-M** · …» (8-0…8-3, 9-1…9-5). Una línea nueva sin destino, una viñeta pendiente sin casilla
     o un destino que no existe rompen el CI. Lo que salió de la apertura está marcado «- [x] **→ después de abrir (DA-NN)**» y su DA-NN está en
     docs/DESPUES-DE-ABRIR.md (y al revés). Con TOLATINO_FASE=9 (el despliegue de la apertura, OK-3) NO puede quedar ninguna pendiente.
     Al revés (alreves9a): una casilla sin destino, un destino 9z, una viñeta suelta, un DA que falta, una pendiente con TOLATINO_FASE=9. */
  launchConDestino() {
    const G = "launchConDestino", LC = "docs/LAUNCH-CHECKLIST.md", DA = "docs/DESPUES-DE-ABRIR.md";
    if (!existsSync(LC)) return falla(G, LC, 0, "falta la LAUNCH-CHECKLIST");
    const lineas = readFileSync(LC, "utf8").split("\n"), da = existsSync(DA) ? readFileSync(DA, "utf8") : "";
    const DEST = /^- \[ \] \*\*→ (?:9[b-v]|Paquete (?:8-[0-3]|9-[1-5]))\*\* · \S/;
    const enLaunch = new Set();
    let pend = 0;
    lineas.forEach((l, i) => {
      if (/^- \[ \]/.test(l)) {
        pend++;
        if (!DEST.test(l)) falla(G, LC, i + 1, /^- \[ \] \*\*→ 9a\*\*/.test(l) ? "destino 9a: 9a ya cerró; elige el bloque que lo hace" : "pendiente sin destino válido: empieza con «- [ ] **→ 9x** · » (9b…9v) o «- [ ] **→ Paquete N-M** · »");
        if (process.env.TOLATINO_FASE === "9") falla(G, LC, i + 1, "con TOLATINO_FASE=9 (apertura) no puede quedar ninguna línea pendiente en LAUNCH");
      } else if (/^- (?!\[[ xX]\])/.test(l)) falla(G, LC, i + 1, "viñeta pendiente sin casilla: cada pendiente es «- [ ] **→ 9x** · …»");
      for (const m of l.matchAll(/→ después de abrir \((DA-\d{2})\)/g)) { enLaunch.add(m[1]); if (!/^- \[x\]/.test(l)) falla(G, LC, i + 1, `${m[1]}: lo que pasa a «después de abrir» se marca hecho ([x]) en LAUNCH`); }
    });
    for (const id of enLaunch) if (!new RegExp(`\\*\\*${id}\\*\\*`).test(da)) falla(G, DA, 0, `${id} está en LAUNCH como «después de abrir» y no en ${DA}`);
    for (const m of da.matchAll(/^- \*\*(DA-\d{2})\*\*/gm)) if (!enLaunch.has(m[1])) falla(G, DA, 0, `${m[1]} no corresponde a ninguna línea de LAUNCH marcada «después de abrir (${m[1]})»`);
    if (process.env.TOLATINO_FASE !== "9" && pend) avisos.push(`[${G}] ${pend} línea(s) pendiente(s) en LAUNCH, todas con destino (con TOLATINO_FASE=9 ninguna puede quedar)`);
  },

  /* 9a · Las pruebas viven en el repo (antes solo en el directorio temporal de una sesión: una sesión nueva las perdía). Cada prueba que
     docs/PROGRESS.md nombra —un nombre con forma de prueba: letras, el dígito de la fase y la letra del bloque («evt6c», «alreves8i»,
     «evt6b-6c»)— existe en pruebas/e2e o pruebas/alreves, salvo las de EXCEPCIONES, cada una con su motivo. Al revés (alreves9a): nombrar en
     PROGRESS una prueba que no está; quitar una prueba del repo. */
  e2eEnElRepo() {
    const G = "e2eEnElRepo", PR = "docs/PROGRESS.md";
    const EXCEPCIONES = {
      evt6b: "reemplazada por evt6b-6c (la misma prueba, al día con la venta de 6c)",
      servir8d: "no es una prueba: el servidor de 8d es el perfil «completo» de pruebas/servir/servir.sh",
      servir8h: "no es una prueba: el servidor de 8h es el perfil «completo» de pruebas/servir/servir.sh",
      orden9a: "no es un archivo: es toda la regresión (node pruebas/correr.mjs --todas)",
      "sop7b-8f": "es sop7b (la versión al día de 8f se subió con ese nombre)",
      "usr1l-8d": "es usr1l (la versión al día de 8d se subió con ese nombre)",
      "bench8c-run": "una medición de velocidad, no una prueba: no se subió (la velocidad entra en la tubería de 9b)",
    };
    if (!existsSync(PR)) return falla(G, PR, 0, "falta docs/PROGRESS.md");
    const hay = new Set(["e2e", "alreves"].flatMap((d) => (existsSync(`pruebas/${d}`) ? readdirSync(`pruebas/${d}`) : []).map((f) => f.replace(/\.(cjs|mjs|sh)$/, ""))));
    if (hay.size < 100) falla(G, "pruebas/", 0, `solo ${hay.size} pruebas en pruebas/e2e y pruebas/alreves: ¿se borraron?`);
    const vistos = new Set();
    readFileSync(PR, "utf8").split("\n").forEach((l, i) => {
      for (const m of l.matchAll(/(?<![\w/.-])([a-z]{2,10}\d[a-z]{1,2}(?:-[a-z0-9]+)?)(?![\w/-]|\.\w)/g)) {
        const n = m[1];
        if (vistos.has(n) || hay.has(n) || EXCEPCIONES[n]) continue;
        vistos.add(n);
        falla(G, PR, i + 1, `PROGRESS nombra la prueba «${n}» y no está en pruebas/e2e ni en pruebas/alreves (súbela, o anótala en EXCEPCIONES con su motivo)`);
      }
    });
  },

  /* 8i · Las cuentas de revisión, acotadas (fase8-apps.md §6 #24): es una entrada SIN SMS. El código fijo se lee del entorno SOLO por uno de los
     cuatro nombres REVISION_CODIGO_{APP} (nunca otra variable), es de 6 dígitos, vale solo para el teléfono de una cuenta ACTIVA con el
     interruptor encendido (en producción, además, app.tiendas.publico: Fase 9), se vuelve a revisar al verificar, tiene su tope por hora, se
     anota, nunca sale en la pantalla del modo pruebas; la cuenta no paga con tarjeta (las cuatro maneras de cobrar de la pasarela lo
     preguntan primero, guardar tarjeta también y la base lo rechaza), su negocio está oculto y solo la semilla del sandbox las crea.
     Al revés: leer otra variable, saltarse el interruptor o la cuenta activa, mostrar el código, no revisar al verificar, una forma de cobrar
     sin la pregunta, el trigger de tarjetas fuera, una cuenta de revisión en una semilla de producción → falla. */
  revisionAcotada() {
    const G = "revisionAcotada", R = "apps/web/lib/tiendas/revision.ts", C = "apps/web/lib/cuenta.ts", PA = "apps/web/lib/pagos/pasarela.ts", M = "packages/db/migrations/0132_tiendas_fichas.sql";
    if (!existsSync(R)) return falla(G, R, 0, "falta lib/tiendas/revision.ts");
    const r = sinComent(R);
    if (!/export const CODE_REF = \/\^REVISION_CODIGO_\(CLIENTE\|NEGOCIO\|REPARTIDOR\|PUERTA\)\$\/;/.test(r)) falla(G, R, 0, "CODE_REF: solo los cuatro nombres REVISION_CODIGO_{APP}");
    const cf = cuerpoFn(r, "codigoFijo");
    if (!/if \(!CODE_REF\.test\(codeRef\)\) return null;\s+const v = process\.env\[codeRef\];\s+return v && \/\^\\d\{6\}\$\/\.test\(v\) \? v : null;/.test(cf)) falla(G, R, 0, "codigoFijo: el nombre pasa CODE_REF antes de leer el entorno y el código es de 6 dígitos");
    if ((r.match(/process\.env\[/g) ?? []).length !== 1) falla(G, R, 0, "el entorno se lee en un solo lugar (codigoFijo)");
    const re = cuerpoFn(r, "revisionEncendida");
    if (!/if \(!on\(FLAG_REVISION\)\) return false;/.test(re) || !/if \(ENTORNO === "produccion" && !on\("app\.tiendas\.publico"\)\) return false;/.test(re)) falla(G, R, 0, "revisionEncendida: interruptor y, en producción, la Fase 9");
    const cp = cuerpoFn(r, "codigoParaPedir");
    if (!/if \(!r\.active\) \{[^}]*return "normal"; \}/.test(cp) || !/if \(!\(await revisionEncendida\(c\)\)\) \{[^}]*return "normal"; \}/.test(cp) || !/cfg_int\('revision_intentos_hora'\)/.test(cp) || !/await anotar\(c, r\.id, "codigo", null, ip\);/.test(cp)) falla(G, R, 0, "codigoParaPedir: cuenta activa, interruptor, tope por hora y anotado");
    if (!/if \(!r\.active \|\| !\(await revisionEncendida\(c\)\) \|\| !codigoFijo\(r\.code_ref\)\)/.test(cuerpoFn(r, "codigoSigueValiendo"))) falla(G, R, 0, "codigoSigueValiendo: se vuelve a revisar al verificar");
    for (const f of codigo) if (f !== R && /^apps\/web\/.*\.tsx?$/.test(f) && /REVISION_CODIGO_/.test(sinComent(f))) falla(G, f, 0, "los códigos de revisión solo los lee lib/tiendas/revision.ts");
    const c = sinComent(C), pc = cuerpoFn(c, "pedirCodigo"), bloque = /if \(proposito === "login"\) \{([\s\S]*?)\n  \}\n/.exec(pc)?.[1] ?? "";
    if (!/codigoParaPedir\(c, tel, ip\)/.test(bloque) || !/'revision'/.test(bloque) || /codigoPrueba/.test(bloque) || !/huellaCodigo\(tel, rev\.codigo\)/.test(bloque)) falla(G, C, 0, "pedirCodigo: el código fijo solo para login, guardado como huella de ESE teléfono y nunca en la pantalla del modo pruebas");
    if (!/const rev = fila\.channel === "revision" \? await import\("\.\/tiendas\/revision"\) : null;\s+if \(rev && !\(await rev\.codigoSigueValiendo\(c, tel, ip\)\)\)/.test(cuerpoFn(c, "verificarCodigo"))) falla(G, C, 0, "verificarCodigo: el código de revisión se vuelve a revisar (cuenta activa e interruptor)");
    const pa = sinComent(PA);
    for (const fn of ["retener", "retenerPlataforma", "cobrarDirecto", "cobrarFuera"]) {
      const i = pa.indexOf(`  async ${fn}(`), cab = i < 0 ? "" : pa.slice(i, pa.indexOf("\n", pa.indexOf("\n", i) + 1));
      if (!/\{ const rv = await pagoRevision\(\); if \(rv\) return \{ ok: false, codigo: "revision", mensaje: rv \}; \}/.test(cab)) falla(G, PA, 0, `${fn}: una cuenta de revisión no paga con tarjeta (la primera línea lo pregunta)`);
    }
    if (!/esCuentaRevision\(u\.id\)\) return no\(/.test(sinComent("apps/web/app/(app)/pago/acciones.ts"))) falla(G, "apps/web/app/(app)/pago/acciones.ts", 0, "guardarTarjeta: una cuenta de revisión no guarda tarjetas");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/create trigger payment_methods_revision before insert on payment_methods/.test(m)) falla(G, M, 0, "la base rechaza tarjetas de una cuenta de revisión");
      if (!/'app\.revision\.cuentas', false,/.test(m)) falla(G, M, 0, "el interruptor app.revision.cuentas nace apagado");
      if (!/raise exception 'revision_acotada: el negocio de una cuenta de revisión tiene que estar oculto'/.test(m)) falla(G, M, 0, "el negocio de revisión está oculto");
      if (!/code_ref\s+text not null check \(code_ref ~ '\^REVISION_CODIGO_\(CLIENTE\|NEGOCIO\|REPARTIDOR\|PUERTA\)\$'\)/.test(m)) falla(G, M, 0, "code_ref: solo los cuatro nombres");
    }
    // Solo la semilla del sandbox crea cuentas de revisión (en producción, a mano en la Fase 9 con el OK del fundador).
    for (const f of archivos) if (/\.sql$/.test(f) && !f.startsWith("infra/pruebas/semilla/") && f !== M && /insert into review_accounts/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "las cuentas de revisión solo las crea la semilla del sandbox (producción: Fase 9)");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== C && /'revision'/.test(sinComent(f)) && /otp_codes/.test(sinComent(f)) && /insert into otp_codes/.test(sinComent(f))) falla(G, f, 0, "solo pedirCodigo crea códigos del canal revision");
  },

  /* 9b-1 · Un parámetro de la URL que lee el marco de la app (AppShell) no se come el mismo parámetro de una página. «?ciudad» (vacío) y
     «?ciudad=pedir» abren el selector de ciudad (los manda /ciudad); /recomendar?ciudad=<id> es la ciudad «pronto» de donde viene el vecino
     (CiudadPronto). AppShell miraba solo que existiera (sp.has) y se comía el id: abría la ventana y la recomendación caía en otra ciudad.
     Regla: si alguna pantalla de la app arma un enlace «?ciudad=${…}» (un valor), AppShell solo reacciona a "" y "pedir", nunca a cualquiera.
     Al revés (alreves9b1): volver a sp.has("ciudad"); comparar con otro valor que no sea "" o "pedir". */
  parametroCiudadDelSelector() {
    const G = "parametroCiudadDelSelector", SH = "apps/web/app/(app)/AppShell.tsx";
    if (!existsSync(SH)) return falla(G, SH, 0, "falta AppShell.tsx");
    const conValor = codigo.filter((f) => /^apps\/web\/app\/.*\.tsx?$/.test(f) && /[?&]ciudad=\$\{/.test(sinComent(f)));
    if (!conValor.length) return;
    const t = sinComent(SH);
    if (/sp\.has\(\s*["']ciudad["']\s*\)/.test(t)) falla(G, SH, 0, `AppShell abre el selector con sp.has("ciudad") y se come el ?ciudad=<id> de ${conValor.join(", ")}: solo "" y "pedir"`);
    const usa = /const (\w+) = sp\.get\(\s*["']ciudad["']\s*\);\s*if \(\1 === "" \|\| \1 === "pedir"\)/.test(t);
    if (!usa) falla(G, SH, 0, `AppShell: el selector se abre solo con ?ciudad (vacío) o ?ciudad=pedir (const v = sp.get("ciudad"); if (v === "" || v === "pedir")), no con el id que manda ${conValor.join(", ")}`);
  },

  /* 9b-1 · Una fila de etiquetas de largo variable no empuja la página de lado. La de PostCard (rango · lugar · resuelto · FIJADO · OFERTA ·
     «EN HOY EN EL BARRIO · QUEDAN 22 H» · editado) era flex sin envolver con cada etiqueta flex: none: en un teléfono de 390 px medía 429 y la
     página entera se corría (nov2g lo cazó: el clic caía bajo la barra de arriba). La fila se envuelve (flexWrap: 'wrap'); nov2g además mira que
     la página no sea más ancha que el teléfono. Al revés (alreves9b1): quitar el flexWrap de la fila. */
  etiquetasSeEnvuelven() {
    const G = "etiquetasSeEnvuelven", PC = "packages/ui/src/ds/community/PostCard.js";
    if (!existsSync(PC)) return falla(G, PC, 0, "falta PostCard.js");
    const t = sinComent(PC), i = t.search(/parts\.length \?\s*React\.createElement\("div", \{/), est = i < 0 ? "" : t.slice(i, t.indexOf("}", t.indexOf("style:", i)) + 1);
    if (i < 0) return falla(G, PC, 0, "no encontré la fila de etiquetas (parts) de PostCard");
    if (!/flexWrap: 'wrap'/.test(est)) falla(G, PC, 0, "la fila de etiquetas de PostCard no se envuelve (flexWrap: 'wrap'): con tres etiquetas largas la página se corre de lado en un teléfono");
  },

  /* 9b-1 · «Hoy» es el día de la ciudad, nunca el de UTC. `new Date().toISOString().slice(0, 10)` da la fecha de Greenwich: en Hazleton, de las 7 u
     8 PM a la medianoche ya es mañana (wal8g lo cazó de noche: un certificado que vence en 10 días decía 11; los filtros «Libre este sábado» y
     «Disponible hoy» de las categorías se recalculaban a las 7 PM y no a la medianoche). Se usa hoyEn() de lib/fecha-local.ts (la zona de la
     ciudad) o la fecha que da la base («now() at time zone c.timezone»). Excepción con GUARDIAN-OK y su motivo. Al revés (alreves9b1): volver a
     poner la fecha de UTC en la categoría o en el vencimiento del certificado. */
  hoyEnLaCiudad() {
    const G = "hoyEnLaCiudad";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/GUARDIAN-OK/.test(l) || /^\s*(\/\/|\/\*|\*)/.test(l)) return;
        if (/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/.test(l)) falla(G, f, i + 1, "«hoy» en UTC: usa hoyEn() (lib/fecha-local.ts) o la fecha de la base en la zona de la ciudad");
        if (/\.vence\.toISOString\(\)\.slice\(0, ?10\)/.test(l)) falla(G, f, i + 1, "un vencimiento guardado como día de UTC: usa hoyEn(zona, fecha)");
      });
    }
    if (!existsSync("apps/web/lib/fecha-local.ts") || !/timeZone: zona/.test(readFileSync("apps/web/lib/fecha-local.ts", "utf8"))) falla(G, "apps/web/lib/fecha-local.ts", 0, "hoyEn tiene que formatear en la zona que recibe");
  },

  /* 9b-1 · Una prueba comprueba algo. 13 pruebas de las fases 1–2 (an1n, ciudad, ciudad2, ciudad3, lic, mapa, menu2a, menu2a-adm, menu2a-f, nov1,
     publica, rev1, usr1l) solo imprimían lo que veían («precio guardado: 1250», «errores: […]») y la corrida las contaba en verde con «0 ✓»: un
     error en la página o un precio mal guardado no las ponía en rojo. Ahora cada una lo comprueba (ok(…) → «  ✓ …»), correr.mjs pone en rojo la
     que termina sin ninguna ✓, y aquí: cada prueba de pruebas/e2e y pruebas/alreves escribe «✓» en algún lado. Al revés (alreves9b1): quitar la
     regla de correr.mjs. */
  pruebaQueComprueba() {
    const G = "pruebaQueComprueba", CO = "pruebas/correr.mjs";
    if (!existsSync(CO) || !/const sinNada = codigo === 0 && checks === 0;/.test(readFileSync(CO, "utf8")) || !/ok: codigo === 0 && !sinNada/.test(readFileSync(CO, "utf8")))
      falla(G, CO, 0, "correr.mjs tiene que poner en rojo la prueba que termina sin ninguna comprobación (✓)");
    for (const d of ["e2e", "alreves"]) {
      if (!existsSync(`pruebas/${d}`)) continue;
      for (const f of readdirSync(`pruebas/${d}`)) {
        if (!/\.(cjs|mjs|sh)$/.test(f)) continue;
        if (!readFileSync(`pruebas/${d}/${f}`, "utf8").includes("✓")) falla(G, `pruebas/${d}/${f}`, 0, "la prueba no escribe ninguna comprobación (✓): imprimir lo que ve no es probarlo");
      }
    }
  },
  /* 9b-1 · Los bloques del panel (PanelBloques) no llevan la posición como llave: con key={i}, un bloque que aparece arriba después (las
     plantillas del estimado) desmontaba los campos de abajo mientras se escribía y se perdía lo escrito y el foco (est4d). La llave es el tipo
     y cuántos del mismo tipo van antes (llavesDeBloques). Al revés (alreves9b1): volver a key={i}. */
  bloquesConLlave() {
    const G = "bloquesConLlave", F = "packages/ui/src/panel/Bloques.tsx";
    if (!existsSync(F)) return falla(G, F, 0, "falta Bloques.tsx");
    const t = sinComent(F);
    if (!/<PanelBloque key=\{ks\[i\]\}/.test(t) || !/n\.get\(b\.type\)/.test(t)) falla(G, F, 0, "PanelBloques tiene que usar llavesDeBloques (tipo + cuántos del mismo tipo antes), no la posición: un bloque nuevo arriba desmonta los campos de abajo mientras se escribe");
    if (/<PanelBloque key=\{i\}/.test(t)) falla(G, F, 0, "PanelBloque con la posición como llave");
  },

  /* 9b-1 · La lista de la noche en la Puerta no ofrece lo que el servidor va a rechazar: trae reservas «confirmed» y «done», y marcarLlegada solo
     acepta «confirmed». Una «done» (ya entró, o la noche se cerró) cuenta como completa (entraron = personas) para que no salga «Entró 1»;
     antes la puerta lo ofrecía en una mesa terminada y al tocarlo decía «Esta reserva ya cambió…» (evt6g tocó esa fila). Al revés
     (alreves9b1): volver a contar solo in_n. */
  listaPuertaCoherente() {
    const G = "listaPuertaCoherente", F = "apps/web/lib/noche-reservas.ts";
    if (!existsSync(F)) return falla(G, F, 0, "falta lib/noche-reservas.ts");
    const t = sinComent(F), q = /export async function listaEnLaPuerta[\s\S]*?\n\}/.exec(t)?.[0] ?? "";
    if (!q) return falla(G, F, 0, "falta listaEnLaPuerta");
    if (/o\.status in \([^)]*'done'/.test(q) && !/case when o\.status = 'done' then o\.party_size else coalesce\(\(o\.details->>'in_n'\)::int, 0\) end as entraron/.test(q))
      falla(G, F, 0, "la lista de la noche trae reservas «done» pero cuenta solo in_n: la puerta ofrece «Entró 1» y el servidor lo rechaza");
  },

  /* 9b-1 · Un tiempo relativo («hace 5 min», «hace 2 h», «hace 3 días») en un componente del cliente sale del MISMO «ahora» en el servidor y en
     la hidratación: useAhora() de lib/ahora.tsx (la raíz pone <AhoraProvider t={Date.now()}>). Con Date.now() en cada lado, cuando el minuto
     cambiaba entre el HTML del servidor y la hidratación React daba el error 418 y volvía a pintar la página (adm7i lo vio en /soporte). Falla:
     «Date.now() - new Date(…)» / «Date.now() - Date.parse(…)» en un archivo "use client" (en el servidor y en las acciones está bien), o la raíz sin
     el proveedor. Al revés (alreves9b1): volver a poner Date.now() en el «hace» de Soporte o quitar el proveedor de la raíz. */
  ahoraDeLaHidratacion() {
    const G = "ahoraDeLaHidratacion", RZ = "apps/web/app/layout.tsx", AH = "apps/web/lib/ahora.tsx";
    for (const f of codigo) {
      if (!/^(apps\/web|packages\/ui)\/.*\.(tsx?|jsx?)$/.test(f)) continue;
      const t = sinComent(f);
      if (!/^\s*["']use client["']/.test(t)) continue;
      t.split("\n").forEach((l, i) => {
        if (/GUARDIAN-OK/.test(l)) return;
        if (/Date\.now\(\)\s*-\s*(new Date\(|Date\.parse\()/.test(l) || /new Date\(\)\.getTime\(\)\s*-\s*(new Date\(|Date\.parse\()/.test(l))
          falla(G, f, i + 1, "tiempo relativo con el reloj de cada lado: usa const ahora = useAhora() (lib/ahora.tsx), el mismo en el servidor y en la hidratación");
      });
    }
    if (!existsSync(AH) || !/export function useAhora\(\)/.test(readFileSync(AH, "utf8"))) falla(G, AH, 0, "falta useAhora (lib/ahora.tsx)");
    if (!existsSync(RZ) || !/<AhoraProvider t=\{Date\.now\(\)\}>\{children\}/.test(sinComent(RZ))) falla(G, RZ, 0, "la raíz tiene que envolver la app con <AhoraProvider t={Date.now()}> (lib/ahora.tsx)");
  },

  /* 9b-2 · La tubería completa del CI (PLAN §5). Los cuatro guardianes que faltaban comprueban que cada parte EXISTE en .github/workflows/ci.yml y que no se
     puede saltar: ningún continue-on-error, ningún «if» que apague la parte en un push, y el trabajo «tuberia» (el que se exige en la rama) depende de todas
     y cuenta lo saltado como rojo. Al revés (alreves9b2): quitar un trabajo, un dispositivo, el paso de axe, el de Semgrep o el presupuesto de una pantalla. */
  tuberiaVisual() {
    const G = "tuberiaVisual", Y = ".github/workflows/ci.yml", PA = "pruebas/visual/pantallas.json", CO = "pruebas/visual/comparar.cjs", RU = "pruebas/visual/correr.mjs";
    const IDS = ["iphone-se", "iphone-15", "iphone-15-pro-max", "pixel", "galaxy", "ipad", "escritorio-1024", "escritorio-1280", "escritorio-1440"];
    for (const f of [Y, PA, CO, RU, "pruebas/lib/dispositivos.cjs"]) if (!existsSync(f)) return falla(G, f, 0, "falta");
    const y = readFileSync(Y, "utf8"), d = /\n  dispositivos:\n[\s\S]*?(?=\n  [a-z]+:\n|$)/.exec(y)?.[0] ?? "";
    if (!d) return falla(G, Y, 0, "falta el trabajo «dispositivos» (los 9 dispositivos con capturas)");
    for (const id of IDS) if (!d.includes(id)) falla(G, Y, 0, `el dispositivo ${id} no está en la matriz de «dispositivos»`);
    if (/continue-on-error/.test(y)) falla(G, Y, 0, "continue-on-error en el CI: una parte que falla no puede dejar pasar");
    const comp = /- name: Capturas contra las aprobadas[\s\S]*?run: (.*)/.exec(d)?.[1] ?? "";
    if (!/pruebas\/visual\/correr\.mjs --dispositivo \$\{\{ matrix\.id \}\}$/.test(comp.trim())) falla(G, Y, 0, "el paso «Capturas contra las aprobadas» tiene que correr pruebas/visual/correr.mjs --dispositivo <id> a secas (sin --aprobar)");
    if (!/inputs\.aprobar != 'si'/.test(d) || !/inputs\.aprobar == 'si'/.test(d)) falla(G, Y, 0, "aprobar capturas solo a mano (workflow_dispatch aprobar=si), nunca en un push");
    const t = readFileSync(CO, "utf8"), um = /UMBRAL = ([\d.]+), MAXIMO = ([\d.]+)/.exec(t);
    if (!um || +um[1] > 0.3 || +um[2] > 0.02) falla(G, CO, 0, "la tolerancia de la comparación se aflojó (UMBRAL ≤ 0,3 y MAXIMO ≤ 2 % de la pantalla)");
    const r = readFileSync(RU, "utf8");
    if (!/captura nueva sin aprobar/.test(r)) falla(G, RU, 0, "una captura que no está aprobada tiene que fallar («captura nueva sin aprobar»)");
    const pan = JSON.parse(readFileSync(PA, "utf8")).pantallas ?? [];
    if (pan.length < 6) falla(G, PA, 0, "el conjunto inicial son 6 pantallas clave (inicio, ficha, buscar, mi cuenta, panel hoy, admin hoy)");
    for (const x of pan) for (const id of IDS) if (!existsSync(`pruebas/visual/${x.id}/${id}.png`)) falla(G, `pruebas/visual/${x.id}/${id}.png`, 0, "falta la captura aprobada (se genera con la corrida aprobar=si, se aprueba en docs/REVISION.md y entra por commit)");
  },

  tuberiaAccesibilidad() {
    const G = "tuberiaAccesibilidad", Y = ".github/workflows/ci.yml", RU = "pruebas/visual/correr.mjs", HE = "pruebas/herramientas/package.json", CN = "pruebas/visual/axe-conocidas.json";
    for (const f of [Y, RU, HE, CN]) if (!existsSync(f)) return falla(G, f, 0, "falta");
    const r = readFileSync(RU, "utf8"), he = JSON.parse(readFileSync(HE, "utf8")).dependencies ?? {};
    if (!/AxeBuilder/.test(r) || !/wcag2aa/.test(r) || !/"serious"/.test(r) || !/"critical"/.test(r)) falla(G, RU, 0, "axe tiene que correr con las etiquetas WCAG A/AA y frenar lo serio y lo crítico");
    if (!/falla\(`\$\{pa\.id\}: axe /.test(r)) falla(G, RU, 0, "una violación seria o crítica que no está en axe-conocidas.json tiene que fallar");
    if (!/^\d+\.\d+\.\d+$/.test(he["@axe-core/playwright"] ?? "")) falla(G, HE, 0, "@axe-core/playwright con versión EXACTA (sin ^ ni ~)");
    const y = readFileSync(Y, "utf8");
    if (!/pruebas\/visual\/correr\.mjs --dispositivo/.test(y)) falla(G, Y, 0, "el CI no corre pruebas/visual/correr.mjs (axe va dentro)");
    const lc = existsSync("docs/LAUNCH-CHECKLIST.md") ? readFileSync("docs/LAUNCH-CHECKLIST.md", "utf8") : "";
    for (const k of JSON.parse(readFileSync(CN, "utf8")).conocidas ?? []) {
      if (!/^9[b-v]$/.test(k.destino ?? "")) falla(G, CN, 0, `${k.regla}: una violación conocida lleva su destino (9c…9v)`);
      if (!lc.includes(k.regla)) falla(G, CN, 0, `${k.regla}: una violación conocida tiene que estar en docs/LAUNCH-CHECKLIST.md`);
    }
  },

  tuberiaSeguridad() {
    const G = "tuberiaSeguridad", Y = ".github/workflows/ci.yml", SG = "semgrep/tolatino.yml";
    for (const f of [Y, SG]) if (!existsSync(f)) return falla(G, f, 0, "falta");
    const y = readFileSync(Y, "utf8"), j = /\n  seguridad:\n[\s\S]*?(?=\n  [a-z]+:\n|$)/.exec(y)?.[0] ?? "";
    if (!j) return falla(G, Y, 0, "falta el trabajo «seguridad» (Semgrep + dependencias)");
    if (!/pnpm audit --audit-level high/.test(j)) falla(G, Y, 0, "«seguridad» tiene que correr pnpm audit --audit-level high");
    if (!/semgrep==\d+\.\d+\.\d+/.test(j)) falla(G, Y, 0, "Semgrep con versión EXACTA (semgrep==x.y.z)");
    if (!/semgrep" scan --config semgrep\/ --error/.test(j)) falla(G, Y, 0, "«seguridad» tiene que correr semgrep scan --config semgrep/ --error (un hallazgo rompe el CI)");
    if (/^\s+if:/m.test(j) || /continue-on-error/.test(j)) falla(G, Y, 0, "«seguridad» no se puede apagar: ni «if» ni continue-on-error");
    const t = readFileSync(SG, "utf8");
    for (const id of ["tolatino-sql-con-texto-interpolado", "tolatino-html-crudo", "tolatino-proceso-con-texto-interpolado", "tolatino-secreto-en-el-codigo"]) if (!t.includes(`id: ${id}`)) falla(G, SG, 0, `falta la regla ${id}`);
    if (/severity: (INFO|WARNING)/.test(t)) falla(G, SG, 0, "las reglas propias son ERROR: un aviso no frena el CI");
  },

  tuberiaVelocidad() {
    const G = "tuberiaVelocidad", Y = ".github/workflows/ci.yml", PR = "pruebas/velocidad/presupuesto.json", PA = "pruebas/visual/pantallas.json";
    for (const f of [Y, PR, PA]) if (!existsSync(f)) return falla(G, f, 0, "falta");
    const y = readFileSync(Y, "utf8"), pre = JSON.parse(readFileSync(PR, "utf8")).pantallas ?? {}, pan = JSON.parse(readFileSync(PA, "utf8")).pantallas ?? [];
    const paso = /- name: Velocidad \(Web Vitals[\s\S]*?run: (.*)/.exec(y)?.[1] ?? "";
    if (!/pruebas\/visual\/correr\.mjs --dispositivo \$\{\{ matrix\.id \}\} --velocidad/.test(paso)) falla(G, Y, 0, "falta el paso de velocidad (correr.mjs --velocidad) en «dispositivos»");
    if (!/inputs\.medir == 'si' && '--medir' \|\| ''/.test(paso) || /^\s*--medir/.test(paso)) falla(G, Y, 0, "--medir (sin fallar) solo a mano con medir=si, nunca fijo");
    if (!/matrix\.velocidad/.test(y) || !/id: pixel, velocidad: true/.test(y) || !/id: escritorio-1280, velocidad: true/.test(y)) falla(G, Y, 0, "la velocidad se mide en un teléfono (pixel) y un escritorio (escritorio-1280)");
    for (const x of pan) for (const perfil of ["telefono", "escritorio"]) {
      const l = pre[x.id]?.[perfil];
      if (!l || ![l.lcp, l.cls, l.tbt].every((n) => typeof n === "number" && n >= 0)) falla(G, PR, 0, `${x.id}: falta el presupuesto (${perfil}: lcp, cls, tbt)`);
      else if ((l.lcp > 4000 || l.cls > 0.25 || l.tbt > 600) && !new RegExp(`presupuesto-velocidad:${x.id}\\b`).test(existsSync("docs/LAUNCH-CHECKLIST.md") ? readFileSync("docs/LAUNCH-CHECKLIST.md", "utf8") : "")) falla(G, PR, 0, `${x.id} (${perfil}): el presupuesto pasa de lo que Google llama «malo» (LCP 4 s, CLS 0,25, TBT 600 ms) y no tiene su línea «presupuesto-velocidad:${x.id}» en docs/LAUNCH-CHECKLIST.md`);
    }
  },

  /* 9b-2 · El trabajo «tuberia» es el que cierra la tubería: depende de todas las partes, corre siempre y cuenta lo saltado como rojo. */
  tuberiaNoSeSalta() {
    const G = "tuberiaNoSeSalta", Y = ".github/workflows/ci.yml";
    if (!existsSync(Y)) return falla(G, Y, 0, "falta ci.yml");
    const y = readFileSync(Y, "utf8"), j = /\n  tuberia:\n[\s\S]*$/.exec(y)?.[0] ?? "";
    if (!j) return falla(G, Y, 0, "falta el trabajo «tuberia» (cierra el CI)");
    for (const n of ["verificar", "seguridad", "regresion", "dispositivos"]) if (!new RegExp(`needs: \\[[^\\]]*\\b${n}\\b`).test(j)) falla(G, Y, 0, `«tuberia» no depende de «${n}»`);
    if (!/if: always\(\)/.test(j)) falla(G, Y, 0, "«tuberia» tiene que correr siempre (if: always()) para ver lo que falló");
    if (!/v\.result === "success"/.test(j)) falla(G, Y, 0, "«tuberia» solo da verde con «success»");
    if (!/on:[\s\S]*?push:[\s\S]*?branches: \[main\]/.test(y) || !/\n  pull_request:/.test(y) || !/schedule:/.test(y)) falla(G, Y, 0, "el CI corre en push a main, en pull_request y programado");
    if (!/- cron: "\d+ \d+ \* \* \*"\n\s+- cron: "\d+ \d+ \* \* \*"/.test(y)) falla(G, Y, 0, "el CI se programa a dos horas distintas del día");
    const rg = /\n  regresion:\n[\s\S]*?(?=\n  [a-z]+:\n|$)/.exec(y)?.[0] ?? "";
    for (const g of ["alreves", "fase1,fase2,fase3,fase4,fase5,fase6,fase7,fase8,fase9,varios"]) if (!rg.includes(`--grupo ${g}"`)) falla(G, Y, 0, `la regresión no corre «--grupo ${g}»: toda la punta a punta va en UN trabajo, en el orden de las fases (las pruebas se heredan datos; repartida en trabajos con base propia fallaban 30 de 199) y las pruebas al revés en el suyo`);
    if (/--parte/.test(rg)) falla(G, Y, 0, "la regresión no se reparte con --parte: las pruebas de una fase dependen de las anteriores");
    if (!/\n  confirmacion:\n[\s\S]*?inputs\.confirmar == 'si'/.test(y)) falla(G, Y, 0, "falta el trabajo «confirmacion» (dos veces seguidas y barajada, a mano con confirmar=si)");
  },

  /* 9b-3 · Ningún tope por minuto (o por segundo) ni corta-circuito en la memoria de un proceso de la app (LAUNCH L685, L699, L1235, L1302): con
     varias réplicas cada una contaba y cortaba por su cuenta (el tope se multiplicaba). Todo pasa por lib/topes.ts (rate_counters, 0133). Caza:
     la ventana del minuto hecha con la hora del proceso, un «…Hasta = Date.now() + …» (corte en memoria), un contador de fallas de primer nivel y
     un Map<string, number> de primer nivel que se suma de a uno o guarda la última hora de alguien. Solo el servidor (lo de «use client» vive en
     un teléfono). Al revés: alreves9b3. */
  topeCompartido() {
    const G = "topeCompartido", T = "apps/web/lib/topes.ts", M = "packages/db/migrations/0133_escala.sql";
    if (!existsSync(T) || !existsSync(M)) return falla(G, T, 0, "falta el contador compartido (lib/topes.ts y 0133)");
    const m = readFileSync(M, "utf8");
    if (!/create unlogged table if not exists rate_counters \(/.test(m) || !/on conflict \(scope, key_hash, window_start\) do update set n = r\.n \+ excluded\.n\s+returning n/.test(m)) falla(G, M, 0, "rate_counters (unlogged) y tope_sumar: sumar y leer en UNA sentencia");
    if (!/huella\(`tope:\$\{k\}`\)/.test(sinComent(T))) falla(G, T, 0, "la clave de un tope es una huella, nunca el dato (dirección, teléfono, token)");
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f) || f === T) continue;
      const t = sinComent(f);
      if (/^\s*["']use client["']/.test(t)) continue;
      const lin = (i) => t.slice(0, i).split("\n").length;
      for (const x of t.matchAll(/Date\.now\(\)\s*\/\s*60_?000\b/g)) {
        // El minuto como llave de un intento de cobro (suscripcion.ts: «el mismo minuto y tarjeta = el mismo intento») no es un tope.
        if (/cobrarPeriodo\(/.test(t.split("\n")[lin(x.index) - 1])) continue;
        falla(G, f, lin(x.index), "una ventana por minuto con la hora del proceso: el tope va a lib/topes.ts (dentroDelTope), compartido entre procesos");
      }
      for (const x of t.matchAll(/\b\w*(?:[Hh]asta|[Cc]orte|[Aa]bierto)\w*\s*=\s*Date\.now\(\)\s*\+/g)) falla(G, f, lin(x.index), "un corta-circuito en la memoria del proceso: va a lib/topes.ts (estadoCorte / resultadoCorte)");
      for (const x of t.matchAll(/^(?:const|let)\s+\w+\s*=\s*\{[^}\n]*\bfallas\s*:\s*0/gm)) falla(G, f, lin(x.index), "un contador de fallas en la memoria del proceso: va a lib/topes.ts");
      for (const x of t.matchAll(/^(?:const|let)\s+(\w+)\s*=\s*(?:\{[^}\n]*)?new Map<string,\s*number>/gm)) {
        const n = x[1];
        if (new RegExp(`\\b${n}(?:\\.\\w+)?\\.set\\([^;\n]*(?:\\?\\?\\s*0\\)\\s*\\+\\s*1|Date\\.now\\(\\)|\\bahora\\b)`).test(t)) falla(G, f, lin(x.index), `«${n}» cuenta o guarda la hora de cada quien en la memoria del proceso: es un tope; va a lib/topes.ts`);
      }
    }
  },

  /* 9b-3 · Lo que un proceso guarda en memoria de lo que el Super Admin cambia (Configuración, interruptores, ciudades, reglas y términos de
     moderación, sinónimos) se olvida al momento en TODOS los procesos: la base avisa (NOTIFY tl_config, 0133) y lib/cambios-config.ts llama a cada
     olvido registrado. Una copia con hora que lee una de esas tablas sin registrarse con alCambiarConfig tardaba 15–60 s en verse en cada réplica
     (y las pruebas que cambian Configuración dependían del orden: la «barajada» de 9b-2). Al revés: alreves9b3. */
  copiaQueSeOlvida() {
    const G = "copiaQueSeOlvida", M = "packages/db/migrations/0133_escala.sql", TABLAS = ["platform_config", "config_keys", "feature_flags", "cities", "mod_rules", "mod_terms", "synonyms"];
    if (!existsSync(M)) return falla(G, M, 0, "falta 0133");
    const m = readFileSync(M, "utf8");
    for (const t of TABLAS) if (!new RegExp(`create trigger \\w+ after insert or update or delete on ${t} for each statement execute function config_avisar\\(\\)`).test(m)) falla(G, M, 0, `${t} no avisa sus cambios (config_avisar)`);
    if (!/perform pg_notify\('tl_config'/.test(m)) falla(G, M, 0, "config_avisar() avisa por el canal tl_config");
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f) || f === "apps/web/lib/cambios-config.ts") continue;
      const t = sinComent(f);
      if (!/Date\.now\(\)\s*-\s*\w+\.at\s*[<>]/.test(t)) continue;           // una copia con hora
      const lee = TABLAS.filter((x) => new RegExp(`\\bfrom ${x}\\b`).test(t));
      if (!lee.length) continue;
      if (!/alCambiarConfig\(/.test(t)) falla(G, f, 0, `guarda en memoria lo que lee de ${lee.join(", ")} y no lo olvida al cambiar (alCambiarConfig de lib/cambios-config.ts)`);
    }
  },

  /* 9b-3 · Una función NUESTRA (de las migraciones) en un «with x as (select f(…))» se evalúa una vez solo si el CTE dice «materialized»: si no,
     Postgres lo mete en la consulta y llama a la función en cada fila donde se usa (la búsqueda de la ayuda armaba la consulta con sus sinónimos
     dos veces por trozo: 60 ms en la carga, 2 ms con «materialized»). Al revés: alreves9b3. */
  consultaUnaVez() {
    const G = "consultaUnaVez", fns = new Set();
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) for (const m of readFileSync(`packages/db/migrations/${x}`, "utf8").matchAll(/create or replace function (\w+)\(/g)) fns.add(m[1]);
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/\bwith (\w+) as (materialized )?\(\s*select (\w+)\(/gi)) if (fns.has(m[3]) && !m[2]) falla(G, f, t.slice(0, m.index).split("\n").length, `«with ${m[1]} as (select ${m[3]}(…))»: escribe «as materialized» (si no, ${m[3]} corre en cada fila)`);
    }
  },

  /* 9b-3 · Un saldo que se muestra como «ahora» no sale solo de un resumen del barrido: EN CIRCULACIÓN leía com_rangos_ciudad (cada 10 min) y el
     Super Admin veía 1,015 monedas cuando había otras (com5g en la confirmación del CI). Cada consulta que suma las monedas del resumen le suma
     también lo que entró al libro (coin_entries) desde su refreshed_at. Al revés: alreves9b3. */
  saldoAlDia() {
    const G = "saldoAlDia", RES = { com_rangos_ciudad: { col: "monedas", libro: "coin_entries" } };
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/`[^`]*`/g)) for (const [tab, r] of Object.entries(RES)) {
        if (!new RegExp(`\\b${tab}\\b`).test(m[0]) || !new RegExp(`sum\\([^)]*\\b${r.col}\\b`).test(m[0])) continue;
        if (!new RegExp(`\\b${r.libro}\\b`).test(m[0]) || !/refreshed_at/.test(m[0])) falla(G, f, t.slice(0, m.index).split("\n").length, `suma ${r.col} de ${tab} (el resumen del barrido) sin lo que entró a ${r.libro} desde su refreshed_at: el número se queda atrás hasta 10 min`);
      }
    }
  },

  /* 9b-3 · Dos fotos de la misma página se comparan sin el reloj: compa7e comparaba el texto con solo los números como «#» y falló al pasar las
     12:00 entre las dos («12 PM» → «12:01 PM»). Una prueba que normaliza números a mano usa pruebas/lib/sin-reloj.cjs. Al revés: alreves9b3. */
  fotoSinReloj() {
    const G = "fotoSinReloj", L = "pruebas/lib/sin-reloj.cjs";
    if (!existsSync(L)) return falla(G, L, 0, "falta el normalizador sin reloj de las pruebas");
    const l = readFileSync(L, "utf8");
    for (const x of ["HORA", "SALUDO", "DIA"]) if (!new RegExp(`\\.replace\\(${x},`).test(l)) falla(G, L, 0, `norm() no quita ${x.toLowerCase()} antes de los números`);
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      const m = /\.replace\(\/\\d\+\/g, ['"]#['"]\)/.exec(t);
      if (m) falla(G, f, t.slice(0, m.index).split("\n").length, "normaliza los números a mano: la hora («12 PM» / «12:01 PM») y el saludo quedan; usa norm de pruebas/lib/sin-reloj.cjs");
    }
  },

  /* 9b-3 · El punto de partida de una prueba es SU fila, no «la persona no tiene ninguna»: pre4e creaba la casa de 112 W Oak St solo si Marisol no
     tenía casa; barajada, fi4b le dejaba otra antes y el pre-estimado del Hogar no se podía enviar. Un insert de preparación cuyo «not exists» solo
     mira a la persona (user_id y removed_at) sobre la misma tabla falla. Al revés: alreves9b3. */
  precondicionPropia() {
    const G = "precondicionPropia";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/insert into (\w+)[^`]*?not exists \(select 1 from \1 where user_id = [^ ]+ and removed_at is null\)/g))
        falla(G, f, t.slice(0, m.index).split("\n").length, `prepara ${m[1]} solo si la persona no tiene ninguna: otra prueba pudo dejarle otra; pregunta por la fila de esta prueba y hazla la de por omisión`);
    }
  },

  /* 9b-3 · Un artículo que la prueba deja «disponible» también queda con su cuenta: leg9e quitaba sold_out del flan, que cuenta por día (6); otras
     pruebas lo compraban y, barajadas o dos veces seguidas, el pedido no salía («no está disponible ahora»). Un «update items set sold_out = false»
     de una prueba pone en la misma orden la cuenta (stock_left y stock_day: a su número y null, o la que la prueba necesita). Al revés: alreves9b3. */
  existenciaPropia() {
    const G = "existenciaPropia";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/update items set ([^`]*?)\bwhere\b/g))
        if (/sold_out = false/.test(m[1]) && (!/\bstock_left = /.test(m[1]) || !/\bstock_day = /.test(m[1]))) falla(G, f, t.slice(0, m.index).split("\n").length, "deja el artículo disponible sin devolverle su cuenta: otra prueba pudo agotarlo (stock_left = greatest(stock_left, stock_par), stock_day = null)");
    }
  },

  /* 9b-3 · El pago del menú abre en el modo que la prueba dice: sin uno guardado toma el primero que el negocio tiene a esa hora (delivery si lo
     hay). Barajadas, menu2b y pagos2d llegaban al pago de Sabor Dominicano con delivery encendido, el pedido de $4.50 no llegaba al mínimo de $15 y
     «Enviar pedido» no salía. Una prueba que va al pago de un negocio (/n/…/pagar o «Ir a pagar») fija tl-modo-v1. Al revés: alreves9b3. */
  modoPropio() {
    const G = "modoPropio";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      const m = /(?<![a-z-])(?<!eventos\\?)\/pagar(?![a-z-])|Ir a pagar/.exec(t);
      if (m && !/tl-modo-v1/.test(t)) falla(G, f, t.slice(0, m.index).split("\n").length, "va al pago de un negocio sin fijar el modo (tl-modo-v1): sin él toma el primero que haya a esa hora y otra prueba pudo dejar delivery");
    }
  },

  /* 9j · Un miembro del equipo que una prueba inventa (teléfono libre) entra con segundo factor como el resto del equipo de ficción: ana9g daba de
     alta un Admin con telLibre() sin ponerlo en staff_mfa_pruebas y /admin lo mandaba a /admin/dos-pasos («EMBUDO» no salía). Una prueba que inserta
     en staff_members con un teléfono libre lo anota en staff_mfa_pruebas. Al revés: alreves9b3. */
  equipoDePruebaConDosPasos() {
    const G = "equipoDePruebaConDosPasos";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8"), i = t.search(/insert into staff_members/);
      if (i >= 0 && /telLibre\(\)/.test(t) && !/insert into staff_mfa_pruebas/.test(t)) falla(G, f, t.slice(0, i).split("\n").length, "da de alta a alguien del equipo con un teléfono libre sin anotarlo en staff_mfa_pruebas: sin segundo factor el Super Admin no abre");
    }
  },

  /* 9b-3 · La fila que una prueba elige es la que la página muestra: tra4w tomaba «la próxima salida» de trip_runs sin mirar si el servicio seguía
     vivo y con esa hora (lib/transporte.ts salidasDe lo mira); en la segunda vuelta seguida quedaba la salida de un servicio quitado, la página no la
     mostraba y el «+» bajaba otra. Una consulta de prueba que elige una salida (trip_runs … limit 1) filtra como salidasDe. Al revés: alreves9b3. */
  salidaComoLaPagina() {
    const G = "salidaComoLaPagina";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/`[^`]*\bfrom trip_runs\b[^`]*\blimit 1\b[^`]*`/g))
        if (!/removed_at is null/.test(m[0]) || !/svc_attrs->'sal'/.test(m[0])) falla(G, f, t.slice(0, m.index).split("\n").length, "elige una salida sin filtrar como la página (servicio vivo y a una hora que todavía tiene: lib/transporte.ts salidasDe)");
    }
  },

  /* 9b-3 · Cada prueba de punta a punta empieza sin las ventanas de un minuto que dejó la anterior (la espera entre códigos de un teléfono, los
     topes compartidos, las búsquedas de la puerta): barajadas, una prueba que entraba con la misma cuenta justo después de otra recibía «Espera unos
     segundos» (admin1i). Al revés: alreves9b3. */
  pruebasIndependientes() {
    const G = "pruebasIndependientes", C = "pruebas/correr.mjs";
    if (!existsSync(C)) return falla(G, C, 0, "falta el corredor de las pruebas");
    const t = sinComent(C), f = cuerpoFn(t, "cerrarVentanas");
    if (!/if \(t\.carril === "e2e"\) cerrarVentanas\(\);/.test(t)) falla(G, C, 0, "cada prueba de punta a punta empieza con cerrarVentanas()");
    for (const x of ["delete from otp_codes where created_at > now\\(\\) - interval '1 minute'", "delete from rate_counters", "delete from door_searches"]) if (!new RegExp(x).test(f)) falla(G, C, 0, `cerrarVentanas() no cierra «${x.replace(/\\/g, "")}»`);
  },

  /* 9b-3 · Esperar lo que el clic HACE, no un texto que ya estaba: cit3c tocaba «Llegó · en atención» y esperaba /en atención/, que el botón
     mismo cumplía; recargaba antes de que el servidor guardara y «Terminada · cobrar» no salía (todas las fases, una vez). Un clic en un botón
     seguido de esperar un texto que su propio nombre cumple falla: espera la base (o otro texto). Al revés: alreves9b3. */
  esperaQueEspera() {
    const G = "esperaQueEspera";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/getByRole\('button', \{ name: '([^']+)'[^}]*\}\)\)?(?:\.click\(\))?\)?;\s*await \w+\.getByText\(\/((?:[^\/\\]|\\.)+)\/(i?)\)/g)) {
        let re; try { re = new RegExp(m[2], m[3]); } catch { continue; }
        if (re.test(m[1])) falla(G, f, t.slice(0, m.index).split("\n").length, `toca «${m[1]}» y espera /${m[2]}/, que el botón mismo ya cumple: no espera nada; espera lo que guarda el servidor`);
      }
    }
  },

  /* 9b-3 · Lo que se retiene o se cobra de Marisol sale de SU tarjeta: fie4v, est4d, tra4y, tra4y2, noc4c y barr la daban por hecha (la dejaba
     cit3e); barajada en una base nueva, «Enviar solicitud» no se encendía. Una prueba que entra como Marisol y comprueba algo retenido (held)
     guarda su tarjeta (negocio-nuevo.cjs tarjeta) o la crea ella. Al revés: alreves9b3. */
  tarjetaPropia() {
    const G = "tarjetaPropia";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      // 9b-3 · La tarjeta tiene que ser la de Marisol: ins4e solo guardaba una a otra clienta (0299) y el guardián lo daba por bueno. Si
      // todas las líneas que guardan tarjeta nombran a otro teléfono de prueba, Marisol sigue sin ninguna.
      if (!/5705550122/.test(t)) continue;
      const lt = t.split("\n").filter((x) => /\.tarjeta\b|\btarjeta\(|pm_sim_|payment_methods/.test(x));
      if (lt.length && !lt.every((x) => /570555(?!0122)\d{4}/.test(x) && !/5705550122/.test(x))) continue;
      const l = t.split("\n").findIndex((x) => /\bok\(/.test(x) && /[|:'`]held\b/.test(x));
      if (l >= 0) falla(G, f, l + 1, "comprueba un depósito retenido de Marisol sin guardarle su tarjeta: en una base nueva y barajada no tiene ninguna; usa tarjeta('5705550122') de pruebas/lib/negocio-nuevo.cjs");
      // Un viaje reservado en la app también se retiene en la tarjeta: sin ella «Reservar» queda apagado (cho4y en la barajada).
      const v = t.split("\n").findIndex((x) => /\/viaje\?s=/.test(x));
      if (v >= 0 && /name: 'Reservar', exact: true/.test(t)) falla(G, f, v + 1, "Marisol reserva un viaje sin guardarle su tarjeta: el viaje se retiene en la tarjeta y sin ella «Reservar» queda apagado; usa tarjeta('5705550122') de pruebas/lib/negocio-nuevo.cjs");
    }
  },

  /* 9b-3 · Una captura aprobada no cambia con la hora del día: la ficha y el panel de Sabor Dominicano se aprobaron abiertos y de noche («Cerrado ·
     abre mañana») el CI fallaba en los teléfonos sin que nada cambiara. Cada pantalla de un negocio (/n/<id>, /panel) tiene su negocio en
     pantallas.json «abiertos», y correr.mjs los abre antes de capturar y devuelve el horario al final. Al revés: alreves9b3. */
  capturaSinHora() {
    const G = "capturaSinHora", P = "pruebas/visual/pantallas.json", C = "pruebas/visual/correr.mjs";
    if (!existsSync(P) || !existsSync(C)) return falla(G, P, 0, "faltan las pantallas o el corredor visual");
    const cfg = JSON.parse(readFileSync(P, "utf8")), ab = cfg.abiertos || [], c = readFileSync(C, "utf8");
    for (const pa of cfg.pantallas) {
      const n = /^\/n\/([^/?#]+)/.exec(pa.ruta)?.[1];
      if (n && !ab.includes(n)) falla(G, P, 0, `la pantalla ${pa.id} (${pa.ruta}) no tiene a ${n} en «abiertos»: de noche la captura sale cerrada y no es la aprobada`);
      if (/^\/panel/.test(pa.ruta) && !ab.length) falla(G, P, 0, `la pantalla ${pa.id} (panel) sin negocios en «abiertos»`);
    }
    if (!/cfg\.abiertos/.test(c) || !/finally \{ devolverHorario\(\); \}/.test(c)) falla(G, C, 0, "correr.mjs no abre los negocios de «abiertos» antes de capturar o no devuelve su horario al final");
  },

  /* 9d · purgaCompleta (D5; fase9-apertura.md §3.7): a los 30 días pasa exactamente lo que promete «Borrar mi cuenta», por el mapa. Estático: la
     purga corre en el barrido central (purgarVencidas), lee el mapa (no una lista propia), comprueba con datos_purga_pendiente y anota purge_runs y
     purge_items; la cuenta queda con el teléfono vacío y 'deleted' (el mismo número que vuelve es una cuenta nueva); una tabla «borrar» del mapa no
     tiene un trigger que impida borrar (la purga fallaría a medias); purge_runs y purge_items son de solo inserción. La comprobación de verdad es la
     prueba de punta a punta datos9d (reloj a +30 días: datos_purga_pendiente en cero, tabla por tabla). Al revés: alreves9d. */
  purgaCompleta() {
    const G = "purgaCompleta", P = "apps/web/lib/datos/purgar.ts", B = "apps/web/lib/barrido.ts", M = "packages/db/migrations/0134_mis_datos.sql", E = "pruebas/e2e/datos9d.cjs";
    if (!existsSync(P)) return falla(G, P, 0, "falta la purga (lib/datos/purgar.ts)");
    const p = sinComent(P), b = sinComent(B);
    if (!/\["datosPurga", async \(\) => \(await import\("\.\/datos\/purgar"\)\)\.purgarVencidas\(\)\]/.test(b)) falla(G, B, 0, "la purga de las cuentas a los 30 días corre en el barrido central");
    const pc = cuerpoFn(p, "purgarCuenta");
    if (!/const M = await mapa\(\);/.test(pc) || !/await paso\(c, f, cuenta, u\.phone, lote\)/.test(pc)) falla(G, P, 0, "la purga va por el mapa (data_map), cada paso, no por una lista propia");
    if (!/datos_purga_pendiente\(\$1::uuid, \$2::text\)/.test(pc) || !/pendientes === 0/.test(pc)) falla(G, P, 0, "la purga se comprueba con datos_purga_pendiente (ok solo si no queda nada)");
    if (!/insert into purge_runs/.test(pc) || !/insert into purge_items/.test(pc)) falla(G, P, 0, "la purga anota purge_runs y purge_items (cada tabla)");
    if (!/soporte_purgar_casos\(/.test(pc) || !/compa_purgar_conversaciones\(/.test(pc)) falla(G, P, 0, "la purga reusa la de 7i (soporte_purgar_casos, compa_purgar_conversaciones)");
    if (!/negociosSinDueno\(c, cuenta\)/.test(pc)) falla(G, P, 0, "sus negocios sin otro dueño quedan sin reclamar (L188)");
    if (!/fotosFuera\(cuenta/.test(pc)) falla(G, P, 0, "sus fotos salen del almacenamiento antes de vaciar la fila");
    if (/set_config\('tl\.purga', 'si', false\)|tl\.purga = 'si'/.test(p)) falla(G, P, 0, "tl.purga solo dentro de la transacción (set_config(..., true))");
    const mapa = leerMapa(), us = mapa.tablas?.users?.reglas?.find((r) => r.col === "id");
    if (us?.set?.phone !== "null" || us?.set?.status !== "'deleted'" || us?.set?.first_name !== "'Cuenta borrada'") falla(G, "packages/db/mapa-de-datos.json", 0, "la cuenta purgada: teléfono vacío (vuelve = cuenta nueva), 'deleted' y «Cuenta borrada»");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== P && /tl\.purga/.test(sinComent(f))) falla(G, f, 0, "solo lib/datos/purgar.ts enciende tl.purga");
    // Una tabla que el mapa borra no tiene un trigger que lo impida.
    const borrar = new Set(filasMapa(mapa).filter((f) => f.accion === "borrar" && f.rol !== "equipo").map((f) => f.tabla));
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql")).sort()) {
      const t = readFileSync(`packages/db/migrations/${x}`, "utf8");
      for (const m of t.matchAll(/create trigger \w+ before ([^;]*?) on (\w+)[^;]*?execute (?:function|procedure) (\w+)\(/g)) {
        if (!/\bdelete\b/.test(m[1]) || !borrar.has(m[2])) continue;
        const cuerpo = ultimaFn(m[3]);
        if (/^\s*(declare[\s\S]*?)?begin\s+raise exception/i.test(cuerpo) || /if tg_op = 'DELETE' then raise exception/.test(cuerpo) || /if tg_op <> 'INSERT' then raise exception/.test(cuerpo))
          falla(G, `packages/db/migrations/${x}`, 0, `${m[2]} está en el mapa como «borrar», pero su trigger ${m[3]} no deja borrar: vacíala (vaciar) o guárdala con su porqué`);
      }
    }
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      for (const tb of ["purge_runs", "purge_items", "account_merges"]) if (!new RegExp(`create trigger ${tb}_no_cambia before update or delete on ${tb} for each row execute function purga_solo_insercion\\(\\)`).test(m)) falla(G, M, 0, `${tb} es de solo inserción`);
      if (!/check \(approved_by <> requested_by\)/.test(m)) falla(G, M, 0, "account_merges: lo aprueba OTRA persona (la base lo exige)");
      if (!/alter table users add constraint users_phone_o_borrada check \(phone is not null or status in \('deleted', 'merged'\)\)/.test(m)) falla(G, M, 0, "users: el teléfono solo queda vacío en una cuenta borrada o fusionada");
    }
    if (!existsSync(E) || !/datos_purga_pendiente/.test(readFileSync(E, "utf8"))) falla(G, E, 0, "la prueba de punta a punta comprueba la purga tabla por tabla (datos_purga_pendiente)");
  },

  /* 9d · exportaSoloLoSuyo (fase9-apertura.md §3.7): el archivo de una persona trae SOLO sus filas (la columna de la persona del mapa = su id) y
     sin las columnas que apuntan a OTRA persona, ni huellas, cifrados, tokens o la ubicación exacta; el del negocio, solo lo de su negocio
     (business_id = $1) y de sus clientes nunca el teléfono, el correo ni la dirección; el archivo lo baja solo quien lo pidió (404 si no). Al revés:
     alreves9d. */
  exportaSoloLoSuyo() {
    const G = "exportaSoloLoSuyo", X = "apps/web/lib/datos/exportar.ts", MP = "apps/web/lib/datos/mapa.ts";
    if (!existsSync(X)) return falla(G, X, 0, "falta lib/datos/exportar.ts");
    const x = sinComent(X), dc = cuerpoFn(x, "datosDeCuenta"), dn = cuerpoFn(x, "datosDeNegocio"), bj = cuerpoFn(x, "bajarExportacion");
    if (!/where \$\{ident\(f\.columna\)\} = \$1::uuid/.test(dc)) falla(G, X, 0, "el archivo de la persona: solo sus filas (la columna de la persona del mapa = su id)");
    if (!/\.filter\(\(x\) => x !== f\.columna\)/.test(dc) || !/columnasDePersona\(c\)/.test(dc)) falla(G, X, 0, "el archivo de la persona: sin las columnas que apuntan a otra persona");
    if (!/f\.rol !== "persona"/.test(dc)) falla(G, X, 0, "solo las reglas de la persona exportan (nunca las del equipo)");
    if (!/NUNCA_SE_EXPORTA\.test\(k\)/.test(cuerpoFn(x, "limpiar")) || !/Buffer\.isBuffer\(v\)/.test(cuerpoFn(x, "limpiar"))) falla(G, X, 0, "nunca salen huellas, cifrados, tokens ni binarios");
    const nunca = /export const NUNCA_SE_EXPORTA = (\/.*\/);/.exec(sinComent(MP))?.[1] ?? "";
    for (const k of ["token_hash", "phone_enc", "code_hash", "public_key", "geom", "credential_id"]) if (!nunca || !new RegExp(nunca.slice(1, -1)).test(k)) falla(G, MP, 0, `NUNCA_SE_EXPORTA deja salir «${k}»`);
    const qs = dn.match(/`[^`]*`/g) ?? [];
    if (qs.length < 5) falla(G, X, 0, "no encuentro las consultas del archivo del negocio");
    for (const q of qs) {
      if (/\bfrom\b/.test(q) && !/business_id = \$1\b|where id = \$1\b/.test(q)) falla(G, X, 0, `el archivo del negocio: solo lo de su negocio («${q.slice(0, 60)}…»)`);
      if (/\bu\.(phone|email)\b|user_addresses|\bstreet\b|\bu\.photo_url\b/.test(q)) falla(G, X, 0, "de los clientes, el negocio no recibe teléfono, correo, dirección ni foto");
    }
    if (!/from data_exports where id = \$1::uuid and user_id = \$2::uuid`/.test(bj) || !/status: 404/.test(bj)) falla(G, X, 0, "el archivo lo baja solo quien lo pidió (de otra persona: 404)");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== X && /privado\/exportes\//.test(sinComent(f))) falla(G, f, 0, "solo lib/datos/exportar.ts toca los archivos de las exportaciones");
  },

  /* 9d · enlaceUnUsoSinGet (fase9-apertura.md §3.7): el enlace del archivo es de UN uso y vence: un GET (la vista previa de un enlace pegado en un
     chat, un buscador) NUNCA lo gasta ni sirve el archivo; solo el POST del mismo sitio con la sesión de quien lo pidió lo baja, una vez (gana el
     primero: la condición status = 'listo' y vigente va en el update). La base: bajado no vuelve, y se baja una sola vez. Al revés: alreves9d. */
  enlaceUnUsoSinGet() {
    const G = "enlaceUnUsoSinGet", R = "apps/web/app/api/datos/archivo/[id]/route.ts", X = "apps/web/lib/datos/exportar.ts", M = "packages/db/migrations/0134_mis_datos.sql";
    if (!existsSync(R)) return falla(G, R, 0, "falta la ruta del archivo");
    const r = sinComent(R), get = r.slice(r.indexOf("export async function GET"), r.indexOf("export async function POST") > r.indexOf("export async function GET") ? r.indexOf("export async function POST") : undefined);
    if (!/export async function GET/.test(r)) falla(G, R, 0, "el GET existe y no gasta nada (lleva a la pantalla)");
    if (/bajarExportacion|leerObjeto|update |application\/zip|db\(\)/.test(get)) falla(G, R, 0, "un GET no gasta el enlace ni sirve el archivo");
    const post = r.slice(r.indexOf("export async function POST"));
    if (!/await mismoOrigen\(\)/.test(post) || !/await yo\(\)/.test(post) || !/bajarExportacion\(/.test(post)) falla(G, R, 0, "solo un POST del mismo sitio, con sesión, baja el archivo");
    if (/export async function (PUT|PATCH|HEAD|OPTIONS)/.test(r)) falla(G, R, 0, "solo GET (sin gastar) y POST");
    const bj = cuerpoFn(sinComent(X), "bajarExportacion");
    if (!/set status = 'bajado', downloaded_at = now\(\)[^`]*where id = \$1::uuid and user_id = \$2::uuid and status = 'listo' and expires_at > now\(\)/.test(bj)) falla(G, X, 0, "un uso: el que baja gana con status = 'listo' y vigente en el mismo update");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== R && f !== X && /bajarExportacion\(/.test(sinComent(f))) falla(G, f, 0, "solo la ruta POST baja el archivo");
    if (existsSync(M)) { const m = readFileSync(M, "utf8"); if (!/raise exception 'el archivo se baja una sola vez'/.test(m) || !/raise exception 'una exportación bajada, vencida o fallida no vuelve'/.test(m)) falla(G, M, 0, "la base: se baja una sola vez y no vuelve"); }
  },

  /* 9b-3 · Un ayudante compartido de las pruebas (pruebas/lib) no cambia un libro de solo inserción sin el modo réplica: sinTopeDeAyuda corría
     compa_messages con un update simple, la base lo rechazó («es solo de inserción») y 15 pruebas cayeron en la misma línea. Las tablas salen de
     los disparadores de las migraciones. (En pruebas/e2e un update así suele ser a propósito: comprueba que la base lo rechaza.) Al revés: alreves9b3. */
  libroEnAyudantes() {
    const G = "libroEnAyudantes", tabs = new Set();
    for (const f of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) for (const m of readFileSync(`packages/db/migrations/${f}`, "utf8").matchAll(/'(\w+) es solo de inserci[oó]n/g)) tabs.add(m[1]);
    if (!tabs.has("compa_messages")) falla(G, "packages/db/migrations", 0, "no encontré los libros de solo inserción en las migraciones");
    for (const y of readdirSync("pruebas/lib").filter((x) => /\.c?js$/.test(x))) {
      const f = `pruebas/lib/${y}`, t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/`[^`]*`/g)) for (const tb of tabs)
        if (new RegExp(`\\b(update|delete from)\\s+${tb}\\b`).test(m[0]) && !/session_replication_role\s*=\s*replica/.test(m[0])) falla(G, f, t.slice(0, m.index).split("\n").length, `cambia ${tb} (solo inserción) sin «set session_replication_role = replica»: la base lo rechaza y cae cada prueba que usa este ayudante`);
    }
  },

  /* 9b-3 · Abierto las 24 horas no tiene hora de cerrar: lib/pedir.ts contaba el «último pedido» desde la medianoche y un negocio de 24 horas
     dejaba de tomar pedidos a las 11:30 PM (lo destapó la barajada de noche: pedidos2c a las 11:50 PM de Hazleton). Las pruebas lo escribían
     «00:00–23:59» (cierra a las 11:59 PM); un día entero es «00:00–00:00». Al revés: alreves9b3. */
  /* 9b-3 · Un bloque se toma por su nombre, no por su lugar: Textos y páginas armaba la página de una versión con «cab[3]», el aviso de producción;
     9f metió el selector de idioma en la cabecera y la página mostraba las cifras en su lugar (leg9e: «el Super Admin avisa que es producción»).
     Una lista de bloques (Bloque[]) no lleva un elemento de otra lista tomado por índice fijo. Al revés: alreves9b3. */
  bloquePorNombre() {
    const G = "bloquePorNombre";
    for (const f of archivos.filter((x) => /^apps\/web\/.*\.tsx$/.test(x))) {
      const t = sinComent(f), re = /:\s*Bloque\[\]\s*=\s*\[/g; let m;
      while ((m = re.exec(t))) {
        let i = m.index + m[0].length, n = 1;
        for (; i < t.length && n; i++) { if (t[i] === "[") n++; else if (t[i] === "]") n--; }
        // Los elementos de primer nivel de la lista (no lo de dentro de un objeto: «ic: L[1]» es un dato, no un bloque).
        const cuerpo = t.slice(m.index + m[0].length, i - 1), els = []; let d = 0, ini = 0;
        for (let k = 0; k < cuerpo.length; k++) { const c = cuerpo[k]; if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (c === "," && !d) { els.push([ini, cuerpo.slice(ini, k)]); ini = k + 1; } }
        els.push([ini, cuerpo.slice(ini)]);
        for (const [pos, e] of els) if (/^[A-Za-z_$][\w$]*\[\d+\]!?$/.test(e.trim()))
          falla(G, f, t.slice(0, m.index + m[0].length + pos).split("\n").length + (e.match(/^\s*\n/) ? 1 : 0), `una lista de bloques toma «${e.trim()}» por su lugar: si la otra lista cambia, sale otro bloque; dale nombre`);
      }
    }
  },

  /* 9b-3 · «Publica tu negocio» pinta cada paso dentro de un marco con la etiqueta «ONB-NEG-<paso> · móvil/desktop», y el paso lleva la suya
     («ONB-NEG-C1 · lo propio de tu categoría»): un prefijo «^="ONB-NEG-C1"» toma los dos, y «> div» del marco incluye la cabecera con «Volver»
     (a11y9c apretaba «Volver» en vez de contestar). Una prueba que baja a los hijos de un paso usa la etiqueta entera. */
  etiquetaDelPaso() {
    const G = "etiquetaDelPaso";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8"), m = /data-screen-label\^=\\?"ONB-NEG-[A-Z0-9]+\\?"\]\s*>/.exec(t);
      if (m) falla(G, f, t.slice(0, m.index).split("\n").length, "un prefijo «ONB-NEG-<paso>» también es el marco de la pantalla (con su «Volver»): para bajar a los hijos de un paso, la etiqueta entera");
    }
  },

  /* 9b-3 · El chat del negocio con El Compa encendido por otra prueba: compa7f y compa7h dejan las respuestas automáticas de El Compa
     encendidas en su negocio y, dos veces seguidas, msg2p tomaba la respuesta de El Compa por el mensaje de la clienta. Una prueba que
     escribe en /cuenta/mensajes y mira chat_messages, y no es de El Compa, lo apaga mientras dura (compa_business_settings). Al revés: alreves9b3. */
  compaEnElChat() {
    const G = "compaEnElChat";
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs") && !/^compa/.test(y)).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8");
      if (!/cuenta\/mensajes\//.test(t) || !/from chat_messages/.test(t)) continue;
      const apaga = t.search(/update compa_business_settings set enabled = false/), escribe = t.search(/Escribe a|cuenta\/mensajes\//);
      if (apaga < 0 || apaga > escribe) falla(G, f, t.slice(0, escribe).split("\n").length, "escribe en el chat de un negocio y mira chat_messages sin apagar antes El Compa de ese negocio: si otra prueba lo dejó encendido, su respuesta pasa por la del cliente");
    }
  },

  veinticuatroHoras() {
    const G = "veinticuatroHoras", P = "apps/web/lib/pedir.ts";
    const p = sinComent(P);
    if (!/const sinCierre = !!actual && actual\[1\] - actual\[0\] >= 1440;/.test(p) || !/!sinCierre \? actual\[1\] - b\.last_min/.test(p)) falla(G, P, 0, "el «último pedido» de un negocio abierto las 24 horas se cuenta desde la medianoche: deja de tomar pedidos de noche");
    for (const f of readdirSync("pruebas/e2e").filter((y) => y.endsWith(".cjs")).map((y) => `pruebas/e2e/${y}`)) {
      const t = readFileSync(f, "utf8"), m = /\[\["00:00", ?"23:59"\]\]/.exec(t);
      if (m) falla(G, f, t.slice(0, m.index).split("\n").length, "«abierto todo el día» como 00:00–23:59 cierra a las 11:59 PM (y deja de tomar pedidos antes): un día entero es [[\"00:00\",\"00:00\"]]");
    }
  },

  /* 9e · legalRevisado (fase9-apertura.md §1c, §3.6, §4 9e): «Nada de lo legal se publica como final sin el abogado». En producción, ninguna
     página legal «publicado» sin reviewed_by_counsel: (1) la base lo impide (legal_pages_antes) y la base es producción salvo que la semilla del
     SANDBOX diga lo contrario (legal_entorno() falla cerrada: sin la fila, 'produccion'); (2) esa fila solo la escribe una semilla de
     infra/pruebas/semilla (nunca el código, una migración ni la Configuración); (3) lib/legal.ts tampoco publica sin revisión con
     el entorno de producción; (4) solo lib/legal.ts cambia el estado de una página y el indexador nunca publica; (5) con TOLATINO_FASE=9 (el
     despliegue de la apertura) ningún archivo de docs/legal/ puede seguir diciendo BORRADOR (antes, solo aviso). Al revés: alreves9e. */
  legalRevisado() {
    const G = "legalRevisado", M = "packages/db/migrations/0135_legal.sql", L = "apps/web/lib/legal.ts", X = "scripts/legal/indexar.mjs";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de lo legal");
    const fn = ultimaFn("legal_pages_antes");
    if (!/if new\.reviewed_by_counsel is null and legal_entorno\(\) <> 'pruebas' then\s+raise exception 'legal_revisado/.test(fn)) falla(G, M, 0, "la base no deja publicar sin reviewed_by_counsel fuera del sandbox");
    if (!/select coalesce\(\(select value #>> '\{\}' from platform_config where key = 'entorno'\), 'produccion'\)/.test(ultimaFn("legal_entorno"))) falla(G, M, 0, "legal_entorno() falla cerrada: sin la fila del sandbox, es producción");
    for (const f of archivos) {
      if (!/\.(sql|tsx?|mjs|cjs|js|sh|ya?ml)$/.test(f) || f.startsWith("infra/pruebas/semilla/") || f.startsWith("docs/") || f.startsWith("pruebas/") || f === "guardianes/run.mjs") continue;
      const t = readFileSync(f, "utf8");
      if (/platform_config[\s\S]{0,200}'entorno'|'entorno'[\s\S]{0,40}platform_config/.test(t) && !/key = 'entorno'\), 'produccion'/.test(t)) falla(G, f, 0, "platform_config «entorno» lo escribe solo la semilla del sandbox (infra/pruebas/semilla)");
      if (/^\s*\('entorno',/m.test(t) && /insert into config_keys/.test(t)) falla(G, f, 0, "«entorno» no es una clave de Configuración");
    }
    if (!existsSync(L)) return falla(G, L, 0, "falta lib/legal.ts");
    if (!/if \(ENTORNO === "produccion" && !v\.reviewed_by_counsel\) return \{ ok: false/.test(cuerpoFn(sinComent(L), "publicarLegal"))) falla(G, L, 0, "publicarLegal no publica sin revisión en el entorno de producción");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== L && /\bupdate legal_pages\b|status = 'publicado'/.test(sinComent(f))) falla(G, f, 0, "solo lib/legal.ts publica una página legal");
    if (existsSync(X) && /publicado|published_by/.test(sinComent(X))) falla(G, X, 0, "el indexador nunca publica: publicar es del Super Admin");
    const borr = paginasLegales().paginas.filter((p) => p.es.meta?.estado === BORRADOR_LEGAL || p.en.meta?.estado === BORRADOR_LEGAL);
    if (borr.length) {
      const msg = `${borr.length} página(s) de docs/legal/ siguen en BORRADOR (${borr.map((p) => `${p.jur}/${p.clave}`).join(", ")}): el abogado las revisa en 9s`;
      if (process.env.TOLATINO_FASE === "9") falla(G, "docs/legal", 0, msg); else avisos.push(`[${G}] ${msg} (solo aviso hasta TOLATINO_FASE=9)`);
    }
  },

  /* 9e · legalUnaFuente (fase9-apertura.md §3.6, §4 9e): el texto legal vive SOLO en docs/legal/ (con la forma de scripts/legal/forma.mjs, los
     dos idiomas y la página general de cada adenda) y llega a la web por lib/legal.ts. Cada página tiene su ruta pública, que pinta
     <PaginaLegal clave="…"> y nada más escrito a mano; ningún .ts/.tsx de apps/ o packages/ copia un trozo de un texto legal (16 palabras
     seguidas iguales). Al revés: alreves9e. */
  legalUnaFuente() {
    const G = "legalUnaFuente";
    const { errores, paginas } = paginasLegales();
    for (const e of errores) falla(G, "docs/legal", 0, e);
    for (const k of CLAVES_LEGALES) {
      if (!paginas.some((p) => p.jur === "us" && p.clave === k)) falla(G, `docs/legal/us/${k}.es.md`, 0, `falta la página «${k}» (español e inglés) en docs/legal/us/`);
      const R = `apps/web/app/(app)/${k}/page.tsx`;
      if (!existsSync(R)) { falla(G, R, 0, `falta la ruta pública /${k}`); continue; }
      const r = sinComent(R);
      if (!new RegExp(`<PaginaLegal clave="${k}" searchParams=\\{searchParams\\}`).test(r)) falla(G, R, 0, `/${k} pinta <PaginaLegal clave="${k}"> (el texto sale de docs/legal/)`);
      for (const m of r.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){160,})\1/g)) falla(G, R, 0, `texto largo escrito en la ruta legal: «${m[2].slice(0, 50)}…» (va en docs/legal/)`);
    }
    const P = "apps/web/app/(app)/_legal/PaginaLegal.tsx";
    if (!existsSync(P) || !/paginaPara\(/.test(sinComent(P))) falla(G, P, 0, "la página legal lee su texto con paginaPara (lib/legal.ts)");
    // 16 palabras seguidas de un texto legal en el código = el texto se copió (las líneas fijas del producto que un texto legal cita, más cortas, no cuentan).
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[^a-z0-9ñ]+/g, " ").trim();
    const N = 16, tejas = new Set();
    for (const p of paginas) for (const l of ["es", "en"]) { const w = norm(`${p[l].lead}\n${p[l].cuerpo}`).split(" "); for (let i = 0; i + N <= w.length; i++) tejas.add(w.slice(i, i + N).join(" ")); }
    for (const f of codigo) {
      if (!/^(apps|packages)\/.*\.(tsx?|jsx?)$/.test(f) || /^packages\/ui\/src\/ds\//.test(f)) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){50,})\1/g)) {
        const w = norm(m[2]).split(" ");
        for (let i = 0; i + N <= w.length; i++) if (tejas.has(w.slice(i, i + N).join(" "))) { falla(G, f, 0, `copia un texto legal («${w.slice(i, i + N).join(" ").slice(0, 60)}…»): el texto vive solo en docs/legal/`); break; }
      }
    }
  },

  /* 9f · cadenaConLlave (fase9-apertura.md §4 9f): todo texto de la interfaz sale del CMS con su llave ÁREA-MÓDULO-PANTALLA.clave. (1) El catálogo
     apps/web/lib/cms-cadenas.json es exactamente lo que el extractor saca del código (sin errores: los dos idiomas, llaves con la forma, sin repetidas);
     (2) toda llave que el código pide con cadena("…") o pantalla("…") existe en el catálogo; (3) las pantallas ya migradas (el Inicio de la ciudad) no
     llevan ni un E2("…","…") escrito a mano; (4) las páginas del servidor leen el diccionario general por textosT (lib/cms.ts), nunca T directo, salvo
     los componentes de cliente que aún lo importan (lista cerrada, LAUNCH «→ 9f»); (5) el Inicio lee el CMS (homeConfig, anunciosVivos, pantalla).
     Trinquete (aviso hasta TOLATINO_FASE=9): cuántos E2("…","…") escritos a mano quedan en apps/web; no puede subir de lo que se registró aquí.
     Al revés: alreves9f. */
  cadenaConLlave() {
    const G = "cadenaConLlave";
    for (const e of CMS.errores) falla(G, "apps/web/lib/textos*.ts", 0, e);
    if (!CMS.errores.length) {
      if (!existsSync(CMS_SALIDA) || readFileSync(CMS_SALIDA, "utf8") !== cmsComoJson(CMS.cadenas)) falla(G, "apps/web/lib/cms-cadenas.json", 0, "el catálogo de cadenas no es el que sale del código: corre «node scripts/cms/extraer.mjs»");
    }
    const llaves = new Set(CMS.cadenas.map((c) => c.id));
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/\bcadena\(\s*["'`]([A-Z0-9-]+\.[A-Za-z0-9_.-]+)["'`]/g)) if (!llaves.has(m[1])) falla(G, f, 0, `la llave «${m[1]}» no está en el catálogo de cadenas`);
      for (const m of t.matchAll(/\bpantalla\(\s*["'`]([A-Z0-9-]+)["'`]/g)) if (![...llaves].some((k) => k.startsWith(m[1] + "."))) falla(G, f, 0, `la pantalla «${m[1]}» no tiene cadenas en el catálogo`);
    }
    const E2LIT = /\bE2\(\s*(["`'])(?:(?!\1)[^\\\n]|\\.)*\1\s*,\s*(["`'])(?:(?!\2)[^\\\n]|\\.)*\2\s*\)/g;
    const MIGRADAS = ["apps/web/app/(app)/Inicio.tsx", "apps/web/app/(app)/page.tsx"];
    for (const f of MIGRADAS) {
      if (!existsSync(f)) { falla(G, f, 0, "falta una pantalla migrada al CMS"); continue; }
      const n = (sinComent(f).match(E2LIT) ?? []).length;
      if (n) falla(G, f, 0, `${n} texto(s) escritos a mano con E2("…","…") en una pantalla que ya lee el CMS: van en el diccionario con su llave (lib/textos-home.ts)`);
    }
    // El Inicio lee el CMS.
    const PG = "apps/web/app/(app)/page.tsx";
    if (existsSync(PG)) {
      const t = sinComent(PG);
      for (const x of ["homeConfig(", "anunciosVivos(", "pantalla(\"APP-HOME\"", "textosT("]) if (!t.includes(x)) falla(G, PG, 0, `el Inicio de la ciudad lee el CMS: falta ${x.replace("(", "")}`);
    }
    // Las páginas del servidor no leen T directo (el diccionario con lo editado es textosT). Los componentes de cliente de la lista siguen con T.
    const T_EN_CLIENTE = new Set(["apps/web/app/(app)/buscar/Buscar.tsx", "apps/web/app/(app)/comunidad/hoy/Hoy.tsx", "apps/web/lib/cms.ts"]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || T_EN_CLIENTE.has(f)) continue;
      if (/import \{ T(?: as \w+)? \} from "@\/lib\/textos"/.test(sinComent(f))) falla(G, f, 0, "lee el diccionario T directo: usa textosT(lang) de lib/cms.ts (así ve lo que el Super Admin editó)");
    }
    // Trinquete.
    const TOPE_E2 = 16129;
    let hechos = 0;
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f)) hechos += (sinComent(f).match(E2LIT) ?? []).length;
    if (hechos > TOPE_E2) {
      const msg = `${hechos} textos escritos a mano con E2("…","…") en apps/web (tope registrado ${TOPE_E2}): los nuevos van al diccionario con su llave`;
      if (process.env.TOLATINO_FASE === "9") falla(G, "apps/web", 0, msg); else avisos.push(`[${G}] ${msg} (solo aviso hasta TOLATINO_FASE=9)`);
    }
  },

  /* 9f · lineaFijaBloqueada (fase9-apertura.md §1c y §4 9f): las líneas fijas no se editan desde el Super Admin: 911 («Si es una emergencia, llama al 911»),
     «Nadie te garantiza un resultado», la de cada categoría y las de §1c. (1) El catálogo las trae con candado (locked); las de §1c son idénticas, palabra por
     palabra, a las del plan; (2) la base lo impone (cms_linea_fija) y solo el despliegue (tl.cms_indexar, una sola función) puede cambiarlas; (3) la app
     tampoco las edita (editarCadena revisa locked) y ningún código escribe locked ni tl.cms_indexar fuera del indexador. Al revés: alreves9f. */
  lineaFijaBloqueada() {
    const G = "lineaFijaBloqueada", M = "packages/db/migrations/0136_cms.sql", AD = "apps/web/lib/cms-admin.ts", PLAN = "docs/diseno/plan/fase9-apertura.md";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del CMS");
    const m = readFileSync(M, "utf8");
    const fn = (m.match(/create or replace function cms_cadena_reglas\(\)[\s\S]*?\nend \$\$;/) ?? [""])[0];
    if (!/if old\.locked and not indexando and \(new\.text is distinct from old\.text/.test(fn) || !/raise exception 'cms_linea_fija/.test(fn)) falla(G, M, 0, "la base no impide editar una línea fija (cms_linea_fija)");
    if (!/if new\.locked then new\.status := 'vivo'; end if;/.test(fn)) falla(G, M, 0, "una línea fija nace «vivo»: no se deja en borrador");
    if ((m.match(/set_config\('tl\.cms_indexar'/g) ?? []).length !== 1 || !/create or replace function cms_indexar\(p jsonb\)[\s\S]*?set_config\('tl\.cms_indexar', 'on', true\)/.test(m)) falla(G, M, 0, "solo cms_indexar (el despliegue) pone tl.cms_indexar");
    for (const f of codigo) {
      if (!/\.(tsx?|mjs|cjs|sh|ya?ml)$/.test(f) || f === "guardianes/run.mjs" || f.startsWith("pruebas/")) continue;
      const t = sinComent(f);
      if (/tl\.cms_indexar/.test(t)) falla(G, f, 0, "tl.cms_indexar lo pone solo la función cms_indexar de la base (el despliegue)");
      if (f !== "scripts/cms/extraer.mjs" && /\bupdate cms_strings\s+set\b[^;`]*\blocked\s*=/.test(t)) falla(G, f, 0, "nadie cambia `locked` de una cadena fuera del despliegue");
    }
    if (!existsSync(AD)) falla(G, AD, 0, "falta lib/cms-admin.ts");
    else { const t = (sinComent(AD).match(/async function cambiar\([\s\S]*?\n}\n/) ?? [""])[0]; if (!/if \(v\.locked\) return mal\(/.test(t)) falla(G, AD, 0, "editar una cadena revisa que no sea una línea fija"); }
    const por = new Map(CMS.cadenas.map((c) => [c.id, c]));
    const norm = (x) => x.replace(/\s+/g, " ").trim();
    const plan = existsSync(PLAN) ? norm(readFileSync(PLAN, "utf8")) : "";
    for (const k of ["landing", "landingTel", "exportar", "borrar", "mantenimiento", "equipoDosPasos"]) {
      const c = por.get(`FIJAS-1C.${k}`);
      if (!c) { falla(G, "apps/web/lib/textos-fijas.ts", 0, `falta la línea fija de §1c «${k}»`); continue; }
      if (!c.locked) falla(G, "apps/web/lib/textos-fijas.ts", 0, `la línea fija «${k}» tiene que llevar candado`);
      if (plan && (!plan.includes(norm(c.es)) || (k !== "borrar" && !plan.includes(norm(c.en))))) falla(G, "apps/web/lib/textos-fijas.ts", 0, `la línea fija «${k}» no es la de §1c de ${PLAN}, palabra por palabra`);
    }
    const sal = por.get("NEG-CATEGORIA.NEG-SALUD.linea"), pro = por.get("NEG-CATEGORIA.NEG-PRO.linea");
    if (!sal || !/911/.test(sal.es) || !sal.locked) falla(G, "packages/db/seeds/lineas.sql", 0, "la línea fija de Salud (911) tiene que estar en el catálogo, con candado");
    if (!pro || !/nadie te garantiza un resultado/i.test(pro.es) || !pro.locked) falla(G, "packages/db/seeds/lineas.sql", 0, "«Nadie te garantiza un resultado» tiene que estar en el catálogo, con candado");
    for (const c of CMS.cadenas) if (/^NEG-CATEGORIA\./.test(c.id) && !c.locked) falla(G, "scripts/cms/extraer.mjs", 0, `${c.id}: la línea fija de una categoría lleva candado`);
  },

  /* 9f · cmsConLimite (fase9-apertura.md §4 9f): cada cadena editable tiene un largo máximo que cabe en su lugar. (1) En el catálogo, max_len ≥ el largo de
     los dos textos del código, ≤ 600, y una cadena editable no se aleja más de 3 veces de su largo; (2) la base lo impone (cms_largo, cms_marcas,
     cms_vacia, check de max_len) y exige autor y motivo (cms_sin_autor); (3) la app lo revisa antes (editarCadena compara con max_len y con las marcas). Al revés: alreves9f. */
  cmsConLimite() {
    const G = "cmsConLimite", M = "packages/db/migrations/0136_cms.sql", AD = "apps/web/lib/cms-admin.ts";
    for (const c of CMS.cadenas) {
      const mayor = Math.max(c.es.length, c.en.length);
      if (!(c.max_len >= mayor)) falla(G, "apps/web/lib/cms-cadenas.json", 0, `${c.id}: el texto del código (${mayor}) pasa de su largo máximo (${c.max_len})`);
      if (!c.locked && (c.max_len > 600 || c.max_len > Math.max(40, mayor * 3))) falla(G, "apps/web/lib/cms-cadenas.json", 0, `${c.id}: un largo máximo de ${c.max_len} no cabe en su lugar (el texto mide ${mayor})`);
    }
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del CMS");
    const m = readFileSync(M, "utf8");
    if (!/max_len\s+integer not null default 200 check \(max_len between 1 and 2000\)/.test(m)) falla(G, M, 0, "max_len tiene sus límites en la base");
    const fn = (m.match(/create or replace function cms_cadena_reglas\(\)[\s\S]*?\nend \$\$;/) ?? [""])[0];
    for (const x of ["cms_largo", "cms_marcas", "cms_vacia", "cms_sin_autor"]) if (!fn.includes(`raise exception '${x}`)) falla(G, M, 0, `la base no impone ${x}`);
    if (!/char_length\(new\.text->>'es'\) > new\.max_len or char_length\(new\.text->>'en'\) > new\.max_len/.test(fn)) falla(G, M, 0, "la base compara los dos idiomas con max_len");
    if (!existsSync(AD)) return falla(G, AD, 0, "falta lib/cms-admin.ts");
    const t = sinComent(AD);
    if (!/E\.length > v\.max_len \|\| N\.length > v\.max_len/.test(t)) falla(G, AD, 0, "editarCadena revisa el largo máximo antes de guardar");
    if (!/if \(marcas\(E\) !== marcas\(v\.code_text\.es\)/.test(t)) falla(G, AD, 0, "editarCadena revisa las marcas {…}");
    if (!/tl\.cms_por/.test(t) || !/tl\.cms_motivo/.test(t)) falla(G, AD, 0, "un cambio de texto lleva autor y motivo");
  },

  /* 9f · cmsSoloInsercion (regla 12: auditoría solo inserción, nada se borra): cms_string_versions es de solo inserción (trigger) y la escribe la propia base
     (cms_cadena_version); un anuncio no se borra ni se edita (se retira, con motivo); ningún código borra ni cambia versiones, cadenas, anuncios ni la
     configuración del Inicio de otra manera que por lib/cms-admin.ts. Al revés: alreves9f. */
  cmsSoloInsercion() {
    const G = "cmsSoloInsercion", M = "packages/db/migrations/0136_cms.sql", AD = "apps/web/lib/cms-admin.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del CMS");
    const m = readFileSync(M, "utf8");
    if (!/create trigger cms_string_versions_no_cambia before update or delete on cms_string_versions for each row execute function cms_solo_insercion\(\)/.test(m)) falla(G, M, 0, "cms_string_versions es de solo inserción (trigger)");
    if (!/create trigger cms_strings_version after insert or update on cms_strings/.test(m)) falla(G, M, 0, "la base escribe la versión de cada cambio de texto (cms_cadena_version)");
    const fa = (m.match(/create or replace function announcements_reglas\(\)[\s\S]*?\nend \$\$;/) ?? [""])[0];
    if (!/raise exception 'announcements no se borra: se retira'/.test(fa) || !/un anuncio no se edita, se retira y se crea otro/.test(fa)) falla(G, M, 0, "un anuncio no se borra ni se edita: se retira");
    if (!/create trigger announcements_reglas_tg before update or delete on announcements/.test(m)) falla(G, M, 0, "el trigger de los anuncios (no se borra, no se edita)");
    for (const f of codigo) {
      if (!/^(apps|scripts|packages)\/.*\.(tsx?|mjs|cjs)$/.test(f) || f === AD || f === "guardianes/run.mjs") continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) {
        if (/\b(delete from|update|insert into) cms_string_versions\b/.test(q)) falla(G, f, 0, "las versiones de las cadenas las escribe solo la base (cms_cadena_version)");
        if (/\bdelete from (cms_strings|announcements|city_home_config)\b/.test(q)) falla(G, f, 0, "nada se borra: una cadena vuelve al código, un anuncio se retira");
        if (/\b(update (cms_strings|announcements|city_home_config)|insert into (announcements|city_home_config))\b/.test(q)) falla(G, f, 0, "el CMS lo escribe solo lib/cms-admin.ts (con autor, motivo y auditoría)");
      }
    }
    if (existsSync(AD)) {
      const t = sinComent(AD);
      for (const a of ["cms.editar", "cms.restaurar", "cms.rotulo", "cms.home", "cms.anuncio", "cms.anuncio.retirar", "cms.ingles"]) if (!t.includes(`"${a}"`)) falla(G, AD, 0, `la acción ${a} deja su auditoría`);
    }
  },

  /* 9f · cuentaBorradaBilingue (LAUNCH de 9d): el nombre que deja la purga en la base («Cuenta borrada», packages/db/mapa-de-datos.json) es el de
     lib/textos-cuenta.ts, que también lo tiene en inglés («Deleted account»); en el catálogo va con candado (USR-CUENTA.borrada); y el panel de Pedidos lo
     muestra con nombreVisible() en el idioma de quien mira, nunca el nombre guardado tal cual. Al revés: alreves9f. */
  cuentaBorradaBilingue() {
    const G = "cuentaBorradaBilingue", F = "apps/web/lib/textos-cuenta.ts", P = "apps/web/app/panel/Pedidos.tsx", MAPA = "packages/db/mapa-de-datos.json";
    if (!existsSync(F)) return falla(G, F, 0, "falta lib/textos-cuenta.ts");
    const t = readFileSync(F, "utf8"), c = CMS.cadenas.find((x) => x.id === "USR-CUENTA.borrada");
    if (!c || !c.locked) return falla(G, F, 0, "USR-CUENTA.borrada tiene que estar en el catálogo, con candado");
    if (c.es === c.en || !/deleted account/i.test(c.en)) falla(G, F, 0, "«Cuenta borrada» en inglés es «Deleted account»");
    if (!readFileSync(MAPA, "utf8").includes(`"first_name": "'${c.es}'"`)) falla(G, MAPA, 0, `la purga deja en la base «${c.es}» (lo mismo que lib/textos-cuenta.ts)`);
    if (!/export function nombreVisible\(/.test(t)) falla(G, F, 0, "falta nombreVisible()");
    if (!existsSync(P)) return;
    const p = sinComent(P);
    if (!/nombreVisible\(x\.who, es\)/.test(p)) falla(G, P, 0, "el panel de Pedidos muestra el cliente con nombreVisible(x.who, es)");
    if ((p.match(/\bx\.who\b/g) ?? []).length !== (p.match(/nombreVisible\(x\.who, es\)/g) ?? []).length) falla(G, P, 0, "x.who se muestra siempre por nombreVisible (una cuenta borrada en inglés dice «Deleted account»)");
  },

  /* 9f · pieSinCapturas (LAUNCH de 9e): el pie de la web bajo el Inicio, la ficha y Buscar cambiaría las capturas aprobadas de la tubería, así que nace APAGADO
     (feature_flags «web.pie_todas» = false en la migración) y solo lib/cms-admin.ts lo enciende (cms:aprobar, con motivo y auditoría); <PieWeb> no pinta nada
     mientras esté apagado; el Inicio, la ficha y Buscar lo llevan. Al revés: alreves9f. */
  pieSinCapturas() {
    const G = "pieSinCapturas", M = "packages/db/migrations/0136_cms.sql", W = "apps/web/app/(app)/_legal/PieWeb.tsx", AD = "apps/web/lib/cms-admin.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración del CMS");
    if (!/insert into feature_flags \(key, enabled, note, updated_by\) values \('web\.pie_todas', false,/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "el interruptor web.pie_todas nace apagado");
    if (!existsSync(W) || !/if \(!\(await pieEnTodas\(\)\)\) return null;/.test(sinComent(W))) falla(G, W, 0, "PieWeb no pinta nada mientras el interruptor esté apagado");
    for (const f of ["apps/web/app/(app)/page.tsx", "apps/web/app/(app)/buscar/page.tsx", "apps/web/app/(app)/n/[id]/page.tsx"]) if (!/<PieWeb \/>/.test(sinComent(f))) falla(G, f, 0, "esta pantalla lleva <PieWeb />");
    for (const f of codigo) {
      if (!/^(apps|packages|scripts)\/.*\.(tsx?|mjs|cjs|sql)$/.test(f) || f === AD || f === M) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/web\.pie_todas/.test(q) && /\b(update|insert into|delete from)\b/i.test(q)) falla(G, f, 0, "el interruptor del pie lo cambia solo lib/cms-admin.ts (con motivo y auditoría)");
    }
    if (!/cms\.pie/.test(sinComent(AD)) || !/s\.puede\("cms", "aprobar"\)/.test((sinComent(AD).match(/export async function fijarPie[\s\S]*?\n}/) ?? [""])[0])) falla(G, AD, 0, "encender el pie pide cms:aprobar y deja su auditoría");
  },

  idioma() {
    for (const f of codigo) {
      if (!/layout\.tsx$/.test(f)) continue;
      if (/lang=["']en/.test(readFileSync(f, "utf8"))) falla("idioma", f, 0, "el idioma por defecto es es-US");
    }
    // 9e · Cada página legal va en español Y en inglés, con las mismas secciones (scripts/legal/forma.mjs parejaLegal).
    for (const e of paginasLegales().errores) if (/van los dos idiomas|secciones|mismos puntos|fecha y el estado/.test(e)) falla("idioma", "docs/legal", 0, e);
    // 9f · Toda cadena del catálogo del CMS trae los dos idiomas (y el inglés no se queda vacío ni como una marca de «pendiente»).
    for (const c of CMS.cadenas) if (!c.es?.trim() || !c.en?.trim() || /^(TODO|TBD|pendiente)$/i.test(c.en.trim())) falla("idioma", "apps/web/lib/cms-cadenas.json", 0, `${c.id}: falta uno de los dos idiomas`);
  },

  /* 9j · equipoConDosPasos (fase9-apertura.md §4 9j; T#30; LAUNCH L35, L1319): ninguna acción del Super Admin sin el segundo factor de ESA sesión.
     (1) staff() devuelve null si la sesión no dio su segundo factor y requerir() manda a /admin/dos-pasos; (2) toda página de /admin pasa por
     requerir(), salvo /admin/dos-pasos (que no abre nada más); (3) el marco no pinta secciones ni colas sin el segundo factor; (4) toda ruta de
     /api/admin pasa por staff() o requerir(); (5) las acciones de los dos pasos revisan la sesión y el origen; (6) el camino de las pruebas solo existe
     con el código de entrada en pantalla y fuera de producción: solo lib/equipo/dos-pasos.ts lee staff_mfa_pruebas y solo con ese candado, solo la
     semilla del sandbox lo llena, la base solo acepta teléfonos 570-555, y una sesión marcada «pruebas» no vale fuera de ese camino; (7) solo
     dos-pasos.ts marca una sesión con su segundo factor; (8) la ruta que provoca un error del servidor solo existe con ese mismo candado. Al revés: alreves9j. */
  equipoConDosPasos() {
    const G = "equipoConDosPasos", A = "apps/web/lib/admin.ts", D = "apps/web/lib/equipo/dos-pasos.ts", L = "apps/web/app/admin/layout.tsx", P = "apps/web/app/admin/dos-pasos/page.tsx",
      AC = "apps/web/app/admin/dos-pasos/acciones.ts", M = "packages/db/migrations/0140_sistema.sql", EP = "apps/web/app/api/interno/error-prueba/route.ts";
    for (const f of [A, D, L, P, AC, M]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza del segundo factor del equipo");
    const a = sinComent(A), st = (a.match(/export async function staff\(\)[\s\S]*?\n}/) ?? [""])[0], rq = (a.match(/export async function requerir\([\s\S]*?\n}/) ?? [""])[0];
    if (!/if \(\(await estadoDosPasos\(u\)\)\.estado !== "ok"\) return null;/.test(st)) falla(G, A, 0, "staff() devuelve null si la sesión no dio su segundo factor");
    if (!/if \(m\.dos\.estado !== "ok"\) redirect\("\/admin\/dos-pasos"\);/.test(rq)) falla(G, A, 0, "requerir() manda a /admin/dos-pasos a quien no dio su segundo factor");
    for (const f of archivos) {
      if (/^apps\/web\/app\/admin\/.*page\.tsx$/.test(f) && f !== P && !/\brequerir\(/.test(sinComent(f))) falla(G, f, 0, "toda página del Super Admin pasa por requerir() (del equipo y con el segundo factor)");
      if (/^apps\/web\/app\/api\/admin\/.*route\.ts$/.test(f) && !/await (staff|requerir)\(/.test(sinComent(f))) falla(G, f, 0, "toda ruta de /api/admin pasa por staff() o requerir()");
    }
    const p = sinComent(P);
    if (/\brequerir\(/.test(p) || !/if \(m\.dos\.estado === "ok"\) redirect\("\/admin"\);/.test(p)) falla(G, P, 0, "la pantalla de los dos pasos solo da el segundo factor (con él, al Inicio del admin)");
    if (!/if \(m\.dos\.estado !== "ok"\) return <main[^>]*>\{children\}<\/main>;/.test(sinComent(L))) falla(G, L, 0, "sin el segundo factor, el marco no pinta secciones ni colas");
    const ac = sinComent(AC);
    for (const parte of ac.split(/\nexport async function /).slice(1)) if (!/await yo\(\)/.test(parte.slice(0, 400)) && !/await mismoOrigen\(\)/.test(parte.slice(0, 400))) falla(G, AC, 0, `«${parte.slice(0, parte.indexOf("("))}» no revisa la sesión ni el origen`);
    for (const parte of ac.split(/\nexport async function /).slice(1)) if (/await yo\(\)/.test(parte) && !/mismoOrigen\(\)/.test(parte)) falla(G, AC, 0, `«${parte.slice(0, parte.indexOf("("))}» no revisa que venga de nuestra página`);
    const d = sinComent(D);
    if (!/const CAMINO_PRUEBAS = MODO_SMS === "pruebas" && ENTORNO !== "produccion";/.test(d)) falla(G, D, 0, "el camino de las pruebas exige el código en pantalla Y un entorno que no es producción");
    if (!/if \(s\.mfa_at && \(s\.mfa_via !== "pruebas" \|\| CAMINO_PRUEBAS\)\)/.test(d)) falla(G, D, 0, "una sesión marcada «pruebas» no vale fuera del camino de las pruebas");
    if (!/if \(s\.via === "llave"\) return \{ estado: "ok"/.test(d)) falla(G, D, 0, "la sesión abierta con la llave de acceso trae los dos pasos");
    for (const f of codigo) {
      if (!/\.(tsx?|mjs|cjs|sql)$/.test(f) || f.startsWith("guardianes/") || f === M) continue;
      const t = /\.sql$/.test(f) ? readFileSync(f, "utf8") : sinComent(f);
      if (/staff_mfa_pruebas/.test(t)) {
        if (/^infra\/pruebas\/semilla\//.test(f)) continue;
        if (f !== D) { falla(G, f, 0, "solo lib/equipo/dos-pasos.ts lee staff_mfa_pruebas (y la semilla del sandbox la llena)"); continue; }
        for (const l of t.split("\n")) if (/staff_mfa_pruebas/.test(l) && !/CAMINO_PRUEBAS/.test(l) && !/^\s*const exento = /.test(l)) falla(G, D, 0, "staff_mfa_pruebas solo se lee detrás de CAMINO_PRUEBAS");
        if (/insert into staff_mfa_pruebas|update staff_mfa_pruebas|delete from staff_mfa_pruebas/.test(t)) falla(G, D, 0, "la app no escribe staff_mfa_pruebas (solo la semilla del sandbox)");
      }
      if (f !== D && /\.(tsx?|mjs|cjs)$/.test(f) && /update sessions set[^`]*\bmfa_(at|via)\s*=/.test(t)) falla(G, f, 0, "solo lib/equipo/dos-pasos.ts marca una sesión con su segundo factor");
    }
    const ex = /if \(CAMINO_PRUEBAS[^)]*\) \{\s*const exento = /.test(d);
    if (!ex) falla(G, D, 0, "la lista de las pruebas se mira solo dentro de if (CAMINO_PRUEBAS …)");
    if (!/phone text primary key check \(phone ~ '\^\\\+1570555\[0-9\]\{4\}\$'\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "staff_mfa_pruebas solo acepta teléfonos de ficción 570-555");
    if (!existsSync(EP) || !/if \(!\(MODO_SMS === "pruebas" && ENTORNO !== "produccion"\) \|\| !tokenOk\(/.test(sinComent(EP))) falla(G, EP, 0, "la ruta que provoca un error del servidor solo existe en pruebas y con el token");
  },

  /* 9j · totpPropio: el TOTP del equipo es nuestro (RFC 6238 con node:crypto, sin dependencias), con ventana ±1, comparación de tiempo constante, y un
     código usado no vuelve a entrar (la escritura condicionada en la app y el trigger en la base). Los códigos de recuperación se guardan como huella
     y se gastan una vez. Al revés: alreves9j. */
  totpPropio() {
    const G = "totpPropio", T = "apps/web/lib/equipo/totp.ts", D = "apps/web/lib/equipo/dos-pasos.ts", M = "packages/db/migrations/0140_sistema.sql";
    for (const f of [T, D, M]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza del TOTP del equipo");
    const t = sinComent(T);
    for (const m of t.matchAll(/from "([^"]+)"/g)) if (!["node:crypto", "server-only"].includes(m[1])) falla(G, T, 0, `el TOTP no depende de nada más que node:crypto («${m[1]}»)`);
    for (const f of ["apps/web/package.json", "package.json"]) if (existsSync(f) && /"(otplib|speakeasy|otpauth|notp|totp-generator|@otplib\/[\w-]+)"/.test(readFileSync(f, "utf8"))) falla(G, f, 0, "sin dependencia externa para el TOTP");
    if (!/export const VENTANA = 1;/.test(t)) falla(G, T, 0, "la ventana es ±1 paso (30 s)");
    if (!/export const PASO_S = 30;/.test(t) || !/createHmac\("sha1", secreto\)/.test(t)) falla(G, T, 0, "RFC 6238: HMAC-SHA1 y pasos de 30 s");
    if (!/timingSafeEqual\(/.test(t)) falla(G, T, 0, "el código se compara en tiempo constante");
    const d = sinComent(D), ent = (d.match(/export async function entrarConCodigo[\s\S]*?\n}/) ?? [""])[0];
    if (!/and \(last_step is null or last_step < \$2\)/.test(ent)) falla(G, D, 0, "un código usado no vuelve a entrar (escritura condicionada al último paso)");
    if (!/codigo_repetido/.test(ent)) falla(G, D, 0, "el código repetido se anota y cuenta para el bloqueo");
    const rec = (d.match(/export async function entrarConRecuperacion[\s\S]*?\n}/) ?? [""])[0];
    if (!/array_remove\(recovery_hashes, \$2\)/.test(rec) || !/\$2 = any \(recovery_hashes\)/.test(rec)) falla(G, D, 0, "un código de recuperación se gasta al usarlo (una sola vez)");
    if (!/const huellaRecuperacion = [^\n]*createHmac\("sha256", secretoAuth\(\)\)/.test(d)) falla(G, D, 0, "los códigos de recuperación se guardan como huella (HMAC)");
    if (!/cifrar\(secreto\)/.test(d)) falla(G, D, 0, "el secreto del TOTP se guarda cifrado");
    const m = readFileSync(M, "utf8");
    if (!/raise exception 'un código usado no vuelve a entrar'/.test(m) || !/raise exception 'los códigos de recuperación solo se gastan'/.test(m) || !/raise exception 'un segundo factor no se borra/.test(m)) falla(G, M, 0, "la base no deja bajar el último paso, recuperar códigos gastados ni borrar un factor");
    if (!/raise exception 'staff_mfa_log es solo de inserción'/.test(m)) falla(G, M, 0, "staff_mfa_log es de solo inserción");
  },

  /* 9j · erroresDelServidor (erroresTapados ampliado al servidor): instrumentation.ts manda los errores del servidor a recibirErrorServidor, que pasa
     por el MISMO guardar() (tapar, huella, tablas) que los de los teléfonos; con su tope por minuto antes de la base; solo en el proceso de Node. */
  erroresDelServidor() {
    const G = "erroresDelServidor", I = "apps/web/instrumentation.ts", E = "apps/web/lib/errores/ingesta.ts", M = "packages/db/migrations/0140_sistema.sql";
    if (!existsSync(I)) return falla(G, I, 0, "falta instrumentation.ts (los errores del servidor)");
    const i = sinComent(I);
    if (!/export async function onRequestError\(/.test(i) || !/if \(process\.env\.NEXT_RUNTIME === "nodejs"\)/.test(i) || !/recibirErrorServidor\(err,/.test(i)) falla(G, I, 0, "onRequestError manda el error a recibirErrorServidor, solo en Node");
    const e = sinComent(E), f = cuerpoFn(e, "recibirErrorServidor");
    if (!f) return falla(G, E, 0, "falta recibirErrorServidor");
    const it = f.indexOf("dentroDelTope("), ig = f.indexOf("guardar(");
    if (it < 0 || ig < 0 || ig < it) falla(G, E, 0, "el tope por minuto va antes de guardar");
    if (!/return guardar\([^;]*"servidor"/.test(f)) falla(G, E, 0, "el error del servidor pasa por el mismo guardar() (tapado y agrupado)");
    if (/insert into app_error/.test(f)) falla(G, E, 0, "recibirErrorServidor no inserta por su cuenta: usa guardar()");
    const g = cuerpoFn(e, "guardar");
    if (!/const mensaje = taparError\(/.test(g) || !/const stack = taparError\(s\.stack/.test(g)) falla(G, E, 0, "guardar() tapa el mensaje y el stack");
    if (!/kind in \('js', 'nativo', 'cierre', 'red', 'servidor'\)/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "app_error_groups.kind admite 'servidor'");
  },

  /* 9j · llaveConVencimiento (LAUNCH L1184): toda llave viva del llavero con fecha se avisa a los Admins 30 días antes (y vencida), una vez por llave,
     versión y etapa, desde el barrido; cada reemplazo queda en key_rotations (solo inserción). */
  llaveConVencimiento() {
    const G = "llaveConVencimiento", S = "apps/web/lib/sistema/salud.ts", B = "apps/web/lib/barrido.ts", LL = "apps/web/lib/tiendas/llavero.ts", M = "packages/db/migrations/0140_sistema.sql";
    for (const f of [S, B, LL, M]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza de las llaves que vencen");
    const s = sinComent(S), av = cuerpoFn(s, "avisarLlavesQueVencen");
    if (!/export const AVISO_LLAVE_DIAS = 30;/.test(s)) falla(G, S, 0, "el aviso sale 30 días antes");
    if (!/where retired_at is null and expires_on is not null[^`]*expires_on <= current_date \+ \$1::int/.test(av)) falla(G, S, 0, "se revisan TODAS las llaves vivas con fecha (no una lista)");
    if (!/ref_kind = 'llave_vence' and ref_id = \$1/.test(av) || !/avisar\(u\.id, "llave_vence"/.test(av)) falla(G, S, 0, "un aviso por llave, versión y etapa (sin repetir)");
    if (!/avisarLlavesQueVencen\(\)/.test(readFileSync(B, "utf8"))) falla(G, B, 0, "las llaves que vencen se revisan en el barrido");
    if (!/if \(prev\) await c\.query\(`insert into key_rotations/.test(sinComent(LL))) falla(G, LL, 0, "cada llave que se reemplaza queda en key_rotations");
    const m = readFileSync(M, "utf8");
    if (!/\('llave_vence', 'mod'/.test(m)) falla(G, M, 0, "falta la plantilla del aviso llave_vence");
    if (!/create trigger key_rotations_no_cambia before update or delete on key_rotations/.test(m)) falla(G, M, 0, "key_rotations es de solo inserción");
  },

  /* 9j · flagPorPersona: un interruptor por ciudad o por porcentaje solo si su código lo lee persona por persona (flag_para); la base no deja acotar
     uno «todo o nada», y nadie lee crudo un interruptor acotable. Lo cambia Sistema › Flags con sys:editar, motivo y auditoría. */
  flagPorPersona() {
    const G = "flagPorPersona", M = "packages/db/migrations/0140_sistema.sql", F = "apps/web/lib/sistema/flags.ts";
    if (!existsSync(M) || !existsSync(F)) return falla(G, F, 0, "falta Sistema › Flags");
    const m = readFileSync(M, "utf8");
    if (!/check \(scope in \('all', 'city', 'percent'\) and \(scope = 'all' or scopable\)/.test(m)) falla(G, M, 0, "la base no deja acotar un interruptor que no es «scopable»");
    const acotables = [...m.matchAll(/update feature_flags set scopable = true where key = '([^']+)'/g)].map((x) => x[1]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const k of acotables) if (new RegExp(`select enabled[^\`]*from feature_flags where key = '${k.replace(/\./g, "\\.")}'`).test(t)) falla(G, f, 0, `${k} se puede acotar por ciudad o porcentaje: se lee con flag_para (flagPara), no crudo`);
    }
    const f = sinComent(F), c = cuerpoFn(f, "cambiarFlag");
    if (!/s\.puede\("sys", "editar"\)/.test(c) || !/auditar\(cx, \{ actor: s\.id, action: "sistema\.flag"/.test(c) || !/m\.length < 3/.test(c)) falla(G, F, 0, "cambiar un interruptor pide sys:editar, motivo y deja su auditoría");
    if (!/if \(duenio\(key\)\) return/.test(c)) falla(G, F, 0, "los interruptores con pantalla propia se cambian ahí");
  },

  /* 9j · vidrioRoto (LAUNCH L464): la foto de una ayuda de Salud solo se muestra al equipo después de escribir el motivo (break_glass, solo inserción,
     10 minutos, auditoría); la ruta de la foto lo exige. */
  vidrioRoto() {
    const G = "vidrioRoto", R = "apps/web/app/api/ayuda/foto/[id]/route.ts", V = "apps/web/lib/sistema/vidrio.ts", M = "packages/db/migrations/0140_sistema.sql";
    for (const f of [R, V, M]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza del vidrio roto");
    if (!/const sinMotivo = !!s && m\.owner_kind === "help" && \(await ayudaDeSalud\(m\.owner_id\)\) && !\(await vidrioVigente\(s\.id, m\.owner_id\)\);/.test(sinComent(R)) || !/if \(s && !sinMotivo &&/.test(sinComent(R))) falla(G, R, 0, "la foto de Salud no se le muestra al equipo sin un motivo vigente");
    const v = sinComent(V), ab = cuerpoFn(v, "abrirVidrio");
    if (!/if \(m\.length < 10\) return/.test(ab) || !/insert into break_glass/.test(ab) || !/action: "ayuda\.foto\.vidrio"/.test(ab)) falla(G, V, 0, "abrir pide un motivo de 10 letras o más, lo guarda y deja la auditoría");
    if (!/create trigger break_glass_no_cambia before update or delete on break_glass/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "break_glass es de solo inserción");
  },

  /* 9j · minimoDisponible (LAUNCH L1349; plan §3.5): el build mínimo o de aviso de una app nunca por encima del último build disponible en producción
     (nadie podría actualizar). En el sandbox (builds de prueba) se guarda y se dice. */
  minimoDisponible() {
    const G = "minimoDisponible", A = "apps/web/lib/app-nativa.ts";
    if (!existsSync(A)) return;
    const c = cuerpoFn(sinComent(A), "cambiarBuild");
    if (!/select max\(build\) as b from app_builds where app = \$1 and platform = \$2 and status = 'disponible'/.test(c) || !/if \(ENTORNO === "produccion"\) throw new Choque\(/.test(c)) falla(G, A, 0, "en producción, el build mínimo o de aviso no pasa del último build disponible");
  },

  /* 9h · enlaceSoloPropio (fase9-apertura.md §4 9h, §6 #16): un enlace corto o un QR de calle (/q/{código}) y el enlace de una campaña llevan SIEMPRE a una ruta
     propia: nunca a otro origen (un QR pegado en la calle no puede volverse una trampa hacia otra página). (1) La base lo impone (short_links.target y
     campaigns.href: empiezan con una sola «/», sin «//» ni barra invertida); (2) rutaPropia() de lib/crecimiento/comun.ts lo revisa igual; (3) crear un enlace y
     una campaña pasan por rutaPropia; el escaneo solo redirige a un destino que pasa rutaPropia (si no, al Inicio); (4) /q/[code] redirige SOLO a lo que
     devuelve escanear() (nunca a un parámetro de la petición); (5) solo lib/crecimiento/enlaces.ts crea enlaces (y la semilla del sandbox). Al revés: alreves9h. */
  enlaceSoloPropio() {
    const G = "enlaceSoloPropio", M = "packages/db/migrations/0138_crecimiento.sql", C = "apps/web/lib/crecimiento/comun.ts", E = "apps/web/lib/crecimiento/enlaces.ts", Q = "apps/web/app/q/[code]/route.ts", K = "apps/web/lib/crecimiento/campanas.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de Crecimiento");
    const m = readFileSync(M, "utf8");
    if (!/target\s+text not null check \(target ~ '\^\/\[A-Za-z0-9\/_\?=&\.%-\]\*\$' and target !~ '\^\/\/' and position\('\\' in target\) = 0/.test(m)) falla(G, M, 0, "short_links.target: la base exige una ruta propia (una «/», sin «//» ni barra invertida)");
    if (!/href\s+text check \(href is null or \(href ~ '\^\/\[A-Za-z0-9\/_\?=&\.%-\]\*\$' and href !~ '\^\/\/'\)\)/.test(m)) falla(G, M, 0, "campaigns.href: la base exige una ruta propia");
    // Sin sinComent: «"//"» dentro del código parece un comentario y se perdería.
    const c = existsSync(C) ? readFileSync(C, "utf8") : "";
    const rp = (c.match(/export function rutaPropia[\s\S]*?\n}/) ?? [""])[0];
    if (!/\/\^\\\/\[A-Za-z0-9\/_\?=&\.%-\]\*\$\/\.test\(t\)/.test(rp) || !/!t\.startsWith\("\/\/"\)/.test(rp) || !/!t\.includes\("\\\\"\)/.test(rp)) falla(G, C, 0, "rutaPropia() revisa: empieza con una «/», sin «//» y sin barra invertida");
    const e = existsSync(E) ? sinComent(E) : "";
    if (!/if \(!rutaPropia\(target\)\) return mal\(/.test(cuerpoFn(e, "crearEnlace"))) falla(G, E, 0, "crearEnlace() rechaza un destino que no es una ruta propia");
    if (!/if \(!l \|\| !l\.vivo \|\| !rutaPropia\(l\.target\)\) return \{ destino: "\/"/.test(cuerpoFn(e, "escanear"))) falla(G, E, 0, "escanear(): un enlace retirado, que no existe o con un destino ajeno lleva al Inicio");
    if (!/if \(href && !rutaPropia\(href\)\) return mal\(/.test(cuerpoFn(existsSync(K) ? sinComent(K) : "", "crearCampana"))) falla(G, K, 0, "crearCampana(): el enlace de la campaña es una ruta propia");
    const q = existsSync(Q) ? sinComent(Q) : "";
    if (!q) falla(G, Q, 0, "falta /q/[code]");
    else {
      const red = [...q.matchAll(/NextResponse\.redirect\(([^;]*)\)/g)].map((x) => x[1]);
      if (!red.length || red.some((x) => !/^new URL\(r\.destino, /.test(x))) falla(G, Q, 0, "/q/[code] solo redirige a r.destino (lo que devuelve escanear), nunca a otra cosa");
      if (/searchParams\.get\(|nextUrl\.searchParams/.test(q)) falla(G, Q, 0, "/q/[code] no lee parámetros de la petición para decidir a dónde ir");
    }
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === E) continue;
      for (const s of sinComent(f).match(/`[^`]*`/g) ?? []) if (/insert into short_links\b|update short_links\s+set\s+[^`]*\btarget\b/i.test(s)) falla(G, f, 0, "solo lib/crecimiento/enlaces.ts crea enlaces cortos (y nunca les cambia el destino)");
    }
  },

  /* 9h · escaneosSinPersonas (amplía analiticaSinPersonas a Crecimiento; fase9-apertura.md §2 0138): un escaneo de QR guarda el código, la hora, la ciudad, web o
     app y la clase de navegador, y NADA de la persona: ni IP, ni dispositivo, ni cuenta, ni el navegador entero. (1) link_scans en la migración no tiene esas
     columnas y es de solo inserción; link_scan_days es un derivado que solo escribe la base; (2) escanear() inserta solo esas columnas; (3) nadie más escribe
     link_scans ni link_scan_days; (4) Crecimiento › Enlaces y QR y la Lista de espera no sacan columnas de personas (teléfono, nombre, IP, dispositivo).
     Al revés: alreves9h. */
  escaneosSinPersonas() {
    const G = "escaneosSinPersonas", M = "packages/db/migrations/0138_crecimiento.sql", E = "apps/web/lib/crecimiento/enlaces.ts", AD = "apps/web/lib/crecimiento/admin.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de Crecimiento");
    const m = readFileSync(M, "utf8").replace(/--.*$/gm, "");
    const t = /create table if not exists link_scans \(([\s\S]*?)\n\);/.exec(m)?.[1] ?? "";
    if (!t) falla(G, M, 0, "falta link_scans");
    const cols = t.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean);
    const P = /^(ip|ip_\w+|\w+_ip|device|\w*_device|user_id|\w+_user_id|phone|\w*_phone|ua|user_agent|session\w*|cookie\w*|lat|lng|geom|\w+_hash)$/;
    for (const x of cols) if (P.test(x)) falla(G, M, 0, `link_scans.${x}: un escaneo no guarda nada de la persona`);
    if (!/create trigger link_scans_no_cambia before update or delete on link_scans/.test(m)) falla(G, M, 0, "link_scans es de solo inserción (trigger)");
    if (!/if coalesce\(current_setting\('tl\.crec_derivado', true\), ''\) <> 'on' then raise exception 'link_scan_days es un derivado/.test(m)) falla(G, M, 0, "link_scan_days es un derivado: solo lo escribe la base");
    const e = existsSync(E) ? sinComent(E) : "";
    if (!/insert into link_scans \(code, city_id, app, ua_class\) values \(\$1, \$2, \$3, \$4\)/.test(cuerpoFn(e, "escanear"))) falla(G, E, 0, "escanear() inserta solo código, ciudad, web/app y la clase de navegador");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === E) continue;
      for (const s of sinComent(f).match(/`[^`]*`/g) ?? []) if (/\b(insert into|update|delete from) (link_scans|link_scan_days)\b/i.test(s)) falla(G, f, 0, "solo escanear() escribe un escaneo; los días los cuenta la base");
    }
    const PER = /\b(phone|first_name|last_name|nick|photo_url|email|ip|device|user_agent)\b/;
    for (const fn of ["enlacesAdmin", "escaneosDe"]) { const b = cuerpoFn(e, fn); if (!b) falla(G, E, 0, `falta ${fn}`); else if (/from link_scans[\s\S]{0,200}\b(ip|device)\b/.test(b) || /l\.(ip|device)\b/.test(b)) falla(G, E, 0, `${fn} no saca columnas de personas`); }
    const ad = existsSync(AD) ? sinComent(AD) : "";
    const le = cuerpoFn(ad, "listaEspera");
    if (!le) falla(G, AD, 0, "falta listaEspera");
    else if (PER.test(le)) falla(G, AD, 0, "la Lista de espera del Super Admin no muestra teléfonos, nombres, IP ni dispositivos");
  },

  /* 9h · campanaConPermiso (fase9-apertura.md §4 9h; Notificaciones › Reglas): una campaña de Crecimiento solo llega a quien ENCENDIÓ «Novedades de To'Latino»
     (apagado de fábrica), nunca en horas de silencio de su ciudad y con tope por persona y semana (y por SMS, por mes); a más de campana_aprobar_desde personas
     la aprueba OTRA persona. (1) El segmento SIEMPRE exige notif_prefs.mkt = 'true' (se vuelve a mirar al mandar cada lote); (2) enviarLote no manda de noche
     (7 AM – 10 PM de la ciudad) y aplica los topes; (3) la base: approved_by <> created_by y campaign_sends de solo inserción; aprobarCampana revisa que no la
     apruebe quien la creó; (4) «mkt» nace apagado (perfil.ts) y la landing NO lo enciende (promete un solo mensaje); (5) solo lib/crecimiento/campanas.ts usa las
     plantillas mkt_campana_* y escribe campaign_sends. Al revés: alreves9h. */
  campanaConPermiso() {
    const G = "campanaConPermiso", K = "apps/web/lib/crecimiento/campanas.ts", M = "packages/db/migrations/0138_crecimiento.sql", PF = "apps/web/lib/perfil.ts", LI = "apps/web/lib/crecimiento/lista.ts";
    if (!existsSync(K)) return falla(G, K, 0, "falta lib/crecimiento/campanas.ts");
    const k = sinComent(K), seg = cuerpoFn(k, "segmentoSql"), lote = cuerpoFn(k, "enviarLote"), cre = cuerpoFn(k, "crearCampana"), apr = cuerpoFn(k, "aprobarCampana");
    if (!/let donde = `u\.home_city_id = \$1 and \(u\.notif_prefs->>'mkt'\) = 'true' and cuenta_estado\(u\.status, u\.status_until\) in \('active', 'muted'\)`/.test(seg)) falla(G, K, 0, "el segmento exige siempre «Novedades» encendido (notif_prefs.mkt = 'true'), la ciudad y la cuenta activa");
    if (!/where \$\{q\.donde\} and/.test(lote)) falla(G, K, 0, "enviarLote() vuelve a mirar el segmento (con «Novedades») al mandar cada lote");
    if (!/extract\(hour from now\(\) at time zone ci\.timezone\) not between 7 and 21 as silencio/.test(lote) || !/if \(!x \|\| x\.silencio\) return null;/.test(lote)) falla(G, K, 0, "enviarLote() no manda en horas de silencio de la ciudad (10 PM – 7 AM)");
    if (!/u\.semana >= cfg\.campana_por_semana/.test(lote) || !/x\.canal === "sms" && u\.sms_mes >= cfg\.campana_sms_por_mes/.test(lote)) falla(G, K, 0, "enviarLote() aplica el tope por semana y el de SMS por mes");
    if (!/const porAprobar = n > cfg\.campana_aprobar_desde;/.test(cre)) falla(G, K, 0, "crearCampana(): a más de campana_aprobar_desde personas queda «por aprobar»");
    if (!/if \(x\.by === s\.id\) return mal\(/.test(apr) || !/s\.puede\("mkt", "aprobar"\)/.test(apr)) falla(G, K, 0, "aprobarCampana(): mkt:aprobar y nunca quien la creó");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/check \(approved_by is null or approved_by <> created_by\)/.test(m)) falla(G, M, 0, "campaigns: la base exige que apruebe otra persona");
      if (!/create trigger campaign_sends_no_cambia before update or delete on campaign_sends/.test(m)) falla(G, M, 0, "campaign_sends es de solo inserción");
      if (/\('mkt_campana_\w+', 'mkt', null,/.test(m) || !/\('mkt_campana_push', 'mkt', 'mkt',/.test(m)) falla(G, M, 0, "las plantillas de campaña son del grupo mkt y se apagan con «Novedades» (pref mkt)");
    }
    if (!existsSync(PF) || !/mkt: false \}/.test(sinComent(PF))) falla(G, PF, 0, "«Novedades de To'Latino» (mkt) nace apagado");
    if (existsSync(LI) && /notif_prefs|['"]mkt['"]/.test(sinComent(LI))) falla(G, LI, 0, "la landing promete un solo mensaje: no enciende «Novedades» (mkt)");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === K) continue;
      const t = sinComent(f);
      if (/["'`]mkt_campana_(push|app|sms|correo)["'`]/.test(t) && f !== "apps/web/lib/crecimiento/comun.ts") falla(G, f, 0, "solo lib/crecimiento/campanas.ts manda campañas (con permiso, silencio y tope)");
      for (const s of t.match(/`[^`]*`/g) ?? []) if (/\b(insert into|update|delete from) campaign_sends\b/i.test(s)) falla(G, f, 0, "solo lib/crecimiento/campanas.ts escribe campaign_sends");
      for (const s of t.match(/`[^`]*`/g) ?? []) if (/update campaigns\s+set\s+[^`]*status = 'enviando'/i.test(s)) falla(G, f, 0, "solo enviarLote() pone una campaña a salir");
    }
  },

  /* 9h · sandboxNoSeIndexa (fase9-apertura.md §4 9h; HERRAMIENTAS #24): el sandbox no se indexa NUNCA. (1) app/robots.ts: fuera de producción, «Disallow: /» y
     sin mapa del sitio; (2) el mapa del sitio (lib/seo/mapa.ts, /sitemap.xml y /mapa-del-sitio/{n}.xml) solo existe en producción y se calcula al pedirlo
     (nada en el build: el mismo paquete sirve a los dos entornos); (3) el layout raíz: fuera de producción, noindex en toda página; (4) ninguna página
     se declara indexable a mano (index: true); (5) nginx-pruebas pone X-Robots-Tag noindex en todo (también en cada ubicación con su propio add_header).
     Al revés: alreves9h. */
  sandboxNoSeIndexa() {
    const G = "sandboxNoSeIndexa", R = "apps/web/app/robots.ts", S = "apps/web/lib/seo/mapa.ts", L = "apps/web/app/layout.tsx", N = "infra/pruebas/nginx-pruebas.conf";
    const RS = ["apps/web/app/sitemap.xml/route.ts", "apps/web/app/mapa-del-sitio/[parte]/route.ts"];
    const r = existsSync(R) ? sinComent(R) : "";
    if (!/if \(ENTORNO !== "produccion"\) return \{ rules: \[\{ userAgent: "\*", disallow: "\/" \}\] \};/.test(r)) falla(G, R, 0, "robots.txt: fuera de producción, «Disallow: /» y nada más");
    const s = existsSync(S) ? sinComent(S) : "";
    if (!/export const mapaActivo = \(\) => ENTORNO === "produccion";/.test(s) || !/if \(!mapaActivo\(\)\) return \[\];/.test(cuerpoFn(s, "partes")) || !/if \(!mapaActivo\(\) \|\|/.test(cuerpoFn(s, "parte"))) falla(G, S, 0, "el mapa del sitio solo existe en producción (mapaActivo) y vacío fuera de ella");
    for (const f of RS) { const t = existsSync(f) ? sinComent(f) : ""; if (!/export const dynamic = "force-dynamic";/.test(t) || !/if \(!mapaActivo\(\)\) return new NextResponse\("No", \{ status: 404/.test(t)) falla(G, f, 0, "el mapa del sitio se calcula al pedirlo y fuera de producción es 404"); }
    if (existsSync("apps/web/app/sitemap.ts")) falla(G, "apps/web/app/sitemap.ts", 0, "sin app/sitemap.ts de Next: se arma en el build (con el entorno del build), no al pedirlo");
    const l = existsSync(L) ? sinComent(L) : "";
    if (!/\.\.\.\(ENTORNO !== "produccion" \? \{ robots: \{ index: false, follow: false \} \} : \{\}\)/.test(l)) falla(G, L, 0, "el layout raíz dice noindex en toda página fuera de producción");
    for (const f of codigo) if (/^apps\/web\/app\/.*\.tsx?$/.test(f) && /\bindex:\s*true\b/.test(sinComent(f))) falla(G, f, 0, "ninguna página se declara indexable a mano (lo decide el entorno)");
    if (!existsSync(N)) return falla(G, N, 0, "falta nginx-pruebas.conf");
    const n = readFileSync(N, "utf8").replace(/#.*$/gm, "");
    const cab = n.slice(n.indexOf("server_name _;"), n.indexOf("location"));
    if (!/\n\s*add_header X-Robots-Tag "noindex, nofollow" always;/.test(cab)) falla(G, N, 0, "nginx-pruebas: X-Robots-Tag noindex para todo el servidor (antes de las ubicaciones)");
    for (const b of n.matchAll(/location [^{]*\{([^}]*)\}/g)) if (/add_header (?!X-Robots-Tag)/.test(b[1]) && !/add_header X-Robots-Tag "noindex, nofollow" always;/.test(b[1])) falla(G, N, 0, "una ubicación con su propio add_header repite X-Robots-Tag noindex (nginx no lo hereda)");
  },

  /* 9h · listaConPermiso (la lista de la landing y los teléfonos: Opus; fase9-apertura.md §4 9h, §6 #14): (1) early_access no guarda el teléfono otra vez, ni IP,
     ni dispositivo (la cuenta verificada ya lo tiene, decisión E); no se borra salvo la purga a los 30 días; (2) anotarse pasa por el código de entrada de
     siempre (verificarCodigo: topes por teléfono y por dirección) y las acciones de la landing miran mismoOrigen; (3) la landing usa las dos líneas fijas de
     §1c tal cual (FIJAS.landing y FIJAS.landingTel); (4) quitarse de la lista también la saca de city_waitlist. Al revés: alreves9h. */
  listaConPermiso() {
    const G = "listaConPermiso", M = "packages/db/migrations/0138_crecimiento.sql", LI = "apps/web/lib/crecimiento/lista.ts", AC = "apps/web/app/acceso/acciones.ts", LA = "apps/web/app/acceso/Landing.tsx", D = "apps/web/app/acceso/datos.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de Crecimiento");
    const m = readFileSync(M, "utf8").replace(/--.*$/gm, "");
    const t = /create table if not exists early_access \(([\s\S]*?)\n\);/.exec(m)?.[1] ?? "";
    for (const x of t.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean)) if (/^(phone\w*|\w+_phone|ip|\w*_ip|device|\w*_device|email|\w+_hash|first_name|last_name)$/.test(x)) falla(G, M, 0, `early_access.${x}: la lista no copia el teléfono ni guarda IP, dispositivo o nombre`);
    if (!/if coalesce\(current_setting\('tl\.purga', true\), ''\) = 'si' then return old; end if;\s*raise exception 'la lista no se borra/.test(m)) falla(G, M, 0, "early_access no se borra (solo la purga de una cuenta borrada)");
    const li = existsSync(LI) ? sinComent(LI) : "";
    if (!/uid = \(await verificarCodigo\(String\(p\.tel \?\? ""\), String\(p\.codigo \?\? ""\)\)\)\.id;/.test(cuerpoFn(li, "anotarse"))) falla(G, LI, 0, "anotarse() pasa por el código de entrada (verificarCodigo, con sus topes)");
    if (!/const r = await pedirCodigo\(String\(tel \?\? ""\)\);/.test(cuerpoFn(li, "pedirCodigoLista"))) falla(G, LI, 0, "el código de la landing es el de siempre (pedirCodigo, con sus topes)");
    if (!/update city_waitlist set removed_at = now\(\) where user_id = \$1 and source = 'coming_soon'/.test(cuerpoFn(li, "quitarme"))) falla(G, LI, 0, "quitarse de la lista también la saca de «Avísame» (city_waitlist)");
    const ac = existsSync(AC) ? sinComent(AC) : "";
    for (const fn of ["listaCodigo", "listaEntrar", "listaConSesion", "listaQuitar"]) if (!new RegExp(`export async function ${fn}\\([^)]*\\) \\{\\n\\s*if \\(!\\(await mismoOrigen\\(\\)\\)\\) return NO;`).test(ac)) falla(G, AC, 0, `${fn}: la acción mira que venga de nuestra página (mismoOrigen)`);
    const d = existsSync(D) ? sinComent(D) : "", la = existsSync(LA) ? sinComent(LA) : "";
    if (!/fijas: \{ landing: FIJAS\[lang\]\.landing, landingTel: FIJAS\[lang\]\.landingTel \}/.test(d) || !/\{d\.fijas\.landing\}/.test(la) || !/\{d\.fijas\.landingTel\}/.test(la)) falla(G, LA, 0, "la landing usa las líneas fijas de §1c tal cual (FIJAS.landing y FIJAS.landingTel)");
  },

  /* 9h · promotorAntiabuso (prototipo secMkt «Promotores»; el antiabuso de 5d): el código de un promotor no vale para su propia cuenta ni para alguien de su
     mismo dispositivo: ni da los días de prueba ni cuenta como negocio traído (queda «rechazado» con su motivo). (1) codigoPermitido mira dueño = promotor y
     pts_mismo_dispositivo; (2) publicar() solo da los días del código si codigoPermitido lo deja y anota el referido en la MISMA transacción; (3) probarPromo
     rechaza el código propio; (4) anotarReferido deja «rechazado» lo no permitido; (5) la base: un referido rechazado o pagado no cambia y no se borra.
     Al revés: alreves9h. */
  promotorAntiabuso() {
    const G = "promotorAntiabuso", P = "apps/web/lib/crecimiento/promotores.ts", A = "apps/web/app/(app)/publica/acciones.ts", M = "packages/db/migrations/0138_crecimiento.sql";
    const p = existsSync(P) ? sinComent(P) : "", a = existsSync(A) ? sinComent(A) : "";
    const cp = cuerpoFn(p, "codigoPermitido");
    if (!/if \(k\.promotor === dueno\) return false;/.test(cp) || !/pts_mismo_dispositivo\(\$1::uuid, \$2::uuid, \$3::uuid\) as v`, \[dueno, k\.promotor, dev\]/.test(cp)) falla(G, P, 0, "codigoPermitido(): ni su propia cuenta ni alguien de su mismo dispositivo (pts_mismo_dispositivo(dueño, promotor, el teléfono de esta petición))");
    if (!/if \(me && !\(await tx\(\(c\) => codigoPermitido\(c, k, me\.id, dev\)\)\)\) return \{ ok: false as const \};/.test(cuerpoFn(a, "probarPromo"))) falla(G, A, 0, "probarPromo(): el mismo antiabuso que publicar (la pantalla no promete días que no se dan)");
    if (!/ok \? "traido" : "rechazado"/.test(cuerpoFn(p, "anotarReferido")) || !/const ok = await codigoPermitido\(c, k, dueno, dev\);/.test(cuerpoFn(p, "anotarReferido"))) falla(G, P, 0, "anotarReferido(): lo no permitido queda «rechazado»");
    const pub = cuerpoFn(a, "publicar");
    if (!/const promoOk = !!promo && \(await tx\(\(c\) => codigoPermitido\(c, promo, me\.id, dev\)\)\);/.test(pub) || !/const dias = promoOk \? promo!\.dias : 30;/.test(pub)) falla(G, A, 0, "publicar(): los días del código solo si codigoPermitido lo deja");
    if (!/if \(promo\) await anotarReferido\(c, promo, slug, loc\.ciudad, me\.id, dev\);/.test(pub)) falla(G, A, 0, "publicar(): el referido se anota en la misma transacción que el negocio");
    if (!/if \(me && k\.kind === "promotor" && k\.promotor === me\.id\) return \{ ok: false as const \};/.test(cuerpoFn(a, "probarPromo"))) falla(G, A, 0, "probarPromo(): el código propio no vale");
    if (/PROMO: Record<string, number>|HZL30: 60/.test(a)) falla(G, A, 0, "los códigos viven en promo_codes, no en el código");
    if (existsSync(M)) { const f = ultimaFn("business_referrals_antes"); if (!/if old\.status in \('rechazado', 'pagado'\) and new\.status <> old\.status then raise exception/.test(f) || !/raise exception 'un referido no se borra'/.test(f)) falla(G, M, 0, "un referido rechazado o pagado no cambia y ninguno se borra"); }
  },

  /* ── 9k · Dinero real listo (fase9-apertura.md §4 9k). Al revés: pruebas/alreves/alreves9k.cjs. ── */

  /* 9k · conciliacionDiaria (HERRAMIENTAS #20, el guardián del dinero): la conciliación Stripe ↔ libro corre cada día en el barrido (y su vigilante avisa si
     no corrió); compara TODO lo que mueve dinero (cobros, devoluciones, transferencias, reversiones, payouts, disputas y retenciones sueltas); una diferencia
     sin dueño o una corrida que falló avisa al instante; la corrida, sus diferencias y quién se hizo cargo son de solo inserción y la base revisa que la
     corrida diga cuántas diferencias tiene; solo lib/conciliacion.ts las escribe; el Inicio dice «el dinero no cuadra» desde conciliacion_del_dia. */
  conciliacionDiaria() {
    const G = "conciliacionDiaria", M = "packages/db/migrations/0141_conciliacion.sql", C = "apps/web/lib/conciliacion.ts", B = "apps/web/lib/barrido.ts", H = "apps/web/app/admin/page.tsx";
    if (!existsSync(M) || !existsSync(C)) return falla(G, C, 0, "falta la conciliación diaria (migración 0141 y lib/conciliacion.ts)");
    const m = readFileSync(M, "utf8"), c = sinComent(C), b = existsSync(B) ? sinComent(B) : "";
    for (const t of ["recon_runs", "recon_diffs", "recon_diff_notes", "money_alerts", "money_alert_notes"])
      if (!new RegExp(`create trigger ${t}_no_cambia before update or delete on ${t} for each row execute function dinero_solo_insercion\\(\\)`).test(m)) falla(G, M, 0, `${t} es de solo inserción (trigger)`);
    if (!/create constraint trigger recon_runs_cuadra after insert on recon_runs deferrable initially deferred/.test(m)) falla(G, M, 0, "la base revisa al confirmar que la corrida dice cuántas diferencias tiene (recon_runs_cuadra)");
    if (!/create or replace function conciliacion_del_dia\(d date\)/.test(m)) falla(G, M, 0, "falta conciliacion_del_dia (lo lee el reporte diario de 9g)");
    if (!/\["conciliacion", async \(\) => \(await import\("\.\/conciliacion"\)\)\.conciliarAyer\(\)\]/.test(b)) falla(G, B, 0, "la conciliación de ayer corre en el barrido central");
    if (!/\.vigilarConciliacion\(\)/.test(b)) falla(G, B, 0, "el vigilante (si la conciliación no corrió, alerta) corre en el barrido central");
    for (const k of ["payment_intent", "refund", "transfer", "transfer_reversal", "payout", "dispute", "hold_orphan"]) if (!new RegExp(`kind: "${k}"`).test(c)) falla(G, C, 0, `la conciliación no compara «${k}»`);
    for (const lado of ["intents", "refunds", "transfers", "reversals", "payouts", "disputes"]) if (!new RegExp(`for \\(const \\w+ of st\\.${lado}\\)`).test(c)) falla(G, C, 0, `la conciliación no recorre lo que dice Stripe de «${lado}»`);
    if (!/if \(r\.sinDueno > 0 \|\| r\.estado === "fallo"\) await \(await import\("\.\/dinero-alertas"\)\)\.alertar\(/.test(c)) falla(G, C, 0, "una diferencia sin dueño (o una corrida que falló) avisa al equipo al instante");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.(tsx?)$/.test(f) || f === C || f === "apps/web/lib/dinero-alertas.ts") continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) {
        if (/\b(insert into|update|delete from) (recon_runs|recon_diffs|recon_diff_notes)\b/.test(q)) falla(G, f, 0, "la conciliación la escribe solo lib/conciliacion.ts");
        if (/\b(insert into|update|delete from) (money_alerts|money_alert_notes)\b/.test(q)) falla(G, f, 0, "las alertas del dinero las escribe solo lib/dinero-alertas.ts");
      }
    }
    if (existsSync(H) && !/EL DINERO NO CUADRA/.test(readFileSync(H, "utf8")) || existsSync(H) && !/conciliacion_del_dia\(g::date\)/.test(readFileSync(H, "utf8"))) falla(G, H, 0, "el Inicio del Super Admin dice «el dinero no cuadra» desde conciliacion_del_dia");
  },

  /* 9k · tresDSecure (L355, L382, L759): cuando el banco pide verificar, el cobro no se suelta ni se pide otra tarjeta: la verificación queda a nombre de quien
     paga (payment_actions, que solo cambia de estado), la pantalla la completa en la hoja y vuelve a enviar con la MISMA llave (la pasarela reusa el cobro
     verificado: nunca cobra dos veces); el simulador nunca da por retenido un «requires_action»; lo que nadie verifica vence en el barrido; la renovación de
     Pro avisa al dueño con su enlace y suelta la verificación vieja antes de otro intento. */
  tresDSecure() {
    const G = "tresDSecure", P = "apps/web/lib/pagos/pasarela.ts", V = "apps/web/lib/pagos/verificacion.ts", S = "apps/web/lib/suscripcion.ts", M = "packages/db/migrations/0141_conciliacion.sql";
    if (!existsSync(P) || !existsSync(V)) return falla(G, V, 0, "falta lib/pagos/verificacion.ts");
    const p = sinComent(P);
    for (const fn of ["retener", "retenerPlataforma"]) {
      const cu = (p.match(new RegExp(`\\n  async ${fn}\\([\\s\\S]*?\\n  },`)) ?? [""])[0];
      if (!/const v = await this\.verificacionPrevia\(x\.idem, !!x\.usuario\);\s*if \(v && "r" in v\) return v\.r;/.test(cu)) falla(G, P, 0, `«${fn}» reusa la verificación previa del mismo cobro (sin cobrar dos veces)`);
      if (!/if \(ya && ya\.status !== "requires_action"\)/.test(cu)) falla(G, P, 0, `«${fn}»: el simulador nunca da por retenido un cobro que pide verificar`);
      if ((cu.match(/registrarAccion\(\{/g) ?? []).length < 2) falla(G, P, 0, `«${fn}» guarda la verificación a nombre de quien paga (simulador y Stripe)`);
    }
    if (!/if \(s\?\.estado === "requires_capture"\) return \{ r: \{ ok: true, pi: a\.pi, estado: "retenido"/.test(p)) falla(G, P, 0, "una verificación hecha se reusa solo si Stripe dice que está retenida (se mira, no se supone)");
    if (existsSync(M)) { const m = readFileSync(M, "utf8"); if (!/raise exception 'verificacion_estado: de % no se pasa a %'/.test(m) || !/de una verificación solo cambia su estado/.test(m)) falla(G, M, 0, "payment_actions solo cambia de estado, y solo hacia adelante (trigger)"); }
    const v = sinComent(V);
    for (const fn of ["verificacionDe", "confirmarVerificacion", "simularBanco"]) if (!/a\.user_id !== userId/.test(cuerpoFn(v, fn))) falla(G, V, 0, `solo quien paga ve y completa su verificación («${fn}»)`);
    if (!/const s = await pasarela\.intento\(pi\);/.test(v)) falla(G, V, 0, "después de la hoja, el servidor mira el estado en Stripe (nunca le cree a la pantalla)");
    if (!/\["verificaciones", async \(\) => \(await import\("\.\/pagos\/verificacion"\)\)\.vencerVerificaciones\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "las verificaciones que nadie completó vencen en el barrido (se suelta lo retenido)");
    // Los flujos con quien paga devuelven `verificar` (no sueltan el cobro) y sus pantallas abren la hoja.
    for (const f of ["apps/web/lib/pedir.ts", "apps/web/lib/mercado.ts", "apps/web/lib/apartados.ts", "apps/web/lib/layaway.ts", "apps/web/lib/boletos.ts"])
      if (existsSync(f) && !/pideVerificar\(ret\)/.test(sinComent(f))) falla(G, f, 0, "cuando el banco pide verificar, el flujo devuelve la verificación a la pantalla (pideVerificar) en vez de soltar el cobro");
    if (!/usuario: \{ id: x\.userId, negocio: x\.negocio \}/.test(sinComent("apps/web/lib/cobros.ts"))) falla(G, "apps/web/lib/cobros.ts", 0, "retenerPedido pasa quien paga a la pasarela (la verificación queda a su nombre)");
    for (const f of ["apps/web/app/(app)/n/[id]/pagar/Pagar.tsx", "apps/web/app/(app)/n/[id]/mercado/PedidoMercado.tsx", "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx", "apps/web/app/(app)/eventos/pagar/[apartado]/Pagar.tsx", "apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx"]) {
      if (!existsSync(f)) continue;
      const t = sinComent(f);
      if (!/useVerificacion\(/.test(t) || !/\{V\.hoja\}/.test(t) || !/V\.pide\(r, \(\) => \{ void \w+\(\); \}\)/.test(t)) falla(G, f, 0, "la pantalla abre la hoja del banco y vuelve a enviar lo mismo (useVerificacion, V.pide, {V.hoja})");
    }
    if (existsSync(S)) {
      const s = sinComent(S);
      if (!/if \(await soltarVerificaciones\(s\.business_id\)\) return \{ ok: true \};/.test(s)) falla(G, S, 0, "antes de otro intento de Pro, la verificación vieja se mira (si ya cobró, no se cobra otra vez) y se suelta");
      if (!/avisarNegocio\(s\.business_id, "pro_verify"/.test(s) || !/href: `\/pago\/verificar\?pi=\$\{encodeURIComponent\(r\.pi\)\}`/.test(s)) falla(G, S, 0, "la renovación con 3-D Secure avisa al dueño con el enlace a la hoja");
    }
  },

  /* 9k · huellaDeTarjeta (L760, L938): la huella de la tarjeta (card.fingerprint) se guarda al guardar una tarjeta y en cada cobro; el máximo de boletos por
     persona la cuenta (la misma tarjeta en otra cuenta); la señal «la misma tarjeta en varias cuentas» sale de la base (tarjetas_en_varias_cuentas) en
     Confianza; al borrar una cuenta, la huella de sus tarjetas guardadas se vacía (mapa de datos). */
  huellaDeTarjeta() {
    const G = "huellaDeTarjeta", A = "apps/web/app/(app)/pago/acciones.ts", C = "apps/web/lib/cobros.ts", BO = "apps/web/lib/boletos.ts", CF = "apps/web/lib/admin-confianza.ts", MAPA = "packages/db/mapa-de-datos.json";
    if (existsSync(A) && !/insert into payment_methods \([^)]*card_fingerprint\)/.test(sinComent(A))) falla(G, A, 0, "guardar una tarjeta guarda su huella (card_fingerprint)");
    if (existsSync(C) && !/insert into payments \([^)]*card_fingerprint\)/.test(sinComent(C))) falla(G, C, 0, "cada retención guarda la huella de la tarjeta (payments.card_fingerprint)");
    if (existsSync(BO)) { const t = sinComent(BO); if (!/p\.card_fingerprint = \$6/.test(t) || !/entradasDe\(c, h\.fid, userId, dev, pm, holdId, await pasarela\.huella\(pm\)\)/.test(t)) falla(G, BO, 0, "el máximo de boletos por persona cuenta la misma tarjeta en otra cuenta (por su huella)"); }
    if (existsSync(CF) && !/tarjetas_en_varias_cuentas\(cfg_int\('tarjeta_cuentas_senal'\), 90\)/.test(sinComent(CF))) falla(G, CF, 0, "la señal «la misma tarjeta en varias cuentas» sale de la base, con el número de Configuración");
    if (!/"payment_methods": \{ "reglas": \[ \{[^\n]*"card_fingerprint": "null"/.test(readFileSync(MAPA, "utf8"))) falla(G, MAPA, 0, "al borrar una cuenta, la huella de sus tarjetas guardadas se vacía");
  },

  /* 9k · alertasDelDinero (L800, L821, L357/L393): lo que Stripe nunca avisa se avisa (devolución atascada, transferencia sin saldo para revertir, disputa por
     vencer, pago al banco que falló) desde el barrido, una vez por objeto; el camino manual se anota una vez con quién y por qué (la base lo impone) y,
     resuelto a mano, nunca se vuelve a pedir a Stripe (sería pagar dos veces). */
  alertasDelDinero() {
    const G = "alertasDelDinero", A = "apps/web/lib/dinero-alertas.ts", M = "packages/db/migrations/0141_conciliacion.sql";
    if (!existsSync(A)) return falla(G, A, 0, "falta lib/dinero-alertas.ts");
    const a = sinComent(A);
    for (const k of ["refund_stuck", "transfer_reversal_stuck", "dispute_due", "payout_failed"]) if (!new RegExp(`alertar\\("${k}"`).test(a)) falla(G, A, 0, `falta la alerta «${k}»`);
    if (!/\["alertasDinero", async \(\) => \(await import\("\.\/dinero-alertas"\)\)\.barrerAlertasDinero\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "las alertas del dinero corren en el barrido central");
    if (!/on conflict \(kind, subject_id\) do nothing returning id::text/.test(a)) falla(G, A, 0, "una alerta por tipo y objeto (dos barridos no avisan dos veces)");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      for (const t of ["refunds", "event_settlement_reversals"]) if (!new RegExp(`create trigger ${t}_a_mano before update on ${t} for each row execute function dinero_a_mano\\(\\)`).test(m)) falla(G, M, 0, `lo resuelto a mano de ${t} se anota una vez y no vuelve (trigger)`);
      if (!/raise exception 'dinero_a_mano: resuelta a mano, ya no se reintenta'/.test(m)) falla(G, M, 0, "resuelta a mano, la base no la deja pasar a hecha");
    }
    if (!/r\.status = 'pending' and r\.manual_at is null/.test(sinComent("apps/web/lib/boletos-despues.ts")) || !/if \(r\.mano\) return false;/.test(sinComent("apps/web/lib/boletos-despues.ts"))) falla(G, "apps/web/lib/boletos-despues.ts", 0, "una devolución resuelta a mano no se vuelve a pedir a Stripe");
    if (!/status = 'pending' and manual_at is null/.test(sinComent("apps/web/lib/evt-liquidacion.ts")) || !/manual_at is not null`, \[id\]\)\)\.rowCount\) return false;/.test(sinComent("apps/web/lib/evt-liquidacion.ts"))) falla(G, "apps/web/lib/evt-liquidacion.ts", 0, "una reversión resuelta a mano no se vuelve a pedir a Stripe");
  },

  /* 9k · disputaConEvidencia (L357, L393): la cola de disputas es de 120 h; responder sube los archivos de la evidencia (recibo, conversación, constancia de
     entrega) por la API de archivos de Stripe y los manda en el mismo envío; si una subida falla, no se envía nada; los archivos van al almacén PRIVADO; la
     evidencia es de solo inserción salvo su archivo de Stripe y cuándo se envió (trigger). */
  disputaConEvidencia() {
    const G = "disputaConEvidencia", D = "apps/web/lib/disputas.ts", M = "packages/db/migrations/0141_conciliacion.sql";
    if (!/disputa: \{ es: "Disputas con el banco", en: "Bank disputes", icon: "card", sla: 120,/.test(readFileSync("apps/web/lib/colas.ts", "utf8"))) falla(G, "apps/web/lib/colas.ts", 0, "la cola de disputas es de 120 h");
    if (!existsSync(D)) return falla(G, D, 0, "falta lib/disputas.ts");
    const r = cuerpoFn(sinComent(D), "responderDisputa");
    // 9n: la foto de la entrega va como archivo más (otro → uncategorized_file).
    if (!/pasarela\.subirEvidencia\(/.test(r) || !/archivos: \{ recibo: archivos\.recibo, conversacion: archivos\.conversacion, entrega: archivos\.entrega(, otro: archivos\.foto_entrega)? \}/.test(r)) falla(G, D, 0, "responder sube los archivos (API de archivos) y los manda en el envío");
    if (!/if \(!up\.ok\) return \{ ok: false/.test(r)) falla(G, D, 0, "si un archivo no sube, no se envía nada");
    if (!/clave = `privado\/disputas\//.test(sinComent(D))) falla(G, D, 0, "los archivos de la evidencia van al almacén privado (privado/disputas/…)");
    if (existsSync(M) && !/raise exception 'de la evidencia solo cambia, una vez, su archivo en Stripe y cuándo se envió'/.test(readFileSync(M, "utf8"))) falla(G, M, 0, "la evidencia no se cambia ni se borra (trigger)");
    if (!/const ok = await pasarela\.disputaResponder\(/.test(r) || !/if \(!ok\) return \{ ok: false/.test(r)) falla(G, D, 0, "responder manda la evidencia por la pasarela y, si Stripe no la acepta, no cambia nada");
  },

  /* 9k · pagoAlBancoMartes (L358, L829): los pagos al banco salen los martes: la cuenta nueva nace con el calendario semanal del martes, reanudar vuelve al
     martes, la Configuración dice 2 (martes) y no se edita aquí; el libro de payouts no se borra ni cambia su monto; el webhook payout.* lo pone al día. */
  pagoAlBancoMartes() {
    const G = "pagoAlBancoMartes", P = "apps/web/lib/pagos/pasarela.ts", M = "packages/db/migrations/0141_conciliacion.sql", W = "apps/web/app/api/stripe/webhook/route.ts";
    const p = sinComent(P);
    if (!/settings: \{ payouts: \{ schedule: \{ interval: "weekly", weekly_anchor: "tuesday" \} \} \}/.test(p)) falla(G, P, 0, "la cuenta de cobro nace con los pagos al banco los martes");
    if (!/\{ interval: "weekly", weekly_anchor: "tuesday" \}/.test(p.slice(p.indexOf("async cuentaPagos(")))) falla(G, P, 0, "reanudar los pagos vuelve al martes");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/\('pagos_banco_dia', 1, 5, 2, [^\n]*\n[^\n]*\n\s*false,/.test(m)) falla(G, M, 0, "pagos_banco_dia nace en 2 (martes) y no se edita en Configuración");
      if (!/raise exception 'de un pago al banco solo cambian su estado, la llegada y el fallo'/.test(m) || !/raise exception 'un pago al banco no se borra \(estados\)'/.test(m)) falla(G, M, 0, "el libro de payouts no se borra ni cambia su monto (trigger)");
    }
    if (!existsSync(W) || !/case "payout\.paid":/.test(readFileSync(W, "utf8")) || !/registrarPayout\(ev\.account, o\)/.test(readFileSync(W, "utf8"))) falla(G, W, 0, "el webhook payout.* escribe el libro de payouts");
    if (!/\["pagosAlBanco", async \(\) => \(await import\("\.\/pagos-banco"\)\)\.pagarAlBanco\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "los pagos al banco del simulador corren en el barrido (los martes)");
  },

  /* 9k · devolverRepartido (L448, L455): una devolución de una operación con varios cobros (estimado + «algo más», planes y rentas) se reparte entre los cobros,
     cada parte con su propia llave (reintentar no devuelve dos veces); Transacciones y la ayuda con la cita devuelven por ahí. */
  devolverRepartido() {
    const G = "devolverRepartido", C = "apps/web/lib/cobros.ts";
    const f = cuerpoFn(sinComent(C), "devolverOperacion");
    if (!f) return falla(G, C, 0, "falta devolverOperacion");
    if (!/idem: `\$\{x\.idem\}-p\$\{p\.id\}`/.test(f) || !/if \(conLlave\.has\(`\$\{x\.idem\}-p\$\{p\.id\}`\) \|\| p\.resto <= 0\) continue;/.test(f)) falla(G, C, 0, "cada parte con su propia llave, y las partes hechas se saltan (no se devuelven dos veces)");
    if (!/if \(falta > libre\) return \{ ok: false/.test(f)) falla(G, C, 0, "el tope es lo que queda por devolver en esos cobros");
    for (const x of ["apps/web/app/admin/acciones-tx.ts", "apps/web/lib/ayuda-cita.ts"]) if (existsSync(x) && (/devolverPago\(/.test(sinComent(x)) || !/devolverOperacion\(/.test(sinComent(x)))) falla(G, x, 0, "devuelve repartiendo entre los cobros (devolverOperacion), no de uno solo");
  },

  /* 9k · simuladorDeDinero (amplía simuladorAislado): TODO el simulador de pagos (sim_intents, sim_refunds, sim_transfers, sim_transfer_reversals, sim_payouts,
     sim_files, sim_disputes, sim_dispute_submissions) vive en lib/pagos/pasarela.ts; ninguna otra parte de la app escribe o lee el «Stripe» del sandbox. */
  simuladorDeDinero() {
    const G = "simuladorDeDinero";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || f === "apps/web/lib/pagos/pasarela.ts") continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\bsim_(intents|refunds|transfers|transfer_reversals|payouts|files|disputes|dispute_submissions)\b/.test(l)) falla(G, f, i + 1, "el simulador de pagos solo se toca desde lib/pagos/pasarela.ts"); });
    }
  },

  /* 9l · smsConReintento (L336, L345, L1111, L1115): TODO SMS sale por el único camino (lib/sms): el aviso, el SMS a un teléfono sin cuenta, el código para
     entrar y El Compa por SMS. Cada intento queda anotado (sms_attempts, solo inserción); el que falla se reintenta con espera creciente hasta el tope, salvo
     lo permanente o un código vencido; el resultado final llega UNA vez del webhook (o del simulador) y solo el último intento decide; el barrido retoma.
     El simulador nunca en producción. Al revés: mandar un SMS por fuera (fetch a Telnyx, mandar("telnyx" en otro archivo), reintentar sin tope o sin
     espera, dejar que un aviso viejo mueva el SMS, o el código para entrar que no sale → falla. */
  smsConReintento() {
    const G = "smsConReintento", S = "apps/web/lib/sms/index.ts", SIM = "apps/web/lib/sms/simulador.ts", A = "apps/web/lib/avisos.ts", K = "apps/web/lib/compa/canales.ts",
      CU = "apps/web/lib/cuenta.ts", CO = "apps/web/lib/sms/codigo.ts", P = "apps/web/lib/compa/canales-proveedor.ts", M = "packages/db/migrations/0142_canales.sql", B = "apps/web/lib/barrido.ts";
    for (const f of [S, SIM, A, K, CU, CO, P]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza del único camino de los SMS");
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      if (f !== S && /insert into sms_(outbox|attempts)\b|update sms_(outbox|attempts)\b/.test(t)) falla(G, f, 0, "solo lib/sms/index.ts escribe sms_outbox y sms_attempts");
      if (f !== S && /mandar\(\s*"telnyx"/.test(t)) falla(G, f, 0, "un SMS por Telnyx solo sale desde lib/sms (el único camino, con reintentos)");
      if (f !== P && /api\.telnyx\.com|process\.env\.TELNYX_API_KEY/.test(t)) falla(G, f, 0, "solo canales-proveedor.ts habla con Telnyx");
      if (f !== S && f !== SIM && /simularEnvio\(|from "\.\/simulador"|sms\/simulador/.test(t)) falla(G, f, 0, "el simulador de SMS solo lo usa lib/sms/index.ts");
    }
    const s = sinComent(S), it = cuerpoFn(s, "intentar"), fa = cuerpoFn(s, "fallar"), an = cuerpoFn(s, "anotarEntrega");
    if (!/update sms_outbox set attempts = attempts \+ 1[\s\S]*?where id = \$1::bigint and attempts < max_attempts/.test(it)) falla(G, S, 0, "intentar() reclama el SMS en una sola escritura y nunca pasa del tope de intentos");
    if (!/insert into sms_attempts \(sms_id, n, provider, provider_msg_id, accepted, error_code\)/.test(it)) falla(G, S, 0, "cada intento queda anotado en sms_attempts");
    if (!/if \(f\.vencido \|\| !tel \|\| !texto\) return cerrar\(id, "vencido"/.test(it)) falla(G, S, 0, "un código vencido no se manda");
    if (!/if \(permanente \|\| n >= max \|\| v\?\.vencido\) return cerrar\(id, "fallo"/.test(fa) || !/status = 'reintento', next_at = now\(\) \+ make_interval\(mins => \$2::int\)/.test(fa) || !/\[id, base \* 2 \*\* \(n - 1\), codigo/.test(fa)) falla(G, S, 0, "lo que falla se reintenta con espera creciente hasta el tope; lo permanente o vencido, no");
    if (!/where provider = \$1 and provider_msg_id = \$2 and final is null and accepted/.test(an) || !/if \(!s \|\| s\.status !== "enviado" \|\| s\.attempts !== a\.n\) return/.test(an)) falla(G, S, 0, "el resultado final de un intento llega una vez y solo el último intento decide el SMS");
    if (!/\["sms", async \(\) => \(await import\("\.\/sms"\)\)\.reintentarSms\(\)\]/.test(sinComent(B))) falla(G, B, 0, "el barrido retoma los reintentos del SMS");
    if (!/if \(ENTORNO === "produccion"\) throw new Error/.test(sinComent(SIM))) falla(G, SIM, 0, "el simulador de SMS no existe en producción");
    if (/smsTelnyx|fetch\(/.test(sinComent(A)) || !/await enviarSms\(\{ tel, texto, tpl, origen:/.test(sinComent(A))) falla(G, A, 0, "los avisos mandan su SMS por el único camino (enviarSms)");
    if (!/if \(st === "pendiente" && o\.n\.provider === "telnyx"\) \{\s*const s = await enviarSms\(/.test(cuerpoFn(sinComent(K), "enviar"))) falla(G, K, 0, "El Compa por SMS sale por el único camino (enviarSms)");
    const pc = cuerpoFn(sinComent(CU), "pedirCodigo");
    if (!/smsCodigo\(tel, codigo, CODIGO_MIN/.test(pc) || /^\s*throw new ErrorCuenta\("sin_proveedor"\);/m.test(pc)) falla(G, CU, 0, "el código para entrar sale por el único camino (smsCodigo); ya no «sin proveedor» siempre");
    if (!/tpl: "cuenta_codigo"/.test(sinComent(CO)) || !/venceSeg: minutos \* 60/.test(sinComent(CO))) falla(G, CO, 0, "el SMS del código usa su plantilla editable y no se reintenta vencido");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/raise exception 'ese SMS ya se decidió/.test(m) || !/raise exception 'sms_attempts es solo de inserción/.test(m) || !/raise exception 'sms_outbox no se borra \(estados\)'/.test(m)) falla(G, M, 0, "la base impone que el SMS solo avanza y que sus intentos son de solo inserción");
      if (!/body_enc\s+bytea/.test(m) || !/to_enc\s+bytea/.test(m)) falla(G, M, 0, "el teléfono y el texto del SMS se guardan cifrados (llevan códigos)");
    }
  },

  /* 9l · correoEntranteFirmado (L977, L1131, §6 #23): al correo de Soporte solo entra lo que Amazon firma y aprueba. La firma de SNS se revisa ANTES de leer el
     aviso de SES (401 si no), con el certificado bajado SOLO de sns.<región>.amazonaws.com por https (o de localhost fuera de producción) y del tema PROPIO
     (CORREO_SNS_TEMA; sin él, nada entra); la hora dentro de una hora; una vez por id. Los veredictos de SES: virus y spam PASS y SPF o DKIM PASS. Solo un
     correo CONFIRMADO de una cuenta abre un caso; el texto entra tapado. Al revés: leer el aviso antes de la firma, aceptar otro host o http en producción,
     no mirar el tema, dejar pasar spam o un remitente sin SPF ni DKIM, o un correo sin confirmar → falla. */
  correoEntranteFirmado() {
    const G = "correoEntranteFirmado", R = "apps/web/app/api/correo/entrada/route.ts", E = "apps/web/lib/correo/entrante.ts", M = "packages/db/migrations/0142_canales.sql";
    for (const f of [R, E]) if (!existsSync(f)) return falla(G, f, 0, "falta una pieza del correo entrante de Soporte");
    const post = cuerpoFn(sinComent(R), "POST");
    const iF = post.indexOf("firmaSns("), iM = post.indexOf("recibirCorreo("), iP = post.search(/JSON\.parse\(String\(m\.Message/);
    if (iF < 0 || iM < 0 || iP < 0 || iF > iM || iF > iP) falla(G, R, 0, "la firma de SNS se revisa antes de leer el aviso de SES");
    if (!/if \(!f\.ok\) return no\(401\);/.test(post)) falla(G, R, 0, "firma mala = 401 y nada se guarda");
    if (/console\.(log|info|warn|error)/.test(sinComent(R) + sinComent(E))) falla(G, E, 0, "el correo que entra no va al registro del servidor");
    const e = sinComent(E), fs = cuerpoFn(e, "firmaSns"), uv = cuerpoFn(e, "urlCertificadoValida"), hp = cuerpoFn(e, "hostsPrueba"), rc = cuerpoFn(e, "recibirCorreo");
    if (!/const tema = process\.env\.CORREO_SNS_TEMA \?\? "";/.test(fs) || !/return \{ ok: false, motivo: "sin_secreto" \}/.test(fs) || !/if \(m\.TopicArn !== tema\) return \{ ok: false, motivo: "tema" \};/.test(fs)) falla(G, E, 0, "solo el tema propio (CORREO_SNS_TEMA); sin él, nada entra");
    if (!/createVerify\(ver\)\.update\(cad, "utf8"\)\.verify\(pem, Buffer\.from\(m\.Signature, "base64"\)\)/.test(fs) || !/"RSA-SHA256"/.test(fs) || !/Math\.abs\(Date\.now\(\) - t\) > 3_600_000/.test(fs)) falla(G, E, 0, "la firma RSA de SNS sobre su cadena canónica y la hora dentro de una hora");
    if (!/const HOST_SNS = \/\^sns\\\.\[a-z0-9-\]\+\\\.amazonaws\\\.com\$\/;/.test(e) || !/x\.protocol === "https:" && \(x\.port === "" \|\| x\.port === "443"\) && HOST_SNS\.test\(x\.hostname\)/.test(uv)) falla(G, E, 0, "el certificado solo de https://sns.<región>.amazonaws.com");
    if (!/if \(ENTORNO === "produccion"\) return \[\];/.test(hp) || !/\^\(127\\\.0\\\.0\\\.1\|localhost\):\\d\{2,5\}\$/.test(hp)) falla(G, E, 0, "los hosts de prueba solo fuera de producción y solo localhost");
    if (!/virus !== "PASS" \? "virus" : spam !== "PASS" \? "spam" : spf !== "PASS" && dkim !== "PASS"/.test(rc)) falla(G, E, 0, "solo entra lo que SES aprueba: virus y spam PASS, SPF o DKIM PASS");
    if (!/coalesce\(email_verified, false\)/.test(rc) || !/U\.length === 1/.test(rc)) falla(G, E, 0, "solo el correo CONFIRMADO de una sola cuenta abre un caso");
    if (!/tapar\(sinCitas\(textoDelCorreo/.test(rc)) falla(G, E, 0, "el texto del correo entra tapado");
    for (const f of codigo) if (/^apps\/web\/.*\.tsx?$/.test(f) && f !== E && /insert into support_email_in\b/.test(sinComent(f))) falla(G, f, 0, "solo lib/correo/entrante.ts escribe support_email_in");
    if (existsSync(M)) {
      const m = readFileSync(M, "utf8");
      if (!/sns_message_id\s+text not null unique/.test(m) || !/ses_message_id\s+text not null unique/.test(m)) falla(G, M, 0, "un correo entra una sola vez (ids únicos de SNS y de SES)");
      if (!/raise exception 'support_sin_secretos: el correo se guarda tapado'/.test(m)) falla(G, M, 0, "la base rechaza un correo con tarjeta o seguro social");
    }
  },

  /* 9i · ciudadConAsistente (fase9-apertura.md §4 9i; LAUNCH L41): una ciudad solo pasa a «on» por el asistente con todos sus pasos, y bajar una ciudad
     abierta o en beta pide un cierre aprobado por OTRA persona. (1) La base lo impone: cities_estado pide tl.apertura con un asistente de esa ciudad, en
     curso y con sus pasos 1–6 (fuera del sandbox no hay otro camino) y tl.cierre con un pedido aprobado por otra persona; los pasos solo avanzan, de uno
     en uno, y no se cambian ni se borran; un asistente se cierra «abierta» solo con sus 7 pasos. (2) Solo lib/ciudades/apertura.ts cambia
     cities.status, y lo hace con tl.apertura o tl.cierre en la misma transacción; abrir (paso 7) y «Abrir igual» son de un Admin; quien pide el cierre no
     lo aprueba. (3) Ninguna semilla nueva abre una ciudad a mano (la 0002 del sandbox, de antes de 9i, es la única) ni lo hace una semilla del catálogo.
     Al revés: alreves9i. */
  ciudadConAsistente() {
    const G = "ciudadConAsistente", M = "packages/db/migrations/0139_ciudades.sql", A = "apps/web/lib/ciudades/apertura.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta 0139 (el asistente de apertura en la base)");
    const m = readFileSync(M, "utf8"), est = /create or replace function cities_estado\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(m)?.[1] ?? "";
    if (!/create trigger cities_estado before update of status on cities for each row execute function cities_estado\(\)/.test(m)) falla(G, M, 0, "cada cambio de cities.status pasa por cities_estado (trigger)");
    if (!/if new\.status = 'on' then\s*if ap is not null then/.test(est) || !/raise exception 'ciudad_apertura: una ciudad solo abre con el asistente/.test(est) || !/elsif not ciudades_sandbox\(\) then\s*raise exception 'ciudad_apertura/.test(est))
      falla(G, M, 0, "abrir una ciudad pide el asistente (tl.apertura); sin él, solo la base del sandbox deja el cambio directo");
    if (!/l\.city_id <> new\.id or l\.status <> 'en_curso'/.test(est) || !/step between 1 and 6;\s*if n < 6 then raise exception 'ciudad_apertura: faltan pasos/.test(est)) falla(G, M, 0, "el asistente que abre es de esa ciudad, sigue en curso y tiene sus pasos 1–6");
    if (!/r\.status <> 'aprobada' or r\.to_status <> new\.status or r\.decided_by is null or r\.decided_by = r\.requested_by/.test(est) || !/raise exception 'ciudad_cierre: cerrar una ciudad abierta pide motivo y otra persona/.test(est))
      falla(G, M, 0, "bajar una ciudad abierta o en beta pide un cierre aprobado por otra persona (tl.cierre)");
    if (!/check \(decided_by is null or decided_by <> requested_by\)/.test(m)) falla(G, M, 0, "la base no deja que quien pide el cierre lo apruebe");
    const pasos = /create or replace function city_launch_steps_reglas\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(m)?.[1] ?? "";
    if (!/if tg_op <> 'INSERT' then raise exception 'ciudad_paso: un paso del asistente no se cambia ni se borra/.test(pasos) || !/if new\.step <> m \+ 1 then raise exception/.test(pasos) || !/create trigger city_launch_steps_reglas before insert or update or delete on city_launch_steps/.test(m))
      falla(G, M, 0, "los pasos del asistente solo avanzan, de uno en uno, y no se cambian ni se borran (trigger)");
    if (!/select count\(\*\) from city_launch_steps where launch_id = new\.id\) < 7 then raise exception/.test(m)) falla(G, M, 0, "un asistente solo queda «abierta» con sus 7 pasos");
    if (!/legal_entorno\(\) = 'pruebas'/.test(m) || !/name like 'pruebas\/%'/.test(m)) falla(G, M, 0, "ciudades_sandbox() solo es verdad en la base del sandbox (el entorno o la semilla de pruebas)");
    if (!existsSync(A)) return falla(G, A, 0, "falta lib/ciudades/apertura.ts");
    const a = sinComent(A), cp = cuerpoFn(a, "confirmarPaso"), dc = cuerpoFn(a, "decidirCierre");
    const iAp = cp.indexOf('await rastro(c, s, m, { "tl.apertura": l });'), iOn = cp.indexOf("update cities set status = 'on'");
    if (iAp < 0 || iOn < 0 || iAp > iOn) falla(G, A, 0, "abrir pone tl.apertura (el asistente) antes de cambiar el estado, en la misma transacción");
    if (!/if \(\(paso === 7 \|\| abrirIgual\) && !esAdmin\(s\)\) return mal\(/.test(cp)) falla(G, A, 0, "abrir (paso 7) y «Abrir igual» los hace un Admin");
    if (!/if \(paso !== hecho \+ 1\) return mal\(/.test(cp)) falla(G, A, 0, "el servidor solo confirma el paso que toca (el asistente solo avanza)");
    if (!/if \(!ev\.ok && !\(paso === 6 && abrirIgual && ev\.abrirIgual\)\) return/.test(cp)) falla(G, A, 0, "un paso sin su evidencia no se confirma (salvo «Abrir igual» en «Comprobar», que no salta la LAUNCH)");
    const ev6 = cuerpoFn(a, "evidencia");
    if (!/const frena = !LA\.leida \|\| \(!sandbox && LA\.deLaCiudad\.length > 0\)/.test(ev6) || !/abrirIgual: !R\.cumple && !frena,/.test(ev6) || !/const sandbox = \(await db\(\)\.query<\{ s: boolean \}>\(`select ciudades_sandbox\(\) as s`\)\)/.test(ev6))
      falla(G, A, 0, "«Comprobar»: fuera de la base del sandbox, una línea de LAUNCH de la ciudad (o no poder leerla) frena la apertura, y «Abrir igual» no la salta");
    const iCi = dc.indexOf('await rastro(c, s, m, { "tl.cierre": pedido });'), iUp = dc.indexOf("update cities set status = $2");
    if (!/if \(x\.by === s\.id\) return mal\(/.test(dc) || iCi < 0 || iUp < 0 || iCi > iUp) falla(G, A, 0, "aprobar un cierre: otra persona, con tl.cierre antes de cambiar el estado");
    for (const f of archivos) {
      if (f === A || f === M || !/^(apps|services|scripts|packages\/db\/seeds)\/.*\.(tsx?|mjs|cjs|js|sql)$/.test(f) || !existsSync(f)) continue;
      const t = /\.sql$/.test(f) ? readFileSync(f, "utf8").replace(/--.*$/gm, "") : sinComent(f);
      if (/update cities set[^;`]*\bstatus\s*=/i.test(t)) falla(G, f, 0, "cambia cities.status fuera de lib/ciudades/apertura.ts: una ciudad abre con el asistente y cierra con otra persona");
    }
    for (const x of readdirSync("infra/pruebas/semilla").filter((y) => y.endsWith(".sql") && y > "0002_ciudad.sql")) {
      const t = readFileSync(`infra/pruebas/semilla/${x}`, "utf8").replace(/--.*$/gm, "");
      if (/update cities set status = 'on'/.test(t)) falla(G, `infra/pruebas/semilla/${x}`, 0, "una semilla abre una ciudad a mano: se abre con el asistente (la 0002, de antes de 9i, es la única)");
    }
  },

  /* 9i · ciudadAlInstante (LAUNCH L71): ningún proceso guarda el estado de una ciudad más de lo que tarda el NOTIFY. (1) 0139 avisa por el canal «ciudades»
     cada cambio de cities, zones y city_beta_invites; (2) lib/cambios-config.ts escucha «ciudades» y olvida lo registrado; (3) toda copia con hora que lee
     cities, zones o city_beta_invites se registra con alCambiarConfig, y la de lib/ubicacion.ts dura a lo más 60 s de respaldo; (4) quién entra a una ciudad
     en beta no se guarda en memoria (vista() pregunta cada vez). Al revés: alreves9i. */
  ciudadAlInstante() {
    const G = "ciudadAlInstante", M = "packages/db/migrations/0139_ciudades.sql", CC = "apps/web/lib/cambios-config.ts", U = "apps/web/lib/ubicacion.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta 0139");
    const m = readFileSync(M, "utf8");
    if (!/perform pg_notify\('ciudades', tg_table_name\);/.test(m)) falla(G, M, 0, "ciudades_avisar() avisa por el canal «ciudades»");
    for (const t of ["cities", "zones", "city_beta_invites"]) if (!new RegExp(`create trigger \\w+ after insert or update or delete on ${t} for each statement execute function ciudades_avisar\\(\\)`).test(m)) falla(G, M, 0, `${t} no avisa sus cambios por NOTIFY 'ciudades'`);
    const cc = sinComent(CC);
    if (!/listen ciudades/.test(cc) || !/m\.channel === "ciudades"/.test(cc)) falla(G, CC, 0, "cada proceso escucha «ciudades» y olvida su copia al momento");
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/.*\.ts$/.test(f) || f === CC) continue;
      const t = sinComent(f);
      if (!/Date\.now\(\)\s*-\s*\w+\.at\s*[<>]/.test(t)) continue;
      const lee = ["cities", "zones", "city_beta_invites"].filter((x) => new RegExp(`\\b(from|join) ${x}\\b`).test(t));
      if (lee.length && !/alCambiarConfig\(/.test(t)) falla(G, f, 0, `guarda en memoria lo que lee de ${lee.join(", ")} y no lo olvida con NOTIFY 'ciudades' (alCambiarConfig)`);
    }
    const u = sinComent(U);
    const ms = /Date\.now\(\) - cache\.at < (\d[\d_]*)/.exec(u)?.[1];
    if (!ms || Number(ms.replace(/_/g, "")) > 60000) falla(G, U, 0, "la copia de las ciudades dura a lo más 60 s de respaldo (el NOTIFY la olvida antes)");
    const v = cuerpoFn(u, "vista");
    if (!/ciudad_abierta_para\(id, \$1::uuid\)/.test(v) || /\bcache\b|=\s*new Map\(/.test(v)) falla(G, U, 0, "quién entra a una ciudad en beta se pregunta en cada visita (vista), sin guardarlo en memoria");
  },

  /* 9i · betaSoloInvitados (§3.1, §4 9i): una ciudad en «beta» es abierta SOLO para las cuentas invitadas (city_beta_invites vivas) y las de revisión
     activas; para los demás es «próximamente». (1) ciudad_abierta_para lo decide en la base; (2) ubicacion() y el selector ven las ciudades con vista()
     (la de esa persona); (3) las acciones del servidor que deciden si alguien puede actuar en una ciudad usan ciudad_abierta_para, nunca «status = 'on'»
     a secas (con beta, un invitado no podía; sin beta, cualquiera podría). El Super Admin (app/admin, lib/admin*), el mapa del sitio (lo público) y
     lib/ciudades/ quedan fuera; ordenar las abiertas primero («order by (status = 'on')») no decide nada. Al escribirlo cazó «Mi ciudad» (lib/perfil.ts ciudadDe): la lista de ciudades para elegir no traía la de la beta.
     Al revés: alreves9i. */
  betaSoloInvitados() {
    const G = "betaSoloInvitados", M = "packages/db/migrations/0139_ciudades.sql", U = "apps/web/lib/ubicacion.ts", S = "apps/web/app/(app)/ciudad/acciones.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta 0139");
    const f0 = /create or replace function ciudad_abierta_para\([\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(readFileSync(M, "utf8"))?.[1] ?? "";
    if (!/c\.status = 'on' or \(c\.status = 'beta' and p_user is not null and \(/.test(f0) || !/i\.user_id = p_user and i\.revoked_at is null/.test(f0) || !/r\.user_id = p_user and r\.active/.test(f0))
      falla(G, M, 0, "ciudad_abierta_para: on para todos; beta solo para invitaciones vivas y cuentas de revisión activas");
    const u = sinComent(U);
    if (!/const cs = await vista\(cs0, usuario\?\.id\);/.test(cuerpoFn(u, "ubicacion"))) falla(G, U, 0, "ubicacion() ve las ciudades como las ve esa persona (vista)");
    if (!/c\.status === "beta" \? \{ \.\.\.c, status: dentro\.has\(c\.id\) \? "on" : "soon" \} : c/.test(cuerpoFn(u, "vista"))) falla(G, U, 0, "vista(): beta → abierta para quien entra, próximamente para los demás");
    if (existsSync(S)) {
      const s = "\n" + sinComent(S).replace(/\nexport async function /g, "\nasync function ");
      for (const fn of ["elegirUbicacion", "dondeEstoy", "medirBorrador", "esperarCiudad", "abrirSelector"]) if (!/await vista\(/.test(cuerpoFn(s, fn))) falla(G, S, 0, `${fn} ve las ciudades sin vista(): con una ciudad en beta, el selector le mentiría a quien no está invitado`);
    }
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f) || /^apps\/web\/(app\/admin\/|lib\/admin|lib\/ciudades\/|lib\/seo\/)/.test(f)) continue;
      for (const q0 of sinComent(f).match(/`[^`]*`/g) ?? []) {
        const q = q0.replace(/order by \([^)]*\)/g, ""); // ordenar las abiertas primero no decide nada
        if (/\bfrom cities\b[^`]*\bstatus = 'on'|\bstatus = 'on'[^`]*\bfrom cities\b|\bc\.status = 'on' as\b/.test(q)) falla(G, f, 0, `decide si una ciudad está abierta con «status = 'on'»: usa ciudad_abierta_para (beta = solo invitados): «${q.slice(0, 70)}»`);
      }
    }
  },

  /* 9i · listaAvisadaUnaVez (§4 9i; LAUNCH 9h → 9i): el día que abre una ciudad, su lista de espera recibe UN aviso, por partes y nunca de noche. (1) city_notices
     es único por ciudad y persona y de solo inserción; (2) lib/ciudades/aviso.ts reclama a cada persona en la misma escritura (on conflict … do nothing
     returning), solo de AVISO_DESDE a AVISO_HASTA en la hora de la ciudad, y manda los avisos DESPUÉS de cerrar la transacción; (3) nunca escribe a un teléfono
     sin cuenta (sin avisarTelefono); (4) el barrido lo corre; (5) la plantilla ciudad_abierta lleva push y su SMS solo como respaldo (sin_push). Al revés: alreves9i. */
  listaAvisadaUnaVez() {
    const G = "listaAvisadaUnaVez", M = "packages/db/migrations/0139_ciudades.sql", A = "apps/web/lib/ciudades/aviso.ts", C = "apps/web/lib/ciudades/comun.ts";
    if (!existsSync(M) || !existsSync(A)) return falla(G, A, 0, "falta el aviso de apertura (0139 y lib/ciudades/aviso.ts)");
    const m = readFileSync(M, "utf8");
    if (!/create table if not exists city_notices \([\s\S]*?unique \(city_id, user_id\)\s*\);/.test(m)) falla(G, M, 0, "un aviso de apertura por ciudad y persona (unique)");
    if (!/create trigger city_notices_reglas before update or delete on city_notices/.test(m) || !/raise exception 'city_notices es solo de inserción'/.test(m)) falla(G, M, 0, "city_notices es de solo inserción (trigger)");
    if (!/\('ciudad_abierta', 'tx', null, true, 'sin_push', true,/.test(m)) falla(G, M, 0, "ciudad_abierta: push primero y el SMS solo de respaldo (sin_push)");
    const a = sinComent(A), lo = cuerpoFn(a, "lote"), av = cuerpoFn(a, "avisarAperturas");
    if (!/on conflict \(city_id, user_id\) do nothing returning user_id::text as uid/.test(lo)) falla(G, A, 0, "cada persona se reclama una vez en la misma escritura (city_notices)");
    if (!/extract\(hour from now\(\) at time zone c\.timezone\) between \$\{AVISO_DESDE\} and \$\{AVISO_HASTA\}/.test(av)) falla(G, A, 0, "el aviso sale solo de día en la hora de la ciudad (AVISO_DESDE a AVISO_HASTA)");
    const iTx = lo.indexOf("const r = await tx("), iFin = lo.indexOf("\n  });", iTx), iAv = lo.indexOf('await avisar(u.uid, "ciudad_abierta"');
    if (iTx < 0 || iFin < 0 || iAv < 0 || iAv < iFin) falla(G, A, 0, "los avisos salen después de cerrar la transacción (nada de red adentro)");
    if (/avisarTelefono\(/.test(a)) falla(G, A, 0, "el aviso de apertura no le escribe a un teléfono sin cuenta (no se verificó)");
    const cm = sinComent(C), d = Number(/AVISO_DESDE = (\d+)/.exec(cm)?.[1] ?? -1), h = Number(/AVISO_HASTA = (\d+)/.exec(cm)?.[1] ?? 99);
    if (!(d >= 8 && h <= 20 && d < h)) falla(G, C, 0, "la ventana del aviso queda dentro del día (de las 8 AM en adelante y hasta las 8:59 PM)");
    if (!/\["avisoApertura", async \(\) => \(await import\("\.\/ciudades\/aviso"\)\)\.avisarAperturas\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "el barrido central manda el aviso de apertura");
  },

  /* 9i · parametroDeMas: una consulta que recibe más valores que los $n que usa falla en Postgres («could not determine data type of parameter $1»): el
     aviso de apertura (lib/ciudades/aviso.ts) mandaba la ciudad como $1 a un update que no la usaba y el barrido fallaba en cada pasada (ciu9i lo cazó).
     En cada .query(`…`, [ … ]) con la lista escrita ahí y la consulta sin partes armadas (${…}), el número de valores es el $n más alto. Al revés: alreves9i. */
  parametroDeMas() {
    const G = "parametroDeMas";
    for (const f of codigo) {
      if (!/^apps\/web\/(lib|app)\/.*\.tsx?$/.test(f)) continue;
      const t = sinComent(f);
      for (const m of t.matchAll(/\.query(?:<[^`]*?>)?\(\s*`([^`]*)`\s*,\s*\[/g)) {
        if (m[1].includes("${")) continue;
        // La lista de valores, hasta su corchete de cierre (contando corchetes, paréntesis y llaves; las cadenas se saltan).
        let i = m.index + m[0].length, d = 1, n = 0, algo = false, q = null;
        for (; i < t.length && d > 0; i++) {
          const ch = t[i];
          if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
          if (ch === '"' || ch === "'" || ch === "`") { q = ch; algo = true; continue; }
          if ("[({".includes(ch)) d++; else if ("])}".includes(ch)) d--;
          else if (ch === "," && d === 1) n++;
          else if (d === 1 && /\S/.test(ch)) algo = true;
        }
        const cuenta = algo ? n + 1 - (/,\s*\]$/.test(t.slice(m.index, i)) ? 1 : 0) : 0;
        if (/\.\.\./.test(t.slice(m.index + m[0].length, i))) continue; // una lista que se arma con «...» no se cuenta
        const max = Math.max(0, ...[...m[1].matchAll(/\$(\d+)/g)].map((x) => Number(x[1])));
        if (cuenta > max) falla(G, f, t.slice(0, m.index).split("\n").length, `la consulta usa hasta $${max} y recibe ${cuenta} valores: Postgres no sabe de qué tipo es el que sobra y la consulta falla`);
      }
    }
  },

  /* ── 9o · Producción como código y ensayada (fase9-apertura.md §3.2–§3.5, §4 9o) ── */

  /* 9o · mismoPaquete: producción hace LO MISMO que el sandbox, con su lista cerrada de diferencias. Los dos deploy.sh cargan el paquete común
     (infra/comun/) y llaman a sus mismos pasos; la imagen de la app sale de la misma receta (infra/pruebas/Dockerfile); los servicios de producción son
     los del sandbox (mismas imágenes fijadas y mismos comandos) más los de su lista (monitoreo, sobres, exportadores); las variables de la app de
     producción son las del sandbox más las de su lista; lo único del sandbox que producción NO tiene es la lista cerrada (la semilla, el modo pruebas del
     SMS, los simuladores). Las órdenes del ensayo nunca están en main y solo corren con TOLATINO_ENTORNO=ensayo. */
  mismoPaquete() {
    const G = "mismoPaquete", P = "infra/pruebas/deploy.sh", D = "infra/produccion/deploy.sh";
    if (!existsSync(D)) return falla(G, D, 0, "falta el despliegue de producción");
    const tp = readFileSync(P, "utf8"), td = readFileSync(D, "utf8");
    const sinC = (t) => t.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
    for (const lib of ["lib.sh", "registro.sh", "sellado.sh"]) {
      if (!new RegExp(`\\. "\\$REPO/infra/comun/${lib.replace(".", "\\.")}"`).test(tp)) falla(G, P, 0, `el sandbox no carga infra/comun/${lib} (el mismo paquete)`);
      if (!new RegExp(`\\. "\\$REPO/infra/comun/${lib.replace(".", "\\.")}"`).test(td)) falla(G, D, 0, `producción no carga infra/comun/${lib} (el mismo paquete)`);
    }
    // Los pasos comunes que los dos llaman (producción no tiene un paso propio que el sandbox no tenga, salvo su lista cerrada).
    const PASOS = ["secreto_nace", "sellado_preparar", "sellado_abrir", "disco_liberar", "diag", "indexar_docs", "packages/db/migrar.sh", "infra/pruebas/medios.sh"];
    for (const p of PASOS) { if (!sinC(tp).includes(p)) falla(G, P, 0, `el sandbox no llama ${p}`); if (!sinC(td).includes(p)) falla(G, D, 0, `producción no llama ${p}`); }
    if (!/registrar_despliegue pruebas /.test(sinC(tp))) falla(G, P, 0, "el sandbox no anota su despliegue (registrar_despliegue)");
    if (!/desplegar_azulverde /.test(sinC(td)) || !/\. "\$REPO\/infra\/comun\/azulverde\.sh"/.test(td)) falla(G, D, 0, "producción despliega con el azul/verde común (infra/comun/azulverde.sh)");
    const SOLO_PROD_PASOS = /\b(desplegar_azulverde|traer_sobre|servir_sobres|recuperar_si_hace_falta|pgbackrest_conf|temporizador|anotar_llave)\b/;
    void SOLO_PROD_PASOS; // la lista cerrada de pasos propios de producción (azul/verde, sobres privados, recuperación, respaldos, temporizadores)
    const llamadas = (t) => new Set([...sinC(t).matchAll(/^\s*(?:[A-Z_]+=\S+ )*(?:if !? ?)?([a-z][a-z_]+)\s/gm)].map((m) => m[1]));
    const comunes = new Set([...readFileSync("infra/comun/lib.sh", "utf8").matchAll(/^([a-z_]+)\(\)/gm), ...readFileSync("infra/comun/sellado.sh", "utf8").matchAll(/^([a-z_]+)\(\)/gm),
      ...readFileSync("infra/comun/registro.sh", "utf8").matchAll(/^([a-z_]+)\(\)/gm)].map((m) => m[1]));
    for (const f of comunes) if (llamadas(td).has(f) && !llamadas(tp).has(f) && !["anotar_llave", "abrir_incidente", "env_poner", "age_disponible", "sellado_permitido", "hex_o_nada", "digest_o_nada", "salud_esperar", "log"].includes(f))
      falla(G, D, 0, `producción llama ${f} del paquete común y el sandbox no (un paso que no se ensayó en pruebas)`);
    // La imagen de la app: la misma receta.
    if (!/docker build[^\n]*-f "\$REPO\/infra\/pruebas\/Dockerfile"/.test(td)) falla(G, D, 0, "la imagen de producción se construye con la MISMA receta del sandbox (infra/pruebas/Dockerfile)");
    // Los servicios y sus imágenes.
    const yml = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
    const servicios = (t) => { const out = new Map(); const s = (/\nservices:\n([\s\S]*?)(?:\n[a-z]+:|$)/.exec("\n" + t) ?? [])[1] ?? ""; for (const b of s.split(/\n(?=  [a-z][\w-]*:\n)/)) { const n = (/^\s*([a-z][\w-]*):/.exec(b) ?? [])[1]; if (n) out.set(n, b); } return out; };
    const sp = servicios(yml("infra/pruebas/docker-compose.yml"));
    const SOLO_PROD = new Set(["node-exporter", "postgres-exporter", "prometheus", "alertmanager", "blackbox", "sobres", "tls"]);
    for (const f of ["infra/produccion/compose-app.yml", "infra/produccion/compose-app-fijos.yml", "infra/produccion/compose-base.yml", "infra/produccion/compose-replica.yml"]) {
      for (const [n, b] of servicios(yml(f))) {
        if (SOLO_PROD.has(n)) continue;
        if (!sp.has(n)) { falla(G, f, 0, `el servicio «${n}» de producción no existe en el sandbox (fuera de la lista cerrada)`); continue; }
        const img = (x) => (/\n\s+image: (\S+)/.exec("\n" + x) ?? [])[1] ?? "";
        const ip = img(sp.get(n)), id = img(b);
        if (/^(libretranslate|maptiler|dxflrs)\//.test(ip) && ip !== id) falla(G, f, 0, `«${n}» usa ${id} y el sandbox ${ip} (la misma versión fijada)`);
        const cmd = (x) => ((/\n\s+command: (\[.*\])/.exec("\n" + x) ?? [])[1] ?? "").replace(/http:\/\/(web|127\.0\.0\.1):3000/g, "APP");
        if (["barrido", "push"].includes(n) && cmd(sp.get(n)) !== cmd(b)) falla(G, f, 0, `el comando de «${n}» no es el del sandbox`);
      }
    }
    // Las variables de la app.
    const envDe = (t, s) => new Set([...((/\n    environment:\n((?:      .*\n)+)/.exec(servicios(t).get(s) ?? "") ?? [])[1] ?? "").matchAll(/^\s+([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]));
    const ep = envDe(yml("infra/pruebas/docker-compose.yml"), "web"), ed = envDe(yml("infra/produccion/compose-app.yml"), "web");
    const SOLO_PROD_ENV = new Set(["TOLATINO_COLOR", "LLAVERO_SECRET", "ALERTA_TOKEN", "PROMETHEUS_URL", "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "TELNYX_API_KEY", "TELNYX_FROM",
      "SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "CORREO_DE", "VAPID_SUJETO", "TOLATINO_URL", "TOLATINO_COMPA"]);
    const SOLO_SANDBOX_ENV = new Set([]);   // la lista cerrada al revés: hoy ninguna variable del sandbox falta en producción (TOLATINO_SMS_MODO está, con otro valor)
    for (const v of ed) if (!ep.has(v) && !SOLO_PROD_ENV.has(v)) falla(G, "infra/produccion/compose-app.yml", 0, `la app de producción lee ${v} y la del sandbox no (fuera de la lista cerrada)`);
    for (const v of ep) if (!ed.has(v) && !SOLO_SANDBOX_ENV.has(v)) falla(G, "infra/produccion/compose-app.yml", 0, `la app del sandbox lee ${v} y la de producción no`);
    // Lo del ensayo: sus órdenes no viven en main y su gancho solo corre en el ensayo.
    for (const f of archivos) if (/^infra\/ensayo\/ordenes\//.test(f)) falla(G, f, 0, "las órdenes del ensayo viven solo en la rama «ensayo», nunca en main");
    if (/infra\/ensayo\/ordenes/.test(td) && !/if \[ "\$TOLATINO_ENTORNO" = ensayo \]; then\n\s+if \[ -f "\$REPO\/infra\/ensayo\/ordenes/.test(td)) falla(G, D, 0, "las órdenes del ensayo solo corren con TOLATINO_ENTORNO=ensayo");
  },

  /* 9o · produccionSoloAvanza: la rama produccion solo AVANZA (fast-forward) a un commit que ya pasó por pruebas con su CI en verde y con el OK del
     fundador anotado (etiqueta ok-produccion/*, que va a deploy_releases.founder_ok_ref). Lo revisan el que empuja (scripts/produccion/promover.sh) y el que
     despliega (infra/produccion/tolatino-sync, en cada máquina); ningún flujo de GitHub empuja a produccion; y si las ramas están a mano, produccion es
     ancestro de pruebas. */
  produccionSoloAvanza() {
    const G = "produccionSoloAvanza", S = "infra/produccion/tolatino-sync", PR = "scripts/produccion/promover.sh";
    const s = existsSync(S) ? readFileSync(S, "utf8") : "";
    if (!/git merge-base --is-ancestor "\$LOCAL" "\$REMOTE"/.test(s)) falla(G, S, 0, "el servidor no rechaza una rama que reescribe la historia (fast-forward)");
    if (!/git merge-base --is-ancestor "\$REMOTE" origin\/pruebas/.test(s)) falla(G, S, 0, "el servidor no comprueba que el commit pasó por pruebas");
    if (!/--list 'ok-produccion\/\*'/.test(s) || !/RECHAZO="\$\{RECHAZO:-sin la etiqueta ok-produccion/.test(s)) falla(G, S, 0, "el servidor despliega sin la etiqueta del OK del fundador");
    if (!/export TOLATINO_OK_REF/.test(s)) falla(G, S, 0, "el OK del fundador no llega al registro del despliegue");
    if (/git (reset|pull)[^\n]*\n[\s\S]*?RECHAZO=/.test(s.slice(0, s.indexOf("RECHAZO=\"\"")))) falla(G, S, 0, "el servidor se mueve antes de comprobar");
    const p = existsSync(PR) ? readFileSync(PR, "utf8") : "";
    if (!/--is-ancestor "\$C" origin\/pruebas/.test(p) || !/--is-ancestor origin\/produccion "\$C"/.test(p) || !/conclusion == "success"/.test(p) || !/git tag -a "\$T" "\$C" -m "OK del fundador/.test(p)) falla(G, PR, 0, "promover.sh: pruebas, fast-forward, CI en verde y la etiqueta con el OK");
    p.split("\n").forEach((l, i) => { if (/git push/.test(l) && /(--force|\s-f\b|\+refs|\s\+)/.test(l)) falla(G, PR, i + 1, "a produccion no se empuja a la fuerza"); });
    if (!/check \(entorno <> 'produccion' or founder_ok_ref is not null\)/.test(readFileSync("packages/db/migrations/0145_despliegues.sql", "utf8"))) falla(G, "packages/db/migrations/0145_despliegues.sql", 0, "la base no exige el OK en un despliegue de producción");
    for (const f of archivos.filter((x) => /^\.github\/workflows\/.*\.ya?ml$/.test(x))) {
      const t = readFileSync(f, "utf8");
      if (/(git push[^\n]*(refs\/heads\/)?produccion\b)|branches:\s*\[?\s*produccion/.test(t)) falla(G, f, 0, "un flujo de GitHub empuja o corre sobre produccion (solo promover.sh con el OK)");
    }
    try {
      const r = (x) => execSync(`git rev-parse -q --verify ${x}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      const pr = r("refs/remotes/origin/produccion"), pu = r("refs/remotes/origin/pruebas");
      if (pr && pu) { try { execSync(`git merge-base --is-ancestor ${pr} ${pu}`, { stdio: "ignore" }); } catch { falla(G, "origin/produccion", 0, "produccion no es ancestro de pruebas"); } }
    } catch { /* sin la rama produccion (todavía no existe): nada que comparar */ }
  },

  /* 9o · migracionReversible: toda migración desde la 0145 es expandir → contraer. Un drop / rename de una tabla, una columna o una función que el código
     del commit ANTERIOR todavía lee rompe el CI (durante el azul/verde y en una vuelta atrás, el código anterior corre contra la base nueva). Se borra
     solo en un despliegue posterior, cuando ningún código vivo lo usa. Una migración nunca se «deshace»: se escribe otra. */
  migracionReversible() {
    const G = "migracionReversible";
    const previo = (() => { try { return execSync("git rev-parse -q --verify HEAD~1", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } })();
    // Quién lo lee: el código del commit anterior (git grep en HEAD~1) y el de ahora (también lo que todavía no está en git).
    const vivos = archivos.filter((f) => /^(apps|services|packages\/db\/seeds|scripts)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs|sql|json|sh)$/.test(f) && !f.includes("node_modules"));
    const lee = (id) => {
      const re = new RegExp(`\\b${id}\\b`);
      if (previo) {
        try {
          const out = execSync(`git grep -l -E "\\b${id}\\b" ${previo} -- apps services packages/db/seeds scripts`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
          if (out) return out.split("\n")[0].replace(/^[0-9a-f]+:/, "") + " (commit anterior)";
        } catch { /* sin coincidencias */ }
      }
      return vivos.find((f) => re.test(readFileSync(f, "utf8"))) ?? "";
    };
    for (const x of readdirSync("packages/db/migrations").filter((y) => /^\d{4}_.*\.sql$/.test(y) && Number(y.slice(0, 4)) >= 145).sort()) {
      const f = `packages/db/migrations/${x}`, t = readFileSync(f, "utf8").replace(/--.*$/gm, "");
      const objetos = [];
      for (const m of t.matchAll(/\bdrop\s+(table|view|materialized view|function|type)\s+(?:if exists\s+)?([a-z_][a-z0-9_]*)/gi)) objetos.push([m[2], `drop ${m[1]}`]);
      for (const m of t.matchAll(/\balter table\s+(?:if exists\s+)?(?:only\s+)?[a-z_][a-z0-9_]*\s+drop column\s+(?:if exists\s+)?([a-z_][a-z0-9_]*)/gi)) objetos.push([m[1], "drop column"]);
      for (const m of t.matchAll(/\brename\s+column\s+([a-z_][a-z0-9_]*)\s+to/gi)) objetos.push([m[1], "rename column"]);
      for (const m of t.matchAll(/\balter table\s+(?:if exists\s+)?([a-z_][a-z0-9_]*)\s+rename to/gi)) objetos.push([m[1], "rename table"]);
      for (const m of t.matchAll(/\balter table\s+(?:if exists\s+)?[a-z_][a-z0-9_]*\s+alter column\s+([a-z_][a-z0-9_]*)\s+(?:set data\s+)?type/gi)) objetos.push([m[1], "cambio de tipo"]);
      for (const [id, que] of objetos) { const quien = lee(id); if (quien) falla(G, f, 0, `${que} de «${id}»: el código todavía lo lee (${quien}); primero un despliegue sin lectores, después se contrae`); }
    }
  },

  /* 9o · selladoSoloSuServidor: en infra/<entorno>/sellado/ solo hay llaves públicas (llaves.json, recuperacion.txt), la lista de sobres (sobres.json) y
     sobres age (<máquina>/<NOMBRE>.age). Cada sobre es age de verdad (X25519), dice en sobres.json para qué huella se cifró y esa huella es la de la llave
     publicada de su máquina; su nombre está en la lista cerrada con origen «sellado». Ninguna llave privada age en el repo. El servidor solo abre lo de la
     lista (sellado_permitido). */
  selladoSoloSuServidor() {
    const G = "selladoSoloSuServidor";
    const huella = (k) => createHash("sha256").update(k).digest("hex").slice(0, 32);
    const lista = JSON.parse(readFileSync("infra/comun/secretos.json", "utf8"));
    for (const f of archivos) {
      if (/^infra\/[a-z]+\/sellado\//.test(f) && !/^infra\/[a-z]+\/sellado\/(llaves\.json|sobres\.json|recuperacion\.txt|[a-z][a-z0-9-]*\/[A-Z][A-Z0-9_]+\.age)$/.test(f)) falla(G, f, 0, "en sellado/ solo van llaves públicas, la lista de sobres y sobres .age");
      if (/\.(tsx?|jsx?|mjs|cjs|json|md|sql|sh|ya?ml|txt|conf|tpl|age)$/.test(f) && !f.includes("node_modules")) {
        const t = readFileSync(f, "utf8");
        if (/AGE-SECRET-KEY-1[0-9A-Z]{40,}/.test(t)) falla(G, f, 0, "una llave PRIVADA age en el repo");
      }
    }
    for (const ent of readdirSync("infra").filter((d) => existsSync(`infra/${d}/sellado`))) {
      const dir = `infra/${ent}/sellado`;
      const llaves = existsSync(`${dir}/llaves.json`) ? JSON.parse(readFileSync(`${dir}/llaves.json`, "utf8")) : {};
      const sobres = existsSync(`${dir}/sobres.json`) ? JSON.parse(readFileSync(`${dir}/sobres.json`, "utf8")) : {};
      for (const [m, k] of Object.entries(llaves)) if (!m.startsWith("_") && !/^age1[0-9a-z]{58}$/.test(String(k))) falla(G, `${dir}/llaves.json`, 0, `la llave de «${m}» no es una llave pública age`);
      for (const f of archivos.filter((x) => x.startsWith(`${dir}/`) && x.endsWith(".age"))) {
        const [maq, arch] = f.slice(dir.length + 1).split("/"), nombre = arch.replace(/\.age$/, "");
        const cab = readFileSync(f).subarray(0, 200).toString("latin1");
        if (!cab.startsWith("age-encryption.org/v1\n-> X25519 ")) falla(G, f, 0, "no es un sobre age para una llave X25519");
        if (lista[nombre]?.origen !== "sellado") falla(G, f, 0, `${nombre} no está en la lista cerrada con origen «sellado»`);
        const e = sobres[`${maq}/${nombre}`];
        if (!e) { falla(G, f, 0, "el sobre no está en sobres.json (para qué llave se cifró)"); continue; }
        if (!llaves[maq]) falla(G, f, 0, `no hay llave pública de «${maq}» en llaves.json`);
        else if (e.para !== huella(llaves[maq])) falla(G, f, 0, `se cifró para la huella ${e.para} y la llave publicada de «${maq}» es ${huella(llaves[maq])}: no abre en su servidor`);
      }
    }
    const S = "infra/comun/sellado.sh", s = readFileSync(S, "utf8");
    if (!/! sellado_permitido "\$n" "\$lista"/.test(s)) falla(G, S, 0, "el servidor abre sobres fuera de la lista cerrada");
    if (!/NO ABRE con la llave de este servidor/.test(s)) falla(G, S, 0, "un sobre que no abre tiene que decirse (y dejar el valor de antes)");
    if (/echo "\$v"|printf '%s\\n' "\$v"|log [^\n]*\$v\b/.test(s)) falla(G, S, 0, "el valor de un sobre se imprime");
  },

  /* 9o · secretoConDueno (secretoConDueño): cada variable del entorno de producción está en la lista cerrada infra/comun/secretos.json con su origen (nace
     en el servidor, llega por el sobre privado de otra máquina, llega sellada, configuración o derivada); ninguna «prohibida» (simuladores, modos de
     pruebas, direcciones de simuladores) aparece en producción; lo que nace en el servidor tiene su receta en infra/comun/lib.sh y producción lo hace
     nacer; lo que va al sobre de recuperación existe. */
  secretoConDueno() {
    const G = "secretoConDueno", L = "infra/comun/secretos.json";
    let lista; try { lista = JSON.parse(readFileSync(L, "utf8")); } catch (e) { return falla(G, L, 0, `no se lee: ${e.message}`); }
    readFileSync(L, "utf8").split("\n").forEach((l, i) => { if (/^\s{3,}"[A-Z]/.test(l)) falla(G, L, i + 1, "una variable por línea (los scripts la leen con grep)"); });
    const ORIGENES = new Set(["servidor", "base", "app", "sellado", "config", "derivado", "prohibida"]);
    for (const [k, v] of Object.entries(lista)) { if (k.startsWith("_")) continue; if (!ORIGENES.has(v.origen)) falla(G, L, 0, `${k}: origen «${v.origen}» desconocido`); }
    for (const f of archivos.filter((x) => /^infra\/(produccion|ensayo)\/.*\.(ya?ml|conf)$/.test(x) && !/cloud-init|reglas\.json/.test(x))) {
      const t = readFileSync(f, "utf8");
      for (const m of t.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)) { const v = lista[m[1]]; if (!v) falla(G, f, 0, `\${${m[1]}} sin dueño en ${L}`); else if (v.origen === "prohibida") falla(G, f, 0, `\${${m[1]}} está prohibida en producción`); }
      for (const m of t.matchAll(/^\s+([A-Z][A-Z0-9_]+):\s/gm)) if (lista[m[1]]?.origen === "prohibida" || (!lista[m[1]] && f === "infra/produccion/compose-app.yml")) falla(G, f, 0, `${m[1]} en el entorno de la app de producción sin dueño o prohibida`);
    }
    const lib = readFileSync("infra/comun/lib.sh", "utf8"), dep = readFileSync("infra/produccion/deploy.sh", "utf8");
    const receta = (/secreto_receta\(\) \{([\s\S]*?)\n\}/.exec(lib) ?? [])[1] ?? "";
    for (const [k, v] of Object.entries(lista)) {
      if (!["servidor", "base", "app"].includes(v.origen) || /^MEDIOS_/.test(k)) continue;   // las de Garage las crea medios.sh
      if (!new RegExp(`(^|[|\\s])${k.replace(/_\*$/, "")}(\\*|[|)])`).test(receta) && !(k.startsWith("REVISION_CODIGO_") && /REVISION_CODIGO_\*\)/.test(receta))) falla(G, "infra/comun/lib.sh", 0, `${k} nace en el servidor y no tiene receta`);
      if (!new RegExp(`\\b${k}\\b`).test(dep)) falla(G, "infra/produccion/deploy.sh", 0, `${k} nace en el servidor y producción no lo hace nacer`);
    }
    for (const [k, v] of Object.entries(lista)) if (v.recuperacion && !["servidor", "base", "app"].includes(v.origen)) falla(G, L, 0, `${k} va al sobre de recuperación pero no nace en un servidor`);
    for (const k of ["DATOS_SECRET", "QR_LLAVE_PRIVADA", "VAPID_PRIVADA", "AUTH_SECRET", "LLAVERO_SECRET", "RESPALDO_LLAVE"]) if (!lista[k]?.recuperacion) falla(G, L, 0, `${k} tiene que ir en el sobre de recuperación (sin ella una máquina reconstruida no lee lo de antes: L458, L775)`);
  },

  /* 9o · respaldoRestaurado: no es «respaldo verificado» de palabra. La restauración de prueba corre cada semana (temporizador de la réplica), restaura a
     un punto en el tiempo en un contenedor DESECHABLE, corre migrar.sh --verificar y las consultas de control, anota restore_drills con su RTO y su
     resultado (también si falla); si falla o no corre en 8 días, Prometheus (RestauracionDePrueba) y el barrido (vigilarRespaldos) dan la alerta crítica. */
  respaldoRestaurado() {
    const G = "respaldoRestaurado", R = "infra/comun/respaldos/restaurar-prueba.sh", D = "infra/produccion/deploy.sh";
    const r = existsSync(R) ? readFileSync(R, "utf8") : "";
    if (!/--type=time "--target=\$PUNTO"/.test(r)) falla(G, R, 0, "restaura a un punto en el tiempo (PITR)");
    if (!/docker volume create "\$C"/.test(r) || !/docker rm -f "\$C"/.test(r) || !/docker volume rm -f "\$C"/.test(r)) falla(G, R, 0, "en un contenedor y un volumen desechables que se destruyen");
    if (!/migrar\.sh" --verificar/.test(r) || !/consultas-control\.sql/.test(r)) falla(G, R, 0, "con migrar.sh --verificar y las consultas de control");
    if (!/insert into restore_drills/.test(r) || !/rto_s/.test(r) || !/anotar fallo/.test(r)) falla(G, R, 0, "anota restore_drills con su RTO, también cuando falla");
    if (!/temporizador restauracion-prueba "Sun [^"]+" "bash \$REPO\/infra\/comun\/respaldos\/restaurar-prueba\.sh"/.test(readFileSync(D, "utf8"))) falla(G, D, 0, "la restauración de prueba no está programada cada semana en la réplica");
    if (!/if \[ "\$VERIFICAR" = 1 \]; then/.test(readFileSync("packages/db/migrar.sh", "utf8"))) falla(G, "packages/db/migrar.sh", 0, "falta --verificar (no cambia nada)");
    const reglas = readFileSync("infra/comun/monitoreo/reglas.yml", "utf8");
    if (!/alert: RestauracionDePrueba\n\s+expr: tolatino_restauracion_dias > 8 or tolatino_restauracion_fallos > 0/.test(reglas) || !/RestauracionDePrueba[\s\S]{0,200}severity: critica/.test(reglas)) falla(G, "infra/comun/monitoreo/reglas.yml", 0, "la alerta crítica si falla o no corre en 8 días");
    if (!/export const SIN_RESTAURAR_DIAS = 8;/.test(readFileSync("apps/web/lib/sistema/respaldos-comun.ts", "utf8"))) falla(G, "apps/web/lib/sistema/respaldos-comun.ts", 0, "8 días sin restaurar es la alerta");
    const dsp = sinComent("apps/web/lib/sistema/despliegues.ts");
    if (!/export async function vigilarRespaldos/.test(dsp) || !/"respaldo_alerta"/.test(dsp)) falla(G, "apps/web/lib/sistema/despliegues.ts", 0, "el barrido da la alerta crítica de los respaldos");
    if (!/\["respaldosVigilar", async \(\) => \(await import\("\.\/sistema\/despliegues"\)\)\.vigilarRespaldos\(\)\]/.test(sinComent("apps/web/lib/barrido.ts"))) falla(G, "apps/web/lib/barrido.ts", 0, "vigilarRespaldos no corre en el barrido");
  },

  /* 9o · mantenimientoFijo: la página que sirve nginx con la app caída o durante una ventana programada es la del sistema de diseño con la línea fija
     de §1c tal cual (FIJAS.mantenimiento, ES/EN), se instala en cada despliegue de producción y nginx la usa para 502/503/504 y para la ventana. */
  mantenimientoFijo() {
    const G = "mantenimientoFijo";
    try { execSync("node scripts/produccion/mantenimiento.mjs --revisar", { stdio: "pipe" }); } catch { falla(G, "infra/comun/mantenimiento/index.html", 0, "no es la que sale del sistema de diseño y las líneas fijas (node scripts/produccion/mantenimiento.mjs)"); }
    const n = readFileSync("infra/produccion/nginx-produccion.conf", "utf8");
    if (!/error_page 502 503 504 \/mantenimiento\.html;/.test(n) || !/if \(-f \/var\/lib\/tolatino\/mantenimiento\/activo\) \{ set \$tolatino_mant 1; \}/.test(n)) falla(G, "infra/produccion/nginx-produccion.conf", 0, "nginx no muestra la página de mantenimiento (app caída y ventana programada)");
    if (!/\^\/\(api\|admin\|entrar/.test(n)) falla(G, "infra/produccion/nginx-produccion.conf", 0, "la ventana no puede cortar la API (webhooks de Stripe, tiendas, pases) ni el Super Admin");
    if (!/install -m 0644 "\$REPO\/infra\/comun\/mantenimiento\/index\.html" \/var\/www\/mantenimiento\/index\.html/.test(readFileSync("infra/produccion/deploy.sh", "utf8"))) falla(G, "infra/produccion/deploy.sh", 0, "el despliegue no instala la página de mantenimiento");
  },

  /* 9m · direccionSinTerceros (decisión AC): las direcciones, el mapa y «Cómo llegar» son nuestros. Ningún archivo de la app, los paquetes o los
     servicios llama a un geocodificador, autocompletado o teselas de terceros (Google Maps/Places, Mapbox, Here, Esri/ArcGIS, Nominatim o Photon
     públicos, OpenCage, LocationIQ, Geoapify, positionstack, tile.openstreetmap.org…): las direcciones salen de nuestra base (dir_sugerir,
     dir_inversa, dir_resolver) y las teselas de /teselas. «Cómo llegar» abre la app de mapas del TELÉFONO con un enlace (no es una llamada): esos
     enlaces viven SOLO en lib/como-llegar.ts. La ruta /api/direcciones y lib/direcciones.ts no hacen fetch. La carga (infra/direcciones/generar.sh)
     baja datos públicos (Censo y las fuentes de fuentes-oa.txt), nunca consulta un servicio por cada dirección.
     Al revés (alreves9m): un fetch a maps.googleapis.com, un enlace a google.com/maps fuera de lib/como-llegar.ts, una tesela de Mapbox, un fetch en
     lib/direcciones.ts. */
  direccionSinTerceros() {
    const G = "direccionSinTerceros", CL = "apps/web/lib/como-llegar.ts";
    const PROHIBIDOS = /maps\.googleapis\.com|maps\.google\.com|google\.com\/maps|maps\.gstatic\.com|places\.googleapis|api\.mapbox\.com|mapbox-gl|tiles\.mapbox|\bmapbox\.com|api\.here\.com|hereapi\.com|geocode\.search\.hereapi|arcgisonline\.com|arcgis\.com\/arcgis\/rest|geocode\.arcgis|nominatim\.openstreetmap\.org|photon\.komoot\.io|api\.opencagedata\.com|us1\.locationiq\.com|api\.geoapify\.com|api\.positionstack\.com|tile\.openstreetmap\.org|maps\.apple\.com\/geocode/;
    for (const f of archivos) {
      if (!/^(apps|packages|services)\//.test(f) || !/\.(tsx?|jsx?|mjs|cjs)$/.test(f) || /node_modules|\/\.next\//.test(f) || f === CL) continue;
      if (/^apps\/mobile\/(ios|android)\//.test(f)) continue;
      const t = sinComent(f);
      t.split("\n").forEach((l, i) => { if (PROHIBIDOS.test(l)) falla(G, f, i + 1, "un servicio de mapas o direcciones de terceros: las direcciones salen de nuestra base y «Cómo llegar» solo con lib/como-llegar.ts"); });
      if (/\b(maps:\/\/|geo:[0-9$])/.test(t)) falla(G, f, 0, "un enlace a la app de mapas fuera de lib/como-llegar.ts (abrirComoLlegar / urlComoLlegar)");
    }
    if (!existsSync(CL)) return falla(G, CL, 0, "falta lib/como-llegar.ts");
    const cl = sinComent(CL);
    if (!/export function abrirComoLlegar/.test(cl) || !/maps:\/\/\?daddr=/.test(cl) || !/geo:\$\{d\.lat\},\$\{d\.lng\}/.test(cl)) falla(G, CL, 0, "«Cómo llegar» abre la app de mapas del teléfono (maps:// en iPhone, geo: en Android)");
    if (/\bfetch\(/.test(cl)) falla(G, CL, 0, "«Cómo llegar» es un enlace: nunca una llamada");
    for (const f of ["apps/web/lib/direcciones.ts", "apps/web/app/api/direcciones/route.ts", "apps/web/app/_dir/DireccionCampo.tsx", "apps/web/app/_dir/MapaPin.tsx", "apps/web/app/_dir/MiniMapa.tsx"]) {
      if (!existsSync(f)) { falla(G, f, 0, "falta"); continue; }
      const t = sinComent(f);
      if (/\bfetch\(\s*["'`]https?:/.test(t)) falla(G, f, 0, "una llamada a otro servidor desde las direcciones o el mapa");
      if (/DireccionCampo/.test(f) && !/fetch\(`\/api\/direcciones\?/.test(t)) falla(G, f, 0, "las sugerencias salen de /api/direcciones (nuestra base)");
      if (/(MapaPin|MiniMapa)/.test(f) && !/\bteselas\(/.test(t)) falla(G, f, 0, "el mapa se pinta con las teselas propias (lib/mapa-geo.ts teselas)");
    }
    const lib = sinComent("apps/web/lib/direcciones.ts");
    if (!/from dir_sugerir\(/.test(lib) || !/from dir_inversa\(/.test(lib) || !/from dir_resolver\(/.test(lib)) falla(G, "apps/web/lib/direcciones.ts", 0, "autocompletar, inversa y el punto final salen de las funciones de la base (dir_sugerir, dir_inversa, dir_resolver)");
    const gen = readFileSync("infra/direcciones/generar.sh", "utf8");
    if (!/BASE="\$\{DIRECCIONES_ESPEJO:-https:\/\/www2\.census\.gov\/geo\/tiger\}"/.test(gen) || /googleapis|mapbox|hereapi|nominatim\.openstreetmap|photon\.komoot/.test(gen)) falla(G, "infra/direcciones/generar.sh", 0, "la carga baja datos públicos del Censo (y las fuentes de fuentes-oa.txt): nunca un servicio de geocodificación");
  },

  /* 9m · autocompletarRapido (decisión AC: ≤ 100 ms mientras se escribe, a escala nacional). Lo que lo hace rápido no se puede perder sin que el build
     se entere: los índices por PREFIJO (text_pattern_ops) y de trigramas de geo_names, la búsqueda acotada (un CTE materializado con límite y el
     número de sugerencias recortado), el tope de tiempo de la consulta (statement_timeout ≤ 300 ms), la espera de la pantalla (≥ 100 ms sin teclas)
     y que la respuesta vieja se cancele, y la MEDIDA a escala nacional con su presupuesto de 100 ms (scripts/carga/direcciones-1m.mjs, en la
     carga) y la de la tubería (pruebas/infra/direcciones.test.sh). Al revés (alreves9m): quitar el índice por prefijo, el límite del CTE, el tope de
     tiempo, la espera de la pantalla, o subir el presupuesto. */
  autocompletarRapido() {
    const G = "autocompletarRapido";
    const mig = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8")).join("\n");
    if (!/create index if not exists \w+ on geo_names \(norm text_pattern_ops\)/.test(mig) || !/on geo_names \(state, norm text_pattern_ops\)/.test(mig)) falla(G, "packages/db/migrations", 0, "geo_names sin sus índices por prefijo (norm text_pattern_ops y state, norm)");
    if (!/on geo_names using gin \(norm gin_trgm_ops\)/.test(mig)) falla(G, "packages/db/migrations", 0, "geo_names sin su índice de trigramas (lo mal escrito)");
    if (!/on geo_points \(norm, zip, num_i\)/.test(mig) || !/on geo_streets \(norm, zip_l, zip_r\)/.test(mig)) falla(G, "packages/db/migrations", 0, "la casa y el tramo se buscan por índice (geo_points norm/zip/num_i, geo_streets norm/zip)");
    const fn = ultimaFn("dir_sugerir");
    if (!fn) return falla(G, "packages/db/migrations", 0, "falta dir_sugerir");
    if (!/with m as materialized \(/.test(fn) || !/where g\.norm like s \|\| '%'/.test(fn) || !/limit 4000\)/.test(fn)) falla(G, "dir_sugerir", 0, "la búsqueda por prefijo tiene que ser acotada (CTE materializado con límite) antes de ordenar por cercanía");
    if (!/cuantos := greatest\(1, least\(coalesce\(cuantos, 6\), 10\)\)/.test(fn)) falla(G, "dir_sugerir", 0, "el número de sugerencias se recorta (1–10)");
    const lib = sinComent("apps/web/lib/direcciones.ts"), tope = /export const TOPE_MS = (\d+);/.exec(lib);
    if (!tope || Number(tope[1]) > 300 || !/set local statement_timeout = \$\{TOPE_MS\}/.test(lib)) falla(G, "apps/web/lib/direcciones.ts", 0, "la consulta de autocompletar lleva su tope de tiempo (≤ 300 ms)");
    const dc = sinComent("apps/web/app/_dir/DireccionCampo.tsx"), espera = /\}, (\d+)\);\n  \};\n  const elegir/.exec(dc);
    if (!espera || Number(espera[1]) < 100 || !/ctl\.current\?\.abort\(\); const c = new AbortController\(\)/.test(dc)) falla(G, "apps/web/app/_dir/DireccionCampo.tsx", 0, "la pantalla espera ≥ 100 ms sin teclas y cancela la pregunta anterior");
    const c = existsSync("scripts/carga/direcciones-1m.mjs") ? readFileSync("scripts/carga/direcciones-1m.mjs", "utf8") : "";
    if (!/NOMBRES = n\(6_000_000\)/.test(c) || !/presupuesto: 100/.test(c) || /presupuesto: (?!100\b)\d+/.test(c)) falla(G, "scripts/carga/direcciones-1m.mjs", 0, "la medida a escala nacional (6 M de nombres) con presupuesto de 100 ms");
    if (!/"direcciones"\]/.test(readFileSync("scripts/carga/correr.mjs", "utf8"))) falla(G, "scripts/carga/correr.mjs", 0, "la carga corre direcciones-1m");
    const t = existsSync("pruebas/infra/direcciones.test.sh") ? readFileSync("pruebas/infra/direcciones.test.sh", "utf8") : "";
    if (!/presupuesto 100 ms/.test(t) || !/-le 100 \]/.test(t)) falla(G, "pruebas/infra/direcciones.test.sh", 0, "la prueba de la tubería mide la velocidad (≤ 100 ms)");
  },

  /* 9m · mensajesEnVivo (L385, L599): Mensajes en vivo con SSE propio, sin preguntar cada N segundos. Las pantallas de conversación (Mi cuenta,
     Comunidad y el panel) escuchan /api/vivo (useMensajesVivo / RefrescoVivo) y no tienen setInterval; la ruta pide sesión, el negocio pide la parte
     «Mensajes» del panel y el aviso NUNCA lleva el texto (solo de qué conversación es); la base avisa (NOTIFY 'mensajes') en cada mensaje nuevo de
     chat_messages y dm_messages sin el cuerpo; el cliente se vuelve a conectar con espera creciente (nunca un intervalo fijo).
     Al revés (alreves9m): volver al setInterval, mandar el texto en el aviso, quitar el disparador, la ruta sin sesión o sin acceso al negocio. */
  mensajesEnVivo() {
    const G = "mensajesEnVivo";
    const P = { "apps/web/app/(app)/cuenta/mensajes/[negocio]/Chat.tsx": /useMensajesVivo\(/, "apps/web/app/(app)/comunidad/mensajes/[id]/Chat.tsx": /useMensajesVivo\(/,
      "apps/web/app/(app)/cuenta/mensajes/Mensajes.tsx": /<RefrescoVivo k="chat" \/>/, "apps/web/app/(app)/comunidad/mensajes/Mensajes.tsx": /<RefrescoVivo k="dm" \/>/,
      "apps/web/app/panel/Panel.tsx": /<RefrescoVivo negocio=\{d\.id\} k="chat" \/>/ };
    for (const [f, re] of Object.entries(P)) {
      if (!existsSync(f)) { falla(G, f, 0, "falta"); continue; }
      const t = sinComent(f);
      if (!re.test(t)) falla(G, f, 0, "la conversación se pone al día en vivo (/api/vivo), no preguntando");
      if (/Chat\.tsx$|Mensajes\.tsx$/.test(f) && /setInterval\(/.test(t)) falla(G, f, 0, "pregunta cada N segundos (setInterval): Mensajes es en vivo");
    }
    for (const f of ["apps/web/app/panel/MensajesPanel.tsx", "apps/web/lib/vivo-cliente.ts", "apps/web/app/_vivo/RefrescoVivo.tsx"]) if (existsSync(f) && /setInterval\(/.test(sinComent(f))) falla(G, f, 0, "un intervalo fijo en Mensajes");
    // El panel preguntaba cada 5 s con la sección Mensajes abierta (router.refresh en un setInterval): ningún intervalo que refresque Mensajes.
    if (/ruta\.sec !== "msg"[\s\S]{0,200}setInterval\(|setInterval\([^)]*router\.refresh/.test(sinComent("apps/web/app/panel/Panel.tsx"))) falla(G, "apps/web/app/panel/Panel.tsx", 0, "el panel refresca Mensajes con un intervalo fijo: es en vivo (RefrescoVivo)");
    const vc = existsSync("apps/web/lib/vivo-cliente.ts") ? sinComent("apps/web/lib/vivo-cliente.ts") : "";
    if (!/new EventSource\(`\/api\/vivo/.test(vc) || !/espera = Math\.min\(espera \* 2, 30000\)/.test(vc)) falla(G, "apps/web/lib/vivo-cliente.ts", 0, "EventSource a /api/vivo con espera creciente al reconectar");
    const R = "apps/web/app/api/vivo/route.ts", r = existsSync(R) ? sinComent(R) : "";
    if (!/const u = await yo\(\);\n  if \(!u\) return NO\(\);/.test(r) || !/accesoPanel\(negocio, "msg"\)/.test(r)) falla(G, R, 0, "la ruta en vivo pide sesión y, para un negocio, la parte «Mensajes» de su panel");
    if (/\bbody\b|last_text|\btexto\b|\bselect\b|\bdb\(\)/i.test(r)) falla(G, R, 0, "el aviso en vivo no lleva texto ni consulta mensajes: solo de qué conversación es");
    const L = "apps/web/lib/mensajes-vivo.ts", l = existsSync(L) ? sinComent(L) : "";
    if (!/c\.query\("listen mensajes"\)/.test(l)) falla(G, L, 0, "una conexión por proceso con LISTEN mensajes");
    for (const [fn, tabla] of [["chat_messages_vivo", "chat_messages"], ["dm_messages_vivo", "dm_messages"]]) {
      const b = ultimaFn(fn);
      if (!b || !/pg_notify\('mensajes'/.test(b)) { falla(G, "packages/db/migrations", 0, `${tabla}: falta el aviso en vivo (${fn} con NOTIFY 'mensajes')`); continue; }
      if (/new\.body|'body'/.test(b)) falla(G, "packages/db/migrations", 0, `${fn}: el aviso en vivo lleva el texto del mensaje`);
    }
    const mig = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8")).join("\n");
    if (!/create trigger chat_messages_vivo after insert or update of hidden_at on chat_messages/.test(mig) || !/create trigger dm_messages_vivo after insert or update of hidden_at on dm_messages/.test(mig)) falla(G, "packages/db/migrations", 0, "los disparadores del aviso en vivo (chat_messages y dm_messages)");
  },

  /* 9m · mensajesTapados (L1063): Mensajes tapa tarjetas y seguro social como Soporte: lib/mensajes.ts pasa todo texto por tapar() ANTES de guardarlo
     (y antes de mirar si trae un teléfono: una tarjeta no es un teléfono) y la base rechaza el que se salte eso (chat_messages_sin_secretos).
     Al revés (alreves9m): quitar tapar() de limpiar() o el disparador. */
  mensajesTapados() {
    const G = "mensajesTapados", F = "apps/web/lib/mensajes.ts", t = sinComent(F);
    if (!/import \{ tapar \} from "\.\/compa\/tapar";/.test(t) || !/function limpiar\(texto: unknown\)[\s\S]{0,140}?\{\n  const tp = tapar\(String\(texto \?\? ""\)\);/.test(t)) falla(G, F, 0, "limpiar() tapa con tapar() antes de guardar");
    const b = ultimaFn("chat_messages_sin_secretos");
    if (!b || !/texto_con_secretos\(new\.body\)/.test(b)) falla(G, "packages/db/migrations", 0, "la base rechaza tarjetas y seguro social en chat_messages");
    const mig = readdirSync("packages/db/migrations").filter((x) => x.endsWith(".sql")).sort().map((x) => readFileSync(`packages/db/migrations/${x}`, "utf8")).join("\n");
    if (!/create trigger chat_messages_sin_secretos before insert or update of body on chat_messages/.test(mig)) falla(G, "packages/db/migrations", 0, "falta el disparador chat_messages_sin_secretos");
  },

  /* 9n · entregaConPrueba (fase9 §6 #21): una entrega con prueba exige una foto de ESTE pedido subida por ESTE repartidor o el código válido del
     cliente, y lo decide el servidor (y otra vez la base):
     - 0144: el trigger operations_prueba no deja cerrar («done») un delivery con repartidor de un negocio que pide prueba sin una fila en delivery_proofs;
       delivery_proofs es solo de inserción; los códigos nacen solos (operations_codigos) con codigo4() de azar fuerte.
     - lib/repartidor.ts pasoRepartidor: la foto se busca con owner_kind 'delivery', owner_id = la operación y uploaded_by = el repartidor; el código se
       compara con delivery_codes.cliente con un tope de intentos de Configuración (entrega_codigo_intentos) y suma los fallos; sin prueba y con el
       negocio pidiéndola, no avanza. Nunca devuelve los códigos (EntregaRep no los lleva).
     - Quien marca «Entregado» en el panel con repartidor y prueba pedida deja su prueba «negocio» (lib/pedidos.ts cambiarPaso). */
  entregaConPrueba() {
    const G = "entregaConPrueba", M = "packages/db/migrations/0144_negocio.sql", R = "apps/web/lib/repartidor.ts", P = "apps/web/lib/pedidos.ts";
    if (!existsSync(M)) return falla(G, M, 0, "falta la migración de la prueba de entrega");
    const m = readFileSync(M, "utf8");
    const tr = /create or replace function operations_prueba\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "";
    if (!/new\.driver_id is not null/.test(tr) || !/s\.proof/.test(tr) || !/not exists \(select 1 from delivery_proofs p where p\.operation_id = new\.id\)/.test(tr) || !/raise exception/.test(tr)) falla(G, M, 0, "la base no exige la prueba al cerrar un delivery con repartidor de un negocio que la pide (operations_prueba)");
    if (!/create trigger operations_prueba before update of status on operations/.test(m)) falla(G, M, 0, "falta el trigger operations_prueba");
    if (!/create trigger delivery_proofs_no_cambia before update or delete on delivery_proofs/.test(m)) falla(G, M, 0, "delivery_proofs es solo de inserción");
    if (!/check \(\(kind = 'foto'\) = \(media_id is not null\)\)/.test(m)) falla(G, M, 0, "una prueba «foto» lleva su foto y solo ella");
    if (!/gen_random_uuid\(\)/.test(/create or replace function codigo4\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(m)?.[1] ?? "")) falla(G, M, 0, "los códigos salen de azar fuerte (gen_random_uuid), no de random()");
    if (!existsSync(R)) return falla(G, R, 0, "falta lib/repartidor.ts");
    const r = sinComent(R), ps = cuerpoFn(r, "pasoRepartidor");
    if (!/owner_kind = 'delivery' and owner_id = \$2 and uploaded_by = \$3/.test(ps)) falla(G, R, 0, "la foto de la prueba es de ESTE pedido y la subió ESTE repartidor");
    if (!/codigo !== k\.cliente/.test(ps) || !/intentos = intentos \+ 1/.test(ps) || !/if \(!k \|\| k\.n >= maxIntentos\) return no\(/.test(ps) || !/valor\("entrega_codigo_intentos"\)/.test(ps)) falla(G, R, 0, "el código del cliente se compara en el servidor, cuenta los fallos y tiene tope de Configuración");
    if (!/if \(o\.pide_prueba && !probada\) return no\(/.test(ps)) falla(G, R, 0, "sin prueba, con el negocio pidiéndola, «Entregado» no avanza");
    const tipo = /export type EntregaRep = \{([\s\S]*?)\n\};/.exec(r)?.[1] ?? "";
    if (/\b(cliente|recogida)Codigo\b|codigoCliente|\bcodigo: string/.test(tipo) || /dc\.(cliente|recogida)\b/.test(cuerpoFn(r, "misEntregas"))) falla(G, R, 0, "el repartidor nunca recibe los códigos (EntregaRep / misEntregas)");
    if (existsSync(P) && !/insert into delivery_proofs \(operation_id, city_id, kind, actor_id\)[\s\S]{0,120}'negocio'/.test(sinComent(P))) falla(G, P, 0, "el panel que marca «Entregado» con repartidor deja su prueba «negocio» con su nombre");
  },

  /* 9n · sinTelefonoAlRepartidor (§6 #20, L368): el repartidor nunca recibe el número del cliente (ni para llamar: «Llamar» es al negocio; al cliente
     se le escribe dentro de la app). Lo que lee el Repartidor (lib/repartidor.ts, lib/repartidor-ofertas.ts, lib/chofer.ts y app/repartidor/**) no
     selecciona el teléfono de la cuenta del cliente ni lo pasa; los mensajes libres no llevan teléfonos ni enlaces. */
  sinTelefonoAlRepartidor() {
    const G = "sinTelefonoAlRepartidor";
    const F = codigo.filter((f) => /^apps\/web\/(lib\/(repartidor|repartidor-ofertas|chofer)\.ts|app\/repartidor\/.*\.tsx?)$/.test(f));
    if (!F.length) return;
    for (const f of F) {
      const t = sinComent(f);
      if (/telCliente|phoneCliente|clienteTel/.test(t)) falla(G, f, 0, "el repartidor no recibe el teléfono del cliente (§6 #20): escríbele dentro de la app o llama al negocio");
      for (const q of t.match(/`[^`]*`/g) ?? []) if (/join users u\b/.test(q) && /\bphone\b/.test(q.replace(/\b[bd]\.phone\b/g, ""))) falla(G, f, 0, "una consulta del Repartidor con la cuenta del cliente trae un teléfono");
      if (/href = `tel:\$\{(?!x\.negocio\.tel)/.test(t)) falla(G, f, 0, "el único «Llamar» del Repartidor es al negocio");
    }
    const o = "apps/web/lib/repartidor-ofertas.ts";
    if (existsSync(o) && !/\(s\.match\(\/\\d\/g\) \?\? \[\]\)\.length >= 7 \|\|/.test(readFileSync(o, "utf8"))) falla(G, o, 0, "el mensaje libre del repartidor no deja pasar un número de teléfono");
  },

  /* 9n · diaEspecialActivo: los días especiales (feriados, vacaciones, días propios, temporada) no se borran: «Quitar» deja status 'removed'. Toda
     lectura de special_hours en la app filtra los activos, y el estado abierto/cerrado de la base (la última negocio_abierto) también. Si no, un
     feriado quitado seguiría cerrando la página. */
  diaEspecialActivo() {
    const G = "diaEspecialActivo";
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f)) continue;
      for (const q of sinComent(f).match(/`[^`]*`/g) ?? []) if (/\bfrom special_hours\b/.test(q) && !/status = 'active'/.test(q)) falla(G, f, 0, "lee special_hours sin filtrar los quitados (status = 'active')");
    }
    const n = ultimaFn("negocio_abierto");
    if (n && (!/s\.status = 'active'/.test(n) || !/kind = 'season'/.test(n))) falla(G, "packages/db/migrations", 0, "negocio_abierto no mira los días especiales activos ni la temporada");
    for (const x of readdirSync("packages/db/migrations").filter((y) => y.endsWith(".sql"))) if (/delete from special_hours/i.test(readFileSync(`packages/db/migrations/${x}`, "utf8"))) falla(G, `packages/db/migrations/${x}`, 0, "special_hours no se borra (status)");
  },

};


const lista = solo ? { [solo]: guardianes[solo] } : guardianes;
for (const [n, g] of Object.entries(lista)) {
  if (!g) { console.error(`guardián desconocido: ${n}`); process.exit(2); }
  g();
}
for (const a of avisos) console.warn(`⚠ ${a}`);
if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) de guardianes:\n` + fallos.map((x) => "  " + x).join("\n") + "\n");
  process.exit(1);
}
console.log(`✓ guardianes: ${Object.keys(lista).join(", ")} — sin fallos (${archivos.length} archivos revisados)`);
