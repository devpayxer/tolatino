// gen-barber.js — render 10 ORIGINAL, on-brand barbershop illustrations (no photos,
// no copied art, no network) to PNG via the pre-installed Chromium. Palette from the
// To'Latino design system. Output: /tmp/barber/barber-1..10.png (1200×900).
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/barber';
fs.mkdirSync(OUT, { recursive: true });

// brand tokens
const INK = '#1E1B2E', PRIM = '#7B61FF', PRIMD = '#6D4DF6', AMBER = '#F4B740', APP = '#F4F2F9', CREAM = '#FBF7EF';
const RED = '#D64550', BLUE = '#2F6FED', TEAL = '#0E9384';

// A reusable barber pole (classic diagonal stripes clipped to a rounded bar).
const pole = (x, y, w, h, id) => `
  <defs><clipPath id="pc${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w/2}"/></clipPath>
  <linearGradient id="pg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e9e6f2"/></linearGradient></defs>
  <rect x="${x-6}" y="${y-22}" width="${w+12}" height="18" rx="6" fill="${INK}"/>
  <rect x="${x-6}" y="${y+h+4}" width="${w+12}" height="18" rx="6" fill="${INK}"/>
  <g clip-path="url(#pc${id})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#pg${id})"/>
    ${Array.from({length: 14}, (_, i) => `<rect x="${x-w}" y="${y - h + i*(h/7)}" width="${w*3}" height="${h/14}" fill="${i%2?RED:BLUE}" transform="rotate(35 ${x+w/2} ${y+h/2})" opacity=".92"/>`).join('')}
  </g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w/2}" fill="none" stroke="rgba(30,27,46,.12)"/>`;

// scissors icon
const scissors = (cx, cy, s, col) => `<g transform="translate(${cx} ${cy}) scale(${s})" stroke="${col}" stroke-width="7" fill="none" stroke-linecap="round">
  <circle cx="-26" cy="26" r="14"/><circle cx="26" cy="26" r="14"/>
  <path d="M-16 16 L34 -40 M16 16 L-34 -40"/><circle cx="0" cy="0" r="4" fill="${col}"/></g>`;

const chair = (x, y, col) => `<g transform="translate(${x} ${y})">
  <rect x="-70" y="120" width="140" height="24" rx="8" fill="${INK}"/>
  <rect x="-14" y="60" width="28" height="70" fill="${INK}"/>
  <rect x="-64" y="-40" width="128" height="110" rx="26" fill="${col}"/>
  <rect x="-64" y="60" width="128" height="30" rx="12" fill="${col}"/>
  <rect x="-80" y="0" width="24" height="70" rx="10" fill="${INK}" opacity=".85"/>
  <rect x="56" y="0" width="24" height="70" rx="10" fill="${INK}" opacity=".85"/>
  <rect x="-52" y="-96" width="104" height="64" rx="22" fill="${col}"/></g>`;

const head = (x, y, skin, hair) => `<g transform="translate(${x} ${y})">
  <path d="M-58 40 Q-58 -78 0 -78 Q58 -78 58 40 Z" fill="${skin}"/>
  <path d="M-58 -8 Q-58 -86 0 -86 Q58 -86 58 -8 Q40 -30 24 -20 Q10 -34 -10 -22 Q-32 -34 -58 -8 Z" fill="${hair}"/>
  <rect x="-58" y="-14" width="18" height="30" rx="6" fill="${hair}"/>
  <rect x="40" y="-14" width="18" height="30" rx="6" fill="${hair}"/>
  <circle cx="-20" cy="-6" r="5" fill="${INK}"/><circle cx="20" cy="-6" r="5" fill="${INK}"/>
  <path d="M-14 22 Q0 32 14 22" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;

// caption chip + shop wordmark
const chip = (t) => `<g transform="translate(60 786)"><rect x="0" y="0" width="${64 + t.length*16.5}" height="60" rx="18" fill="rgba(30,27,46,.82)"/>
  <text x="32" y="39" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="27" fill="#fff">${t}</text></g>`;
const wordmark = () => `<g transform="translate(816 60)"><text x="0" y="0" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="30" fill="rgba(30,27,46,.55)">Barbería D' Primera</text></g>`;

const frame = (bg, inner) => `<rect width="1200" height="900" fill="${bg}"/>${inner}`;
const bgGrad = (id, a, b, dir = 'to bottom') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${dir==='to right'?1:0}" y2="${dir==='to right'?0:1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

// 10 distinct scenes
const scenes = [
  // 1 · storefront
  () => `${bgGrad('g1','#EFEBFF','#DDD4FA')}${frame('url(#g1)', `
    <rect x="120" y="150" width="960" height="560" rx="28" fill="${CREAM}" stroke="rgba(30,27,46,.08)"/>
    <rect x="120" y="150" width="960" height="120" rx="28" fill="${INK}"/>
    <text x="600" y="228" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="58" fill="#fff" letter-spacing="4">BARBER SHOP</text>
    <rect x="470" y="300" width="260" height="410" rx="12" fill="#EDE8FB"/>
    <rect x="470" y="300" width="260" height="410" rx="12" fill="none" stroke="${PRIMD}" stroke-width="6"/>
    <circle cx="700" cy="510" r="9" fill="${AMBER}"/>
    <rect x="180" y="330" width="230" height="200" rx="10" fill="#E7EEFA"/><rect x="790" y="330" width="230" height="200" rx="10" fill="#E7EEFA"/>
    ${pole(390, 320, 34, 250, 'a')}
    <text x="600" y="675" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="26" fill="${INK}" opacity=".65">Est. Hazleton, PA</text>
    ${chip('La barbería')}`)}`,
  // 2 · interior chairs
  () => `${bgGrad('g2','#F6F4FC','#E9E3F8')}${frame('url(#g2)', `
    <rect x="0" y="640" width="1200" height="260" fill="#E4DCF6"/>
    <rect x="120" y="120" width="960" height="150" rx="16" fill="#EDE8FB"/>
    ${[300,600,900].map((x,i)=>`<circle cx="${x}" cy="195" r="52" fill="#fff" stroke="rgba(30,27,46,.12)" stroke-width="4"/><circle cx="${x}" cy="195" r="52" fill="none" stroke="${[PRIM,AMBER,TEAL][i]}" stroke-width="6" opacity=".5"/>`).join('')}
    ${chair(300,470,PRIM)}${chair(600,470,INK)}${chair(900,470,PRIMD)}
    ${chip('Nuestras sillas')}`)}`,
  // 3 · tools flat-lay
  () => `${bgGrad('g3','#1E1B2E','#2A2440')}${frame('url(#g3)', `
    <rect x="90" y="120" width="1020" height="660" rx="26" fill="#26213b"/>
    <rect x="90" y="120" width="1020" height="660" rx="26" fill="none" stroke="rgba(255,255,255,.08)"/>
    ${scissors(360,340,2.1,'#EDE8FB')}
    <g transform="translate(760 330)"><rect x="-90" y="-26" width="150" height="52" rx="12" fill="#EDE8FB"/><rect x="60" y="-16" width="70" height="32" rx="8" fill="${PRIM}"/><rect x="-70" y="30" width="14" height="70" rx="6" fill="#C9C2E6"/><rect x="-40" y="30" width="14" height="70" rx="6" fill="#C9C2E6"/><rect x="-10" y="30" width="14" height="70" rx="6" fill="#C9C2E6"/></g>
    <g transform="translate(360 560)"><rect x="-140" y="-10" width="280" height="20" rx="10" fill="#EDE8FB"/>${Array.from({length:22},(_,i)=>`<rect x="${-134+i*12}" y="-40" width="5" height="34" rx="2" fill="#C9C2E6"/>`).join('')}</g>
    <g transform="translate(770 570) rotate(20)"><rect x="-14" y="-90" width="28" height="150" rx="12" fill="${AMBER}"/><rect x="-8" y="-150" width="16" height="80" rx="6" fill="#EDE8FB"/></g>
    <text x="600" y="200" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="#fff" letter-spacing="3" opacity=".9">HERRAMIENTAS</text>
    ${chip('Herramientas')}`)}`,
  // 4 · barber pole hero
  () => `${bgGrad('g4','#EDE7FC','#D9CDF6')}${frame('url(#g4)', `
    <circle cx="600" cy="440" r="250" fill="#fff" opacity=".5"/>
    ${pole(560, 190, 80, 470, 'b')}
    <text x="600" y="770" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="44" fill="${INK}" letter-spacing="6">CORTES · AFEITADAS</text>
    ${chip('Estamos abiertos')}`)}`,
  // 5 · fresh fade portrait
  () => `${bgGrad('g5','#E7EEFA','#CDDBF6')}${frame('url(#g5)', `
    <circle cx="600" cy="420" r="230" fill="#fff" opacity=".55"/>
    ${head(600,440,'#F1C9A5','#20304A')}
    <path d="M470 300 Q600 250 730 300" stroke="${PRIMD}" stroke-width="5" fill="none" stroke-dasharray="2 12" stroke-linecap="round"/>
    ${scissors(880,300,1.2,PRIMD)}
    ${chip('Fade perfecto')}`)}`,
  // 6 · waiting area
  () => `${bgGrad('g6','#FBF7EF','#F1E6CF')}${frame('url(#g6)', `
    <rect x="0" y="660" width="1200" height="240" fill="#EAD9B6"/>
    <rect x="150" y="470" width="520" height="190" rx="30" fill="${PRIMD}"/><rect x="150" y="440" width="520" height="70" rx="26" fill="${PRIM}"/>
    ${[250,410,570].map(x=>`<rect x="${x-4}" y="480" width="8" height="150" fill="rgba(255,255,255,.25)"/>`).join('')}
    <g transform="translate(880 300)"><rect x="-16" y="120" width="32" height="240" rx="10" fill="${INK}"/><path d="M0 130 Q-120 60 -80 -80 Q-10 -30 0 40 Q10 -30 80 -80 Q120 60 0 130Z" fill="${TEAL}"/></g>
    <rect x="150" y="150" width="360" height="220" rx="14" fill="#fff" opacity=".7"/><text x="330" y="285" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="46" fill="${INK}" opacity=".5">BIENVENIDO</text>
    ${chip('Sala de espera')}`)}`,
  // 7 · neon open sign
  () => `${bgGrad('g7','#161226','#241a3a')}${frame('url(#g7)', `
    <rect x="220" y="220" width="760" height="470" rx="30" fill="#0f0b1c"/>
    <rect x="220" y="220" width="760" height="470" rx="30" fill="none" stroke="${PRIM}" stroke-width="4" opacity=".5"/>
    <text x="600" y="410" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="120" fill="${AMBER}" letter-spacing="6" style="filter:drop-shadow(0 0 22px ${AMBER})">OPEN</text>
    <text x="600" y="530" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="64" fill="${PRIM}" letter-spacing="12" style="filter:drop-shadow(0 0 20px ${PRIM})">BARBER</text>
    <line x1="600" y1="120" x2="600" y2="220" stroke="#3a3358" stroke-width="6"/>
    ${chip('Abierto de noche')}`)}`,
  // 8 · hot shave
  () => `${bgGrad('g8','#E3F5EA','#CBE9D6')}${frame('url(#g8)', `
    <circle cx="600" cy="430" r="240" fill="#fff" opacity=".5"/>
    <g transform="translate(470 470) rotate(-18)"><rect x="-16" y="-110" width="32" height="150" rx="12" fill="${INK}"/><path d="M-14 40 L14 40 L20 210 Q0 230 -20 210 Z" fill="#EDE8FB"/><ellipse cx="0" cy="120" rx="34" ry="70" fill="#EDE8FB" opacity=".9"/><ellipse cx="0" cy="120" rx="34" ry="70" fill="#fff"/>
      <path d="M-18 20 h36" stroke="#C9C2E6" stroke-width="3"/></g>
    <g transform="translate(760 460) rotate(24)"><rect x="-10" y="0" width="20" height="150" rx="8" fill="${AMBER}"/><path d="M0 -8 L120 -70 L120 -34 L8 12 Z" fill="#D9D3EC" stroke="#B9B1D6" stroke-width="3"/></g>
    <text x="600" y="760" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="${INK}" letter-spacing="4" opacity=".7">AFEITADA CLÁSICA</text>
    ${chip('Afeitada al ras')}`)}`,
  // 9 · price board
  () => `${bgGrad('g9','#EFEBFF','#E0D8FA')}${frame('url(#g9)', `
    <rect x="240" y="130" width="720" height="640" rx="20" fill="${INK}"/>
    <rect x="270" y="160" width="660" height="580" rx="12" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3"/>
    <text x="600" y="245" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="46" fill="${AMBER}" letter-spacing="4">PRECIOS</text>
    ${[['Corte','$20'],['Corte + barba','$30'],['Afeitada','$18'],['Diseño / línea','$25'],['Niños','$15']].map((r,i)=>`
      <text x="310" y="${340+i*78}" font-family="Plus Jakarta Sans" font-weight="700" font-size="34" fill="#EDE8FB">${r[0]}</text>
      <text x="890" y="${340+i*78}" text-anchor="end" font-family="Plus Jakarta Sans" font-weight="800" font-size="34" fill="#fff">${r[1]}</text>
      <line x1="310" y1="${360+i*78}" x2="890" y2="${360+i*78}" stroke="rgba(255,255,255,.10)" stroke-width="2" stroke-dasharray="2 8"/>`).join('')}
    ${chip('Lista de precios')}`)}`,
  // 10 · the crew
  () => `${bgGrad('g10','#F6F4FC','#E7E0F7')}${frame('url(#g10)', `
    <rect x="0" y="690" width="1200" height="210" fill="#DDD4F5"/>
    ${[[330,PRIM,'#F1C9A5','#20304A'],[600,INK,'#E7B78C','#2A2033'],[870,PRIMD,'#F1C9A5','#3a2a20']].map(([x,ap,sk,hr])=>`
      <g transform="translate(${x} 250)">${head(0,150,sk,hr)}
        <path d="M-96 250 Q-96 360 0 360 Q96 360 96 250 L96 470 L-96 470 Z" fill="${ap}"/>
        <path d="M-96 250 L0 320 L96 250 L96 340 L0 400 L-96 340 Z" fill="#fff" opacity=".9"/>
        <circle cx="0" cy="360" r="8" fill="${AMBER}"/></g>`).join('')}
    <text x="600" y="820" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="${INK}" letter-spacing="3" opacity=".7">NUESTRO EQUIPO</text>
    ${chip('El equipo')}`)}`,
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  for (let i = 0; i < scenes.length; i++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${scenes[i]()}${wordmark()}</svg>`;
    await page.setContent(`<!doctype html><html><head><style>*{margin:0}</style></head><body>${svg}</body></html>`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    await page.locator('svg').screenshot({ path: `${OUT}/barber-${i + 1}.png` });
    console.log(`rendered barber-${i + 1}.png`);
  }
  await browser.close();
})();
