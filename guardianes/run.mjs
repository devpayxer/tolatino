#!/usr/bin/env node
/* Guardianes del build (decisión N). Cada uno vigila una CLASE de problema y rompe el build si la encuentra.
   Regla de oro: un guardián se prueba al revés (se inyecta el defecto y debe fallar) antes de confiar en él.
   Uso: node guardianes/run.mjs   (corre todos)   ·   node guardianes/run.mjs --solo secretos */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const solo = process.argv.includes("--solo") ? process.argv[process.argv.indexOf("--solo") + 1] : null;
import { existsSync } from "node:fs";
// Incluye los archivos nuevos que todavía no están en git (5 nov, 1l: corrían limpios en local y la CI los cazó).
const archivos = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter((f) => f && existsSync(f));
// .github/ también: un flujo de CI podría apuntar la semilla o un secreto a producción (5 nov: no se revisaba).
const codigo = archivos.filter((f) => /^(apps|packages|services|guardianes|infra|scripts|\.github)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs|css|sh|ya?ml|json)$/.test(f));
const fallos = [];
const falla = (g, f, linea, msg) => fallos.push(`[${g}] ${f}${linea ? ":" + linea : ""} — ${msg}`);

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
      if (/(--semilla-pruebas|infra\/pruebas\/semilla)/.test(t) && !/^(infra\/pruebas\/|packages\/db\/migrar\.sh$|scripts\/semilla\/|guardianes\/|\.github\/workflows\/ci\.yml$)/.test(f))
        falla("semilla", f, 0, "la semilla de pruebas se llama desde fuera del sandbox");
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
    const apis = archivos.filter((f) => /^apps\/web\/app\/.*route\.ts$/.test(f)).map((f) => f.replace(/^apps\/web\/app/, "").replace(/\/route\.ts$/, ""));
    for (const f of codigo) {
      if (!/^apps\/web\/(app|lib)\/.*\.tsx?$/.test(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const m of l.matchAll(/(?:\.push|\.replace|redirect|href[=:]\s*\{?)\s*\(?\s*[`"'](\/[^`"'?#\s]*)/g)) {
          let r = m[1].split("${")[0];
          if (m[0].includes("`") && m[1].includes("${")) r = r.replace(/\/[^/]*$/, "/x"); // `/c/${slug}` → /c/x
          // Archivos de apps/web/public (fuentes, logos): existen como archivo o, si la ruta lleva ${…}, su carpeta.
          if (existsSync("apps/web/public" + r) || (m[1].includes("${") && existsSync("apps/web/public" + r.replace(/\/[^/]*$/, "")) && r.replace(/\/[^/]*$/, "") !== "")) continue;
          if (!r || r === "/" ? false : r.startsWith("/api/") ? !apis.some((a) => r.startsWith(a)) : !paginas.some((re) => re.test(r.replace(/\/$/, ""))))
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
  promesaSms() {
    const ANOTADOS = new Set(["apps/web/app/(app)/reserva/[num]/Estado.tsx", "apps/web/app/(app)/CiudadSelector.tsx", "apps/web/app/(app)/n/[id]/reservar/Detalles.tsx",
      "apps/web/app/panel/Equipo.tsx", "apps/web/app/panel/acciones-equipo.ts", "apps/web/lib/textos.ts", "apps/web/app/panel/Menu.tsx", "apps/web/app/(app)/n/[id]/apartar/Apartar.tsx"]);
    for (const f of codigo) {
      if (!/^apps\/web\/.*\.tsx?$/.test(f) || ANOTADOS.has(f)) continue;
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        if (/["'`][^"'`]*(por SMS|by SMS|We will text|we text you|We text you|te llega un SMS|Le llegó por SMS|Sent by text)/i.test(l) && !/c[oó]digo|code/i.test(l)) falla("promesaSms", f, i + 1, "promete un SMS que todavía no sale; di dónde lo ve en To'Latino o anótalo en LAUNCH-CHECKLIST");
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
  },

  /* 4j. Privacidad de Salud (fase4-salud-pro.md §3): (1) ningún aviso de Doctores (sal_*, biz_sal_*) lleva el nombre del
     consultorio ni del servicio: en la pantalla bloqueada ya diría demasiado; (2) la nota cifrada (op_private.note_enc) solo
     se escribe o se lee donde toca (crear la cita, el detalle del panel, el borrado a los 30 días): nunca en avisos, correos,
     logs ni el Super Admin. */
  privacidadSalud() {
    for (const f of readdirSync("packages/db/migrations").map((x) => `packages/db/migrations/${x}`)) {
      readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\('(sal_|biz_sal_)[a-z_]+'/.test(l) && /\{(negocio|servicio|svc|cliente)\}/.test(l)) falla("privacidadSalud", f, i + 1, "un aviso de Salud no lleva {negocio}, {servicio} ni {cliente}: tiene que ser neutro"); });
    }
    const PERMITIDOS = new Set(["apps/web/lib/citas-salud.ts", "apps/web/lib/citas-panel.ts", "apps/web/lib/citas-flujo.ts", "apps/web/lib/citas-pro.ts", "apps/web/lib/cifrado.ts", "apps/web/lib/viajes.ts", "apps/web/lib/envios.ts", "apps/web/lib/ninos-privado.ts", "apps/web/lib/visitas-inm.ts"]); // 4ie: la dirección cifrada de la prueba en casa (crear y ver confirmada) · crear · ver en el panel · borrar a los 30 d · 4y-2: el destinatario de la caja (crear en viajes, ver en envios)
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
    if (!/o\.status not in \('pending', 'change_proposed'\) and o\.kind not in \('market_order', 'hold'\)/.test(c)) falla("capturaMercado", C, 1, "repararPagos no puede capturar completo lo retenido de un pedido del mercado ni de un envío de la tienda");
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
    const pref = [...h.matchAll(/startsWith\("([A-Z])-"\)/g)].map((m) => m[1]);
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
    for (const x of migs) { const t = readFileSync(`${dir}/${x}`, "utf8"), c = [...t.matchAll(/add constraint queue_items_queue_check check \(([^;]+)\);/g)].pop(); if (c) { check = c[1]; donde = x; } }
    if (!check) return falla("colasEnLaBase", dir, 0, "ninguna migración define queue_items_queue_check");
    const base = new Set([...check.matchAll(/'(\w+)'/g)].map((x) => x[1]));
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
  },

  /* Barrido central (0078). Los vencimientos solo corrían al abrir una página: una retención podía quedarse sin liberar si
     nadie miraba. Todo barrido exportado (vencer*, barrer*, escalar*) de lib/ tiene que estar en lib/barrido.ts. */
  barridoCompleto() {
    const B = "apps/web/lib/barrido.ts";
    if (!existsSync(B)) return falla("barridoCompleto", B, 0, "falta el barrido central");
    const t = readFileSync(B, "utf8");
    for (const f of codigo) {
      if (!/^apps\/web\/lib\/[^/]+\.ts$/.test(f) || f === B) continue;
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
     botones de verdad; el resto va al bloque de accesibilidad (LAUNCH-CHECKLIST). Trinquete: no puede subir. */
  panelClicMudo() {
    const TOPE = 18, f = "packages/ui/src/panel/Bloques.tsx";
    if (!existsSync(f)) return;
    const n = readFileSync(f, "utf8").split("\n").reduce((k, l) => k + [...l.matchAll(/role="button"(?![^>]*tabIndex)/g)].length, 0);
    if (n > TOPE) falla("panelClicMudo", f, 1, `${n} «role=button» sin foco en los bloques del panel (tope ${TOPE}): usa <button type="button">`);
  },

  /* 3o-bis. Clics mudos del sistema de diseño portado: un onClick en un <div>/<span> sin rol no lo usa ni el teclado ni un
     lector de pantalla (6 nov, 3b: día, hora, persona, opción y extra del Booking). Los de reserva y Chip ya se corrigieron en
     scripts/portar-sistema.mjs; los demás (fondos de hojas, cruces, filas) van en el bloque de accesibilidad del sistema
     (LAUNCH-CHECKLIST). Trinquete: el número no puede subir; cuando baja, se baja el tope aquí. */
  sistemaClicMudo() {
    const TOPE = 193;
    let n = 0;
    const recorrer = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) recorrer(p); else if (p.endsWith(".js")) {
      const L = readFileSync(p, "utf8").split("\n");
      L.forEach((l, i) => { if (/^\s*onClick:/.test(l) && !/role:|\.\.\.btn\(|\.\.\.\(on[A-Z]\w* \? \{ role/.test(L.slice(i, i + 3).join("\n"))) n++; });
    } } };
    if (existsSync("packages/ui/src/ds")) recorrer("packages/ui/src/ds");
    if (n > TOPE) falla("sistemaClicMudo", "packages/ui/src/ds", 1, `${n} clics sin rol en el sistema portado (tope ${TOPE}): dale rol, foco y teclado en scripts/portar-sistema.mjs`);
    else if (n < TOPE) console.log(`  (sistemaClicMudo: bajó a ${n}; baja el TOPE en guardianes/run.mjs)`);
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
    if (!/export const FILA_VIVA_MIN = 60;/.test(t)) falla("filaNoFalsa", C, 0, "la fila «ahora» vale 60 minutos (FILA_VIVA_MIN = 60)");
    if (!/if \(f\.viva\) return f\.min \? E2\(`Fila ahora/.test(t) || !/if \(f\.viva\) return E2\(`Ahora · lo puso/.test(t) || !/f\.viva \? \(es \? "FILA AHORA"/.test(t)) falla("filaNoFalsa", C, 0, "«Fila ahora» solo dentro de if (f.viva)");
    if (existsSync(L) && !/s\.line_at > now\(\) - make_interval\(mins => \$\{FILA_VIVA_MIN\}\)/.test(readFileSync(L, "utf8"))) falla("filaNoFalsa", L, 0, "«viva» se calcula en el servidor con FILA_VIVA_MIN");
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
  },
  /* 4ib. La dirección exacta de una propiedad (addr_line, geom) solo la lee lib/inmuebles.ts (el panel del negocio) y, en 4ie, lib/visitas-inm*.ts
     (al confirmar la visita). Ninguna consulta pública la ve; los cuartos y «solo la zona» muestran la zona (§3, §6 #15). */
  direccionAlConfirmar() {
    const G = "direccionAlConfirmar", OK = /^apps\/web\/lib\/(inmuebles|visitas-inm)\.ts$/; // 4ie: solo lib/visitas-inm.ts (no su -comun, que va al navegador)
    for (const f of codigo) {
      if (!/^(apps|services)\//.test(f) || OK.test(f)) continue;
      const s = readFileSync(f, "utf8");
      s.split("\n").forEach((l, i) => { if (/\baddr_line\b/.test(l)) falla(G, f, i + 1, "addr_line de una propiedad solo se lee en lib/inmuebles.ts (y al confirmar la visita, lib/visitas-inm*.ts)"); });
      if (/property_listings/.test(s) && /\b(pl|property_listings)\.geom\b|\bgeom\b[^\n]*from property_listings|st_[xy]\(\s*(pl\.)?geom/.test(s)) falla(G, f, 0, "la ubicación exacta (geom) de una propiedad no se lee fuera de lib/inmuebles.ts");
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
    if (!/where key = '\$\{TOPE_KEY\}'/.test(a) || !/const TOPE_KEY = "dealer_doc_fee_cap_cents"/.test(a)) falla(G, A, 0, "el tope del cargo sale de platform_config");
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

  idioma() {
    for (const f of codigo) {
      if (!/layout\.tsx$/.test(f)) continue;
      if (/lang=["']en/.test(readFileSync(f, "utf8"))) falla("idioma", f, 0, "el idioma por defecto es es-US");
    }
  },
};

const lista = solo ? { [solo]: guardianes[solo] } : guardianes;
for (const [n, g] of Object.entries(lista)) {
  if (!g) { console.error(`guardián desconocido: ${n}`); process.exit(2); }
  g();
}
if (fallos.length) {
  console.error(`\n✗ ${fallos.length} fallo(s) de guardianes:\n` + fallos.map((x) => "  " + x).join("\n") + "\n");
  process.exit(1);
}
console.log(`✓ guardianes: ${Object.keys(lista).join(", ")} — sin fallos (${archivos.length} archivos revisados)`);
