import { BizOnboardingScreen } from '@/screens/BizOnboarding';

// `/negocio` — business panel entry. Shows the mini-dashboard if the user has
// a business (or drops into onboarding otherwise). The full admin panel
// (modules, orders, customers, billing) is the next build phase.
export default function Page() {
  return <BizOnboardingScreen />;
}
