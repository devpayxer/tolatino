// Pone las plantillas de correo de Supabase a MANDAR EL CÓDIGO, no un enlace.
import { spawnSync } from 'node:child_process';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.argv[2];
if (!token || !ref) { console.error('uso: node plantillas.mjs <project-ref>'); process.exit(2); }

const CUERPO = (venceEs, venceEn) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F4F2F9;padding:32px 16px">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:20px;padding:30px 26px">
    <div style="font-size:22px;font-weight:800;letter-spacing:-.03em;color:#1E1B2E">To&rsquo;<span style="color:#7B61FF">Latino</span></div>
    <h1 style="font-size:20px;font-weight:800;color:#1E1B2E;margin:22px 0 8px">Tu c&oacute;digo de acceso</h1>
    <p style="font-size:14px;color:#6E6A85;line-height:1.6;margin:0 0 20px">Escr&iacute;belo en la pantalla donde lo pediste. Vence en ${venceEs}.</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:.3em;color:#1E1B2E;background:#F4F2F9;border-radius:14px;padding:18px 0 18px 18px;text-align:center">{{ .Token }}</div>
    <p style="font-size:12.5px;color:#8A86A0;line-height:1.6;margin:20px 0 0">Si no lo pediste, ignora este correo. Nadie puede entrar a tu cuenta sin este c&oacute;digo, y nunca te lo vamos a pedir por tel&eacute;fono ni por mensaje.</p>
    <hr style="border:none;border-top:1px solid #E7E3F4;margin:22px 0 14px">
    <p style="font-size:12px;color:#8A86A0;line-height:1.6;margin:0"><strong style="color:#6E6A85">In English:</strong> your To&rsquo;Latino sign-in code is above. Enter it on the screen where you requested it. It expires in ${venceEn}. If you didn&rsquo;t request it, ignore this email.</p>
  </div>
</div>`;

const cuerpo = CUERPO('1 hora', '1 hour');
const asunto = "{{ .Token }} es tu código de To'Latino";

const patch = {
  // Usuario NUEVO (el alta) — era la que mandaba el enlace.
  mailer_subjects_confirmation: asunto,
  mailer_templates_confirmation_content: cuerpo,
  // Usuario que YA existe (vuelve a entrar).
  mailer_subjects_magic_link: asunto,
  mailer_templates_magic_link_content: cuerpo,
  // Reautenticación: ya iba con código, se traduce y se le da el mismo aspecto.
  mailer_subjects_reauthentication: asunto,
  mailer_templates_reauthentication_content: cuerpo,
};

const res = spawnSync('curl', [
  '-sS', '-X', 'PATCH', `https://api.supabase.com/v1/projects/${ref}/config/auth`,
  '-H', `Authorization: Bearer ${token}`,
  '-H', 'Content-Type: application/json',
  '-d', JSON.stringify(patch),
  '-w', '\n__HTTP__%{http_code}',
], { encoding: 'utf8' });

const out = res.stdout || '';
const code = out.split('__HTTP__')[1]?.trim();
console.log(ref, '→ HTTP', code);
if (code !== '200') console.log(out.slice(0, 600));
