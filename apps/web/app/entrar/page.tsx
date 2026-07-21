import type { Metadata } from 'next';
import { OnboardingScreen } from '@/screens/Onboarding';

export const metadata: Metadata = {
  title: 'Entrar o crear cuenta',
  description: 'Únete a To\'Latino — tu súper app latina. Descubre negocios, eventos y vecinos de confianza cerca de ti.',
};

export default function Page() {
  return <OnboardingScreen />;
}
