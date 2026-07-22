import type { Metadata } from 'next';
import { PrivacidadScreen } from '@/screens/Legal';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Aviso de privacidad de To’Latino — qué datos recopilamos, cómo los usamos y tus opciones.',
  alternates: { canonical: '/privacidad' },
};

export default function Page() {
  return <PrivacidadScreen />;
}
