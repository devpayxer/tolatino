const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE='http://127.0.0.1:4173', REF='zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A,'utf8'));
function relay(req){return new Promise((res)=>{const a=['-s','-o','-','-w','\n%{http_code}','-X',req.method(),'--max-time','25'];const h=req.headers();for(const k of ['apikey','authorization','content-type','prefer','accept','accept-profile','content-profile','x-client-info','range'])if(h[k])a.push('-H',`${k}: ${h[k]}`);const b=req.postData();if(b!=null)a.push('--data-binary',b);a.push(req.url());execFile('curl',a,{encoding:'buffer',maxBuffer:64*1024*1024},(e,o)=>{o=o||Buffer.from('');const s=o.toString('latin1');const nl=s.lastIndexOf('\n');res({status:parseInt(s.slice(nl+1),10)||500,body:o.slice(0,Buffer.byteLength(s.slice(0,nl),'latin1'))});});});}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:390,height:900}});
  p.on('pageerror',()=>{});
  await p.route('**://*.supabase.co/**',async(r)=>{const {status,body}=await relay(r.request());const ct=r.request().url().includes('/storage/')?'image/png':'application/json';await r.fulfill({status,headers:{'content-type':ct,'access-control-allow-origin':'*'},body});});
  await p.route('**://fonts.g**',(r)=>r.abort());
  await p.addInitScript(([s,ref])=>localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(s)),[sessA,REF]);
  await p.goto(`${BASE}/negocios/?b=hz-barberia-primera`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(8000);
  const body=await p.evaluate(()=>document.body.innerText);
  const checks={count:/Recomendado por[\s\S]{0,40}vecino/.test(body), btn:/Recomendar|Recomendado/.test(body), quote:/mejor fade de Hazleton/.test(body)};
  console.log(JSON.stringify(checks));
  await p.screenshot({path:'/tmp/barber/endorse.png',fullPage:false});
  // test toggle off then the reason sheet
  await p.getByRole('button',{name:/Recomendado/}).first().click({timeout:4000}).catch(()=>{});
  await p.waitForTimeout(2500);
  const body2=await p.evaluate(()=>document.body.innerText);
  console.log('after un-recommend, button shows Recomendar:', /Recomendar/.test(body2));
  await p.getByRole('button',{name:/^Recomendar$/}).first().click({timeout:4000}).catch(()=>{});
  await p.waitForTimeout(1200);
  const body3=await p.evaluate(()=>document.body.innerText);
  console.log('reason sheet opened:', /¿Por qué lo recomiendas|Recommend this business/.test(body3));
  await p.screenshot({path:'/tmp/barber/endorse-sheet.png',fullPage:false});
  await b.close();
})();
