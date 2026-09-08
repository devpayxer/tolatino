import type { Metadata } from 'next';
import { JuegosScreen } from '@/screens/Juegos';

export const metadata: Metadata = {
  title: 'Sala de juegos',
  description: 'Dominó y parchís con vecinos de tu ciudad. Se juega por puntos, nunca por dinero. Gana tu nivel en la comunidad.',
};

export default function Page() {
  return <JuegosScreen />;
}
