import { AppRoot } from "@/AppRoot";

/**
 * Home route. Renders the responsive app full-bleed: a normal full-width mobile
 * website on phones, and a desktop layout (top nav / sidebar) on larger screens
 * — no device-mockup frame. Reflow per DESIGN_SYSTEM.md §6.
 */
export default function Page() {
  return <AppRoot />;
}
