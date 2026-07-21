import type { Metadata } from 'next';
import { NegociosScreen } from '@/screens/Negocios';

export const metadata: Metadata = {
  title: 'Negocios',
  description: 'Encuentra negocios latinos de confianza cerca de ti — comida, belleza, autos, servicios y más. Reseñas reales de vecinos, en español.',
};

export default function Page() {
  return <NegociosScreen />;
}
