const { chromium } = require('playwright');
const { execFile } = require('child_process');
const BASE='http://127.0.0.1:4173';
function relay(req){return new Promise((res)=>{const a=['-s','-o','-','-w','\n%{http_code}','-X',req.method(),'--max-time','25'];const h=req.headers();for(const k of ['apikey','authorization','content-type','prefer','accept','accept-profile','content-profile','x-client-info','range'])if(h[k])a.push('-H',`${k}: ${h[k]}`);const b=req.postData();if(b!=null)a.push('--data-binary',b);a.push(req.url());execFile('curl',a,{encoding:'buffer',maxBuffer:64*1024*1024},(e,o)=>{o=o||Buffer.from('');const s=o.toString('latin1');const nl=s.lastIndexOf('\n');res({status:parseInt(s.slice(nl+1),10)||500,body:o.slice(0,Buffer.byteLength(s.slice(0,nl),'latin1'))});});});}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:390,height:900}});
  p.on('pageerror',()=>{});
  await p.route('**://*.supabase.co/**',async(r)=>{const {status,body}=await relay(r.request());const ct=r.request().url().includes('/storage/')?'image/png':'application/json';await r.fulfill({status,headers:{'content-type':ct,'access-control-allow-origin':'*'},body});});
  await p.route('**://fonts.g**',(r)=>r.abort());
  await p.goto(`${BASE}/negocios/?b=hz-barberia-primera`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(8000);
  await p.screenshot({path:'/tmp/barber/listing.png',fullPage:false});
  const body=await p.evaluate(()=>document.body.innerText);
  console.log('gallery/photos present:', /Fotos|Galería|foto/i.test(body) || 'check screenshot');
  await b.close();
})();
