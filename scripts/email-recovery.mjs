#!/usr/bin/env node
// email-recovery.mjs — pone la plantilla de «elige una contraseña nueva» en
// español y con la marca, igual que las otras tres (código, confirmación,
// reautenticación).
//
// POR QUÉ EXISTE: ese correo era el ÚNICO que seguía con la plantilla por
// defecto de Supabase — en inglés, sin diseño, con un `<h2>` pelado. Quien lo
// recibiera vería un correo que no parece de To'Latino justo en el momento en
// que está intentando recuperar su cuenta, que es cuando más falta hace la
// confianza.
//
// USO:
//   SUPABASE_PROJECT_REF=<ref> node scripts/email-recovery.mjs          # aplica
//   SUPABASE_PROJECT_REF=<ref> node scripts/email-recovery.mjs --ver    # solo mira
//
// AUTH: SUPABASE_ACCESS_TOKEN (el mismo token personal que usa `sbsql.mjs`).
// TRANSPORTE: `curl`, porque el fetch de Node no respeta el proxy del sandbox.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('email-recovery: falta SUPABASE_ACCESS_TOKEN'); process.exit(2); }

let ref = process.env.SUPABASE_PROJECT_REF;
if (!ref) {
  const env = readFileSync(resolve(HERE, '../apps/web/.env.production'), 'utf8');
  ref = /NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z0-9]+)\./.exec(env)?.[1];
}
if (!ref) { console.error('email-recovery: no se pudo determinar el proyecto'); process.exit(2); }

const SUBJECT = 'Elige una contraseña nueva para To’Latino';

// Mismo esqueleto que la plantilla del código: fondo #F4F2F9, tarjeta blanca de
// 440px, logotipo en texto, y el bloque «In English» al pie. Los colores son los
// del sistema de diseño (ink #1E1B2E, primary #7B61FF, apagado #6E6A85).
const BODY = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F4F2F9;padding:32px 16px">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:20px;padding:30px 26px">
    <div style="font-size:22px;font-weight:800;letter-spacing:-.03em;color:#1E1B2E">To&rsquo;<span style="color:#7B61FF">Latino</span></div>
    <h1 style="font-size:20px;font-weight:800;color:#1E1B2E;margin:22px 0 8px">Elige una contrase&ntilde;a nueva</h1>
    <p style="font-size:14px;color:#6E6A85;line-height:1.6;margin:0 0 20px">Pulsa el bot&oacute;n y escribe la que quieras. El enlace vence en 1 hora y solo sirve una vez.</p>
    <a href="{{ .ConfirmationURL }}" style="display:block;background:#7B61FF;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;text-align:center;border-radius:14px;padding:15px 18px">Elegir mi contrase&ntilde;a</a>
    <p style="font-size:12px;color:#8A86A0;line-height:1.6;margin:16px 0 0">Si el bot&oacute;n no funciona, copia esta direcci&oacute;n en tu navegador:<br><span style="color:#6E6A85;word-break:break-all">{{ .ConfirmationURL }}</span></p>
    <p style="font-size:12.5px;color:#8A86A0;line-height:1.6;margin:20px 0 0">Si no lo pediste, ignora este correo: tu contrase&ntilde;a sigue igual. Y recuerda que para entrar a To&rsquo;Latino no hace falta contrase&ntilde;a &mdash; normalmente te mandamos un c&oacute;digo de 6 d&iacute;gitos.</p>
    <hr style="border:none;border-top:1px solid #E7E3F4;margin:22px 0 14px">
    <p style="font-size:12px;color:#8A86A0;line-height:1.6;margin:0"><strong style="color:#6E6A85">In English:</strong> tap the button above to choose a new To&rsquo;Latino password. The link expires in 1 hour and works once. If you didn&rsquo;t request it, ignore this email &mdash; your password is unchanged.</p>
  </div>
</div>`;

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const H = ['-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json'];

function api(method, body) {
  const args = ['-s', '-w', '\n%{http_code}', '-X', method, ...H];
  if (body) args.push('--data-binary', JSON.stringify(body));
  args.push(url);
  const out = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const txt = (out.stdout || '').trim();
  const i = txt.lastIndexOf('\n');
  return { code: Number(txt.slice(i + 1)), json: JSON.parse(txt.slice(0, i) || '{}') };
}

const antes = api('GET');
if (antes.code !== 200) { console.error('email-recovery: no se pudo leer la config', antes.code); process.exit(1); }

const ver = (j) => ({
  asunto: j.mailer_subjects_recovery,
  espanol: /contrase/i.test(j.mailer_subjects_recovery || ''),
  conMarca: /To&rsquo;<span/.test(j.mailer_templates_recovery_content || ''),
  largo: (j.mailer_templates_recovery_content || '').length,
});

console.log(`proyecto ${ref}`);
console.log('  antes  ·', JSON.stringify(ver(antes.json)));

if (process.argv.includes('--ver')) process.exit(0);

const r = api('PATCH', { mailer_subjects_recovery: SUBJECT, mailer_templates_recovery_content: BODY });
if (r.code !== 200) { console.error('email-recovery: PATCH fallo', r.code, JSON.stringify(r.json).slice(0, 300)); process.exit(1); }

const despues = api('GET');
console.log('  despues·', JSON.stringify(ver(despues.json)));
const ok = ver(despues.json).espanol && ver(despues.json).conMarca;
console.log(ok ? '  OK' : '  NO QUEDO APLICADO');
process.exit(ok ? 0 : 1);
