import type { Metadata } from 'next';
import { TerminosScreen } from '@/screens/Legal';

export const metadata: Metadata = {
  title: 'Términos de servicio',
  description: 'Términos de servicio de To’Latino — el marketplace local para la comunidad latina en Estados Unidos.',
  alternates: { canonical: '/terminos' },
};

export default function Page() {
  return <TerminosScreen />;
}
