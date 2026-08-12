'use client';

// InstalarApp — la invitación a poner To'Latino en la pantalla de inicio.
//
// DE DÓNDE SALE: el fundador quiere que la gente «la tenga presente en el
// teléfono» (2026-08-06). El manifiesto ya lo permite; lo que faltaba era
// pedirlo. Sin esto, la función existe y no la usa nadie.
//
// DOS DECISIONES QUE NO SON OBVIAS:
//
// 1. NO se enseña al entrar. Un cartel de instalar sobre una app que aún no te
//    ha dado nada se cierra sin leer, y encima quema la única oportunidad. Se
//    espera a la SEGUNDA visita: quien vuelve ya tiene un motivo. Cerrarla la
//    calla 14 días, y siempre queda a mano en el menú de la cuenta.
//
// 2. En iPhone se enseña el CAMINO, no un botón. Apple no da instalador: hay
//    que ir a Compartir → «Añadir a pantalla de inicio» a mano, y ese menú
//    tiene veinte cosas. Por eso la hoja dibuja el icono exacto de Compartir y
//    el de la opción — sin eso, no lo encuentra nadie. (Y en Chrome o Firefox
//    de iPhone esa opción NI SIQUIERA existe: hay que decirlo, no callarlo.)

import { useEffect, useState } from 'react';
import { IconShare2 as Share, IconSquarePlus as SquarePlus, IconX as X, IconDeviceMobile as Phone, IconBell as Bell, IconBolt as Bolt } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { Overlay, PrimaryBtn } from '@/components/ui';
import { yaInstalada, esIOS, esSafariIOS, esEscritorio, posponer, pospuesta, hayPromptNativo, suscribirPrompt, instalarNativo } from '@/lib/instalar';

const VISITAS = 'tl.visitas';

/** Cuenta visitas para no pedir la instalación en la primera. */
function visitaNumero(): number {
  try {
    const n = Number(localStorage.getItem(VISITAS) ?? 0) + 1;
    localStorage.setItem(VISITAS, String(n));
    return n;
  } catch { return 1; }
}

export function InstalarApp() {
  const { L } = useLang();
  const [abierta, setAbierta] = useState(false);
  const [barra, setBarra] = useState(false);
  const [nativo, setNativo] = useState(false);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(false);

  useEffect(() => {
    if (yaInstalada() || esEscritorio()) return;
    setIos(esIOS());
    setSafari(esSafariIOS());
    setNativo(hayPromptNativo());
    const off = suscribirPrompt(() => setNativo(hayPromptNativo()));
    // La barra aparece a partir de la SEGUNDA visita, y no si se pospuso.
    if (visitaNumero() >= 2 && !pospuesta()) {
      // Un pequeño retraso para no competir con el primer pintado.
      const t = window.setTimeout(() => setBarra(true), 2500);
      return () => { window.clearTimeout(t); off(); };
    }
    return off;
  }, []);

  // En iPhone solo Safari puede instalar. En Chrome/Firefox de iPhone se avisa
  // en la hoja en vez de ofrecer un botón que no haría nada.
  const puede = ios || nativo;
  if (!puede) return null;

  const cerrarBarra = () => { setBarra(false); posponer(); };

  const alInstalar = async () => {
    if (nativo) { await instalarNativo(); setBarra(false); return; }
    setBarra(false);
    setAbierta(true);
  };

  const ventaja = (Icon: typeof Bell, t: string) => (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-lilac-2">
        <Icon size={16} stroke={2.2} className="text-primary-dark" />
      </span>
      <span className="text-[12.5px] font-semibold text-ink-soft">{t}</span>
    </span>
  );

  return (
    <>
      {/* Barra discreta sobre el menú inferior. No tapa contenido ni bloquea. */}
      {barra && (
        <div data-instalar-barra className="fixed inset-x-2.5 bottom-[86px] z-40 flex items-center gap-3 rounded-[18px] border border-line bg-white/95 p-3 shadow-modal backdrop-blur md:bottom-4 md:left-auto md:right-4 md:w-[380px]">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-primary text-[17px] font-extrabold text-white">To’</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-extrabold text-ink">{L('Ponla en tu teléfono', 'Put it on your phone')}</span>
            <span className="block truncate text-[11.5px] font-semibold text-muted">
              {L('Icono propio y avisos', 'Own icon and alerts')}
            </span>
          </span>
          <button onClick={alInstalar} className="tap flex-none cursor-pointer rounded-field bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
            {L('Instalar', 'Install')}
          </button>
          <button onClick={cerrarBarra} aria-label={L('Ahora no', 'Not now')} className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full text-muted-2 hover:bg-lilac-2">
            <X size={15} stroke={2.4} />
          </button>
        </div>
      )}

      {/* La hoja del iPhone: el camino exacto, con los iconos de Apple. */}
      <Overlay open={abierta} onClose={() => setAbierta(false)} width={420}>
        <div data-instalar-hoja>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[16px] bg-primary text-[22px] font-extrabold text-white">To’</span>
            <span className="min-w-0">
              <span className="block text-[17px] font-extrabold text-ink">{L('Añádela a tu pantalla de inicio', 'Add it to your Home Screen')}</span>
              <span className="block text-[12.5px] font-semibold text-muted">{L('Toma diez segundos y es gratis', 'Takes ten seconds and it’s free')}</span>
            </span>
            <button onClick={() => setAbierta(false)} aria-label={L('Cerrar', 'Close')} className="ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink">
              <X size={16} stroke={2.4} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 rounded-card border border-line bg-canvas p-3.5">
            {ventaja(Phone, L('Su icono queda junto a tus otras apps', 'Its icon sits with your other apps'))}
            {ventaja(Bell, L('Te avisa aunque la tengas cerrada', 'Alerts you even when it’s closed'))}
            {ventaja(Bolt, L('Abre a pantalla completa, sin el navegador', 'Opens full screen, no browser bar'))}
          </div>

          {safari ? (
            <>
              <div className="mt-4 text-[12.5px] font-extrabold text-ink">{L('En tu iPhone, dos pasos:', 'On your iPhone, two steps:')}</div>
              <ol className="mt-2.5 flex flex-col gap-2.5">
                <li className="flex items-center gap-3 rounded-card border border-line bg-white p-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">1</span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink-soft">
                    {L('Toca', 'Tap')} <span className="font-extrabold text-ink">{L('Compartir', 'Share')}</span> {L('abajo en Safari', 'at the bottom of Safari')}
                  </span>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-line bg-canvas">
                    <Share size={19} stroke={2} className="text-[#0A84FF]" />
                  </span>
                </li>
                <li className="flex items-center gap-3 rounded-card border border-line bg-white p-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">2</span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink-soft">
                    {L('Baja y elige', 'Scroll and choose')} <span className="font-extrabold text-ink">{L('Añadir a pantalla de inicio', 'Add to Home Screen')}</span>
                  </span>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-line bg-canvas">
                    <SquarePlus size={19} stroke={2} className="text-ink" />
                  </span>
                </li>
              </ol>
              <div className="mt-3 rounded-field bg-lilac-3 px-3.5 py-2.5 text-[11.5px] font-semibold leading-snug text-ink-3">
                {L('Si no ves «Añadir a pantalla de inicio», desliza la lista hacia arriba: está entre las opciones grises.', 'If you don’t see “Add to Home Screen”, scroll the list up — it’s among the grey options.')}
              </div>
            </>
          ) : ios ? (
            // Chrome/Firefox en iPhone: su menú Compartir NO trae la opción.
            <div className="mt-4 rounded-card border border-amber/40 bg-amber-bg p-3.5">
              <div className="text-[12.5px] font-extrabold text-amber-ink">{L('Ábrela en Safari para instalarla', 'Open it in Safari to install it')}</div>
              <div className="mt-1 text-[12px] font-semibold leading-snug text-ink-3">
                {L('En iPhone solo Safari puede añadir apps a la pantalla de inicio. Copia la dirección y ábrela allí.', 'On iPhone only Safari can add apps to the Home Screen. Copy the address and open it there.')}
              </div>
            </div>
          ) : null}

          <PrimaryBtn className="mt-4" onClick={() => setAbierta(false)}>{L('Entendido', 'Got it')}</PrimaryBtn>
        </div>
      </Overlay>
    </>
  );
}

/** Punto de entrada desde el menú de la cuenta, para quien cerró la barra. */
export function useInstalarDisponible(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (yaInstalada() || esEscritorio()) return;
    setOk(esIOS() || hayPromptNativo());
    return suscribirPrompt(() => setOk(esIOS() || hayPromptNativo()));
  }, []);
  return ok;
}
