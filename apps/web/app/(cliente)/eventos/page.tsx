import type { Metadata } from 'next';
import { EventosScreen } from '@/screens/Eventos';

// Server-component metadata → baked into out/eventos/index.html (the only event
// metadata a non-JS crawler sees). Title MUST match Eventos' LIST_TITLE so closing
// an open event restores a consistent tab title. (Per-event crawler/social SEO
// needs SSR — deferred; see docs/LAUNCH-CHECKLIST.md.)
export const metadata: Metadata = {
  title: "Eventos cerca de ti — To'Latino",
  description: 'Conciertos, ferias, talleres y fiestas de la comunidad latina cerca de ti. Consigue boletos, en español.',
};

export default function Page() {
  return <EventosScreen />;
}
