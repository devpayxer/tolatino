import type { Metadata } from 'next';
import { ComunidadScreen } from '@/screens/Comunidad';

export const metadata: Metadata = {
  title: 'Comunidad',
  description: 'Pregunta, recomienda y entérate de lo que pasa en tu barrio. Tu comunidad latina cerca de ti, en español.',
};

export default function Page() {
  return <ComunidadScreen />;
}
