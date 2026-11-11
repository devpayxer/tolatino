import Foundation
import Capacitor
import UIKit

/* 8a · TLPantalla (fase8-apps.md §3.1): la pantalla encendida mientras la Puerta escanea (desde 8e también el Repartidor con una entrega), el
   brillo al máximo al mostrar un QR (8e; se devuelve al salir) y abrir los Ajustes de ESTA app si la persona negó un permiso.
   Métodos: mantener, brillo, ajustes (los mismos que el Android).
   8e · Y la linterna de la Puerta: el WebView de iOS no deja prender la luz desde la cámara de la página, así que la prende el nativo
   (AVCaptureDevice.torchMode; a verificar en un iPhone real que no choca con la cámara del WebView; el simulador no tiene luz). La linterna vive
   en ios-camara/ y solo entra en los targets con cámara (generar.mjs); los demás llevan ios-sin-camara/ (ok:false), para que una app sin texto de
   cámara (Repartidor) no enlace la API de la cámara (Apple la rechaza sin NSCameraUsageDescription). fijar no existe en
   iOS (una app no puede fijarse sola sin MDM: la Puerta explica Acceso guiado) y contesta ok:false; fijada dice si Acceso guiado está activo. */
@objc(TLPantallaPlugin)
public class TLPantallaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TLPantallaPlugin"
    public let jsName = "TLPantalla"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "mantener", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "brillo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ajustes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "linterna", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fijar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "soltar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fijada", returnType: CAPPluginReturnPromise)
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

    @objc func fijar(_ call: CAPPluginCall) { call.resolve(["ok": false]) } // iOS: Acceso guiado (lo explica la Puerta)

    @objc func soltar(_ call: CAPPluginCall) { call.resolve() }

    @objc func fijada(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["fijada": UIAccessibility.isGuidedAccessEnabled]) }
    }
}
