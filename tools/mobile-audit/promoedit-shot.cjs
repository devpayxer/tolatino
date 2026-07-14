const { chromium } = require('playwright'); const { execFile } = require('child_process'); const fs = require('fs');
const SCR='/tmp/claude-0/-home-user-tolatino/fbfa8251-bcf7-542c-ad6c-e36f02d2852e/scratchpad';
const sessB = JSON.parse(fs.readFileSync(SCR+'/sessB-p0.json','utf8'));
const relay=(req)=>new Promise(r=>{const a=['-s','-o','-','-w','\n%{http_code}','-X',req.method(),'--max-time','30'];const h=req.headers();for(const k of['apikey','authorization','content-type','prefer','accept','accept-profile','content-profile','x-client-info','range'])if(h[k])a.push('-H',`${k}: ${h[k]}`);const b=req.postData();if(b!=null)a.push('--data-binary',b);a.push(req.url());execFile('curl',a,{encoding:'utf8',maxBuffer:1<<25},(e,o)=>{o=o||'';const nl=o.lastIndexOf('\n');r({status:parseInt(o.slice(nl+1),10)||500,body:o.slice(0,nl)});});});
(async()=>{const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await br.newPage({viewport:{width:390,height:1000}});p.on('pageerror',()=>{});
await p.route('**://*.supabase.co/**',async ro=>{const{status,body}=await relay(ro.request());await ro.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body});});
await p.route('**://fonts.googleapis.com/**',r=>r.abort());await p.route('**://fonts.gstatic.com/**',r=>r.abort());
await p.addInitScript(([s])=>localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token',JSON.stringify(s)),[sessB]);
await p.goto('http://127.0.0.1:4173/negocio/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(6500);
await p.getByRole('button',{name:'Menú',exact:true}).first().click({timeout:10000}).catch(()=>{});await p.waitForTimeout(700);
const pr=p.getByText('Promociones',{exact:true});for(let i=0;i<await pr.count();i++){const e=pr.nth(i);if(await e.isVisible().catch(()=>false)){await e.click();break;}}
await p.waitForTimeout(2200);
await p.getByText('Nueva campaña').first().click({timeout:6000}).catch(()=>{});
await p.waitForTimeout(1200);
console.log('editor open:', await p.getByText(/¿Dónde aplica\?/).first().isVisible().catch(()=>false));
await p.screenshot({path:SCR+'/promo-editor.png'});
await br.close();})();
