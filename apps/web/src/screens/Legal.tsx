'use client';

// Legal pages — Términos (Terms of Service) and Privacidad (Privacy Policy).
// Spanish-first (es-US) with English secondary via L(); mobile-first, tokens only.
// Public, crawlable, linked from the landing footer. These are professional
// starting scaffolds — the founder must have counsel review them and fill the
// legal entity name / address / contact mailbox before the real money launch
// (logged in docs/LAUNCH-CHECKLIST.md).

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft as ArrowLeft } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { LangToggle } from '@/components/AppHeader';
import { Wordmark } from '@/components/ui';

// Contact + entity placeholders — replaced before public launch (see checklist).
const LEGAL_EMAIL = 'hola@tolatino.com';
const UPDATED = { es: '22 de julio de 2026', en: 'July 22, 2026' };

type Block = { h: [string, string]; p: [string, string][] };

function LegalShell({ title, intro, blocks }: { title: [string, string]; intro: [string, string]; blocks: Block[] }) {
  const { L } = useLang();
  const router = useRouter();
  return (
    <div className="min-h-screen bg-canvas">
      {/* sticky nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[820px] items-center gap-3 px-4 py-3 md:px-6">
          <button onClick={() => router.back()} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-primary-dark" aria-label={L('Volver', 'Back')}>
            <ArrowLeft size={17} stroke={2.2} />
          </button>
          <Link href="/" className="flex-none"><Wordmark /></Link>
          <div className="ml-auto"><LangToggle /></div>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-20 pt-6 md:px-6 md:pt-9">
        <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink md:text-[30px]">{L(title[0], title[1])}</h1>
        <div className="mt-1.5 text-[12px] font-semibold text-muted-2">{L('Última actualización', 'Last updated')}: {L(UPDATED.es, UPDATED.en)}</div>
        <p className="mt-4 text-[13.5px] font-medium leading-relaxed text-ink-soft">{L(intro[0], intro[1])}</p>

        <div className="mt-7 flex flex-col gap-6">
          {blocks.map((b, i) => (
            <section key={i}>
              <h2 className="text-[16px] font-extrabold text-ink md:text-[17px]">{i + 1}. {L(b.h[0], b.h[1])}</h2>
              <div className="mt-2 flex flex-col gap-2.5">
                {b.p.map((para, j) => (
                  <p key={j} className="text-[13px] font-medium leading-relaxed text-ink-soft">{L(para[0], para[1])}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-card border border-line bg-white p-5 shadow-card">
          <div className="text-[13.5px] font-extrabold text-ink">{L('¿Preguntas?', 'Questions?')}</div>
          <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-muted">
            {L('Escríbenos a ', 'Reach us at ')}<a href={`mailto:${LEGAL_EMAIL}`} className="font-extrabold text-primary-dark">{LEGAL_EMAIL}</a>.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] font-extrabold text-primary-dark">
            <Link href="/terminos" className="hover:underline">{L('Términos', 'Terms')}</Link>
            <Link href="/privacidad" className="hover:underline">{L('Privacidad', 'Privacy')}</Link>
            <Link href="/" className="hover:underline">{L('Inicio', 'Home')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export function TerminosScreen() {
  return (
    <LegalShell
      title={['Términos de servicio', 'Terms of Service']}
      intro={[
        'To’Latino es una plataforma local que conecta a negocios y personas de la comunidad latina en Estados Unidos para descubrir, comprar, reservar y contactar servicios cerca de ti. Al crear una cuenta o usar la plataforma, aceptas estos términos. Si no estás de acuerdo, por favor no uses el servicio.',
        'To’Latino is a local platform that connects businesses and people in the U.S. Latino community to discover, buy, book and contact services near you. By creating an account or using the platform, you agree to these terms. If you do not agree, please do not use the service.',
      ]}
      blocks={[
        {
          h: ['Qué es To’Latino', 'What To’Latino is'],
          p: [
            ['To’Latino es un mercado (marketplace) e intermediario tecnológico. Los negocios publican sus productos, servicios, rentas, eventos y anuncios; los usuarios los descubren y transaccionan con ellos. To’Latino no es el vendedor, prestador del servicio ni empleador de los negocios listados, salvo que se indique expresamente.', 'To’Latino is a marketplace and technology intermediary. Businesses list their products, services, rentals, events and posts; users discover and transact with them. To’Latino is not the seller, service provider or employer of the listed businesses, unless expressly stated.'],
          ],
        },
        {
          h: ['Tu cuenta', 'Your account'],
          p: [
            ['Debes dar información veraz al registrarte y mantener segura tu credencial de acceso. Eres responsable de la actividad en tu cuenta. Debes tener al menos 18 años, o la mayoría de edad en tu estado, para vender o comprar.', 'You must provide accurate information when registering and keep your login credentials secure. You are responsible for the activity on your account. You must be at least 18, or the age of majority in your state, to sell or buy.'],
          ],
        },
        {
          h: ['Negocios y contenido de usuarios', 'Businesses and user content'],
          p: [
            ['Si publicas un negocio, listado, reseña, publicación de comunidad, foto o cualquier contenido, declaras que tienes derecho a hacerlo y que la información es exacta. Nos otorgas una licencia no exclusiva para mostrar ese contenido dentro de la plataforma con el fin de operar el servicio.', 'If you post a business, listing, review, community post, photo or any content, you represent that you have the right to do so and that the information is accurate. You grant us a non-exclusive license to display that content within the platform to operate the service.'],
            ['Podemos moderar, ocultar o eliminar contenido que viole estos términos, la ley o los derechos de terceros. La responsabilidad por la exactitud de precios, disponibilidad, licencias y cumplimiento legal de cada listado recae en el negocio que lo publica.', 'We may moderate, hide or remove content that violates these terms, the law or third-party rights. Responsibility for the accuracy of prices, availability, licenses and legal compliance of each listing lies with the business that posts it.'],
          ],
        },
        {
          h: ['Compras, reservas y pagos', 'Purchases, bookings and payments'],
          p: [
            ['Cuando pagas en línea, el cobro se procesa de forma segura a través de nuestro procesador de pagos (Stripe). To’Latino no almacena el número completo de tu tarjeta. Para las transacciones en línea, To’Latino puede cobrar una comisión de servicio al negocio y/o al comprador, que se muestra antes de confirmar.', 'When you pay online, the charge is processed securely through our payment processor (Stripe). To’Latino does not store your full card number. For online transactions, To’Latino may charge a service commission to the business and/or the buyer, shown before you confirm.'],
            ['Algunos negocios muestran su catálogo sin venta en línea; en esos casos pagas directamente en el establecimiento. El contrato de compra o servicio es entre tú y el negocio.', 'Some businesses show their catalog without online sales; in those cases you pay directly at the establishment. The purchase or service contract is between you and the business.'],
          ],
        },
        {
          h: ['Reembolsos y cancelaciones', 'Refunds and cancellations'],
          p: [
            ['Cada negocio define su política de cancelación. Cuando un pedido, reserva o renta pagado en línea se cancela o rechaza antes de completarse, el reembolso se procesa a tu método de pago original a través de Stripe. Los depósitos reembolsables de renta se retienen al recoger y se liberan al devolver el artículo en buen estado; se puede retener por daños según la política del negocio.', 'Each business sets its own cancellation policy. When an order, booking or rental paid online is cancelled or rejected before completion, the refund is processed to your original payment method through Stripe. Refundable rental deposits are held at pickup and released when the item is returned in good condition; amounts may be withheld for damage per the business’s policy.'],
          ],
        },
        {
          h: ['Conducta prohibida', 'Prohibited conduct'],
          p: [
            ['No uses la plataforma para actividades ilegales, fraude, spam, acoso, discurso de odio, suplantación de identidad, venta de productos prohibidos, ni para vulnerar la seguridad o extraer datos de forma masiva. Podemos suspender cuentas que incumplan.', 'Do not use the platform for illegal activity, fraud, spam, harassment, hate speech, impersonation, sale of prohibited goods, or to breach security or scrape data at scale. We may suspend accounts that violate this.'],
          ],
        },
        {
          h: ['Descargo y límite de responsabilidad', 'Disclaimer and limitation of liability'],
          p: [
            ['La plataforma se ofrece “tal cual”. En la medida permitida por la ley, To’Latino no es responsable por la calidad, seguridad, legalidad o cumplimiento de los productos y servicios ofrecidos por los negocios, ni por disputas entre usuarios y negocios. Nuestra responsabilidad total se limita al monto de las comisiones que nos pagaste por la transacción en cuestión.', 'The platform is provided “as is.” To the extent permitted by law, To’Latino is not responsible for the quality, safety, legality or performance of the products and services offered by businesses, nor for disputes between users and businesses. Our total liability is limited to the amount of commissions you paid us for the transaction at issue.'],
          ],
        },
        {
          h: ['Terminación', 'Termination'],
          p: [
            ['Puedes dejar de usar el servicio y solicitar la eliminación de tu cuenta en cualquier momento. Podemos suspender o cerrar cuentas que incumplan estos términos o la ley.', 'You may stop using the service and request deletion of your account at any time. We may suspend or close accounts that violate these terms or the law.'],
          ],
        },
        {
          h: ['Cambios a estos términos', 'Changes to these terms'],
          p: [
            ['Podemos actualizar estos términos. Publicaremos la versión vigente con su fecha de actualización; el uso continuo del servicio implica aceptación de los cambios.', 'We may update these terms. We will post the current version with its update date; continued use of the service means acceptance of the changes.'],
          ],
        },
        {
          h: ['Contacto', 'Contact'],
          p: [
            [`Para cualquier asunto legal escríbenos a ${LEGAL_EMAIL}.`, `For any legal matter, contact us at ${LEGAL_EMAIL}.`],
          ],
        },
      ]}
    />
  );
}

export function PrivacidadScreen() {
  return (
    <LegalShell
      title={['Aviso de privacidad', 'Privacy Policy']}
      intro={[
        'Tu confianza es lo más importante para nosotros. Este aviso explica qué información recopila To’Latino, cómo la usamos y qué opciones tienes. Usamos tus datos solo para operar y mejorar la plataforma — nunca vendemos tu información personal.',
        'Your trust matters most to us. This notice explains what information To’Latino collects, how we use it and the choices you have. We use your data only to operate and improve the platform — we never sell your personal information.',
      ]}
      blocks={[
        {
          h: ['Información que recopilamos', 'Information we collect'],
          p: [
            ['Datos de cuenta: nombre, correo o teléfono y tu contraseña (guardada de forma cifrada). Perfil y contenido: lo que publicas, reseñas, mensajes, fotos y tu negocio si eres vendedor. Ubicación: la ciudad que eliges y, si lo autorizas, tu ubicación aproximada para mostrarte resultados cercanos; las direcciones que guardas para entregas.', 'Account data: name, email or phone, and your password (stored encrypted). Profile and content: what you post, reviews, messages, photos and your business if you are a seller. Location: the city you choose and, if you allow it, your approximate location to show nearby results; addresses you save for delivery.'],
            ['Datos de pago: cuando compras en línea, tu pago lo procesa Stripe. Recibimos confirmación e información limitada de la transacción (por ejemplo, últimos 4 dígitos), pero no tu número completo de tarjeta. Datos de uso: información técnica del dispositivo y de cómo usas la app para seguridad y mejoras.', 'Payment data: when you buy online, your payment is processed by Stripe. We receive confirmation and limited transaction info (e.g., last 4 digits), but not your full card number. Usage data: technical device information and how you use the app, for security and improvements.'],
          ],
        },
        {
          h: ['Cómo usamos tu información', 'How we use your information'],
          p: [
            ['Para crear tu cuenta, mostrarte negocios y eventos cerca de ti, procesar compras y reservas, comunicarnos contigo, prevenir fraude y abuso, cumplir la ley y mejorar la plataforma. No usamos tu contenido para venderlo a terceros.', 'To create your account, show you nearby businesses and events, process purchases and bookings, communicate with you, prevent fraud and abuse, comply with the law and improve the platform. We do not use your content to sell it to third parties.'],
          ],
        },
        {
          h: ['Ubicación', 'Location'],
          p: [
            ['La ubicación se usa para mostrarte resultados relevantes cerca de ti. Puedes usar la app eligiendo una ciudad manualmente sin compartir tu ubicación precisa. Para proteger tu privacidad, las coordenadas de publicaciones de comunidad se muestran de forma aproximada, no como tu dirección exacta.', 'Location is used to show you relevant results near you. You can use the app by choosing a city manually without sharing your precise location. To protect your privacy, community post coordinates are shown approximately, not as your exact address.'],
          ],
        },
        {
          h: ['Con quién compartimos', 'Who we share with'],
          p: [
            ['Con los negocios cuando les compras, reservas o los contactas (para que puedan atender tu pedido). Con proveedores que hacen funcionar la plataforma: Stripe (pagos), Supabase (base de datos y autenticación) y Cloudflare (alojamiento y seguridad). Con autoridades cuando la ley lo exige. No vendemos tu información personal.', 'With businesses when you buy from, book or contact them (so they can fulfill your request). With providers that run the platform: Stripe (payments), Supabase (database and authentication) and Cloudflare (hosting and security). With authorities when required by law. We do not sell your personal information.'],
          ],
        },
        {
          h: ['Cookies y almacenamiento local', 'Cookies and local storage'],
          p: [
            ['Usamos almacenamiento en tu dispositivo para recordar tu sesión, tu idioma y tus preferencias, y para el funcionamiento básico de la app. Puedes borrarlo desde tu navegador, aunque algunas funciones podrían dejar de recordarse.', 'We use storage on your device to remember your session, your language and preferences, and for the app’s basic operation. You can clear it from your browser, though some features may stop being remembered.'],
          ],
        },
        {
          h: ['Seguridad', 'Security'],
          p: [
            ['Protegemos tu información con cifrado en tránsito y controles de acceso a nivel de base de datos. Ningún sistema es 100% infalible, pero trabajamos para mantener tus datos seguros y notificar incidentes cuando corresponda.', 'We protect your information with encryption in transit and database-level access controls. No system is 100% foolproof, but we work to keep your data safe and to notify of incidents when appropriate.'],
          ],
        },
        {
          h: ['Tus derechos', 'Your rights'],
          p: [
            ['Puedes acceder, corregir o eliminar tu información y cerrar tu cuenta. Según tu estado (por ejemplo, California), puedes tener derechos adicionales sobre tus datos. Para ejercerlos, escríbenos y responderemos en un plazo razonable.', 'You can access, correct or delete your information and close your account. Depending on your state (for example, California), you may have additional rights over your data. To exercise them, contact us and we will respond within a reasonable time.'],
          ],
        },
        {
          h: ['Menores', 'Minors'],
          p: [
            ['La plataforma no está dirigida a menores de 18 años. No recopilamos a sabiendas datos de menores; si crees que un menor nos dio información, contáctanos para eliminarla.', 'The platform is not directed to anyone under 18. We do not knowingly collect data from minors; if you believe a minor gave us information, contact us to remove it.'],
          ],
        },
        {
          h: ['Retención', 'Retention'],
          p: [
            ['Conservamos tu información mientras tu cuenta esté activa y el tiempo necesario para cumplir obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos.', 'We keep your information while your account is active and as long as needed to comply with legal obligations, resolve disputes and enforce our agreements.'],
          ],
        },
        {
          h: ['Cambios a este aviso', 'Changes to this notice'],
          p: [
            ['Podemos actualizar este aviso. Publicaremos la versión vigente con su fecha; te recomendamos revisarlo periódicamente.', 'We may update this notice. We will post the current version with its date; we recommend reviewing it periodically.'],
          ],
        },
        {
          h: ['Contacto', 'Contact'],
          p: [
            [`Para preguntas sobre privacidad o para ejercer tus derechos, escríbenos a ${LEGAL_EMAIL}.`, `For privacy questions or to exercise your rights, contact us at ${LEGAL_EMAIL}.`],
          ],
        },
      ]}
    />
  );
}
