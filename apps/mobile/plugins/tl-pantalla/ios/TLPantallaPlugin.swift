import Foundation
import Capacitor
import UIKit

/* 8a · TLPantalla (fase8-apps.md §3.1): la pantalla encendida mientras la Puerta escanea (desde 8e también el Repartidor con una entrega), el
   brillo al máximo al mostrar un QR (8e; se devuelve al salir) y abrir los Ajustes de ESTA app si la persona negó un permiso.
   Métodos: mantener, brillo, ajustes (los mismos que el Android). */
@objc(TLPantallaPlugin)
public class TLPantallaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TLPantallaPlugin"
    public let jsName = "TLPantalla"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "mantener", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "brillo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ajustes", returnType: CAPPluginReturnPromise)
    ]
    private var brilloAntes: CGFloat?

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(alSalir), name: UIApplication.willResignActiveNotification, object: nil)
    }

    @objc private func alSalir() {
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = false
            if let b = self.brilloAntes { UIScreen.main.brightness = b; self.brilloAntes = nil }
        }
    }

    @objc func mantener(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = on; call.resolve() }
    }

    @objc func brillo(_ call: CAPPluginCall) {
        let max = call.getBool("max") ?? false
        DispatchQueue.main.async {
            if max { if self.brilloAntes == nil { self.brilloAntes = UIScreen.main.brightness }; UIScreen.main.brightness = 1.0 }
            else if let b = self.brilloAntes { UIScreen.main.brightness = b; self.brilloAntes = nil }
            call.resolve()
        }
    }

    @objc func ajustes(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
            call.resolve()
        }
    }
}
