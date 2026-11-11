const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B='http://localhost:3100'; const sql=(q)=>execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q}"`).toString().trim();
const api=(p,u,b)=>p.evaluate(async([u,b])=>(await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)})).json(),[u,b]);
const entrar=async(p,tel)=>{await p.goto(B+'/entrar'); sql('delete from otp_codes'); const a=await api(p,'/api/cuenta/codigo',{telefono:tel}); await api(p,'/api/cuenta/verificar',{telefono:tel,codigo:a.codigoPrueba});};
const t=(p,x)=>p.getByText(x,{exact:true}).last();
(async()=>{ const b=await chromium.launch(); const err=[];
 const p=await (await b.newContext({viewport:{width:393,height:852}})).newPage(); p.on('pageerror',e=>err.push(e.message)); await entrar(p,'5705550133');
 await p.goto(B+'/recuperar/sabor-dominicano'); await t(p,'Mandarme el código').click(); await p.locator('[data-modo-pruebas] b').waitFor();
 const cod=(await p.locator('[data-modo-pruebas] b').textContent()).trim(); await p.locator('input[placeholder="000000"]').fill(cod); await t(p,'Verificar').click(); await p.locator('text=Lo estamos revisando').first().waitFor();
 const a=await (await b.newContext({viewport:{width:1440,height:900}})).newPage(); a.on('pageerror',e=>err.push(e.message)); await entrar(a,'5705550199');
 await a.goto(B+'/admin/colas?cola=cambio'); await a.locator('text=/Reclamo · Sabor/').first().click(); await a.locator('text=EVIDENCIAS').waitFor();
 await t(a,'Aplicar cambio').click(); await a.locator('textarea').fill('Código correcto'); await t(a,'Aplicar').click(); await a.locator('text=Cambio aplicado. Ya es el dueño.').waitFor();
 console.log('audit:', sql("select before::text || ' -> ' || after::text from audit_entries where action='negocio.dueno.cambiar' order by at desc limit 1"));
 console.log('errores:', err.length?err:'ninguno'); await b.close(); })().catch(e=>{console.error('FALLO',e.message.split('\n').slice(0,3).join(' | ')); process.exit(1);});
