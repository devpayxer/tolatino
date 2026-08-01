// GITHUB_PAGES=true → serve under /tolatino (GitHub Pages live preview).
// Vercel (production target) serves from the root, no basePath.
import { readFileSync } from 'node:fs';

const onGitHubPages = process.env.GITHUB_PAGES === 'true';

// ── Qué base de datos se hornea en ESTE build ───────────────────────────────
// La app es export estático: los NEXT_PUBLIC_* se INCRUSTAN al compilar. Sin
// esto, Vercel construía CADA rama con `.env.production` → una URL de vista
// previa escribía en la base REAL, así que "probar antes de publicar" habría
// creado negocios y pedidos de mentira en producción.
//
// `VERCEL_ENV` lo pone Vercel solo: "production" para la rama de producción,
// "preview" para cualquier otra. No hay que configurar nada en el panel.
//   · production          → .env.production  (base real, limpia)
//   · preview / cualquier → .env.staging     (base de pruebas, con datos sembrados)
//
// En local, `TOLATINO_TARGET=staging pnpm build` fuerza pruebas a mano.
const target =
  process.env.TOLATINO_TARGET ??
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? 'staging' : 'production');

/** Lee un .env sencillo (KEY=valor, ignora comentarios y líneas vacías). */
function readEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return out;
  } catch {
    return null;
  }
}

// Para el build de producción no se toca nada: Next carga `.env.production` como
// siempre. Solo cuando el objetivo es staging se inyectan los valores a mano —
// así no dependemos de adivinar la precedencia entre archivos .env y variables
// del panel de Vercel (algo que ya nos mordió una vez; ver docs/ENVIRONMENTS.md §4.4).
const staging = target === 'staging' ? readEnvFile(new URL('./.env.staging', import.meta.url)) : null;
if (target === 'staging' && !staging) {
  throw new Error("next.config: objetivo staging pero falta apps/web/.env.staging");
}

const envOverride = staging
  ? Object.fromEntries(Object.entries(staging).filter(([k]) => k.startsWith('NEXT_PUBLIC_')))
  : {};
// Bandera visible para el código del navegador: la usan el aviso "SITIO DE
// PRUEBAS" y el bloqueo de indexación. Así un sitio de pruebas no puede pasar por
// el real ni aparecer en Google.
envOverride.NEXT_PUBLIC_TOLATINO_ENV = target;

console.log(
  `▸ To'Latino build → ${target.toUpperCase()}` +
    (staging ? ` (${envOverride.NEXT_PUBLIC_SUPABASE_URL})` : ' (.env.production)'),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → deployable as plain files.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: onGitHubPages ? '/tolatino' : '',
  // `env` incrusta estos valores en el bundle y gana sobre los archivos .env.
  env: envOverride,
};

export default nextConfig;
