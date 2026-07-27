import { AdminScreen } from '@/screens/Admin';

// `/admin` — Super Admin (Fase 1). El guard real vive en el servidor: sin fila en
// `admins`, cada RPC devuelve `forbidden` y la pantalla muestra 404.
export default function Page() {
  return <AdminScreen />;
}
