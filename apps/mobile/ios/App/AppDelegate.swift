import UIKit
import Capacitor

/* Las cuatro cáscaras de iOS comparten este código (un proyecto, cuatro targets; ver project.yml). Lo de cada app (id, nombre, textos de
   permiso, alcance, servidor) está en Targets/{App}/, generado desde apps/mobile/apps.json. */
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
