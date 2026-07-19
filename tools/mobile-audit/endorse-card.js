const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE='http://127.0.0.1:4173', REF='zpkaxojonufdwgahiqjh';
const sess = JSON.parse(fs.readFileSync(process.env.SESSION,'utf8'));
function relay(req){return new Promise((res)=>{const a=['-s','-o','-','-w','\n%{http_code}','-X',req.method(),'--max-time','25'];const h=req.headers();for(const k of ['apikey','authorization','content-type','prefer','accept','accept-profile','content-profile','x-client-info','range'])if(h[k])a.push('-H',`${k}: ${h[k]}`);const b=req.postData();if(b!=null)a.push('--data-binary',b);a.push(req.url());execFile('curl',a,{encoding:'buffer',maxBuffer:64*1024*1024},(e,o)=>{o=o||Buffer.from('');const s=o.toString('latin1');const nl=s.lastIndexOf('\n');res({status:parseInt(s.slice(nl+1),10)||500,body:o.slice(0,Buffer.byteLength(s.slice(0,nl),'latin1'))});});});}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:390,height:900}});
  p.on('pageerror',(e)=>console.log('PAGEERROR',e.message));
  await p.route('**://*.supabase.co/**',async(r)=>{const {status,body}=await relay(r.request());const ct=r.request().url().includes('/storage/')?'image/png':'application/json';await r.fulfill({status,headers:{'content-type':ct,'access-control-allow-origin':'*'},body});});
  await p.route('**://fonts.g**',(r)=>r.abort());
  await p.addInitScript(([s,ref])=>localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(s)),[sess,REF]);
  await p.goto(`${BASE}/negocios/`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(9000);
  // The EndorseBar should render on verified cards.
  const body=await p.evaluate(()=>document.body.innerText);
  const hasBar=/Recomendar|Recomiendas|Recomendado por|Sé el primero/.test(body);
  console.log('card endorse bar present:', hasBar);
  await p.screenshot({path:'/tmp/barber/card-list.png',fullPage:false});

  // Find a "Recomendar" button (not-yet-recommended) and tap it.
  const recBtn = p.getByRole('button',{name:/^Recomendar$/});
  const n = await recBtn.count();
  console.log('Recomendar buttons on page:', n);
  if (n>0){
    await recBtn.first().click({timeout:5000}).catch((e)=>console.log('click err',e.message));
    await p.waitForTimeout(3500);
    const body2=await p.evaluate(()=>document.body.innerText);
    console.log('after tap → a card shows Recomiendas:', /Recomiendas/.test(body2));
    await p.screenshot({path:'/tmp/barber/card-recommended.png',fullPage:false});
    // toggle back off to clean up
    await p.getByRole('button',{name:/^Recomiendas$/}).first().click({timeout:5000}).catch(()=>{});
    await p.waitForTimeout(3000);
    const body3=await p.evaluate(()=>document.body.innerText);
    console.log('after un-tap → back to Recomendar:', /Recomendar/.test(body3));
  }
  await b.close();
})();
