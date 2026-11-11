import UIKit
import Capacitor

/* 8c · Avisos (fase8-apps.md §3.3): iOS le entrega a la app el token de APNs (o el error) y la app se lo pasa al plugin oficial
   PushNotifications de Capacitor, que se lo da a la web (lib/nativo/avisos.ts → el servidor lo guarda cifrado y atado a la sesión). APNs
   directo: sin SDK de Firebase en iOS. El permiso lo pide la web después de la hoja previa (nunca al abrir la app por primera vez). */
extension AppDelegate {
    @objc func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    @objc func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}
